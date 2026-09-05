/**
 * DealFlow360 Quotations Service
 * Dynamically connects frontend to NestJS backend without modifying any backend code.
 * Integrates:
 * - Live Customer Directory: GET /api/customers (Bronze, Silver, Gold tiers)
 * - Live Product Catalog: GET /api/products (Base prices, margins, categories)
 * - Discount Governance Rules: GET /api/config/discount-rules
 * - Real-Time Blended Risk & Margin Engine: POST /api/config/discount-rules/calculate-blended-risk
 * - Local Persistent Store for Quotations, Approvals, and Audit Logs
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STORAGE_QUOTATIONS_KEY = 'dealflow_quotations_store_v1';
const TOKEN_KEY = 'dealflow_token';

// Helper to get auth headers with Bearer token
function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Initial realistic seed quotations mapped to backend data
const DEFAULT_INITIAL_QUOTATIONS = [
  {
    id: 'quote-1041',
    quoteNumber: 'Q-1041',
    customerId: 'abed80b2-3cfa-41a8-a292-caa8c356b0b7',
    customerName: 'Aryan Sondharva',
    customerEmail: 'aryansondharva25@gmail.com',
    customerTier: 'BRONZE',
    salesRepId: '486d9db3-b6e0-45ed-9e40-11fe5699828d',
    salesRepName: 'J. Rao (Sales Rep)',
    status: 'DRAFT',
    currentStage: 'SALES_REP',
    blendedRiskScore: 'LOW',
    requiresManagerApproval: false,
    requiresFinanceApproval: false,
    subtotalAmount: 1800,
    totalDiscountAmount: 72,
    orderDiscountPercent: 4.0,
    totalAmount: 1728,
    totalCost: 1100,
    totalMarginPercent: 36.34,
    notes: 'Initial standard workstation package for Q3 expansion.',
    lines: [
      {
        id: 'line-1041-1',
        productId: 'prod-hw-1',
        productName: 'Precision Tower Workstation',
        category: 'HARDWARE',
        quantity: 1,
        unitPrice: 1200,
        baseCost: 750,
        discountPercent: 4.0,
        allowedLimit: 5.0,
        isOverLimit: false,
        overLimitPoints: 0,
        lineRevenue: 1152,
        lineCost: 750,
        lineMarginPercent: 34.9,
      },
      {
        id: 'line-1041-2',
        productId: 'prod-srv-1',
        productName: 'Deployment & Setup Onsite',
        category: 'SERVICES',
        quantity: 2,
        unitPrice: 300,
        baseCost: 175,
        discountPercent: 4.0,
        allowedLimit: 5.0,
        isOverLimit: false,
        overLimitPoints: 0,
        lineRevenue: 576,
        lineCost: 350,
        lineMarginPercent: 39.2,
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        actorName: 'J. Rao',
        actorRole: 'SALES_REP',
        action: 'CREATED_DRAFT',
        comment: 'Quotation drafted within tier discount boundaries.',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'quote-1042',
    quoteNumber: 'Q-1042',
    customerId: 'cust-acme-2',
    customerName: 'Apex Global Logistics',
    customerEmail: 'procurement@apexlogistics.com',
    customerTier: 'SILVER',
    salesRepId: '486d9db3-b6e0-45ed-9e40-11fe5699828d',
    salesRepName: 'J. Rao (Sales Rep)',
    status: 'PENDING_APPROVAL',
    currentStage: 'SALES_MANAGER',
    blendedRiskScore: 'MEDIUM',
    requiresManagerApproval: true,
    requiresFinanceApproval: false,
    subtotalAmount: 5400,
    totalDiscountAmount: 702,
    orderDiscountPercent: 13.0,
    totalAmount: 4698,
    totalCost: 3100,
    totalMarginPercent: 34.01,
    notes: 'Competitive counter-offer against competitor quote. Moderate 13% discount requested.',
    flagReasonSummary: 'Blended Risk MEDIUM: Moderate discount breach (up to +3pt). Requires Sales Manager approval (L1).',
    lines: [
      {
        id: 'line-1042-1',
        productId: 'prod-hw-2',
        productName: 'Edge Rack Server Pro',
        category: 'HARDWARE',
        quantity: 2,
        unitPrice: 2400,
        baseCost: 1400,
        discountPercent: 13.0,
        allowedLimit: 10.0,
        isOverLimit: true,
        overLimitPoints: 3.0,
        lineRevenue: 4176,
        lineCost: 2800,
        lineMarginPercent: 32.95,
      },
      {
        id: 'line-1042-2',
        productId: '36c8cf95-a6d7-4e70-84d3-10c336adedb0',
        productName: 'Support SLA 24/7',
        category: 'SUBSCRIPTION',
        quantity: 2,
        unitPrice: 300,
        baseCost: 150,
        discountPercent: 13.0,
        allowedLimit: 10.0,
        isOverLimit: true,
        overLimitPoints: 3.0,
        lineRevenue: 522,
        lineCost: 300,
        lineMarginPercent: 42.53,
      },
    ],
    auditLogs: [
      {
        id: 'audit-2',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        actorName: 'J. Rao',
        actorRole: 'SALES_REP',
        action: 'SUBMITTED_FOR_APPROVAL',
        comment: 'Submitted for Manager L1 sign-off due to 13% discount on Silver account.',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'quote-1043',
    quoteNumber: 'Q-1043',
    customerId: 'cust-fin-3',
    customerName: 'Horizon Financial Systems',
    customerEmail: 'finance-ops@horizonfin.com',
    customerTier: 'GOLD',
    salesRepId: 'usr_rep_2',
    salesRepName: 'Sara Vance',
    status: 'PENDING_APPROVAL',
    currentStage: 'FINANCE',
    blendedRiskScore: 'HIGH',
    requiresManagerApproval: true,
    requiresFinanceApproval: true,
    subtotalAmount: 14200,
    totalDiscountAmount: 3266,
    orderDiscountPercent: 23.0,
    totalAmount: 10934,
    totalCost: 9200,
    totalMarginPercent: 15.86,
    notes: 'Multi-site cluster deployment. Deep strategic discount of 23% triggering Finance Controller review.',
    flagReasonSummary: 'Blended Risk HIGH: Significant discount breach (+8pt) and tight margins (15.86%). Requires Finance Controller (L2) sign-off.',
    lines: [
      {
        id: 'line-1043-1',
        productId: 'prod-hw-3',
        productName: 'Enterprise Cloud Gateway',
        category: 'HARDWARE',
        quantity: 4,
        unitPrice: 2800,
        baseCost: 1900,
        discountPercent: 23.0,
        allowedLimit: 15.0,
        isOverLimit: true,
        overLimitPoints: 8.0,
        lineRevenue: 8624,
        lineCost: 7600,
        lineMarginPercent: 11.87,
      },
      {
        id: 'line-1043-2',
        productId: '36c8cf95-a6d7-4e70-84d3-10c336adedb0',
        productName: 'Support SLA 24/7 (Annual)',
        category: 'SUBSCRIPTION',
        quantity: 10,
        unitPrice: 300,
        baseCost: 160,
        discountPercent: 23.0,
        allowedLimit: 15.0,
        isOverLimit: true,
        overLimitPoints: 8.0,
        lineRevenue: 2310,
        lineCost: 1600,
        lineMarginPercent: 30.74,
      },
    ],
    auditLogs: [
      {
        id: 'audit-3a',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        actorName: 'Sara Vance',
        actorRole: 'SALES_REP',
        action: 'SUBMITTED_FOR_APPROVAL',
        comment: 'Strategic key account pursuit submitted.',
      },
      {
        id: 'audit-3b',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        actorName: 'Morgan Manager',
        actorRole: 'SALES_MANAGER',
        action: 'APPROVED_L1_ESCALATED',
        comment: 'Approved by Sales Manager. Escalated to Finance due to tight 15.8% blended margin.',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'quote-1039',
    quoteNumber: 'Q-1039',
    customerId: 'abed80b2-3cfa-41a8-a292-caa8c356b0b7',
    customerName: 'Aryan Sondharva',
    customerEmail: 'aryansondharva25@gmail.com',
    customerTier: 'BRONZE',
    salesRepId: '486d9db3-b6e0-45ed-9e40-11fe5699828d',
    salesRepName: 'J. Rao (Sales Rep)',
    status: 'CONFIRMED',
    currentStage: 'APPROVED',
    blendedRiskScore: 'LOW',
    requiresManagerApproval: false,
    requiresFinanceApproval: false,
    subtotalAmount: 3200,
    totalDiscountAmount: 160,
    orderDiscountPercent: 5.0,
    totalAmount: 3040,
    totalCost: 1800,
    totalMarginPercent: 40.79,
    notes: 'Fully confirmed and signed order converted to fulfillment pipeline.',
    lines: [
      {
        id: 'line-1039-1',
        productId: 'prod-hw-1',
        productName: 'Precision Tower Workstation',
        category: 'HARDWARE',
        quantity: 2,
        unitPrice: 1200,
        baseCost: 750,
        discountPercent: 5.0,
        allowedLimit: 5.0,
        isOverLimit: false,
        overLimitPoints: 0,
        lineRevenue: 2280,
        lineCost: 1500,
        lineMarginPercent: 34.21,
      },
      {
        id: 'line-1039-2',
        productId: 'prod-srv-2',
        productName: 'Annual Software License',
        category: 'SUBSCRIPTION',
        quantity: 1,
        unitPrice: 800,
        baseCost: 300,
        discountPercent: 5.0,
        allowedLimit: 5.0,
        isOverLimit: false,
        overLimitPoints: 0,
        lineRevenue: 760,
        lineCost: 300,
        lineMarginPercent: 60.53,
      },
    ],
    auditLogs: [
      {
        id: 'audit-4a',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        actorName: 'J. Rao',
        actorRole: 'SALES_REP',
        action: 'SUBMITTED',
        comment: 'Quote sent directly to client within Bronze threshold.',
      },
      {
        id: 'audit-4b',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        actorName: 'Aryan Sondharva',
        actorRole: 'CUSTOMER',
        action: 'ACCEPTED_AND_CONFIRMED',
        comment: 'Customer verified e-signature and confirmed commercial terms.',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

// Initialize store in localStorage if absent
function getStoredQuotations() {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_QUOTATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_QUOTATIONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_QUOTATIONS_KEY, JSON.stringify(DEFAULT_INITIAL_QUOTATIONS));
      return DEFAULT_INITIAL_QUOTATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading quotations from store:', e);
    return DEFAULT_INITIAL_QUOTATIONS;
  }
}

function saveStoredQuotations(quotes) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_QUOTATIONS_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error('Error saving quotations to store:', e);
  }
}

export const quotationsService = {
  // 1. Fetch live customers from backend
  async getLiveCustomers() {
    try {
      const res = await fetch(`${API_URL}/api/customers`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.customers || data.data || [];
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn('Backend customers fetch fallback:', err);
    }
    // Fallback seed customers if offline
    return [
      { id: 'abed80b2-3cfa-41a8-a292-caa8c356b0b7', name: 'Aryan Sondharva', email: 'aryansondharva25@gmail.com', tier: 'BRONZE' },
      { id: 'cust-acme-2', name: 'Apex Global Logistics', email: 'procurement@apexlogistics.com', tier: 'SILVER' },
      { id: 'cust-fin-3', name: 'Horizon Financial Systems', email: 'finance-ops@horizonfin.com', tier: 'GOLD' },
      { id: 'cust-tech-4', name: 'Quantum Core Tech', email: 'hello@quantumcore.io', tier: 'SILVER' },
    ];
  },

  // 2. Fetch live product catalog from backend
  async getLiveProducts() {
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.products || data.data || [];
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn('Backend products fetch fallback:', err);
    }
    // Fallback seed products if offline
    return [
      { id: '36c8cf95-a6d7-4e70-84d3-10c336adedb0', sku: 'SUB-SLA-QTR', name: 'Support SLA 24/7', category: 'SUBSCRIPTION', basePrice: 300, baseCost: 120, totalAvailableStock: 999 },
      { id: 'prod-hw-1', sku: 'HW-TWR-100', name: 'Precision Tower Workstation', category: 'HARDWARE', basePrice: 1200, baseCost: 750, totalAvailableStock: 24 },
      { id: 'prod-hw-2', sku: 'HW-SRV-200', name: 'Edge Rack Server Pro', category: 'HARDWARE', basePrice: 2400, baseCost: 1400, totalAvailableStock: 12 },
      { id: 'prod-hw-3', sku: 'HW-GTW-300', name: 'Enterprise Cloud Gateway', category: 'HARDWARE', basePrice: 2800, baseCost: 1900, totalAvailableStock: 8 },
      { id: 'prod-srv-1', sku: 'SRV-DEP-ONSITE', name: 'Deployment & Setup Onsite', category: 'SERVICES', basePrice: 300, baseCost: 175, totalAvailableStock: 50 },
      { id: 'prod-srv-2', sku: 'SRV-LIC-ANNUAL', name: 'Annual Software License', category: 'SERVICES', basePrice: 800, baseCost: 300, totalAvailableStock: 100 },
    ];
  },

  // 3. Fetch discount governance rules
  async getGovernanceRules() {
    try {
      const res = await fetch(`${API_URL}/api/config/discount-rules`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.rules || data;
      }
    } catch (err) {
      console.warn('Governance rules fetch fallback:', err);
    }
    return {
      tierCeilings: [
        { tier: 'BRONZE', maxDiscount: 5 },
        { tier: 'SILVER', maxDiscount: 10 },
        { tier: 'GOLD', maxDiscount: 15 },
      ],
      categoryCeilings: [
        { category: 'HARDWARE', maxDiscount: 15 },
        { category: 'SERVICES', maxDiscount: 10 },
        { category: 'SUBSCRIPTION', maxDiscount: 15 },
      ],
      approvalMatrix: [
        { riskLevel: 'LOW', description: 'Within limits', requiresManagerApproval: false, requiresFinanceApproval: false },
        { riskLevel: 'MEDIUM', description: 'Moderate deviation', requiresManagerApproval: true, requiresFinanceApproval: false },
        { riskLevel: 'HIGH', description: 'High deviation or tight margins', requiresManagerApproval: true, requiresFinanceApproval: true },
      ],
    };
  },

  // 4. Call live backend calculation engine: calculate-blended-risk
  async calculateBlendedRisk(customerTier, lines) {
    try {
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

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.blendedEvaluation) {
          return data.blendedEvaluation;
        }
      }
    } catch (err) {
      console.warn('Live backend risk engine call fallback to local calculation:', err);
    }

    // Dynamic client-side fallback calculation matching backend formula exactly
    const tierCeilings = { BRONZE: 5, SILVER: 10, GOLD: 15 };
    const catCeilings = { HARDWARE: 15, SERVICES: 10, SUBSCRIPTION: 15 };
    const tierLimit = tierCeilings[customerTier] || 5;

    let totalSubtotal = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let maxLineDeviation = 0;
    const computedLines = [];

    lines.forEach((line) => {
      const catLimit = catCeilings[line.category] || 10;
      const allowedLimit = Math.min(tierLimit, catLimit);
      const disc = Number(line.discountPercent) || 0;
      const isOver = disc > allowedLimit;
      const overPoints = isOver ? Number((disc - allowedLimit).toFixed(2)) : 0;
      if (overPoints > maxLineDeviation) maxLineDeviation = overPoints;

      const qty = Number(line.quantity) || 1;
      const uPrice = Number(line.unitPrice) || 0;
      const bCost = Number(line.baseCost) || 0;
      const sub = qty * uPrice;
      const rev = qty * uPrice * (1 - disc / 100);
      const cost = qty * bCost;
      const margin = rev > 0 ? Number((((rev - cost) / rev) * 100).toFixed(2)) : 0;

      totalSubtotal += sub;
      totalRevenue += rev;
      totalCost += cost;

      computedLines.push({
        ...line,
        allowedLimit,
        isOverLimit: isOver,
        overLimitPoints: overPoints,
        statusBadge: isOver ? `OVER (+${overPoints}pt)` : 'OK (0pt)',
        lineRevenue: Number(rev.toFixed(2)),
        lineCost: Number(cost.toFixed(2)),
        lineMarginPercent: margin,
      });
    });

    const totalDiscountAmount = Number((totalSubtotal - totalRevenue).toFixed(2));
    const totalMarginPercent = totalRevenue > 0
      ? Number((((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2))
      : 0;

    let blendedRiskScore = 'LOW';
    let highestRequiredLevel = 'APPROVED';
    let flagReasonSummary = 'All lines are within allowable tier and category discount ceilings.';

    if (maxLineDeviation === 0) {
      blendedRiskScore = 'LOW';
      highestRequiredLevel = 'APPROVED';
    } else if (maxLineDeviation <= 5.0 && totalMarginPercent >= 15.0) {
      blendedRiskScore = 'MEDIUM';
      highestRequiredLevel = 'SALES_MANAGER';
      flagReasonSummary = `Blended Risk MEDIUM: Moderate discount breach (up to +${maxLineDeviation}pt). Requires Sales Manager approval (L1).`;
    } else {
      blendedRiskScore = 'HIGH';
      highestRequiredLevel = 'FINANCE';
      flagReasonSummary = `Blended Risk HIGH: Significant discount breach (+${maxLineDeviation}pt) or tight margin (${totalMarginPercent}%). Requires Sales Manager + Finance Controller (L2) sign-off.`;
    }

    return {
      customerTier,
      blendedRiskScore,
      highestRequiredLevel,
      requiresManagerApproval: blendedRiskScore !== 'LOW',
      requiresFinanceApproval: blendedRiskScore === 'HIGH',
      maxLineDeviation,
      flagReasonSummary,
      financials: {
        totalSubtotal: Number(totalSubtotal.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalDiscountAmount,
        totalMarginPercent,
      },
      lines: computedLines,
    };
  },

  // 5. Get all quotations (with optional role / user filtering)
  getQuotations(role = 'admin', userId = null) {
    const quotes = getStoredQuotations();
    const r = (role || 'admin').toLowerCase();

    if (r === 'admin') {
      return quotes;
    }
    if (r === 'rep' || r === 'sales_rep') {
      // Rep sees all quotes assigned to them, plus allows previewing all team deals
      return quotes;
    }
    if (r === 'manager' || r === 'sales_manager') {
      // Sales Manager sees all quotes, especially prioritizing those requiring approval
      return quotes;
    }
    if (r === 'finance') {
      // Finance sees all deals with financial exposure
      return quotes;
    }
    return quotes;
  },

  // 6. Create a new quotation
  createQuotation(quoteData, currentUser) {
    const quotes = getStoredQuotations();
    const nextNumber = `Q-${1040 + quotes.length + 1}`;
    
    const newQuote = {
      id: `quote-${Date.now()}`,
      quoteNumber: quoteData.quoteNumber || nextNumber,
      customerId: quoteData.customerId,
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      customerTier: quoteData.customerTier || 'BRONZE',
      salesRepId: currentUser?.id || 'usr_rep',
      salesRepName: currentUser?.name || 'Alex Rep',
      status: quoteData.status || 'DRAFT',
      currentStage: quoteData.currentStage || 'SALES_REP',
      blendedRiskScore: quoteData.blendedRiskScore || 'LOW',
      requiresManagerApproval: quoteData.requiresManagerApproval || false,
      requiresFinanceApproval: quoteData.requiresFinanceApproval || false,
      subtotalAmount: quoteData.subtotalAmount || 0,
      totalDiscountAmount: quoteData.totalDiscountAmount || 0,
      orderDiscountPercent: quoteData.orderDiscountPercent || 0,
      totalAmount: quoteData.totalAmount || 0,
      totalCost: quoteData.totalCost || 0,
      totalMarginPercent: quoteData.totalMarginPercent || 0,
      notes: quoteData.notes || '',
      flagReasonSummary: quoteData.flagReasonSummary || '',
      lines: quoteData.lines || [],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser?.name || 'Sales Rep',
          actorRole: currentUser?.role?.toUpperCase() || 'SALES_REP',
          action: 'CREATED_DRAFT',
          comment: quoteData.status === 'PENDING_APPROVAL' 
            ? `Quotation submitted for review with ${quoteData.blendedRiskScore} risk profile.` 
            : 'New quotation drafted in DealFlow360.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    quotes.unshift(newQuote);
    saveStoredQuotations(quotes);
    return newQuote;
  },

  // 7. Submit quote for approval
  submitForApproval(id, currentUser, submissionNote = '') {
    const quotes = getStoredQuotations();
    const quoteIndex = quotes.findIndex((q) => q.id === id);
    if (quoteIndex === -1) return null;

    const quote = { ...quotes[quoteIndex] };
    quote.status = 'PENDING_APPROVAL';
    // Stage routed based on risk
    if (quote.blendedRiskScore === 'LOW') {
      quote.status = 'APPROVED';
      quote.currentStage = 'APPROVED';
    } else {
      // Medium or High start with Sales Manager
      quote.currentStage = 'SALES_MANAGER';
    }

    quote.updatedAt = new Date().toISOString();
    quote.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: currentUser?.name || 'Sales Rep',
      actorRole: currentUser?.role?.toUpperCase() || 'SALES_REP',
      action: 'SUBMITTED_FOR_APPROVAL',
      comment: submissionNote || `Submitted for governance review. Assigned to ${quote.currentStage}.`,
    });

    quotes[quoteIndex] = quote;
    saveStoredQuotations(quotes);
    return quote;
  },

  // 8. Sales Manager / Finance Approval workflow
  approveQuotation(id, currentUser, approvalComments = '') {
    const quotes = getStoredQuotations();
    const quoteIndex = quotes.findIndex((q) => q.id === id);
    if (quoteIndex === -1) return null;

    const quote = { ...quotes[quoteIndex] };
    const userRole = (currentUser?.role || '').toLowerCase();

    if (userRole === 'manager' || userRole === 'sales_manager') {
      if (quote.requiresFinanceApproval) {
        // Escalate to Finance
        quote.currentStage = 'FINANCE';
        quote.status = 'PENDING_APPROVAL';
        quote.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser?.name || 'Sales Manager',
          actorRole: 'SALES_MANAGER',
          action: 'APPROVED_L1_ESCALATED',
          comment: approvalComments || 'Sales Manager sign-off granted. Escalated to Finance Controller for L2 review.',
        });
      } else {
        // Direct approval
        quote.currentStage = 'APPROVED';
        quote.status = 'APPROVED';
        quote.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser?.name || 'Sales Manager',
          actorRole: 'SALES_MANAGER',
          action: 'APPROVED',
          comment: approvalComments || 'Sales Manager approved discount deviation within authorized authority.',
        });
      }
    } else if (userRole === 'finance') {
      // Finance Controller sign-off
      quote.currentStage = 'APPROVED';
      quote.status = 'APPROVED';
      quote.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: currentUser?.name || 'Finance Controller',
        actorRole: 'FINANCE',
        action: 'FINANCE_APPROVED',
        comment: approvalComments || 'Financial terms, credit limit, and gross margins audited and approved.',
      });
    } else if (userRole === 'admin') {
      // Executive Admin override
      quote.currentStage = 'APPROVED';
      quote.status = 'APPROVED';
      quote.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: currentUser?.name || 'Admin',
        actorRole: 'ADMIN',
        action: 'ADMIN_OVERRIDE_APPROVED',
        comment: approvalComments || 'Admin executive override applied. Quotation immediately approved.',
      });
    }

    quote.updatedAt = new Date().toISOString();
    quotes[quoteIndex] = quote;
    saveStoredQuotations(quotes);
    return quote;
  },

  // 9. Reject quotation
  rejectQuotation(id, currentUser, rejectionReason = '') {
    const quotes = getStoredQuotations();
    const quoteIndex = quotes.findIndex((q) => q.id === id);
    if (quoteIndex === -1) return null;

    const quote = { ...quotes[quoteIndex] };
    quote.status = 'REJECTED';
    quote.currentStage = 'REJECTED';
    quote.updatedAt = new Date().toISOString();
    quote.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: currentUser?.name || 'Reviewer',
      actorRole: currentUser?.role?.toUpperCase() || 'MANAGER',
      action: 'REJECTED',
      comment: rejectionReason || 'Discount or commercial terms rejected by governance.',
    });

    quotes[quoteIndex] = quote;
    saveStoredQuotations(quotes);
    return quote;
  },

  // 10. Return quotation for revision to Sales Rep
  returnForRevision(id, currentUser, revisionFeedback = '') {
    const quotes = getStoredQuotations();
    const quoteIndex = quotes.findIndex((q) => q.id === id);
    if (quoteIndex === -1) return null;

    const quote = { ...quotes[quoteIndex] };
    quote.status = 'DRAFT';
    quote.currentStage = 'RETURNED';
    quote.updatedAt = new Date().toISOString();
    quote.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: currentUser?.name || 'Reviewer',
      actorRole: currentUser?.role?.toUpperCase() || 'MANAGER',
      action: 'RETURNED_FOR_REVISION',
      comment: revisionFeedback || 'Returned to Sales Rep with requested discount adjustments.',
    });

    quotes[quoteIndex] = quote;
    saveStoredQuotations(quotes);
    return quote;
  },

  // 11. Confirm Order (Converts approved quote into confirmed commercial agreement)
  confirmOrder(id, currentUser) {
    const quotes = getStoredQuotations();
    const quoteIndex = quotes.findIndex((q) => q.id === id);
    if (quoteIndex === -1) return null;

    const quote = { ...quotes[quoteIndex] };
    quote.status = 'CONFIRMED';
    quote.currentStage = 'APPROVED';
    quote.updatedAt = new Date().toISOString();
    quote.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: currentUser?.name || 'Sales Operations',
      actorRole: currentUser?.role?.toUpperCase() || 'REP',
      action: 'CONFIRMED_ORDER',
      comment: 'Quotation verified and confirmed. Transferred to fulfillment dispatch queue.',
    });

    quotes[quoteIndex] = quote;
    saveStoredQuotations(quotes);
    return quote;
  },

  // Reset store to fresh seed data if needed
  resetStore() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_QUOTATIONS_KEY, JSON.stringify(DEFAULT_INITIAL_QUOTATIONS));
    }
    return DEFAULT_INITIAL_QUOTATIONS;
  },
};
