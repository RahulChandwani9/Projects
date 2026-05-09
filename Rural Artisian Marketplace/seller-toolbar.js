/**
 * seller-toolbar.js  (FIXED)
 * Include in rural.html AFTER api.js.
 * When a seller is logged in, this injects:
 *   1. A sticky "Seller Mode" toolbar at the top of the page
 *   2. An "Add Product" modal accessible from the toolbar
 */
(function () {
  if (!RuralAPI.isLoggedIn()) {
    const signupLink = document.querySelector('a[href="buyer-signup.html"]');
    if (signupLink) {
      signupLink.parentElement.after(
        Object.assign(document.createElement('div'), {
          className: 'logoandname',
          innerHTML: `<a href="seller-login.html" class="rumarket-icon" title="Seller Login" style="font-size:1rem;">🏪</a>
                      <div class="detail"><a href="seller-login.html" class="atag">Seller Login</a></div>`
        })
      );
    }
    return;
  }

  const seller = RuralAPI.getSeller();

  // ── Toolbar HTML ──────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.id = 'sellerToolbar';
  toolbar.innerHTML = `
    <style>
      #sellerBar {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 9999;
        background: #E6D5CE;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 40px;
        height: 72px;
        box-shadow: 0 2px 16px rgba(100,66,52,0.10);
        font-family: 'Poppins', sans-serif;
      }
      #sellerBar .sb-brand { display:flex;align-items:center;gap:10px; }
      #sellerBar .sb-brand-name { font-size:1.35rem;font-weight:700;color:#4D3328;letter-spacing:0.5px; }
      #sellerBar .sb-brand-name span { color:#C0785A; }
      #sellerBar .sb-seller-badge {
        background:#F0E5E1;color:#644234;font-size:0.68rem;font-weight:700;
        letter-spacing:1px;text-transform:uppercase;padding:3px 9px;
        border-radius:20px;border:1.5px solid #D3B6AB;margin-left:6px;
      }
      #sellerBar .sb-actions { display:flex;align-items:center;gap:4px; }
      #sellerBar .sb-shop { font-size:0.82rem;font-weight:600;color:#815F51;padding-right:8px; }
      #sellerBar .sb-divider { width:1px;height:32px;background:#E6D5CE;margin:0 6px; }
      #sellerBar .sb-icon-btn {
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:none;border:none;cursor:pointer;padding:6px 14px;
        border-radius:10px;gap:3px;transition:background 0.18s;
      }
      #sellerBar .sb-icon-btn:hover { background:#F0E5E1; }
      #sellerBar .sb-icon-btn i { font-size:1.1rem;color:#4D3328; }
      #sellerBar .sb-icon-btn .sb-label { font-size:0.67rem;font-weight:600;color:#644234;white-space:nowrap; }
      #sellerBar .sb-logout {
        display:flex;flex-direction:column;align-items:center;
        background:none;border:none;cursor:pointer;padding:6px 14px;
        border-radius:10px;gap:3px;transition:background 0.18s;
      }
      #sellerBar .sb-logout:hover { background:#fdecea; }
      #sellerBar .sb-logout i { font-size:1.1rem;color:#c0392b; }
      #sellerBar .sb-logout .sb-label { font-size:0.67rem;font-weight:600;color:#c0392b;white-space:nowrap; }
    </style>

    <div id="sellerBar">
      <div class="sb-brand">
        <img src="./images/rounded-handmade-vintage-label-by-Vexels.png"
             alt="Logo"
             style="height:42px;width:42px;object-fit:contain;"
             onerror="this.style.display='none'">
        <span class="sb-brand-name">Rural<span>Connect</span></span>
        <span class="sb-seller-badge">🏪 Seller Mode</span>
      </div>

      <div class="sb-actions">
        <span class="sb-shop">${seller.shop || seller.name}</span>
        <div class="sb-divider"></div>

        <button class="sb-icon-btn" onclick="openAddProductModal()">
          <i class="fa-solid fa-plus"></i>
          <span class="sb-label">Add Product</span>
        </button>

        <button class="sb-icon-btn" onclick="openMyProducts()">
          <i class="fa-solid fa-box-open"></i>
          <span class="sb-label">My Products</span>
        </button>

        <div class="sb-divider"></div>

        <button class="sb-logout" onclick="doLogout()">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span class="sb-label">Logout</span>
        </button>
      </div>
    </div>
  `;
  document.body.prepend(toolbar);

  const buyerHeader = document.querySelector('header.rumarket-header');
  if (buyerHeader) buyerHeader.style.display = 'none';
  document.body.style.paddingTop = '72px';

  // ── Add Product Modal ─────────────────────────────────────────────────────
  const modal = document.createElement('div');
  modal.id = 'addProductModal';
  modal.innerHTML = `
    <div id="apOverlay" onclick="closeAddProductModal()" style="
      position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:none;
    "></div>
    <div id="apPanel" style="
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#F9F5F3;border-radius:16px;z-index:10001;display:none;
      width:min(560px,96vw);max-height:90vh;overflow-y:auto;
      padding:36px 36px 28px;font-family:'Lato',sans-serif;
      box-shadow:0 30px 80px rgba(54,36,28,.25);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="font-family:'Playfair Display',serif;color:#36241C;margin:0;">Add New Product</h2>
        <button onclick="closeAddProductModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#815F51;">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Product Name *</label>
          <input id="ap-name" type="text" placeholder="e.g. Handwoven Basket" style="
            width:100%;padding:10px 13px;border:1.5px solid #D3B6AB;
            border-radius:9px;font-size:.9rem;background:#fff;box-sizing:border-box;
          "/>
        </div>

        <div>
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Category *</label>
          <select id="ap-cat" style="
            width:100%;padding:10px 13px;border:1.5px solid #D3B6AB;
            border-radius:9px;font-size:.9rem;background:#fff;box-sizing:border-box;
          ">
            <option value="">Select category…</option>
            <option value="pottery">Pottery</option>
            <option value="bamboo">Bamboo</option>
            <option value="handloom">Handloom</option>
            <option value="jewelry">Jewelry</option>
            <option value="leather">Leather</option>
            <option value="metalcraft">Metalcraft</option>
            <option value="painting">Painting</option>
            <option value="wooden">Wooden</option>
            <option value="mensfashion">Men's Fashion</option>
            <option value="womensfashion">Women's Fashion</option>
          </select>
        </div>

        <div>
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Price (₹)</label>
          <input id="ap-price" type="number" min="0" placeholder="e.g. 499" style="
            width:100%;padding:10px 13px;border:1.5px solid #D3B6AB;
            border-radius:9px;font-size:.9rem;background:#fff;box-sizing:border-box;
          "/>
        </div>

        <div>
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Stock Quantity</label>
          <input id="ap-stock" type="number" min="0" placeholder="e.g. 10" style="
            width:100%;padding:10px 13px;border:1.5px solid #D3B6AB;
            border-radius:9px;font-size:.9rem;background:#fff;box-sizing:border-box;
          "/>
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Description</label>
          <textarea id="ap-desc" rows="3" placeholder="Describe your product…" style="
            width:100%;padding:10px 13px;border:1.5px solid #D3B6AB;
            border-radius:9px;font-size:.9rem;background:#fff;resize:vertical;
            font-family:'Lato',sans-serif;box-sizing:border-box;
          "></textarea>
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:.8rem;font-weight:700;color:#4D3328;display:block;margin-bottom:5px;">Product Photo</label>
          <div onclick="document.getElementById('ap-image').click()" style="
            border:2px dashed #D3B6AB;border-radius:10px;height:110px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            cursor:pointer;position:relative;overflow:hidden;transition:border-color .2s;
          ">
            <input type="file" id="ap-image" accept="image/*" style="display:none;" onchange="apPreview(this)"/>
            <span id="ap-upload-icon" style="font-size:28px;margin-bottom:6px;">📷</span>
            <p id="ap-upload-text" style="font-size:.78rem;color:#AA8B7E;text-align:center;margin:0;">Click to upload product photo</p>
            <img id="ap-preview-img" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px;"/>
          </div>
        </div>
      </div>

      <div id="ap-error" style="color:#c0392b;font-size:.84rem;margin:12px 0;display:none;"></div>

      <div style="display:flex;gap:12px;margin-top:8px;">
        <button onclick="closeAddProductModal()" style="
          flex:1;padding:12px;background:transparent;color:#4D3328;
          border:1.5px solid #D3B6AB;border-radius:9px;font-weight:700;cursor:pointer;
        ">Cancel</button>
        <button onclick="submitProduct()" id="ap-submit-btn" style="
          flex:2;padding:12px;background:#4D3328;color:#F9F5F3;
          border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:.9rem;
        ">✅ Save Product</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // ── My Products Modal ─────────────────────────────────────────────────────
  const myProdModal = document.createElement('div');
  myProdModal.id = 'myProductsModal';
  myProdModal.innerHTML = `
    <div id="mpOverlay" onclick="closeMyProducts()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:none;"></div>
    <div id="mpPanel" style="
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#F9F5F3;border-radius:16px;z-index:10001;display:none;
      width:min(720px,96vw);max-height:88vh;overflow-y:auto;
      padding:36px;font-family:'Lato',sans-serif;
      box-shadow:0 30px 80px rgba(54,36,28,.25);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="font-family:'Playfair Display',serif;color:#36241C;margin:0;">My Products</h2>
        <button onclick="closeMyProducts()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#815F51;">✕</button>
      </div>
      <div id="mp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">
        <p style="color:#AA8B7E;font-size:.9rem;grid-column:1/-1;text-align:center;padding:20px;">Loading…</p>
      </div>
    </div>
  `;
  document.body.appendChild(myProdModal);

  // ── Robust image URL resolver (same logic as products-loader) ────────────
  // DB stores: /uploads/<uuid>.png
  // Django serves at: http://127.0.0.1:8000/uploads/<uuid>.png
  // Set window.RC_DJANGO_ORIGIN = "http://yourserver:port" to override.
  
  function resolveSellerImageUrl(image_url) {
  if (!image_url) return '';

  // If already full URL → use as is
  if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
    return image_url;
  }

  const BASE = 'http://localhost:5000';

  // If already starts with /uploads
  if (image_url.startsWith('/uploads')) {
    return BASE + image_url;
  }

  // Otherwise
  return `${BASE}/uploads/${image_url}`;
}
  // ── Global functions ──────────────────────────────────────────────────────
  let apImageDataUrl = null;

  window.openAddProductModal = function () {
    document.getElementById('apOverlay').style.display = 'block';
    document.getElementById('apPanel').style.display   = 'block';
  };

  window.closeAddProductModal = function () {
    document.getElementById('apOverlay').style.display = 'none';
    document.getElementById('apPanel').style.display   = 'none';
    ['ap-name','ap-price','ap-stock','ap-desc'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('ap-cat').value = '';
    document.getElementById('ap-image').value = '';
    apImageDataUrl = null;
    document.getElementById('ap-preview-img').style.display = 'none';
    document.getElementById('ap-upload-icon').style.display = '';
    document.getElementById('ap-upload-text').style.display = '';
    document.getElementById('ap-error').style.display = 'none';
  };

  window.apPreview = function (input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      apImageDataUrl = e.target.result;
      const img = document.getElementById('ap-preview-img');
      img.src = apImageDataUrl;
      img.style.display = 'block';
      document.getElementById('ap-upload-icon').style.display = 'none';
      document.getElementById('ap-upload-text').style.display = 'none';
    };
    reader.readAsDataURL(file);
  };

  window.submitProduct = async function () {
    const name  = document.getElementById('ap-name').value.trim();
    const cat   = document.getElementById('ap-cat').value;
    const price = document.getElementById('ap-price').value.trim();
    const stock = document.getElementById('ap-stock').value.trim();
    const desc  = document.getElementById('ap-desc').value.trim();
    const err   = document.getElementById('ap-error');
    const btn   = document.getElementById('ap-submit-btn');

    if (!name || !cat) {
      err.textContent = '⚠️ Product name and category are required.';
      err.style.display = 'block';
      return;
    }
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = '⏳ Saving…';
    try {
      await RuralAPI.addProduct({
        name, category: cat, price, stock,
        description: desc,
        image_base64: apImageDataUrl
      });
      closeAddProductModal();
      showSellerToast('✅ "' + name + '" is now live in ' + cat + '!');
    } catch (e) {
      err.textContent = '❌ ' + (e.message || 'Failed to save product');
      err.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = '✅ Save Product';
  };

  // ── FIX: My Products uses DOM nodes + data attributes, not inline onclick strings
  window.openMyProducts = async function () {
    document.getElementById('mpOverlay').style.display = 'block';
    document.getElementById('mpPanel').style.display   = 'block';
    const grid = document.getElementById('mp-grid');
    grid.innerHTML = '<p style="color:#AA8B7E;font-size:.9rem;grid-column:1/-1;text-align:center;padding:20px;">Loading…</p>';

    try {
      const { products } = await RuralAPI.getMyProducts();
      if (!products.length) {
        grid.innerHTML = '<p style="color:#AA8B7E;font-size:.9rem;grid-column:1/-1;text-align:center;padding:20px;">No products yet. Add your first product!</p>';
        return;
      }

      grid.innerHTML = '';
      products.forEach(p => {
        const imgSrc = resolveSellerImageUrl(p.image_url);

        const card = document.createElement('div');
        card.style.cssText = 'background:#F0E5E1;border:1.5px solid #E6D5CE;border-radius:12px;overflow:hidden;';

        // Image area
        const imgWrap = document.createElement('div');
        imgWrap.style.cssText = 'height:130px;background:#E6D5CE;display:flex;align-items:center;justify-content:center;overflow:hidden;';

        if (imgSrc) {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          // FIX: onerror via addEventListener, not inline attribute
          img.addEventListener('error', function () {
            this.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.style.cssText = 'font-size:36px;display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
            fallback.textContent = '🧺';
            imgWrap.appendChild(fallback);
          });
          imgWrap.appendChild(img);
        } else {
          imgWrap.innerHTML = '<span style="font-size:36px;">🧺</span>';
        }

        // Info area
        const info = document.createElement('div');
        info.style.cssText = 'padding:10px;';
        info.innerHTML = `
          <div style="font-weight:700;color:#36241C;font-size:.86rem;margin-bottom:2px;">${p.name}</div>
          <div style="color:#AA8B7E;font-size:.76rem;">${p.category}${p.price ? ' · ₹' + p.price : ''}</div>
        `;

        // Delete button — uses dataset, no inline string with product id
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑 Remove';
        delBtn.style.cssText = 'margin-top:8px;width:100%;padding:6px;background:transparent;color:#c0392b;border:1px solid #f0b0a0;border-radius:6px;font-size:.76rem;cursor:pointer;';
        delBtn.dataset.productId = p.id;
        delBtn.addEventListener('click', function () {
          deleteMyProduct(this.dataset.productId);
        });

        info.appendChild(delBtn);
        card.appendChild(imgWrap);
        card.appendChild(info);
        grid.appendChild(card);
      });

    } catch (e) {
      grid.innerHTML = '<p style="color:#c0392b;grid-column:1/-1;text-align:center;">Failed to load products.</p>';
      console.error('openMyProducts error:', e);
    }
  };

  window.closeMyProducts = function () {
    document.getElementById('mpOverlay').style.display = 'none';
    document.getElementById('mpPanel').style.display   = 'none';
  };

  window.deleteMyProduct = async function (id) {
    if (!confirm('Remove this product?')) return;
    try {
      await RuralAPI.deleteProduct(id);
      showSellerToast('🗑 Product removed.');
      openMyProducts(); // refresh
    } catch (e) {
      showSellerToast('❌ Could not delete product.');
    }
  };

  window.doLogout = function () {
    RuralAPI.logout();
    window.location.reload();
  };

  function showSellerToast(msg) {
    let t = document.getElementById('sellerToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sellerToast';
      t.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#4D3328;color:#F9F5F3;padding:14px 22px;border-radius:10px;font-size:.88rem;font-weight:700;box-shadow:0 8px 30px rgba(54,36,28,.35);transform:translateX(140%);transition:transform .4s cubic-bezier(.22,1,.36,1);z-index:99999;font-family:Lato,sans-serif;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.transform = 'translateX(0)';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.transform = 'translateX(140%)'; }, 3500);
  }
})();