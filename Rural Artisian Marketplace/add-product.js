//Categories data
const categories = [
  { id: 'men-fashion', name: 'Men Fashion', icon: '👔' },
  { id: 'women-fashion', name: 'Women Fashion', icon: '👗' },
  { id: 'handicraft', name: 'Handicraft', icon: '👜' },
  { id: 'pottery', name: 'Pottery', icon: '🏺' },
  { id: 'wooden-furniture', name: 'Wooden Furniture', icon: '🪑' },
  { id: 'toys', name: 'Toys', icon: '🚗' },
  { id: 'ornaments', name: 'Ornaments', icon: '📿' },
  { id: 'grains', name: 'Grains', icon: '🌾' },
  { id: 'herbs', name: 'Herbs', icon: '🌿' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' }
];

// State
let selectedCategory = null;
let uploadedPhotos = [];
let uploadedVideo = null;
let calcValue = '0';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  loadProducts();
  setupEventListeners();
});

// Render categories
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = categories.map(cat => `
    <div class="category-item" data-id="${cat.id}" onclick="selectCategory('${cat.id}')">
      <span style="font-size: 32px; margin-bottom: 8px;">${cat.icon}</span>
      <span>${cat.name}</span>
    </div>
  `).join('');
}

// Select category
function selectCategory(id) {
  selectedCategory = id;
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === id);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Photo input
  document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
  
  // Video input
  document.getElementById('videoInput').addEventListener('change', handleVideoUpload);
  
  // Show media button
  document.getElementById('showMediaBtn').addEventListener('click', openMediaPreview);
  
  // Close modal
  document.getElementById('closeModal').addEventListener('click', closeMediaPreview);
  
  // Close modals on outside click
  document.getElementById('mediaPreviewModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMediaPreview();
  });
  
  document.getElementById('calculatorModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCalculator();
  });
  
  // Mic button
  document.getElementById('micBtn').addEventListener('click', startSpeechRecognition);
  
  // Publish button
  document.getElementById('publishBtn').addEventListener('click', publishProduct);
}

// Handle photo upload
function handlePhotoUpload(e) {
  const files = Array.from(e.target.files);
  
  if (uploadedPhotos.length + files.length > 3) {
    alert('Maximum 3 photos allowed');
    return;
  }
  
  files.forEach(file => {
    if (uploadedPhotos.length < 3) {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPhotos.push(event.target.result);
        updateUploadBoxStatus();
      };
      reader.readAsDataURL(file);
    }
  });
}

// Handle video upload
function handleVideoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedVideo = event.target.result;
      updateUploadBoxStatus();
    };
    reader.readAsDataURL(file);
  }
}

// Update upload box status
function updateUploadBoxStatus() {
  const photoBox = document.getElementById('photoUploadBox');
  const videoBox = document.getElementById('videoUploadBox');
  
  photoBox.classList.toggle('has-media', uploadedPhotos.length > 0);
  videoBox.classList.toggle('has-media', uploadedVideo !== null);
}

// Open media preview
function openMediaPreview() {
  const modal = document.getElementById('mediaPreviewModal');
  const grid = document.getElementById('previewGrid');
  
  let content = '';
  
  if (uploadedPhotos.length === 0 && !uploadedVideo) {
    content = '<p class="no-media">No media uploaded yet</p>';
  } else {
    uploadedPhotos.forEach((photo, index) => {
      content += `<div class="preview-item"><img src="${photo}" alt="Photo ${index + 1}"></div>`;
    });
    
    if (uploadedVideo) {
      content += `<div class="preview-item"><video src="${uploadedVideo}" controls></video></div>`;
    }
  }
  
  grid.innerHTML = content;
  modal.classList.add('active');
}

// Close media preview
function closeMediaPreview() {
  document.getElementById('mediaPreviewModal').classList.remove('active');
}

// Text-to-speech
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Text-to-speech not supported in your browser');
  }
}

