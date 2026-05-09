from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
import os
import base64
import uuid

# ── Config ────────────────────────────────────────────────
MONGO_URI       = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
SECRET_KEY      = "ruralconnect-secret-key"
ALGORITHM       = "HS256"
TOKEN_EXP_HOURS = 24

# ── App ───────────────────────────────────────────────────
app = FastAPI()

# ✅ CORRECT CORS — no credentials=True with wildcard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Static + DB ───────────────────────────────────────────
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

client       = AsyncIOMotorClient(MONGO_URI)
db           = client["ruralconnect"]
users_col    = db["users"]
sellers_col  = db["sellers"]
products_col = db["products"]

# ── Helpers ───────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["argon2"], deprecated="auto")
bearer  = HTTPBearer()

CATEGORY_MAP = {
    "Men Fashion":      "mensfashion",
    "Women Fashion":    "womensfashion",
    "Bamboo":           "bamboo",
    "Pottery":          "pottery",
    "Carpets":          "handloom",
    "Handloom":         "handloom",
    "Jewelry":          "jewelry",
    "Leather":          "leather",
    "Metal Craft":      "metalcraft",
    "Painting":         "painting",
    "Wooden":           "wooden",
    "Handicraft":       "leather",
    "Ornaments":        "jewelry",
    "Home Decor":       "handloom",
    "Wooden Furniture": "wooden",
}

def hash_password(pw):
    return pwd_ctx.hash(pw)

def verify_password(plain, hashed):
    return pwd_ctx.verify(plain, hashed)

