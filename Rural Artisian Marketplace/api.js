const RuralAPI = (() => {
  const BASE      = "http://localhost:5000";
  const TOKEN_KEY  = "rc_seller_token";
  const SELLER_KEY = "rc_seller_info";

  function token() { return localStorage.getItem(TOKEN_KEY); }

  function headers() {
    const h = { "Content-Type": "application/json" };
    if (token()) h["Authorization"] = `Bearer ${token()}`;
    return h;
  }

  async function req(method, path, body) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (err) {
      throw new Error("Cannot connect to server. Is the backend running?");
    }
    
    const data = await res.json();

    // ✅ Check both HTTP error and success:false
    if (!res.ok) throw new Error(data.detail || data.message || "Request failed");
    if (data.success === false) throw new Error(data.message || "Request failed");

    return data;
  }

  // ── Auth ──────────────────────────────────────────────
  async function register(data) {
    const resp = await req("POST", "/api/seller/register", data);
    localStorage.setItem(TOKEN_KEY,  resp.token);
    localStorage.setItem(SELLER_KEY, JSON.stringify(resp.seller));
    return resp;
  }

  async function login(phone, password) {
    const resp = await req("POST", "/api/seller/login", { phone, password });
    localStorage.setItem(TOKEN_KEY,  resp.token);
    localStorage.setItem(SELLER_KEY, JSON.stringify(resp.seller));
    return resp;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SELLER_KEY);
  }

  async function getMe() { return req("GET", "/api/seller/me"); }

  function isLoggedIn() { return !!token(); }

  function getSeller() {
    const raw = localStorage.getItem(SELLER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  // ── Products ──────────────────────────────────────────
  async function addProduct(data)     { return req("POST",   "/api/products",      data); }
  async function addProductsBulk(arr) { return req("POST",   "/api/products/bulk", arr);  }
  async function getMyProducts()      { return req("GET",    "/api/products/seller");     }
  async function getProducts(pageKey) {
    const qs = pageKey ? `?page_key=${encodeURIComponent(pageKey)}` : "";
    return req("GET", `/api/products${qs}`);
  }
  async function deleteProduct(id)    { return req("DELETE", `/api/products/${id}`);      }

  return {
    register, login, logout, getMe, isLoggedIn, getSeller,
    addProduct, addProductsBulk, getMyProducts, getProducts, deleteProduct
  };
})();
