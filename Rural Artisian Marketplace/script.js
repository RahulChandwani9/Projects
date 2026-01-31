let cart = JSON.parse(localStorage.getItem('graminCart')) || [];
updateCartCount();

function openProduct(id, name, price, desc, img) {
    window.location.href = `product-details.html?id=${id}&name=${encodeURIComponent(name)}&price=${price}&desc=${encodeURIComponent(desc)}&img=${encodeURIComponent(img)}`;
}
function openProduct(id, name, price, desc, img) {
    const url = `product-details.html?id=${id}&name=${encodeURIComponent(name)}&price=${price}&desc=${encodeURIComponent(desc)}&img=${encodeURIComponent(img)}`;
    window.location.href = url;
}
// Add to Cart Logic
function addToCart(id, name, price) {
    let item = cart.find(i => i.id === id);
    if (item) {
        item.quantity++;
    } else {
        cart.push({ id, name, price: parseInt(price), quantity: 1 });
    }
    saveCart();
    alert(name + " added to cart!");
}

function saveCart() {
    localStorage.setItem('ruralconnect', JSON.stringify(cart));
    updateCartCount();
    if (document.getElementById('cartSidebar').classList.contains('open')) renderCart();
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').innerText = count;
}

// Cart sidebar kholne aur band karne ka function
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open'); 
        renderCart(); // Cart ke items dikhane ke liye
    } else {
        alert("Error: Cart Sidebar element nahi mila. HTML check karein!");
    }
}

function renderCart() {
    const list = document.getElementById('cartList');
    if(!list) return;
    
    let total = 0;
    list.innerHTML = cart.length === 0 ? "<h3 style='text-align:center; padding:20px;'>Your cart is empty</h3>" : "";

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        list.innerHTML += `
            <div class="cart-item">
                <div style="flex:1;">
                    <p style="font-weight:bold; font-size:15px; margin-bottom:4px;">${item.name}</p>
                    <p style="color:#B12704; font-weight:bold;">₹${item.price}</p>
                </div>
                
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span class="qty-text">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>

                <i class="fa fa-trash remove-icon" onclick="changeQty(${index}, -${item.quantity})" title="Remove item"></i>
            </div>`;
    });
    
    const totalEl = document.getElementById('totalPrice');
    if(totalEl) totalEl.innerText = total;
}
    
    

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
}

function clearCart() {
    if(confirm("Clear cart?")) {
        cart = [];
        saveCart();
    }
}