def create_token(seller_id):
    payload = {
        "sub": seller_id,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXP_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_seller(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload   = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        seller_id = payload.get("sub")
        if not seller_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        seller = await sellers_col.find_one({"_id": seller_id})
        if not seller:
            raise HTTPException(status_code=401, detail="Seller not found")
        return seller
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Models ────────────────────────────────────────────────
class BuyerAuth(BaseModel):
    phone:    str
    password: str

class SellerRegister(BaseModel):
    name:     str
    phone:    str
    password: str
    shop:     str
    street:   str
    city:     str
    district: str
    state:    str
    pin:      str

class SellerLogin(BaseModel):
    phone:    str
    password: str

class ProductCreate(BaseModel):
    name:         str
    category:     str
    price:        Optional[float] = ""
    stock:        Optional[int] = ""
    description:  Optional[str] = ""
    image_base64: Optional[str] = None

# ══════════════════════════════════════════════════════════
#  ROOT
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "RuralConnect API is running 🌾"}

# ══════════════════════════════════════════════════════════
#  BUYER
# ══════════════════════════════════════════════════════════

@app.post("/signup")
async def buyer_signup(data: BuyerAuth):
    try:
        existing = await users_col.find_one({"phone": data.phone})
        if existing:
            return {"success": False, "message": "Account already exists"}
        await users_col.insert_one({
            "phone":    data.phone,
            "password": hash_password(data.password)
        })
        return {"success": True, "message": "Signup successful"}
    except Exception as e:
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def buyer_login(data: BuyerAuth):
    try:
        user = await users_col.find_one({"phone": data.phone})
        if not user:
            return {"success": False, "message": "Account does not exist"}
        if not verify_password(data.password, user["password"]):
            return {"success": False, "message": "Incorrect password"}
        return {"success": True, "message": "Login successful"}
    except Exception as e:
        print("LOGIN ERROR:", e)
        return {"success": False, "message": "Server error"}

# ══════════════════════════════════════════════════════════
#  SELLER
# ══════════════════════════════════════════════════════════

@app.post("/api/seller/register")
async def register_seller(data: SellerRegister):
    try:
        existing = await sellers_col.find_one({"phone": data.phone})
        if existing:
            return {"success": False, "message": "Phone number already registered"}
        

        seller_id  = str(uuid.uuid4())
        seller_doc = {
            "_id":      seller_id,
            "name":     data.name,
            "phone":    data.phone,
            "password": hash_password(data.password),
            "shop":     data.shop,
            "address": {
                "street":   data.street,
                "city":     data.city,
                "district": data.district,
                "state":    data.state,
                "pin":      data.pin,
            },
            "created_at": datetime.utcnow().isoformat(),
            "is_active":  True,
        }
        await sellers_col.insert_one(seller_doc)
        token = create_token(seller_id)
        return {
            "success": True,
            "message": "Seller registered successfully",
            "token":   token,
            "seller":  {
                "id":    seller_id,
                "name":  data.name,
                "shop":  data.shop,
                "phone": data.phone,
            }
        }
    except Exception as e:
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/seller/login")
async def login_seller(data: SellerLogin):
    try:
        seller = await sellers_col.find_one({"phone": data.phone})
        if not seller:
            return {"success": False, "message": "Account does not exist"}
        if not verify_password(data.password, seller["password"]):
            return {"success": False, "message": "Incorrect password"}
        token = create_token(seller["_id"])
        return {
            "success": True,
            "message": "Login successful",
            "token":   token,
            "seller":  {
                "id":    seller["_id"],
                "name":  seller["name"],
                "shop":  seller["shop"],
                "phone": seller["phone"],
            }
        }
    except Exception as e:
        print("SELLER LOGIN ERROR:", e)
        return {"success": False, "message": "Server error"}

@app.get("/api/seller/me")
async def get_me(seller=Depends(get_current_seller)):
    return {
        "id":      seller["_id"],
        "name":    seller["name"],
        "shop":    seller["shop"],
        "phone":   seller["phone"],
        "address": seller.get("address", {}),
    }

# ══════════════════════════════════════════════════════════
#  PRODUCTS
# ══════════════════════════════════════════════════════════

@app.post("/api/products")
async def add_product(product: ProductCreate, seller=Depends(get_current_seller)):
    try:
        product_id = str(uuid.uuid4())
        image_url  = None
        if product.image_base64 and product.image_base64.startswith("data:image"):
            try:
                header, encoded = product.image_base64.split(",", 1)
                ext      = header.split("/")[1].split(";")[0]
                filename = f"{product_id}.{ext}"
                with open(os.path.join("uploads", filename), "wb") as f:
                    f.write(base64.b64decode(encoded))
                image_url = f"/uploads/{filename}"
            except Exception:
                pass

        page_key = CATEGORY_MAP.get(product.category, product.category.lower().replace(" ", ""))
        doc = {
            "_id":         product_id,
            "seller_id":   seller["_id"],
            "seller_name": seller["name"],
            "shop_name":   seller["shop"],
            "name":        product.name,
            "category":    product.category,
            "page_key":    page_key,
            "price":       product.price,
            "stock":       product.stock,
            "description": product.description,
            "image_url":   image_url,
            "created_at":  datetime.utcnow().isoformat(),
            "is_active":   True,
        }
        await products_col.insert_one(doc)
        return {"success": True, "message": "Product added", "product_id": product_id}
    except Exception as e:
        print("ADD PRODUCT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products/bulk")
async def add_products_bulk(products: List[ProductCreate], seller=Depends(get_current_seller)):
    try:
        if not products:
            return {"success": True, "message": "No products", "inserted": 0}
        docs = []
        for product in products:
            product_id = str(uuid.uuid4())
            image_url  = None
            if product.image_base64 and product.image_base64.startswith("data:image"):
                try:
                    header, encoded = product.image_base64.split(",", 1)
                    ext      = header.split("/")[1].split(";")[0]
                    filename = f"{product_id}.{ext}"
                    with open(os.path.join("uploads", filename), "wb") as f:
                        f.write(base64.b64decode(encoded))
                    image_url = f"/uploads/{filename}"
                except Exception:
                    pass
            page_key = CATEGORY_MAP.get(product.category, product.category.lower().replace(" ", ""))
            docs.append({
                "_id":         product_id,
                "seller_id":   seller["_id"],
                "seller_name": seller["name"],
                "shop_name":   seller["shop"],
                "name":        product.name,
                "category":    product.category,
                "page_key":    page_key,
                "price":       product.price,
                "stock":       product.stock,
                "description": product.description,
                "image_url":   image_url,
                "created_at":  datetime.utcnow().isoformat(),
                "is_active":   True,
            })
        await products_col.insert_many(docs)
        return {"success": True, "message": f"{len(docs)} products saved", "inserted": len(docs)}
    except Exception as e:
        print("BULK ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products")
async def get_products(category: Optional[str] = None, page_key: Optional[str] = None):
    try:
        query: dict = {"is_active": True}
        if category: query["category"] = category
        if page_key: query["page_key"] = page_key
        cursor   = products_col.find(query).sort("created_at", -1)
        products = []
        async for p in cursor:
            p["id"] = p.pop("_id")
            products.append(p)
        return {"products": products, "total": len(products)}
    except Exception as e:
        print("GET PRODUCTS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/seller")
async def get_my_products(seller=Depends(get_current_seller)):
    try:
        cursor   = products_col.find({"seller_id": seller["_id"]}).sort("created_at", -1)
        products = []
        async for p in cursor:
            p["id"] = p.pop("_id")
            products.append(p)
        return {"products": products, "total": len(products)}
    except Exception as e:
        print("GET MY PRODUCTS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, seller=Depends(get_current_seller)):
    result = await products_col.update_one(
        {"_id": product_id, "seller_id": seller["_id"]},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deleted"}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, updates: dict, seller=Depends(get_current_seller)):
    allowed  = {"name", "price", "stock", "description", "category"}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if "category" in filtered:
        filtered["page_key"] = CATEGORY_MAP.get(
            filtered["category"],
            filtered["category"].lower().replace(" ", "")
        )
    result = await products_col.update_one(
        {"_id": product_id, "seller_id": seller["_id"]},
        {"$set": filtered}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)