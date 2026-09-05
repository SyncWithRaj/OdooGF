/**
 * DealFlow360 Quotations Service
 * 100% Dynamic Database Integration:
 * - All Quotations read directly from PostgreSQL via /api/quotations
 * - All Quotations created and patched directly in PostgreSQL
 * - Live Customers fetched from backend /api/customers
 * - Live Products fetched from backend /api/products
 * - Live Governance Ceilings fetched from backend /api/config/discount-rules
 * - Live Margin & Risk Engine computed via backend /api/config/discount-rules/calculate-blended-risk
 * - ZERO hardcoded static arrays in code.
 */

import { apiClient } from './apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'dealflow_token';

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const quotationsService = {
  // 1. Fetch live customers from PostgreSQL backend
  async getLiveCustomers() {
    try {
      return await apiClient.getCustomers();
    } catch (e) {
      console.error('getLiveCustomers error:', e);
      return [];
    }
  },

  // 2. Fetch live product catalog from PostgreSQL backend
  async getLiveProducts() {
    try {
      return await apiClient.getProducts();
    } catch (e) {
      console.error('getLiveProducts error:', e);
      return [];
    }
  },

  // 3. Fetch discount governance rules from PostgreSQL backend
  async getGovernanceRules() {
    try {
      return await apiClient.getDiscountRules();
    } catch (e) {
      console.error('getGovernanceRules error:', e);
      return null;
    }
  },

  // 4. Invoke live backend calculation engine: calculate-blended-risk
  async calculateBlendedRisk(customerTier, lines) {
    const payload = {
      customerTier: customerTier || 'BRONZE',
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.productName || 'Catalog Product',
        category: l.category || 'HARDWARE',
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        baseCost: Number(l.baseCost) || 0,
        discountPercent: Number(l.discountPercent) || 0,
      })),
    };

    const data = await apiClient.calculateBlendedRisk(payload);
    return data.blendedEvaluation;
  },

  // 5. Fetch all quotations directly from NestJS backend
  async getQuotations(params = {}) {
    return apiClient.getQuotations(params);
  },

  // 6. Create a new quotation directly in NestJS backend
  async createQuotation(quoteData, currentUser) {
    const payload = {
      ...quoteData,
      salesRepId: currentUser?.id,
    };
    return apiClient.createQuotation(payload);
  },

  // 7. Submit quotation for approval in NestJS backend
  async submitForApproval(id, currentUser, note = '') {
    return apiClient.submitQuotation(id, note);
  },

  // 8. Approve quotation in NestJS backend
  async approveQuotation(id, currentUser, note = '') {
    return apiClient.approveQuotation(id, note);
  },

  // 9. Reject quotation in NestJS backend
  async rejectQuotation(id, currentUser, note = '') {
    return apiClient.rejectQuotation(id, note);
  },

  // 10. Return quotation for revision
  async returnForRevision(id, currentUser, note = '') {
    return apiClient.rejectQuotation(id, note || 'Returned for revision');
  },

  // 11. Confirm order in NestJS backend
  async confirmOrder(id, currentUser) {
    return apiClient.confirmQuotation(id);
  },

  // 12. Update pipeline stage / status
  async updateQuotationStatus(id, newStatus, currentUser) {
    if (newStatus === 'CONFIRMED') {
      return apiClient.confirmQuotation(id);
    }
    if (newStatus === 'PENDING_APPROVAL') {
      return apiClient.submitQuotation(id, 'Pipeline stage move');
    }
    return apiClient.getQuotation(id);
  },

  // 13. Fetch AI Recommendations for cart products
  async getAiRecommendations(productIds) {
    try {
      if (!productIds || productIds.length === 0) return [];
      return await apiClient.getCartRecommendations(productIds);
    } catch (e) {
      console.warn('Could not fetch AI recommendations:', e);
      return [];
    }
  },
};

