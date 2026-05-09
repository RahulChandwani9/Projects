let cart = JSON.parse(localStorage.getItem('ruralconnect')) || [];
updateCartCount();

// Navigates to the product details page with all data passed as URL params.
// Also defined early in products-loader.js so dynamically injected cards
// can call it even before this script's defer execution completes.
function openProduct(id, name, price, desc, img) {
    const url = 'product-details.html'
        + '?id='    + id
        + '&name='  + encodeURIComponent(name)
        + '&price=' + price
        + '&desc='  + encodeURIComponent(desc)
        + '&img='   + encodeURIComponent(img);
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
    if (document.getElementById('cartSidebar') &&
        document.getElementById('cartSidebar').classList.contains('open')) {
        renderCart();
    }
}

function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (!el) return;
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    el.innerText = count;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        renderCart();
    } else {
        alert("Error: Cart Sidebar element not found. Check your HTML.");
    }
}

function renderCart() {
    const list = document.getElementById('cartList');
    if (!list) return;

    let total = 0;
    list.innerHTML = cart.length === 0
        ? "<h3 style='text-align:center;padding:20px;'>Your cart is empty</h3>"
        : "";

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        list.innerHTML += `
            <div class="cart-item">
                <div style="flex:1;">
                    <p style="font-weight:bold;font-size:15px;margin-bottom:4px;">${item.name}</p>
                    <p style="color:#B12704;font-weight:bold;">&#8377;${item.price}</p>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span class="qty-text">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <i class="fa fa-trash remove-icon"
                   onclick="changeQty(${index}, -${item.quantity})"
                   title="Remove item"></i>
            </div>`;
    });

    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.innerText = total;
}

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
}

function clearCart() {
    if (confirm("Clear cart?")) {
        cart = [];
        saveCart();
    }
}

function darkonclick(clickedbtn) {
    document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
    clickedbtn.classList.add("active");
}

window.onload = function () {
    updateCartCount();
};