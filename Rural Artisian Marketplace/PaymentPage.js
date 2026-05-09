// Payment Page Script

let currentStep = 1;
const totalSteps = 3;
let cartProducts = [];
let orderData = {};
let activeCartKey = 'graminCart'; // Will be detected dynamically

// ─── ALL POSSIBLE KEYS your app might use to store the cart ───────────────────
const CART_KEY_CANDIDATES = [
    'graminCart',
    'cart',
    'cartItems',
    'ruralCart',
    'ruralconnect_cart',
    'myCart',
    'shoppingCart'
];

// Country-State-City Mapping
const locationData = {
    india: {
        states: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
        cities: {
            'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
            'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Aurangabad'],
            'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
            'Karnataka': ['Bangalore', 'Mysore', 'Hubballi', 'Davangere'],
            'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Jamnagar'],
            'Delhi': ['New Delhi', 'Delhi'],
            'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Ghaziabad'],
            'West Bengal': ['Kolkata', 'Durgapur', 'Siliguri', 'Asansol'],
            'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner'],
            'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal'],
            'default': ['Select city']
        }
    },
    usa: {
        states: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
        cities: {
            'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'],
            'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio'],
            'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
            'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
            'default': ['Select city']
        }
    },
    uk: {
        states: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
        cities: {
            'England': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'],
            'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
            'Wales': ['Cardiff', 'Swansea', 'Newport'],
            'Northern Ireland': ['Belfast', 'Derry', 'Lisburn'],
            'default': ['Select city']
        }
    },
    canada: {
        states: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
        cities: {
            'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London'],
            'Quebec': ['Montreal', 'Quebec City', 'Gatineau'],
            'British Columbia': ['Vancouver', 'Victoria', 'Burnaby'],
            'Alberta': ['Calgary', 'Edmonton', 'Red Deer'],
            'default': ['Select city']
        }
    },
    australia: {
        states: ['New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
        cities: {
            'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
            'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast'],
            'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
            'Western Australia': ['Perth', 'Fremantle', 'Mandurah'],
            'default': ['Select city']
        }
    }
};

// Promo codes
const promoCodes = {
    'RURAL10': { discount: 0.10, type: 'percentage', minAmount: 0 },
    'FRESH20': { discount: 0.20, type: 'percentage', minAmount: 0 },
    'SAVE50': { discount: 50, type: 'fixed', minAmount: 200 },
    'RURAL25': { discount: 0.25, type: 'percentage', minAmount: 1000 }
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadProductsFromCart();
    calculateTotals();
    setupCardFormatting();
    setupPaymentMethodListeners();
    setupInputRestrictions();
});

// ─── SMART CART LOADER ────────────────────────────────────────────────────────
// Tries every known key and picks the first that has items.
// Also dumps ALL localStorage to console so you can find the exact key.
function getCartFromStorage() {
    console.group('LocalStorage Debug — all keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try { console.log('"' + k + '" =>', JSON.parse(localStorage.getItem(k))); }
        catch { console.log('"' + k + '" =>', localStorage.getItem(k)); }
    }
    console.groupEnd();

    // 1. Try known candidate keys
    for (const key of CART_KEY_CANDIDATES) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.length > 0) {
                console.log('Cart found under key: "' + key + '"', data);
                activeCartKey = key;
                return data;
            }
        } catch(e) { /* skip */ }
    }

    // 2. Auto-scan all localStorage keys for anything that looks like a cart
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data) && data.length > 0) {
                const first = data[0];
                if (first && (first.name || first.title) && (first.price !== undefined || first.cost !== undefined)) {
                    console.log('Cart auto-detected under key: "' + key + '"', data);
                    activeCartKey = key;
                    return data;
                }
            }
        } catch(e) { /* skip */ }
    }

    console.warn('No cart data found in localStorage under any key.');
    return [];
}

