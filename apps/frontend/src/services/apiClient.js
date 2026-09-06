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
const REFRESH_KEY = 'dealflow_refresh_token';

let cachedToken = null;

function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const jsonStr = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    // Consider expired if less than 15 seconds remaining
    return Date.now() >= payload.exp * 1000 - 15000;
  } catch {
    return false;
  }
}

async function getValidToken() {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && !savedToken.startsWith('demo_') && !isTokenExpired(savedToken)) {
      return savedToken;
    }
  }

  if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;

  // Try refreshing with refresh token if available
  if (typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken && !refreshToken.startsWith('demo_')) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.accessToken) {
            cachedToken = data.accessToken;
            localStorage.setItem(TOKEN_KEY, data.accessToken);
            if (data.refreshToken) {
              localStorage.setItem(REFRESH_KEY, data.refreshToken);
            }
            return cachedToken;
          }
        }
      } catch (e) {
        // Fallback to fresh login
      }
    }
  }

  // Only auto-acquire token if no user is already signed in
  if (typeof window !== 'undefined') {
    const savedUserStr = localStorage.getItem('dealflow_user');
    if (savedUserStr) {
      // User is logged in; do not overwrite their session with admin!
      return null;
    }
  }

  // Auto-acquire valid token from backend for developer / guest flow
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
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_KEY, data.refreshToken);
          }
        }
        return cachedToken;
      }
    }
  } catch (err) {
    console.warn('Could not auto-login to backend:', err.message);
  }
  return null;
}

