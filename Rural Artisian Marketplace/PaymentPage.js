// Payment Page Script

let currentStep = 1;
const totalSteps = 3;
let cartProducts = [];
let orderData = {};

// Country-State-City Mapping
const locationData = {
    india: {
        states: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
        cities: {
            'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
            'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Aurangabad'],
            'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
            'Karnataka': ['Bangalore', 'Pune', 'Mysore', 'Hubballi', 'Davangere'],
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

// Load products from localStorage
function loadProductsFromCart() {
    const products = JSON.parse(localStorage.getItem('ruralconnect_products')) || [];
    cartProducts = products;
    
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    
    if (products.length === 0) {
        productsList.innerHTML = '<p style="color: var(--muted-foreground); text-align: center; padding: 20px;">No products in cart</p>';
        return;
    }
    
    products.forEach((product, index) => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-image">
                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%); display: flex; align-items: center; justify-content: center; font-size: 24px;">🛍️</div>
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-qty">Qty: 1</div>
                <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
            </div>
        `;
        productsList.appendChild(productItem);
    });
}

// Calculate totals
function calculateTotals() {
    let subtotal = 0;
    cartProducts.forEach(product => {
        subtotal += parseFloat(product.price) || 0;
    });
    
    const shipping = 99;
    const tax = (subtotal + shipping) * 0.18;
    const total = subtotal + shipping + tax;
    
    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('shipping').textContent = '₹' + shipping.toFixed(2);
    document.getElementById('tax').textContent = '₹' + tax.toFixed(2);
    document.getElementById('total').textContent = '₹' + total.toFixed(2);
    
    orderData.subtotal = subtotal;
    orderData.shipping = shipping;
    orderData.tax = tax;
    orderData.total = total;
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

// Navigate to previous step
function prevStep(step) {
    goToStep(step - 1);
}

// Go to specific step
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected step
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        if (stepNum < step) {
            el.classList.add('completed');
        } else if (stepNum === step) {
            el.classList.add('active');
        }
    });
    
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate address form
function validateAddressForm() {
    const form = document.getElementById('address-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    let isValid = true;
    const email = document.getElementById('email').value.trim();
    const zip = document.getElementById('zip').value.trim();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        document.getElementById('email').style.borderColor = 'red';
        alert('Please enter a valid email address');
        return false;
    }
    document.getElementById('email').style.borderColor = 'var(--border)';
    
    // Validate postal code (numbers only)
    if (!/^\d+$/.test(zip)) {
        document.getElementById('zip').style.borderColor = 'red';
        alert('Postal code should contain only numbers');
        return false;
    }
    document.getElementById('zip').style.borderColor = 'var(--border)';
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = 'red';
            isValid = false;
        } else {
            input.style.borderColor = 'var(--border)';
        }
    });
    
    if (!isValid) {
        alert('Please fill in all required fields');
    }
    
    return isValid;
}

// Validate payment form
function validatePaymentForm() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    if (paymentMethod === 'card') {
        const cardName = document.getElementById('cardName').value.trim();
        const cardNumber = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
        const cardExpiry = document.getElementById('cardExpiry').value.trim();
        const cardCvv = document.getElementById('cardCvv').value.trim();
        
        if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
            alert('Please fill in all card details');
            return false;
        }
        
        if (!/^\d+$/.test(cardNumber)) {
            alert('Card number should contain only numbers');
            return false;
        }
        
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            alert('Invalid card number length');
            return false;
        }
        
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            alert('Invalid expiry date format (MM/YY)');
            return false;
        }
        
        if (!/^\d{3,4}$/.test(cardCvv)) {
            alert('Invalid CVV');
            return false;
        }
    } else if (paymentMethod === 'upi') {
        const upiId = document.getElementById('upiId').value.trim();
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
        if (!upiId || !upiRegex.test(upiId)) {
            alert('Please enter a valid UPI ID (e.g., yourname@bankname)');
            return false;
        }
    } else if (paymentMethod === 'netbanking') {
        const bankName = document.getElementById('bankName').value.trim();
        if (!bankName) {
            alert('Please select a bank');
            return false;
        }
    } else if (paymentMethod === 'wallet') {
        const walletName = document.getElementById('walletName').value.trim();
        if (!walletName) {
            alert('Please select a wallet');
            return false;
        }
    }
    
    return true;
}

// Save address data
function saveAddressData() {
    orderData.address = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zip: document.getElementById('zip').value,
        country: document.getElementById('country').value
    };
}

// Save payment data
function savePaymentData() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    orderData.payment = {
        method: paymentMethod
    };
    
    if (paymentMethod === 'card') {
        orderData.payment.cardName = document.getElementById('cardName').value;
        orderData.payment.cardNumber = '****' + document.getElementById('cardNumber').value.slice(-4);
    }
}

// Display review
function displayReview() {
    const addr = orderData.address;
    const addressReview = document.getElementById('addressReview');
    addressReview.innerHTML = `
        <p><strong>${addr.firstName} ${addr.lastName}</strong></p>
        <p>${addr.address}</p>
        <p>${addr.city}, ${addr.state} ${addr.zip}</p>
        <p>${addr.country}</p>
        <p>Email: ${addr.email}</p>
        <p>Phone: ${addr.phone}</p>
    `;
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const paymentLabels = {
        'card': 'Credit/Debit Card',
        'upi': 'UPI Payment',
        'netbanking': 'Net Banking',
        'wallet': 'Digital Wallet'
    };
    
    const paymentReview = document.getElementById('paymentReview');
    let paymentText = `<p><strong>${paymentLabels[paymentMethod]}</strong></p>`;
    
    if (paymentMethod === 'card') {
        paymentText += `<p>${orderData.payment.cardName}</p>`;
        paymentText += `<p>Card: ${orderData.payment.cardNumber}</p>`;
    }
    
    paymentReview.innerHTML = paymentText;
}

// Complete payment
function completePayment() {
    // Simulate payment processing
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
    
    const orderId = 'RLC' + Date.now();
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = `
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Order Total:</strong> ₹${orderData.total.toFixed(2)}</p>
        <p><strong>Delivery Address:</strong> ${orderData.address.city}, ${orderData.address.state}</p>
        <p><strong>Expected Delivery:</strong> 3-5 business days</p>
    `;
    
    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem('ruralconnect_orders')) || [];
    orders.push({
        orderId: orderId,
        date: new Date().toISOString(),
        address: orderData.address,
        payment: orderData.payment,
        products: cartProducts,
        total: orderData.total
    });
    localStorage.setItem('ruralconnect_orders', JSON.stringify(orders));
    
    // Clear cart
    localStorage.removeItem('ruralconnect_products');
}

// Go to home
function goToHome() {
    window.location.href = 'rural.html';
}

// Apply promo code
function applyPromo() {
    const promoCode = document.getElementById('promoCode').value.trim().toUpperCase();
    
    if (!promoCode) {
        alert('Please select a promo code');
        return;
    }
    
    const promo = promoCodes[promoCode];
    
    if (!promo) {
        alert('Invalid promo code');
        return;
    }
    
    if (orderData.total < promo.minAmount) {
        alert(`Minimum order amount of ₹${promo.minAmount} required for this promo code`);
        return;
    }
    
    let discountAmount = 0;
    if (promo.type === 'percentage') {
        discountAmount = orderData.subtotal * promo.discount;
    } else {
        discountAmount = promo.discount;
    }
    
    const newTotal = Math.max(0, orderData.total - discountAmount);
    alert(`Promo code ${promoCode} applied! You saved ₹${discountAmount.toFixed(2)}`);
    document.getElementById('total').textContent = '₹' + newTotal.toFixed(2);
    orderData.total = newTotal;
}

// Setup card number formatting
function setupCardFormatting() {
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
            e.target.value = formattedValue;
        });
    }
    
    const expiryInput = document.getElementById('cardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
}

// Setup payment method listeners
function setupPaymentMethodListeners() {
    const paymentOptions = document.querySelectorAll('input[name="paymentMethod"]');
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            document.getElementById('card-form').style.display = this.value === 'card' ? 'block' : 'none';
            document.getElementById('upi-form').style.display = this.value === 'upi' ? 'block' : 'none';
            document.getElementById('netbanking-form').style.display = this.value === 'netbanking' ? 'block' : 'none';
            document.getElementById('wallet-form').style.display = this.value === 'wallet' ? 'block' : 'none';
        });
    });
}

// Setup input restrictions
function setupInputRestrictions() {
    // Postal code - numbers only
    const zipInput = document.getElementById('zip');
    if (zipInput) {
        zipInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
    
    // Card number - numbers only
    const cardNumber = document.getElementById('cardNumber');
    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            let formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
            e.target.value = formattedValue;
        });
    }
    
    // CVV - numbers only
    const cardCvv = document.getElementById('cardCvv');
    if (cardCvv) {
        cardCvv.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
}

// Update city and state based on country
function updateCityState() {
    const country = document.getElementById('country').value.toLowerCase();
    const citySelect = document.getElementById('city');
    const stateSelect = document.getElementById('state');
    
    // Clear existing options
    citySelect.innerHTML = '<option value="">Select city</option>';
    stateSelect.innerHTML = '<option value="">Select state</option>';
    
    if (!country || !locationData[country]) {
        citySelect.disabled = true;
        stateSelect.disabled = true;
        return;
    }
    
    const data = locationData[country];
    
    // Populate states
    data.states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
    
    stateSelect.disabled = false;
    
    // Update cities when state changes
    stateSelect.addEventListener('change', function() {
        const state = this.value;
        citySelect.innerHTML = '<option value="">Select city</option>';
        
        if (state && data.cities[state]) {
            data.cities[state].forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
            citySelect.disabled = false;
        } else {
            citySelect.disabled = true;
        }
    }, { once: true });
}