// Load products from localStorage
function loadProductsFromCart() {
    const products = getCartFromStorage();
    cartProducts = products;

    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';

    if (products.length === 0) {
        productsList.innerHTML =
            '<div style="text-align:center;padding:20px;color:var(--muted-foreground);">' +
            '<div style="font-size:32px;margin-bottom:8px;">🛒</div>' +
            '<p style="font-weight:600;">No products in cart</p>' +
            '<p style="font-size:12px;margin-top:6px;">Open browser DevTools (F12 → Console) to see what keys exist in localStorage.</p>' +
            '</div>';
        return;
    }

    products.forEach(function(product) {
        const name  = product.name  || product.title   || 'Unknown Product';
        const price = parseFloat(product.price || product.cost || 0);
        const qty   = parseInt(product.quantity || product.qty || 1);
        const img   = product.image || product.img || product.imageUrl || null;

        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML =
            '<div class="product-image">' +
            (img
                ? '<img src="' + img + '" alt="' + name + '" onerror="this.parentElement.innerHTML=\'<div style=\\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;\\\'>🛍️</div>\'">'
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;">🛍️</div>') +
            '</div>' +
            '<div class="product-info">' +
            '<div class="product-name">' + name + '</div>' +
            '<div class="product-qty">Qty: ' + qty + '</div>' +
            '<div class="product-price">₹' + (price * qty).toFixed(2) + '</div>' +
            '</div>';
        productsList.appendChild(productItem);
    });
}

// Calculate totals
function calculateTotals() {
    let subtotal = 0;
    cartProducts.forEach(function(product) {
        const price = parseFloat(product.price || product.cost || 0);
        const qty   = parseInt(product.quantity || product.qty || 1);
        subtotal += (price * qty) || 0;
    });

    const shipping = subtotal > 0 ? 99 : 0;
    const tax   = (subtotal + shipping) * 0.18;
    const total = subtotal + shipping + tax;

    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('shipping').textContent = '₹' + shipping.toFixed(2);
    document.getElementById('tax').textContent      = '₹' + tax.toFixed(2);
    document.getElementById('total').textContent    = '₹' + total.toFixed(2);

    orderData.subtotal = subtotal;
    orderData.shipping = shipping;
    orderData.tax      = tax;
    orderData.total    = total;
}

// Navigate to next step
function nextStep(step) {
    if (step === 1) {
        if (!validateAddressForm()) return;
        saveAddressData();
        goToStep(2);
    } else if (step === 2) {
        if (!validatePaymentForm()) return;
        savePaymentData();
        goToStep(3);
        displayReview();
    }
}

function prevStep(step) { goToStep(step - 1); }

function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    document.querySelectorAll('.form-step').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('step-' + step).classList.add('active');
    document.querySelectorAll('.step').forEach(function(el, index) {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        if (stepNum < step)       el.classList.add('completed');
        else if (stepNum === step) el.classList.add('active');
    });
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateAddressForm() {
    const form   = document.getElementById('address-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid  = true;

    const email = document.getElementById('email').value.trim();
    const zip   = document.getElementById('zip').value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('email').style.borderColor = 'red';
        alert('Please enter a valid email address');
        return false;
    }
    document.getElementById('email').style.borderColor = 'var(--border)';

    if (!/^\d+$/.test(zip)) {
        document.getElementById('zip').style.borderColor = 'red';
        alert('Postal code should contain only numbers');
        return false;
    }
    document.getElementById('zip').style.borderColor = 'var(--border)';

    inputs.forEach(function(input) {
        if (!input.value.trim()) { input.style.borderColor = 'red'; isValid = false; }
        else { input.style.borderColor = 'var(--border)'; }
    });

    if (!isValid) alert('Please fill in all required fields');
    return isValid;
}

function validatePaymentForm() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;

    if (method === 'card') {
        const cardName   = document.getElementById('cardName').value.trim();
        const cardNumber = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
        const cardExpiry = document.getElementById('cardExpiry').value.trim();
        const cardCvv    = document.getElementById('cardCvv').value.trim();
        if (!cardName || !cardNumber || !cardExpiry || !cardCvv) { alert('Please fill in all card details'); return false; }
        if (!/^\d+$/.test(cardNumber))                           { alert('Card number should contain only numbers'); return false; }
        if (cardNumber.length < 13 || cardNumber.length > 19)   { alert('Invalid card number length'); return false; }
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry))                 { alert('Invalid expiry date format (MM/YY)'); return false; }
        if (!/^\d{3,4}$/.test(cardCvv))                         { alert('Invalid CVV'); return false; }
    } else if (method === 'upi') {
        const upiId = document.getElementById('upiId').value.trim();
        if (!upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(upiId)) { alert('Please enter a valid UPI ID'); return false; }
    } else if (method === 'netbanking') {
        if (!document.getElementById('bankName').value.trim())   { alert('Please select a bank'); return false; }
    } else if (method === 'wallet') {
        if (!document.getElementById('walletName').value.trim()) { alert('Please select a wallet'); return false; }
    }
    return true;
}

function saveAddressData() {
    orderData.address = {
        firstName: document.getElementById('firstName').value,
        lastName:  document.getElementById('lastName').value,
        email:     document.getElementById('email').value,
        phone:     document.getElementById('phone').value,
        address:   document.getElementById('address').value,
        city:      document.getElementById('city').value,
        state:     document.getElementById('state').value,
        zip:       document.getElementById('zip').value,
        country:   document.getElementById('country').value
    };
}

function savePaymentData() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    orderData.payment = { method: method };
    if (method === 'card') {
        orderData.payment.cardName   = document.getElementById('cardName').value;
        orderData.payment.cardNumber = '****' + document.getElementById('cardNumber').value.slice(-4);
    }
}