async function parseResponseSafe(response) {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { success: true };
  }
  const text = await response.text().catch(() => '');
  if (!text || !text.trim()) {
    return { success: true };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { success: true, message: text };
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = await getValidToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    console.warn(`Network error fetching ${endpoint}:`, networkErr);
    throw networkErr;
  }

  if (response.status === 401) {
    // Stale or expired token -> clear and retry once
    cachedToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    const newToken = await getValidToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const errorData = await parseResponseSafe(retryResponse);
        const message = Array.isArray(errorData?.message)
          ? errorData.message.join(', ')
          : errorData?.message || `Request failed with status ${retryResponse.status}`;
        throw new Error(message);
      }
      return parseResponseSafe(retryResponse);
    }
  }

  if (!response.ok) {
    const errorData = await parseResponseSafe(response);
    const message = Array.isArray(errorData?.message)
      ? errorData.message.join(', ')
      : errorData?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parseResponseSafe(response);
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
    return Array.isArray(res) ? res : res.products || res.data || [];
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
    return Array.isArray(res) ? res : res.customers || res.data || [];
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

  async getCuratedUpsells(baseProductId) {
    const query = baseProductId ? `?baseProductId=${encodeURIComponent(baseProductId)}` : '';
    return apiRequest(`/api/config/upsell-rules/curated/list${query}`);
  },

  async createCuratedUpsell(data) {
    return apiRequest('/api/config/upsell-rules/curated', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCuratedUpsell(id) {
    return apiRequest(`/api/config/upsell-rules/curated/${id}`, {
      method: 'DELETE',
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

  // ==================== Invoices & Payments ====================
  async getInvoices(params = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.customerId) q.set('customerId', params.customerId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/invoices${qs}`);
    return Array.isArray(res) ? res : res.invoices || [];
  },

  async getInvoice(id) {
    const res = await apiRequest(`/api/invoices/${id}`);
    return res.invoice || res;
  },

  async payInvoice(id, paymentData = {}) {
    return apiRequest(`/api/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  async generateInvoicesFromQuotation(quotationId) {
    return apiRequest(`/api/invoices/generate-from-quotation/${quotationId}`, {
      method: 'POST',
    });
  },

  // ==================== Subscriptions & Proration ====================
  async getSubscriptions(params = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.customerId) q.set('customerId', params.customerId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/subscriptions${qs}`);
    return Array.isArray(res) ? res : res.subscriptions || [];
  },

  async getSubscription(id) {
    const res = await apiRequest(`/api/subscriptions/${id}`);
    return res.subscription || res;
  },

  async pauseSubscription(id) {
    return apiRequest(`/api/subscriptions/${id}/pause`, { method: 'POST' });
  },

  async resumeSubscription(id) {
    return apiRequest(`/api/subscriptions/${id}/resume`, { method: 'POST' });
  },

  async cancelSubscription(id, reason = '') {
    return apiRequest(`/api/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async adjustSubscriptionQuantity(id, newQuantity, reason = '') {
    return apiRequest(`/api/subscriptions/${id}/adjust-quantity`, {
      method: 'POST',
      body: JSON.stringify({ newQuantity: Number(newQuantity), reason }),
    });
  },

  async createSubscription(data) {
    return apiRequest('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customerId: data.customerId,
        quotationId: data.quotationId,
        planName: data.planName,
        cycle: data.cycle || 'MONTHLY',
        amount: Number(data.amount),
      }),
    });
  },

  // ==================== Fulfillments & Multi-Warehouse Split ====================
  async getFulfillments(params = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.hasBackorder !== undefined) q.set('hasBackorder', String(params.hasBackorder));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/fulfillments${qs}`);
    return Array.isArray(res) ? res : res.fulfillments || [];
  },

  async getFulfillment(id) {
    const res = await apiRequest(`/api/fulfillments/${id}`);
    return res.fulfillment || res;
  },

  async splitQuotation(quotationId) {
    return apiRequest(`/api/fulfillments/${quotationId}/split`, { method: 'POST' });
  },

  async dispatchFulfillment(id, trackingNumber = '') {
    return apiRequest(`/api/fulfillments/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ trackingNumber: trackingNumber || `TRK-${Date.now().toString().slice(-8)}` }),
    });
  },

  async consolidateBackorders(id) {
    return apiRequest(`/api/fulfillments/${id}/consolidate-backorder`, { method: 'POST' });
  },

  async proposeShortage(id, proposedQuantity) {
    return apiRequest(`/api/fulfillments/${id}/propose-shortage`, {
      method: 'POST',
      body: JSON.stringify({ proposedQuantity: Number(proposedQuantity) }),
    });
  },

  // ==================== Quotations & Approvals ====================
  async getQuotations(params = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.customerId) q.set('customerId', params.customerId);
    if (params.salesRepId) q.set('salesRepId', params.salesRepId);
    if (params.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/quotations${qs}`);
    const list = Array.isArray(res) ? res : res.quotations || [];
    return list.map((item) => ({
      ...item,
      customerName: item.customerName || item.customer?.name || item.customer?.companyName || 'Direct Client',
      customerEmail: item.customerEmail || item.customer?.email || '',
      customerTier: item.customerTier || item.customer?.tier || 'BRONZE',
      salesRepName: item.salesRepName || item.salesRep?.fullName || item.salesRep?.email || 'Direct Sales Rep',
      currentStage: item.currentStage || item.approvalRequests?.[0]?.currentStage || (item.blendedRiskScore === 'HIGH' ? 'FINANCE' : 'SALES_MANAGER'),
    }));
  },

  async getPipeline(params = {}) {
    const q = new URLSearchParams();
    if (params.salesRepId) q.set('salesRepId', params.salesRepId);
    if (params.customerId) q.set('customerId', params.customerId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/quotations/pipeline${qs}`);
  },

  async getQuotation(id) {
    const res = await apiRequest(`/api/quotations/${id}`);
    const quote = res.quotation || res;

    // Normalize audit logs from quote.auditLogs or approvalRequests
    const rawAuditLogs = (quote.auditLogs && Array.isArray(quote.auditLogs))
      ? quote.auditLogs
      : (quote.approvalRequests || []).flatMap((ar) =>
          (ar.auditLogs || []).map((log) => ({
            id: log.id,
            approvalRequestId: ar.id,
            actorName: log.user?.fullName || log.actorName || 'Internal Reviewer',
            actorRole: log.user?.role || log.actorRole || ar.currentStage || 'SYSTEM',
            action: log.action,
            comment: log.note || log.comment || `Action: ${log.action}`,
            note: log.note || log.comment,
            timestamp: log.createdAt || log.timestamp,
            createdAt: log.createdAt || log.timestamp,
            stage: ar.currentStage,
            riskLevel: ar.blendedRiskLevel,
          }))
        );

    const comments = (quote.comments || []).map((c) => ({
      id: c.id,
      authorName: c.authorName || 'Participant',
      authorRole: c.authorRole || 'USER',
      message: c.message || '',
      createdAt: c.createdAt,
      timestamp: c.createdAt,
      quotationLineId: c.quotationLineId,
    }));

    return {
      ...quote,
      auditLogs: rawAuditLogs,
      comments,
      customerName: quote.customerName || quote.customer?.name || quote.customer?.companyName || 'Direct Client',
      customerEmail: quote.customerEmail || quote.customer?.email || '',
      customerTier: quote.customerTier || quote.customer?.tier || 'BRONZE',
      salesRepName: quote.salesRepName || quote.salesRep?.fullName || quote.salesRep?.email || 'Direct Sales Rep',
      currentStage: quote.currentStage || quote.approvalRequests?.[0]?.currentStage || (quote.blendedRiskScore === 'HIGH' ? 'FINANCE' : 'SALES_MANAGER'),
    };
  },

  async getQuotationComments(id) {
    return apiRequest(`/api/quotations/${id}/comments`);
  },

  async addQuotationComment(id, message, quotationLineId = undefined) {
    return apiRequest(`/api/quotations/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message, quotationLineId }),
    });
  },

  async createQuotation(data) {
    return apiRequest('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitQuotation(id, note = '') {
    return apiRequest(`/api/quotations/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes: note || undefined }),
    });
  },

  async approveQuotation(id, note = '') {
    return apiRequest(`/api/quotations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async rejectQuotation(id, reason = '') {
    return apiRequest(`/api/quotations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async confirmQuotation(id) {
    return apiRequest(`/api/quotations/${id}/confirm`, {
      method: 'POST',
    });
  },

  async updateQuotationStatus(id, status) {
    return apiRequest(`/api/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async upsellQuotation(id, lineData) {
    return apiRequest(`/api/quotations/${id}/lines/upsell`, {
      method: 'POST',
      body: JSON.stringify(lineData),
    });
  },

  // ==================== Approvals Queue ====================
  async getApprovalsQueue(params = {}) {
    const q = new URLSearchParams();
    if (params.stage) q.set('stage', params.stage);
    if (params.riskLevel) q.set('riskLevel', params.riskLevel);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest(`/api/approvals/queue${qs}`);
    return Array.isArray(res) ? res : res.queue || [];
  },

  async actionApproval(id, action, note = '') {
    return apiRequest(`/api/approvals/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },

  // ==================== Exports ====================
  getExportUrl(type) {
    return `${API_URL}/api/analytics/export/${type}`;
  },

  async downloadExport(type = 'csv') {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const res = await fetch(`${API_URL}/api/analytics/export/${type}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Export failed with status: ${res.status}`);
    }
    if (type === 'pdf') {
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const printWin = window.open(url, '_blank');
      if (!printWin) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `dealflow360_pipeline_export_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealflow360_pipeline_export_${Date.now()}.${type === 'xls' ? 'xls' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ==================== Customer Self-Service Portal ====================
  async getPortalQuotes() {
    const res = await apiRequest('/api/portal/quotes');
    return Array.isArray(res) ? res : res.quotes || [];
  },

  async getPortalQuote(token) {
    return apiRequest(`/api/portal/quote/${token}`);
  },

  async acceptPortalQuote(token, dto = {}) {
    return apiRequest(`/api/portal/quote/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async counterPortalQuote(token, dto = {}) {
    return apiRequest(`/api/portal/quote/${token}/counter`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async commentPortalQuote(token, message) {
    return apiRequest(`/api/portal/quote/${token}/comment`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // ==================== Razorpay Payment Gateway ====================
  async createRazorpayOrder(invoiceId) {
    return apiRequest(`/api/invoices/${invoiceId}/razorpay/order`, {
      method: 'POST',
    });
  },

  async verifyRazorpayPayment(invoiceId, payload) {
    return apiRequest(`/api/invoices/${invoiceId}/razorpay/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ==================== Password Reset & Auth ====================
  async initiatePasswordReset(email) {
    const res = await fetch(`${API_URL}/api/auth/password-reset/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await parseResponseSafe(res);
    if (!res.ok) {
      const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to initiate password reset';
      throw new Error(msg);
    }
    return data;
  },

  async validatePasswordResetToken(token, email) {
    const params = new URLSearchParams({ token: token?.trim() });
    if (email) params.append('email', email.trim().toLowerCase());
    const res = await fetch(`${API_URL}/api/auth/password-reset/validate?${params.toString()}`);
    const data = await parseResponseSafe(res);
    if (!res.ok) {
      return {
        valid: false,
        message: Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Invalid or expired reset link',
      };
    }
    return data;
  },

  async verifyPasswordReset(payload) {
    const res = await fetch(`${API_URL}/api/auth/password-reset/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseResponseSafe(res);
    if (!res.ok) {
      const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to verify password reset';
      throw new Error(msg);
    }
    return data;
  },
};

export default apiClient;




