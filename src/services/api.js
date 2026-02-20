import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  Change BASE_URL to your server's local IP before testing on a device.
//     Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
//     Example: 'http://192.168.1.105:8000/api'
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_URL = 'https://apollo45.pythonanywhere.com/api/';

let _accessToken  = null;
let _refreshToken = null;

export const getToken = () => _accessToken;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
client.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && _refreshToken) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: _refreshToken,
        });
        _accessToken = data.access;
        original.headers.Authorization = `Bearer ${_accessToken}`;
        return client(original);
      } catch {
        _accessToken  = null;
        _refreshToken = null;
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const { data } = await client.post('/auth/login/', { username, password });
  _accessToken  = data.access;
  _refreshToken = data.refresh;
  return data;
};

// ── Tables ────────────────────────────────────────────────────────────────────
export const getTables = () =>
  client.get('/tables/').then(r => r.data.results ?? r.data);

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOpenOrders = () =>
  client.get('/orders/open/').then(r => r.data.results ?? r.data);

export const getOrder = (id) =>
  client.get(`/orders/${id}/`).then(r => r.data);

export const createOrder = (tableId) =>
  client.post('/orders/', { table: tableId }).then(r => r.data);

// ── Order Items ───────────────────────────────────────────────────────────────
export const addOrderItem = (orderId, productId, quantity = 1) =>
  client.post('/order-items/', { order: orderId, product: productId, quantity }).then(r => r.data);

export const updateOrderItem = (itemId, quantity) =>
  client.patch(`/order-items/${itemId}/`, { quantity }).then(r => r.data);

export const deleteOrderItem = (itemId) =>
  client.delete(`/order-items/${itemId}/`);

// ── Products & Categories ─────────────────────────────────────────────────────
export const getCategories = () =>
  client.get('/categories/').then(r => r.data.results ?? r.data);

export const getProducts = (params = {}) =>
  client.get('/products/', { params }).then(r => r.data.results ?? r.data);

export const createProduct = (data) =>
  client.post('/products/', data).then(r => r.data);

export const updateProduct = (id, data) =>
  client.patch(`/products/${id}/`, data).then(r => r.data);

export const createCategory = (data) =>
  client.post('/categories/', data).then(r => r.data);

export const deleteProduct = (id) => 
  client.delete(`/products/${id}/`); //

export const deleteCategory = (id) => 
  client.delete(`/categories/${id}/`); //


// ── Payments ──────────────────────────────────────────────────────────────────
export const createPayment = (orderId, amount, method) =>
  client.post('/payments/', {
    order: orderId,
    amount: String(amount),
    payment_method: method,
  }).then(r => r.data);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getDailyReport = (date) =>
  client.get('/reports/daily/', { params: { date } }).then(r => r.data);

export const getMonthlyReport = (year, month) =>
  client.get('/reports/monthly/', { params: { year, month } }).then(r => r.data);

// ── Error helper ──────────────────────────────────────────────────────────────
export const extractError = (err) => {
  const d = err?.response?.data;
  if (!d) return 'Sunucuya bağlanılamadı.';
  if (typeof d === 'string') return d;
  const first = Object.values(d)[0];
  if (Array.isArray(first)) return first[0];
  return JSON.stringify(d);
};
