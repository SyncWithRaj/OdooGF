'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';

export default function QuotationsPage() {
  const { user, login } = useAuth();

  // Active persona role (defaults to authenticated user role or rep)
  const currentRole = useMemo(() => {
    return (user?.role || 'rep').toLowerCase();
  }, [user]);

  // Main state
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all | drafts | manager | finance | confirmed
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Backend live master data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [governanceRules, setGovernanceRules] = useState(null);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [notification, setNotification] = useState(null);

  // New Quote Form State
  const [newQuoteCustomer, setNewQuoteCustomer] = useState(null);
  const [newQuoteLines, setNewQuoteLines] = useState([]);
  const [newQuoteNotes, setNewQuoteNotes] = useState('');
  const [blendedEvaluation, setBlendedEvaluation] = useState(null);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);

  // Flash notification helper
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load initial backend data & quotations
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [custs, prods, rules, list] = await Promise.all([
          quotationsService.getLiveCustomers(),
          quotationsService.getLiveProducts(),
          quotationsService.getGovernanceRules(),
          quotationsService.getQuotations(),
        ]);
        setCustomers(custs);
        setProducts(prods);
        setGovernanceRules(rules);
        setQuotations(list);
      } catch (err) {
        console.error('Failed to load quotation master data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentRole, user?.id]);

  // Recalculate blended risk in real time whenever customer or lines change in the create modal
  useEffect(() => {
    if (!isCreateModalOpen || !newQuoteCustomer || newQuoteLines.length === 0) {
      setBlendedEvaluation(null);
      return;
    }

    let isCancelled = false;
    async function triggerRiskCalc() {
      setIsCalculatingRisk(true);
      try {
        const evalResult = await quotationsService.calculateBlendedRisk(
          newQuoteCustomer.tier,
          newQuoteLines
        );
        if (!isCancelled) {
          setBlendedEvaluation(evalResult);
        }
      } catch (e) {
        console.error('Error computing risk:', e);
      } finally {
        if (!isCancelled) setIsCalculatingRisk(false);
      }
    }

    const timer = setTimeout(triggerRiskCalc, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isCreateModalOpen, newQuoteCustomer, newQuoteLines]);

  // Switch persona seamlessly for testing all 4 roles
  const handleSwitchPersona = async (targetEmail) => {
    try {
      const res = await login(targetEmail, '123456');
      if (res && res.success) {
        showToast(`Switched persona to ${res.user?.fullName} (${res.user?.role})`, 'info');
      } else {
        // Fallback login with password123
        const res2 = await login(targetEmail, 'password123');
        if (res2 && res2.success) {
          showToast(`Switched persona to ${res2.user?.fullName} (${res2.user?.role})`, 'info');
        }
      }
    } catch (e) {
      console.warn('Quick persona switch:', e);
    }
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Tab filter
      if (activeTab === 'drafts' && q.status !== 'DRAFT') return false;
      if (activeTab === 'manager' && (q.status !== 'PENDING_APPROVAL' || q.currentStage !== 'SALES_MANAGER')) return false;
      if (activeTab === 'finance' && (q.status !== 'PENDING_APPROVAL' || q.currentStage !== 'FINANCE')) return false;
      if (activeTab === 'confirmed' && q.status !== 'CONFIRMED') return false;

      // Status dropdown filter
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;

      // Risk level filter
      if (riskFilter !== 'ALL' && q.blendedRiskScore !== riskFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = q.quoteNumber?.toLowerCase().includes(query);
        const matchesCust = q.customerName?.toLowerCase().includes(query);
        const matchesRep = q.salesRepName?.toLowerCase().includes(query);
        return matchesNumber || matchesCust || matchesRep;
      }

      return true;
    });
  }, [quotations, activeTab, statusFilter, riskFilter, searchQuery]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    const totalPipeline = quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
    const pendingManagerCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL' && q.currentStage === 'SALES_MANAGER').length;
    const pendingFinanceCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL' && q.currentStage === 'FINANCE').length;
    const draftsCount = quotations.filter((q) => q.status === 'DRAFT').length;
    const confirmedCount = quotations.filter((q) => q.status === 'CONFIRMED').length;
    const avgMargin = quotations.length > 0
      ? (quotations.reduce((acc, q) => acc + (q.totalMarginPercent || 0), 0) / quotations.length).toFixed(1)
      : '0.0';

    return {
      totalPipeline,
      pendingManagerCount,
      pendingFinanceCount,
      draftsCount,
      confirmedCount,
      avgMargin,
    };
  }, [quotations]);

  // Add line to new quote
  const handleAddLine = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    const initialLine = {
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      category: defaultProduct.category || 'HARDWARE',
      quantity: 1,
      unitPrice: defaultProduct.basePrice || 500,
      baseCost: defaultProduct.baseCost || 300,
      discountPercent: 0,
      allowedLimit: 5,
      isOverLimit: false,
      overLimitPoints: 0,
    };
    setNewQuoteLines([...newQuoteLines, initialLine]);
  };

  const handleUpdateLine = (index, field, value) => {
    const updated = [...newQuoteLines];
    const line = { ...updated[index] };

    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        line.productId = prod.id;
        line.productName = prod.name;
        line.category = prod.category;
        line.unitPrice = prod.basePrice;
        line.baseCost = prod.baseCost;
      }
    } else if (field === 'quantity') {
      line.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      line.unitPrice = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'discountPercent') {
      line.discountPercent = Math.min(100, Math.max(0, parseFloat(value) || 0));
    }

    updated[index] = line;
    setNewQuoteLines(updated);
  };

  const handleRemoveLine = (index) => {
    const updated = newQuoteLines.filter((_, i) => i !== index);
    setNewQuoteLines(updated);
  };

  // Open Create Quote Modal
  const handleOpenCreateModal = () => {
    if (customers.length > 0) {
      setNewQuoteCustomer(customers[0]);
    }
    if (products.length > 0) {
      const defaultProd = products[0];
      setNewQuoteLines([
        {
          productId: defaultProd.id,
          productName: defaultProd.name,
          category: defaultProd.category || 'HARDWARE',
          quantity: 1,
          unitPrice: defaultProd.basePrice || 1000,
          baseCost: defaultProd.baseCost || 600,
          discountPercent: 0,
          allowedLimit: 5,
          isOverLimit: false,
          overLimitPoints: 0,
        },
      ]);
    } else {
      setNewQuoteLines([]);
    }
    setNewQuoteNotes('');
    setBlendedEvaluation(null);
    setIsCreateModalOpen(true);
  };

  // Create Quotation Handler
  const handleSaveQuotation = async (statusTarget = 'DRAFT') => {
    if (!newQuoteCustomer) {
      alert('Please select a customer.');
      return;
    }
    if (newQuoteLines.length === 0) {
      alert('Please add at least one product line item.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      // Calculate latest evaluation
      const evalData = await quotationsService.calculateBlendedRisk(
        newQuoteCustomer.tier,
        newQuoteLines
      );

      const quotePayload = {
        customerId: newQuoteCustomer.id,
        customerName: newQuoteCustomer.name,
        customerEmail: newQuoteCustomer.email,
        customerTier: newQuoteCustomer.tier,
        status: statusTarget,
        currentStage: statusTarget === 'PENDING_APPROVAL' 
          ? (evalData.blendedRiskScore === 'LOW' ? 'APPROVED' : 'SALES_MANAGER')
          : 'SALES_REP',
        blendedRiskScore: evalData.blendedRiskScore,
        requiresManagerApproval: evalData.requiresManagerApproval,
        requiresFinanceApproval: evalData.requiresFinanceApproval,
        subtotalAmount: evalData.financials.totalSubtotal,
        totalDiscountAmount: evalData.financials.totalDiscountAmount,
        orderDiscountPercent: evalData.financials.totalSubtotal > 0
          ? Number(((evalData.financials.totalDiscountAmount / evalData.financials.totalSubtotal) * 100).toFixed(1))
          : 0,
        totalAmount: evalData.financials.totalRevenue,
        totalCost: evalData.financials.totalCost,
        totalMarginPercent: evalData.financials.totalMarginPercent,
        notes: newQuoteNotes,
        flagReasonSummary: evalData.flagReasonSummary,
        lines: evalData.lines || newQuoteLines,
      };

      const created = await quotationsService.createQuotation(quotePayload, user);
      const updatedList = await quotationsService.getQuotations();
      setQuotations(updatedList);
      setIsCreateModalOpen(false);
      showToast(
        statusTarget === 'PENDING_APPROVAL'
          ? `Quotation ${created.quoteNumber} created and submitted for governance approval!`
          : `Draft ${created.quoteNumber} saved successfully!`
      );
    } catch (e) {
      console.error('Failed to create quotation:', e);
      showToast('Error saving quotation.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open details drawer
  const handleOpenDetailDrawer = (quote) => {
    setSelectedQuote(quote);
    setActionComment('');
    setIsDetailDrawerOpen(true);
  };

  // Handle Governance Actions (Approve, Reject, Return, Confirm)
  const handlePerformAction = async (actionType) => {
    if (!selectedQuote) return;
    setIsSubmittingAction(true);
    try {
      let updated = null;
      if (actionType === 'SUBMIT') {
        updated = await quotationsService.submitForApproval(selectedQuote.id, user, actionComment);
        showToast(`Quotation ${selectedQuote.quoteNumber} submitted for approval.`);
      } else if (actionType === 'APPROVE') {
        updated = await quotationsService.approveQuotation(selectedQuote.id, user, actionComment);
        showToast(
          updated.status === 'APPROVED'
            ? `Quotation ${selectedQuote.quoteNumber} approved!`
            : `Quotation ${selectedQuote.quoteNumber} approved at L1 and escalated to Finance Controller.`
        );
      } else if (actionType === 'REJECT') {
        updated = await quotationsService.rejectQuotation(selectedQuote.id, user, actionComment);
        showToast(`Quotation ${selectedQuote.quoteNumber} rejected.`);
      } else if (actionType === 'RETURN') {
        updated = await quotationsService.returnForRevision(selectedQuote.id, user, actionComment);
        showToast(`Quotation ${selectedQuote.quoteNumber} returned to sales rep for revision.`);
      } else if (actionType === 'CONFIRM') {
        updated = await quotationsService.confirmOrder(selectedQuote.id, user);
        showToast(`Quotation ${selectedQuote.quoteNumber} confirmed into an active Order!`);
      }

      if (updated) {
        const updatedList = await quotationsService.getQuotations();
        setQuotations(updatedList);
        const refreshed = updatedList.find((q) => q.id === selectedQuote.id) || updated;
        setSelectedQuote(refreshed);
        setActionComment('');
      }
    } catch (e) {
      console.error('Governance action error:', e);
      showToast('Failed to perform action', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper styling for status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      case 'PENDING_APPROVAL':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">Pending Approval</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Approved</span>;
      case 'CONFIRMED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">Confirmed Order</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // Helper styling for risk badge
  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Low Risk</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Medium Risk (L1)</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>High Risk (L2)</span>;
      default:
        return null;
    }
  };

  // Helper styling for tier badge
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'GOLD':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-300">Gold (15% max)</span>;
      case 'SILVER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-slate-200 text-slate-800 border border-slate-300">Silver (10% max)</span>;
      case 'BRONZE':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200">Bronze (5% max)</span>;
    }
  };

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        {/* TOAST NOTIFICATION */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-top-4">
            <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : notification.type === 'info' ? 'bg-blue-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* TOP BAR: HEADER & ROLE PERSONA QUICK-SWITCHER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Quotations</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage client proposals, pricing policies, and approval workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* PERSONA SWITCHER */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
              <span className="text-xs font-medium text-gray-500 px-2">Role:</span>
              <button
                onClick={() => handleSwitchPersona('rep@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${currentRole === 'rep' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                title="Login as Alex Rep (SALES_REP)"
              >
                Sales Rep
              </button>
              <button
                onClick={() => handleSwitchPersona('manager@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${currentRole === 'manager' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                title="Login as Morgan Manager (SALES_MANAGER)"
              >
                Manager
              </button>
              <button
                onClick={() => handleSwitchPersona('finance@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${currentRole === 'finance' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                title="Login as Fiona Finance (FINANCE)"
              >
                Finance
              </button>
              <button
                onClick={() => handleSwitchPersona('admin@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${currentRole === 'admin' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                title="Login as System Admin (ADMIN)"
              >
                Admin
              </button>
            </div>

            {/* CREATE QUOTE BUTTON */}
            <button
              onClick={handleOpenCreateModal}
              className="h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition cursor-pointer shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Quotation</span>
            </button>
          </div>
        </div>

        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Pipeline Value</span>
              <span className="text-emerald-700 font-semibold">Live</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              ${metrics.totalPipeline.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {quotations.length} total active proposals
            </div>
          </div>

          <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Manager Approvals (L1)</span>
              {metrics.pendingManagerCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  {metrics.pendingManagerCount} Pending
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold text-amber-700 tracking-tight">
              {metrics.pendingManagerCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Medium risk deals requiring sign-off
            </div>
          </div>

          <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Finance Controller (L2)</span>
              {metrics.pendingFinanceCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                  {metrics.pendingFinanceCount} Urgent
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold text-rose-700 tracking-tight">
              {metrics.pendingFinanceCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              High risk or margin breaches
            </div>
          </div>

          <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Average Margin</span>
              <span className="text-gray-500 font-normal">Target &gt; 25%</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              {metrics.avgMargin}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.confirmedCount} orders confirmed
            </div>
          </div>
        </div>

        {/* ROLE TABS & FILTERS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 mb-6 rounded-lg bg-white border border-gray-200 shadow-xs">
          {/* TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All Quotes ({quotations.length})
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'drafts' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Drafts ({metrics.draftsCount})
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'manager' ? 'bg-amber-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>Manager Approvals</span>
              {metrics.pendingManagerCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${activeTab === 'manager' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {metrics.pendingManagerCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'finance' ? 'bg-rose-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>Finance Controller</span>
              {metrics.pendingFinanceCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${activeTab === 'finance' ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-800'}`}>
                  {metrics.pendingFinanceCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'confirmed' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Confirmed ({metrics.confirmedCount})
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-56">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quote, client, rep..."
                className="w-full h-9 pl-9 pr-3 rounded-md text-xs bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-9 px-3 rounded-md text-xs bg-white border border-gray-200 font-medium text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="ALL">All Risks</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>
        </div>

        {/* QUOTATIONS LIST TABLE */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer &amp; Tier</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Status &amp; Stage</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Net Value</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      No quotations found matching the selected view or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetailDrawer(quote)}
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {quote.quoteNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{quote.customerName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getTierBadge(quote.customerTier)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-700 font-medium">{quote.salesRepName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(quote.status)}
                          {quote.status === 'PENDING_APPROVAL' && (
                            <span className="text-[10px] text-gray-500 font-medium">
                              Stage: <span className="font-semibold text-gray-700">{quote.currentStage}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRiskBadge(quote.blendedRiskScore)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-600">
                        {quote.orderDiscountPercent}%
                        <span className="block text-[10px] text-gray-400">-${quote.totalDiscountAmount}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        ${quote.totalAmount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block font-semibold ${quote.totalMarginPercent < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {quote.totalMarginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetailDrawer(quote)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            title="Inspect Quotation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQuote(quote);
                              setIsPreviewModalOpen(true);
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            title="Preview Customer Proposal"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* CREATE QUOTATION MODAL (Clean, classic web login page style)              */}
        {/* ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 flex flex-col">
              {/* MODAL HEADER */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">New Quotation</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Prepare a proposal with automated policy compliance and margin calculation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* 1. CUSTOMER SELECTION */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="quoteCustomer" className="block text-sm font-medium text-gray-900">
                      Customer Account
                    </label>
                    {newQuoteCustomer && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Tier policy:</span>
                        {getTierBadge(newQuoteCustomer.tier)}
                        <span className="text-xs text-gray-500">
                          (Max {newQuoteCustomer?.tier === 'GOLD' ? '15%' : newQuoteCustomer?.tier === 'SILVER' ? '10%' : '5%'} discount)
                        </span>
                      </div>
                    )}
                  </div>
                  <select
                    id="quoteCustomer"
                    value={newQuoteCustomer?.id || ''}
                    onChange={(e) => {
                      const c = customers.find((cust) => cust.id === e.target.value);
                      if (c) setNewQuoteCustomer(c);
                    }}
                    className="w-full h-10 px-3.5 rounded-md bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email}) — {c.tier} Tier
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. PRODUCT LINE ITEMS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Line Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1.5 rounded-md transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Item
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-24 text-right">Price</th>
                          <th className="py-2.5 px-3 w-28 text-right">Discount</th>
                          <th className="py-2.5 px-3 w-28 text-center">Policy</th>
                          <th className="py-2.5 px-3 w-24 text-right">Total</th>
                          <th className="py-2.5 px-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-900">
                        {newQuoteLines.map((line, idx) => {
                          const evalLine = blendedEvaluation?.lines?.[idx] || line;
                          const lineRev = (line.quantity * line.unitPrice * (1 - line.discountPercent / 100)).toFixed(2);

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3">
                                <select
                                  value={line.productId}
                                  onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                                  className="w-full h-8 px-2 rounded-md text-xs bg-white border border-gray-200 text-gray-900 font-medium focus:outline-none focus:border-gray-400"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (${p.basePrice})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                                  className="w-full h-8 px-2 rounded-md text-xs bg-white border border-gray-200 text-center font-medium focus:outline-none focus:border-gray-400"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-gray-700">
                                ${line.unitPrice}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={line.discountPercent}
                                    onChange={(e) => handleUpdateLine(idx, 'discountPercent', e.target.value)}
                                    className="w-14 h-8 px-2 rounded-md text-xs bg-white border border-gray-200 text-right font-medium focus:outline-none focus:border-gray-400"
                                  />
                                  <span className="text-gray-400 text-xs">%</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {evalLine.isOverLimit ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                    +{evalLine.overLimitPoints}% Over
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Within {evalLine.allowedLimit || 5}%
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                ${lineRev}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {newQuoteLines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(idx)}
                                    className="text-gray-400 hover:text-rose-600 transition p-1 rounded hover:bg-gray-100 cursor-pointer"
                                    title="Remove item"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. ORDER FINANCIAL SUMMARY & RISK ASSESSMENT (Clean light card) */}
                {blendedEvaluation && (
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Financial Summary
                        </span>
                        {isCalculatingRisk && (
                          <span className="text-[11px] text-gray-400 animate-pulse">Calculating...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Risk Assessment:</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            blendedEvaluation.blendedRiskScore === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : blendedEvaluation.blendedRiskScore === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              blendedEvaluation.blendedRiskScore === 'HIGH'
                                ? 'bg-rose-500'
                                : blendedEvaluation.blendedRiskScore === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {blendedEvaluation.blendedRiskScore === 'LOW'
                            ? 'Low Risk (Auto-Approve)'
                            : blendedEvaluation.blendedRiskScore === 'MEDIUM'
                            ? 'Medium Risk (Manager Approval)'
                            : 'High Risk (Finance Review)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="bg-white p-3 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500 block">Subtotal</span>
                        <span className="text-base font-semibold text-gray-900">${blendedEvaluation.financials.totalSubtotal}</span>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500 block">Total Discount</span>
                        <span className="text-base font-semibold text-amber-700">-${blendedEvaluation.financials.totalDiscountAmount}</span>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500 block">Net Order Value</span>
                        <span className="text-base font-semibold text-emerald-700">${blendedEvaluation.financials.totalRevenue}</span>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500 block">Gross Margin</span>
                        <span
                          className={`text-base font-semibold ${
                            blendedEvaluation.financials.totalMarginPercent < 20 ? 'text-rose-600' : 'text-gray-900'
                          }`}
                        >
                          {blendedEvaluation.financials.totalMarginPercent}%
                        </span>
                      </div>
                    </div>

                    {blendedEvaluation.flagReasonSummary && (
                      <div className="text-xs p-2.5 rounded-md bg-white border border-gray-200 text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{blendedEvaluation.flagReasonSummary}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. NOTES */}
                <div>
                  <label htmlFor="quoteNotes" className="block text-sm font-medium text-gray-900 mb-1.5">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="quoteNotes"
                    rows={2}
                    value={newQuoteNotes}
                    onChange={(e) => setNewQuoteNotes(e.target.value)}
                    placeholder="Enter customer notes, SLA agreements, or delivery terms..."
                    className="w-full p-3 rounded-md bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 h-10 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={() => handleSaveQuotation('DRAFT')}
                  className="px-4 h-10 rounded-md bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={() => handleSaveQuotation('PENDING_APPROVAL')}
                  className="px-5 h-10 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingAction ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUOTATION DETAIL & GOVERNANCE APPROVAL DRAWER                             */}
        {/* ========================================================================= */}
        {isDetailDrawerOpen && selectedQuote && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="absolute inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col border-l border-gray-200">
              {/* DRAWER HEADER */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                      {selectedQuote.quoteNumber}
                    </h2>
                    {getStatusBadge(selectedQuote.status)}
                    {getRiskBadge(selectedQuote.blendedRiskScore)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <span className="font-medium text-gray-800">{selectedQuote.customerName}</span> ({selectedQuote.customerTier} Tier)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* DRAWER BODY */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* FINANCIAL OVERVIEW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div>
                    <span className="text-xs text-gray-500 block">Subtotal</span>
                    <span className="text-sm font-semibold text-gray-900">${selectedQuote.subtotalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Discount ({selectedQuote.orderDiscountPercent}%)</span>
                    <span className="text-sm font-semibold text-amber-700">-${selectedQuote.totalDiscountAmount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Final Value</span>
                    <span className="text-base font-semibold text-emerald-700">${selectedQuote.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Gross Margin</span>
                    <span className={`text-base font-semibold ${selectedQuote.totalMarginPercent < 20 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {selectedQuote.totalMarginPercent}%
                    </span>
                  </div>
                </div>

                {/* GOVERNANCE ROUTING BANNER */}
                {selectedQuote.flagReasonSummary && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="font-semibold block">Governance Policy Routing:</span>
                      <span>{selectedQuote.flagReasonSummary}</span>
                    </div>
                  </div>
                )}

                {/* LINE ITEMS */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Order Line Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 text-[11px] font-medium text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-2 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Price</th>
                          <th className="py-2.5 px-3 text-right">Disc %</th>
                          <th className="py-2.5 px-3 text-right">Margin %</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-900">
                        {selectedQuote.lines?.map((line, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-gray-900 block">{line.productName}</span>
                              <span className="text-[10px] text-gray-400">{line.category}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-medium">{line.quantity}</td>
                            <td className="py-2.5 px-3 text-right">${line.unitPrice}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-medium ${line.isOverLimit ? 'text-rose-600' : 'text-gray-700'}`}>
                                {line.discountPercent}%
                              </span>
                              {line.isOverLimit && (
                                <span className="block text-[9px] font-semibold text-rose-500">OVER (+{line.overLimitPoints}pt)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-600">
                              {line.lineMarginPercent}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                              ${line.lineRevenue || (line.quantity * line.unitPrice * (1 - line.discountPercent / 100)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ROLE ACTIONS SECTION */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                      Governance Actions ({currentRole.toUpperCase()})
                    </span>
                    <span className="text-xs text-gray-500">
                      Stage: <span className="font-semibold text-gray-800">{selectedQuote.currentStage}</span>
                    </span>
                  </div>

                  {/* ACTION COMMENT INPUT */}
                  <input
                    type="text"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Enter approval notes, conditions, or revision requests..."
                    className="w-full h-9 px-3 rounded-md text-xs bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                  />

                  {/* BUTTONS GATED BY ROLE AND STATUS */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* SALES REP ACTIONS */}
                    {selectedQuote.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('SUBMIT')}
                        disabled={isSubmittingAction}
                        className="h-9 px-4 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-black transition cursor-pointer shadow-xs"
                      >
                        Submit for Governance Approval
                      </button>
                    )}

                    {/* SALES MANAGER ACTIONS */}
                    {(currentRole === 'manager' || currentRole === 'admin') && selectedQuote.status === 'PENDING_APPROVAL' && selectedQuote.currentStage === 'SALES_MANAGER' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('APPROVE')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                        >
                          ✓ Approve Quotation (Manager L1)
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('RETURN')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer shadow-xs"
                        >
                          Request Revision
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('REJECT')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
                        >
                          Reject Deal
                        </button>
                      </>
                    )}

                    {/* FINANCE CONTROLLER ACTIONS */}
                    {(currentRole === 'finance' || currentRole === 'admin') && selectedQuote.status === 'PENDING_APPROVAL' && selectedQuote.currentStage === 'FINANCE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('APPROVE')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                        >
                          ✓ Approve Terms (Finance L2)
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('RETURN')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer shadow-xs"
                        >
                          Return for Price Adjustment
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePerformAction('REJECT')}
                          disabled={isSubmittingAction}
                          className="h-9 px-4 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
                        >
                          Reject Deal
                        </button>
                      </>
                    )}

                    {/* CONFIRM ORDER ACTION (When Approved) */}
                    {selectedQuote.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('CONFIRM')}
                        disabled={isSubmittingAction}
                        className="h-9 px-4 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Confirm &amp; Convert to Order
                      </button>
                    )}

                    {/* ADMIN OVERRIDE */}
                    {currentRole === 'admin' && selectedQuote.status !== 'APPROVED' && selectedQuote.status !== 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('APPROVE')}
                        disabled={isSubmittingAction}
                        className="h-9 px-3 rounded-md text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition cursor-pointer shadow-xs"
                      >
                        ⚡ Admin Override Approve
                      </button>
                    )}
                  </div>
                </div>

                {/* AUDIT TRAIL TIMELINE */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Audit Trail</h3>
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {selectedQuote.auditLogs?.map((log, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border-2 border-white shadow-xs shrink-0 mt-1"></span>
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">
                              {log.actorName} <span className="text-[10px] text-gray-500 font-normal">({log.actorRole})</span>
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-gray-600 font-normal">{log.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* DRAWER FOOTER */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Client Proposal View
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CUSTOMER PROPOSAL / E-SIGNATURE PREVIEW MODAL                             */}
        {/* ========================================================================= */}
        {isPreviewModalOpen && selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white text-gray-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    DF
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Proposal #{selectedQuote.quoteNumber}</h2>
                    <p className="text-xs text-gray-500">Commercial Proposal &amp; Terms</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 flex-1 text-gray-800 text-xs">
                {/* PROPOSAL HEADER */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Prepared For:</span>
                    <h3 className="text-base font-semibold text-gray-900">{selectedQuote.customerName}</h3>
                    <p className="text-gray-500">{selectedQuote.customerEmail}</p>
                    <p className="text-gray-500 mt-1">Tier: <span className="font-medium text-gray-700">{selectedQuote.customerTier}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Quotation Ref:</span>
                    <p className="font-mono font-semibold text-gray-900 text-sm">{selectedQuote.quoteNumber}</p>
                    <p className="text-gray-500">Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                    <p className="text-gray-500">Rep: {selectedQuote.salesRepName}</p>
                  </div>
                </div>

                {/* LINE ITEMS */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/80 text-[11px] font-medium text-gray-500 uppercase border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Item &amp; Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Discount</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedQuote.lines?.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900 block">{line.productName}</span>
                            <span className="text-[11px] text-gray-500">{line.category} Category</span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium">{line.quantity}</td>
                          <td className="py-3 px-4 text-right">${line.unitPrice}</td>
                          <td className="py-3 px-4 text-right text-amber-700 font-medium">{line.discountPercent}%</td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900">
                            ${line.lineRevenue || (line.quantity * line.unitPrice * (1 - line.discountPercent / 100)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TOTALS */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-medium text-gray-900">${selectedQuote.subtotalAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Total Savings:</span>
                      <span className="font-medium text-amber-700">-${selectedQuote.totalDiscountAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-2">
                      <span>Total Payable:</span>
                      <span className="text-emerald-700">${selectedQuote.totalAmount?.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

                {/* E-SIGNATURE SECTION */}
                <div className="border border-dashed border-gray-300 rounded-lg p-5 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block">Commercial Acceptance &amp; E-Signature</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">By signing or confirming this document, the customer agrees to DealFlow360 commercial terms.</p>
                  </div>
                  <div className="text-right">
                    <div className="h-10 px-4 border-b border-gray-400 flex items-center justify-center font-mono text-xs italic text-gray-600">
                      {selectedQuote.status === 'CONFIRMED' ? `${selectedQuote.customerName} (Verified E-Sign)` : 'Awaiting Customer E-Sign'}
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">Authorized Customer Signature</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 px-4 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}