function displayReview() {
    const addr = orderData.address;
    document.getElementById('addressReview').innerHTML =
        '<p><strong>' + addr.firstName + ' ' + addr.lastName + '</strong></p>' +
        '<p>' + addr.address + '</p>' +
        '<p>' + addr.city + ', ' + addr.state + ' ' + addr.zip + '</p>' +
        '<p>' + addr.country + '</p>' +
        '<p>Email: ' + addr.email + '</p>' +
        '<p>Phone: ' + addr.phone + '</p>';

    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const labels = { card: 'Credit/Debit Card', upi: 'UPI Payment', netbanking: 'Net Banking', wallet: 'Digital Wallet' };
    let paymentText = '<p><strong>' + labels[method] + '</strong></p>';
    if (method === 'card') {
        paymentText += '<p>' + orderData.payment.cardName + '</p>';
        paymentText += '<p>Card: ' + orderData.payment.cardNumber + '</p>';
    }
    document.getElementById('paymentReview').innerHTML = paymentText;
}

function completePayment() {
    document.getElementById('successModal').classList.add('active');

    const orderId = 'RLC' + Date.now();
    document.getElementById('orderDetails').innerHTML =
        '<p><strong>Order ID:</strong> ' + orderId + '</p>' +
        '<p><strong>Order Total:</strong> ₹' + orderData.total.toFixed(2) + '</p>' +
        '<p><strong>Delivery Address:</strong> ' + orderData.address.city + ', ' + orderData.address.state + '</p>' +
        '<p><strong>Expected Delivery:</strong> 3-5 business days</p>';

    const orders = JSON.parse(localStorage.getItem('ruralconnect_orders')) || [];
    orders.push({ orderId: orderId, date: new Date().toISOString(), address: orderData.address, payment: orderData.payment, products: cartProducts, total: orderData.total });
    localStorage.setItem('ruralconnect_orders', JSON.stringify(orders));

    // ✅ Clear the correct key (dynamically detected)
    localStorage.removeItem(activeCartKey);
}

function goToHome() { window.location.href = 'rural.html'; }

function applyPromo() {
    const promoCode = document.getElementById('promoCode').value.trim().toUpperCase();
    if (!promoCode) { alert('Please select a promo code'); return; }

    const promo = promoCodes[promoCode];
    if (!promo) { alert('Invalid promo code'); return; }
    if (orderData.total < promo.minAmount) { alert('Minimum order amount of ₹' + promo.minAmount + ' required for this promo code'); return; }

    const discountAmount = promo.type === 'percentage' ? orderData.subtotal * promo.discount : promo.discount;
    const newTotal = Math.max(0, orderData.total - discountAmount);
    alert('Promo code ' + promoCode + ' applied! You saved ₹' + discountAmount.toFixed(2));
    document.getElementById('total').textContent = '₹' + newTotal.toFixed(2);
    orderData.total = newTotal;
}

function setupCardFormatting() {
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\s/g, '');
            e.target.value = v.replace(/(\d{4})/g, '$1 ').trim();
        });
    }
    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            e.target.value = v;
        });
    }
}

function setupPaymentMethodListeners() {
    document.querySelectorAll('input[name="paymentMethod"]').forEach(function(option) {
        option.addEventListener('change', function() {
            document.getElementById('card-form').style.display       = this.value === 'card'       ? 'block' : 'none';
            document.getElementById('upi-form').style.display        = this.value === 'upi'        ? 'block' : 'none';
            document.getElementById('netbanking-form').style.display = this.value === 'netbanking' ? 'block' : 'none';
            document.getElementById('wallet-form').style.display     = this.value === 'wallet'     ? 'block' : 'none';
        });
    });
}

function setupInputRestrictions() {
    var zipInput = document.getElementById('zip');
    if (zipInput) zipInput.addEventListener('input', function(e) { e.target.value = e.target.value.replace(/[^0-9]/g, ''); });

    var cardNumber = document.getElementById('cardNumber');
    if (cardNumber) cardInput.addEventListener('input', function(e) {
        var v = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = v.replace(/(\d{4})/g, '$1 ').trim();
    });

    var cardCvv = document.getElementById('cardCvv');
    if (cardCvv) cardCvv.addEventListener('input', function(e) { e.target.value = e.target.value.replace(/[^0-9]/g, ''); });
}

function updateCityState() {
    var country     = document.getElementById('country').value.toLowerCase();
    var citySelect  = document.getElementById('city');
    var stateSelect = document.getElementById('state');

    citySelect.innerHTML  = '<option value="">Select city</option>';
    stateSelect.innerHTML = '<option value="">Select state</option>';

    if (!country || !locationData[country]) {
        citySelect.disabled = stateSelect.disabled = true;
        return;
    }

    var data = locationData[country];
    data.states.forEach(function(state) {
        var opt = document.createElement('option');
        opt.value = opt.textContent = state;
        stateSelect.appendChild(opt);
    });
    stateSelect.disabled = false;

    stateSelect.addEventListener('change', function() {
        var state = this.value;
        citySelect.innerHTML = '<option value="">Select city</option>';
        if (state && data.cities[state]) {
            data.cities[state].forEach(function(city) {
                var opt = document.createElement('option');
                opt.value = opt.textContent = city;
                citySelect.appendChild(opt);
            });
            citySelect.disabled = false;
        } else {
            citySelect.disabled = true;
        }
    }, { once: true });
}