// Speech recognition
function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('Speech recognition not supported. Please use Chrome browser.');
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  const micBtn = document.getElementById('micBtn');
  const productNameInput = document.getElementById('productName');
  
  recognition.onstart = () => {
    micBtn.classList.add('listening');
  };
  
  recognition.onend = () => {
    micBtn.classList.remove('listening');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    productNameInput.value = transcript;
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    micBtn.classList.remove('listening');
  };
  
  recognition.start();
}

// Calculator functions
function openCalculator() {
  calcValue = document.getElementById('productPrice').value.replace('₹', '').trim() || '0';
  document.getElementById('calcDisplay').textContent = calcValue;
  document.getElementById('calculatorModal').classList.add('active');
}

function closeCalculator() {
  document.getElementById('calculatorModal').classList.remove('active');
}

function appendCalc(num) {
  if (calcValue === '0' && num !== '.') {
    calcValue = num;
  } else if (num === '.' && calcValue.includes('.')) {
    return;
  } else {
    calcValue += num;
  }
  document.getElementById('calcDisplay').textContent = calcValue;
}

function clearCalc() {
  calcValue = '0';
  document.getElementById('calcDisplay').textContent = calcValue;
}

function backspaceCalc() {
  calcValue = calcValue.slice(0, -1) || '0';
  document.getElementById('calcDisplay').textContent = calcValue;
}

function confirmPrice() {
  document.getElementById('productPrice').value = '₹' + calcValue;
  closeCalculator();
}

// Publish product
function publishProduct() {
  const name = document.getElementById('productName').value.trim();
  const price = document.getElementById('productPrice').value.trim();
  
  if (!name) {
    alert('Please enter product name');
    return;
  }
  
  if (!price) {
    alert('Please enter product price');
    return;
  }
  
  if (!selectedCategory) {
    alert('Please select a category');
    return;
  }
  
  const product = {
    id: Date.now(),
    name,
    price,
    category: selectedCategory,
    categoryName: categories.find(c => c.id === selectedCategory)?.name || '',
    photos: [...uploadedPhotos],
    video: uploadedVideo,
    createdAt: new Date().toISOString()
  };
  
  // Save to localStorage
  const products = JSON.parse(localStorage.getItem('ruralconnect_products') || '[]');
  products.unshift(product);
  localStorage.setItem('ruralconnect_products', JSON.stringify(products));
  
  // Reset form
  resetForm();
  
  // Reload products
  loadProducts();
  
  alert('Product published successfully!');
}

// Reset form
function resetForm() {
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  selectedCategory = null;
  uploadedPhotos = [];
  uploadedVideo = null;
  
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  updateUploadBoxStatus();
  
  document.getElementById('photoInput').value = '';
  document.getElementById('videoInput').value = '';
}

// Load products from localStorage
function loadProducts() {
  const products = JSON.parse(localStorage.getItem('ruralconnect_products') || '[]');
  const section = document.getElementById('productsSection');
  const grid = document.getElementById('productsGrid');
  
  if (products.length === 0) {
    section.classList.remove('has-products');
    return;
  }
  
  section.classList.add('has-products');
  
  grid.innerHTML = products.map(product => `
    <div class="product-card">
      ${product.photos.length > 0 
        ? `<img class="product-image" src="${product.photos[0]}" alt="${product.name}">`
        : `<div class="product-image" style="display: flex; align-items: center; justify-content: center; font-size: 48px;">${categories.find(c => c.id === product.category)?.icon || '📦'}</div>`
      }
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-category">${product.categoryName}</p>
        <p class="product-price">${product.price}</p>
        <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete product
function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  const products = JSON.parse(localStorage.getItem('ruralconnect_products') || '[]');
  const filtered = products.filter(p => p.id !== id);
  localStorage.setItem('ruralconnect_products', JSON.stringify(filtered));
  loadProducts();
}
