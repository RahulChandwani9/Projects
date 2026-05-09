/**
 * products-loader.js  (FIXED)
 * ──────────────────
 * Add to every category page (pottery.html, bamboo.html, etc.)
 * AFTER api.js.
 *
 * Usage in your category HTML:
 *   1. Set the page key on the <body> tag:
 *      <body data-page-key="pottery">
 *
 *   OR pass it manually:
 *      window.RC_PAGE_KEY = "pottery";
 *
 *   Page key must match one of:
 *     mensfashion, womensfashion, bamboo, pottery, handloom,
 *     jewelry, leather, metalcraft, painting, wooden
 *
 * Cards will be injected into the existing products grid so they look
 * identical to the hardcoded product cards on the page.
 */

(function () {
  const PAGE_KEY = window.RC_PAGE_KEY
    || document.body.getAttribute('data-page-key')
    || '';

  const isAllProducts = PAGE_KEY === 'all';

  if (!PAGE_KEY) {
    console.warn('products-loader.js: No page key found. Set data-page-key on <body> or window.RC_PAGE_KEY.');
    return;
  }

  // ── openProduct: defined early so it is always available ─────────────────
  // Uses encodeURIComponent for ALL string params — safe against any character.
  if (typeof window.openProduct !== 'function') {
    window.openProduct = function (id, name, price, desc, img) {
      const url = 'product-details.html'
        + '?id='    + id
        + '&name='  + encodeURIComponent(name)
        + '&price=' + price
        + '&desc='  + encodeURIComponent(desc)
        + '&img='   + encodeURIComponent(img);
      window.location.href = url;
    };
  }

  // ── Robust image URL resolver ─────────────────────────────────────────────
  // DB stores paths like: /uploads/<uuid>.png
  // Django serves them at: http://127.0.0.1:8000/uploads/<uuid>.png
  //                    OR: http://127.0.0.1:8000/media/uploads/<uuid>.png
  // We extract the Django origin from RuralAPI.BASE_URL (strips /api suffix).
  // RC_MEDIA_ROOT can be set on window to override if your MEDIA_URL differs.
  function resolveImageUrl(image_url) {
    if (!image_url) return null;
    if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
      return image_url; // already absolute — nothing to do
    }

    // 1. Find the Django origin (host + port, no path)
    let djangoOrigin = window.RC_DJANGO_ORIGIN || 'http://127.0.0.1:8000';
    if (typeof RuralAPI !== 'undefined') {
      const candidate = RuralAPI.BASE_URL
        || RuralAPI.baseUrl
        || RuralAPI.base
        || RuralAPI.apiBase
        || RuralAPI.API_URL
        || RuralAPI.host
        || null;
      if (candidate && typeof candidate === 'string') {
        try {
          // Parse the URL and use only origin (scheme + host + port)
          djangoOrigin = new URL(candidate).origin;
        } catch (_) {
          // Fallback: strip path manually
          djangoOrigin = candidate.replace(/\/api(\/v\d+)?\/?$/, '').replace(/\/[^/]*$/, '').replace(/\/$/, '');
        }
      }
    }

    // 2. Ensure path has a leading slash
    const path = image_url.startsWith('/') ? image_url : '/' + image_url;

    // 3. Build the final URL
    const resolved = djangoOrigin + path;
    return resolved;
  }

  // ── One-time debug helper (runs only in development / localhost) ──────────
  // Open browser console → you'll see: "[RC] Image URL resolved: ..."
  // This helps confirm the resolver is pointing at the right server.
  function debugImageUrl(raw, resolved) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[RuralConnect] Image path from DB:', raw, '→ resolved:', resolved);
    }
  }

  // ── Styles exactly match .p-card / .buy-btn from style.css ───────────────
  function injectStyles() {
    if (document.getElementById('sps-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'sps-injected-styles';
    style.textContent = `
      .sps-card {
        border: 1px solid #ddd;
        padding: 10px;
        width: 250px;
        text-align: center;
        background: var(--brown, #644234);
        border-radius: 15px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        font-family: 'Georgia', sans-serif;
        display: flex;
        flex-direction: column;
        cursor: pointer;
      }
      .sps-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      }
      .sps-card-img {
        width: 100%;
        height: 180px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--brown, #644234);
        border-radius: 13px;
        background: var(--light-beige, #E6D5CE);
        position: relative;
      }
      .sps-card-img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 13px;
      }
      .sps-placeholder {
        font-size: 48px;
        opacity: 0.5;
      }
      .sps-card-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        flex: 1;
      }
      .sps-card-name {
        font-size: 17px;
        font-weight: 500;
        margin: 10px 0;
        height: 35px;
        overflow: hidden;
        color: var(--light-beige, #E6D5CE);
      }
      .sps-card-price {
        font-weight: bold;
        font-size: 18px;
        color: var(--light-beige, #E6D5CE);
      }
      .sps-card-stock {
        font-size: 0.73rem;
        color: #a8e6a3;
        margin-top: 2px;
      }
      .sps-artisan-badge {
        display: inline-block;
        font-size: 0.68rem;
        background: rgba(255,255,255,0.15);
        color: var(--light-beige, #E6D5CE);
        border-radius: 20px;
        padding: 2px 10px;
        margin-top: 6px;
        font-weight: 500;
        letter-spacing: 0.4px;
      }
      .sps-buy-btn {
        color: var(--brown, #644234);
        width: 100%;
        background: var(--light-beige, #E6D5CE);
        border: none;
        padding: 8px;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 10px;
        font-weight: bold;
        font-family: 'Georgia', sans-serif;
        font-size: 14px;
        transition: all 0.3s ease;
      }
      .sps-buy-btn:hover {
        background: var(--accent, #f2d9c4);
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
  }
  
function resolveImageUrl(imagePath) {
  if (!imagePath) return '';

  // If already full URL
  if (imagePath.startsWith('http')) return imagePath;

  // If DB already gives /uploads/...
  if (imagePath.startsWith('/uploads')) {
    return `http://localhost:5000${imagePath}`;
  }

  // Otherwise
  return `http://localhost:5000/uploads/${imagePath}`;
}

  // ── FIX: buildCard stores all data in data-* attributes ──────────────────
  // This completely avoids the inline-onclick string-escaping bug.
  // Any character in name/description (apostrophes, quotes, backslashes,
  // HTML entities) is handled safely by the DOM — no manual escaping needed.
  function buildCard(p) {
    const imgUrl = resolveImageUrl(p.image_url) || '';
    debugImageUrl(p.image_url, imgUrl);
    const pid    = p.id    || 0;
    const price  = p.price ? Number(p.price) : 0;
    const name   = p.name        || '';
    const desc   = p.description || '';

    const imgHTML = imgUrl
      ? `<img
           src="${imgUrl}"
           alt="${name.replace(/"/g, '&quot;')}"
           loading="lazy"
           onerror="this.style.display='none';this.parentElement.querySelector('.sps-placeholder').style.display='flex';"
         >
         <span class="sps-placeholder" style="display:none;">🧺</span>`
      : `<span class="sps-placeholder">🧺</span>`;

    // ── Key fix: data attributes hold raw values; JS reads them at click time
    const div = document.createElement('div');
    div.className = 'sps-card';
    div.dataset.pid   = pid;
    div.dataset.name  = name;
    div.dataset.price = price;
    div.dataset.desc  = desc;
    div.dataset.img   = imgUrl;

    div.innerHTML = `
      <div class="sps-card-img">${imgHTML}</div>
      <div class="sps-card-body">
        <h3 class="sps-card-name">${name}</h3>
        ${price ? `<div class="sps-card-price">&#8377;${price}</div>` : ''}
        <button class="sps-buy-btn">Buy Now</button>
      </div>
    `;

    // Attach the click handler via addEventListener — no inline string eval
    div.querySelector('.sps-buy-btn').addEventListener('click', function (e) {
      e.stopPropagation(); // prevent card-level click if any
      const card = this.closest('.sps-card');
      openProduct(
        card.dataset.pid,
        card.dataset.name,
        card.dataset.price,
        card.dataset.desc,
        card.dataset.img
      );
    });

    return div; // returns a real DOM element, not an HTML string
  }

  document.addEventListener('DOMContentLoaded', loadProducts);

  async function loadProducts() {
    injectStyles();

    try {
      const { products, total } = await RuralAPI.getProducts(isAllProducts ? null : PAGE_KEY);
      if (!total) return;

      // Build DOM nodes (not raw HTML strings) — safe for all characters
      const fragment = document.createDocumentFragment();
      products.forEach(p => fragment.appendChild(buildCard(p)));

      // ── Strategy 1: inject into the existing products grid ───────────────
      const grid = document.querySelector(
        '.products-grid, .product-grid, .items-grid, .product-list,' +
        '.cards-grid, .product-cards, .grid-container,' +
        '[class*="product"][class*="grid"], [class*="grid"][class*="product"]'
      );
      if (grid) {
        grid.prepend(fragment);
        return;
      }

      // ── Strategy 2: explicit placeholder ─────────────────────────────────
      const explicit = document.getElementById('seller-products-section');
      if (explicit) {
        explicit.innerHTML = '';
        explicit.appendChild(fragment);
        return;
      }

      // ── Strategy 3: find main content area (skip sidebar/nav) ────────────
      const mainEl = Array.from(document.querySelectorAll(
        'main, .main-content, .content-area, .page-content, .category-main, .products-wrapper'
      )).find(el => {
        const cls = (el.className || '').toLowerCase();
        return !cls.includes('sidebar') && !cls.includes('nav') && !cls.includes('filter');
      });

      const mountTarget = mainEl || document.body;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-start;gap:45px;padding:25px;width:100%;';
      wrapper.appendChild(fragment);

      const sidebar = mountTarget.querySelector('.sidebar, [class*="sidebar"], aside');
      if (sidebar) {
        sidebar.insertAdjacentElement('afterend', wrapper);
      } else {
        mountTarget.prepend(wrapper);
      }

    } catch (e) {
      console.warn('products-loader: Failed to load products.', e.message);
    }
  }
})();