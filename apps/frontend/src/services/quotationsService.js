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
    const res = await fetch(`${API_URL}/api/customers`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch customers from database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.customers || data.data || [];
  },

  // 2. Fetch live product catalog from PostgreSQL backend
  async getLiveProducts() {
    const res = await fetch(`${API_URL}/api/products`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch products from database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.products || data.data || [];
  },

  // 3. Fetch discount governance rules from PostgreSQL backend
  async getGovernanceRules() {
    const res = await fetch(`${API_URL}/api/config/discount-rules`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch discount rules from database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.rules || data;
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

    const res = await fetch(`${API_URL}/api/config/discount-rules/calculate-blended-risk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Risk calculation engine failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.blendedEvaluation;
  },

  // 5. Fetch all quotations directly from PostgreSQL database
  async getQuotations() {
    const res = await fetch('/api/quotations', {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch quotations from database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotations || [];
  },

  // 6. Create a new quotation directly in PostgreSQL database
  async createQuotation(quoteData, currentUser) {
    const payload = {
      ...quoteData,
      salesRepId: currentUser?.id,
      salesRepName: currentUser?.name,
    };

    const res = await fetch('/api/quotations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to save quotation in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 7. Submit quotation for approval in PostgreSQL database
  async submitForApproval(id, currentUser, note = '') {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'SUBMIT',
        note,
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to submit quotation in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 8. Approve quotation in PostgreSQL database
  async approveQuotation(id, currentUser, note = '') {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'APPROVE',
        note,
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to approve quotation in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 9. Reject quotation in PostgreSQL database
  async rejectQuotation(id, currentUser, note = '') {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'REJECT',
        note,
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to reject quotation in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 10. Return quotation for revision in PostgreSQL database
  async returnForRevision(id, currentUser, note = '') {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'RETURN',
        note,
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to return quotation in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 11. Confirm order in PostgreSQL database
  async confirmOrder(id, currentUser) {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'CONFIRM',
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to confirm order in database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },

  // 12. Update pipeline stage / status
  async updateQuotationStatus(id, newStatus, currentUser) {
    const res = await fetch('/api/quotations', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id,
        action: 'UPDATE_STATUS',
        newStatus,
        currentUser,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update quotation stage: ${res.statusText}`);
    }
    const data = await res.json();
    return data.quotation;
  },
};

