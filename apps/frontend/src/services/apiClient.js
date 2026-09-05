/**
 * DealFlow360 Centralized Backend API Client
 * Connects directly to the NestJS PostgreSQL backend at http://localhost:4000
 * Handles JWT authentication, automatic token refresh, and endpoints:
 * - Health probe
 * - User Management (Admin)
 * - Products & Catalog
 * - Customers Master
 * - Discount Governance & Rules
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'dealflow_token';

let cachedToken = null;

async function getValidToken() {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && !savedToken.startsWith('demo_')) {
      return savedToken;
    }
  }

  if (cachedToken) return cachedToken;

  // Auto-acquire valid token from backend for seamless developer & client demo flow
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dealflow.com', password: '123456' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        cachedToken = data.accessToken;
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.accessToken);
        }
        return cachedToken;
      }
    }
  } catch (err) {
    console.warn('Could not auto-login to backend:', err.message);
  }
  return null;
}

async function apiRequest(endpoint, options = {}) {
  const token = await getValidToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Try re-authenticating once if token expired
    cachedToken = null;
    const newToken = await getValidToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${retryResponse.status}`);
      }
      return retryResponse.json();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

export const apiClient = {
  // ==================== Health ====================
  async getHealth() {
    return apiRequest('/api/health');
  },

  // ==================== Users (Admin) ====================
  async getUsers(role = '') {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const res = await apiRequest(`/api/users${query}`);
    return res.users || res.data || [];
  },

  async getUser(id) {
    const res = await apiRequest(`/api/users/${id}`);
    return res.user || res;
  },

  async createUser(userData) {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id, updateData) {
    return apiRequest(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async deleteUser(id) {
    return apiRequest(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // ==================== Products & Catalog ====================
  async getProducts(params = {}) {
    const q = new URLSearchParams();
    if (params.category && params.category !== 'ALL') q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/products${queryString}`);
    return res.products || res.data || [];
  },

  async getProduct(id) {
    const res = await apiRequest(`/api/products/${id}`);
    return res.product || res;
  },

  async createProduct(productData) {
    return apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(id, updateData) {
    return apiRequest(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async deleteProduct(id) {
    return apiRequest(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  async addVariant(productId, variantData) {
    return apiRequest(`/api/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variantData),
    });
  },

  async deleteVariant(productId, variantId) {
    return apiRequest(`/api/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  },

  // ==================== Customers Master ====================
  async getCustomers(params = {}) {
    const q = new URLSearchParams();
    if (params.tier && params.tier !== 'ALL') q.set('tier', params.tier);
    if (params.search) q.set('search', params.search);
    if (params.assignedRepId) q.set('assignedRepId', params.assignedRepId);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/customers${queryString}`);
    return res.customers || res.data || [];
  },

  async getCustomer(id) {
    const res = await apiRequest(`/api/customers/${id}`);
    return res.customer || res;
  },

  async createCustomer(customerData) {
    return apiRequest('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  async updateCustomer(id, updateData) {
    return apiRequest(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async deleteCustomer(id) {
    return apiRequest(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  },

  // ==================== Discount Governance & Rules ====================
  async getDiscountRules() {
    const res = await apiRequest('/api/config/discount-rules');
    return res.rules || res;
  },

  async updateTierCeiling(tier, maxDiscount) {
    return apiRequest('/api/config/discount-rules/tier', {
      method: 'PUT',
      body: JSON.stringify({ tier, maxDiscount: Number(maxDiscount) }),
    });
  },

  async updateCategoryCeiling(category, maxDiscount) {
    return apiRequest('/api/config/discount-rules/category', {
      method: 'PUT',
      body: JSON.stringify({ category, maxDiscount: Number(maxDiscount) }),
    });
  },

  async updateApprovalMatrix(ruleData) {
    return apiRequest('/api/config/discount-rules/approval-matrix', {
      method: 'PUT',
      body: JSON.stringify(ruleData),
    });
  },

  async validateDiscountLine(data) {
    return apiRequest('/api/config/discount-rules/validate-line', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async calculateBlendedRisk(data) {
    return apiRequest('/api/config/discount-rules/calculate-blended-risk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ==================== Warehouses & Stock ====================
  async getWarehouses() {
    const res = await apiRequest('/api/warehouses');
    return res.warehouses || res.data || [];
  },

  async getWarehouse(id) {
    const res = await apiRequest(`/api/warehouses/${id}`);
    return res.warehouse || res;
  },

  async createWarehouse(facilityData) {
    return apiRequest('/api/warehouses', {
      method: 'POST',
      body: JSON.stringify(facilityData),
    });
  },

  async updateWarehouse(id, updateData) {
    return apiRequest(`/api/warehouses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async deleteWarehouse(id) {
    return apiRequest(`/api/warehouses/${id}`, {
      method: 'DELETE',
    });
  },

  async adjustStock(stockData) {
    return apiRequest('/api/warehouses/stock-adjustment', {
      method: 'POST',
      body: JSON.stringify(stockData),
    });
  },

  async setReplenishmentRule(ruleData) {
    return apiRequest('/api/warehouses/replenishment-rule', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    });
  },

  // ==================== AI Recommendation Engine ====================
  async getCartRecommendations(productIds) {
    return apiRequest('/api/config/upsell-rules/cart-recommendations', {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    });
  },

  // ==================== Deal Health & Analytics (Screen 14 / B9) ====================
  async getDealHealth() {
    return apiRequest('/api/analytics/deal-health');
  },

  async nudgeRep(data) {
    return apiRequest('/api/analytics/nudge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReports(filter = {}) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/analytics/reports${qs}`);
  },
};

