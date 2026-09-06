'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function QuotationsPage() {
  const { user } = useAuth();

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
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

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
  const [historyTab, setHistoryTab] = useState('negotiation');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  // New Quote Form State
  const [newQuoteCustomer, setNewQuoteCustomer] = useState(null);
  const [newQuoteLines, setNewQuoteLines] = useState([]);
  const [newQuoteNotes, setNewQuoteNotes] = useState('');
  const [blendedEvaluation, setBlendedEvaluation] = useState(null);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isLoadingAiRecs, setIsLoadingAiRecs] = useState(false);

  // Toast notification helper using react-toastify
  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
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
        const validCusts = Array.isArray(custs) ? custs : [];
        const validProds = Array.isArray(prods) ? prods : [];
        const validList = Array.isArray(list) ? list : [];

        setCustomers(validCusts);
        setProducts(validProds);
        setGovernanceRules(rules);
        setQuotations(validList);

        if (validCusts.length > 0) {
          setNewQuoteCustomer((prev) => prev || validCusts[0]);
        }
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

  // B5: Fetch AI Upsell & Cross-Sell Recommendations in Real Time (Screen 4)
  useEffect(() => {
    if (!isCreateModalOpen || newQuoteLines.length === 0) {
      setAiRecommendations([]);
      return;
    }

    let isCancelled = false;
    async function fetchAiRecs() {
      setIsLoadingAiRecs(true);
      try {
        const prodIds = newQuoteLines.map((l) => l.productId).filter(Boolean);
        const recs = await quotationsService.getAiRecommendations(prodIds);
        if (!isCancelled) {
          setAiRecommendations(Array.isArray(recs) ? recs : []);
        }
      } catch (err) {
        console.warn('AI recommendation fetch error:', err);
      } finally {
        if (!isCancelled) setIsLoadingAiRecs(false);
      }
    }

    const timer = setTimeout(fetchAiRecs, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isCreateModalOpen, newQuoteLines]);

  const handleAddAiRecommendation = (rec) => {
    const existing = newQuoteLines.find((l) => l.productId === rec.productId);
    if (existing) {
      setNewQuoteLines((prev) =>
        prev.map((l) => (l.productId === rec.productId ? { ...l, quantity: l.quantity + 1 } : l))
      );
    } else {
      const prod = products.find((p) => p.id === rec.productId) || {
        id: rec.productId,
        name: rec.name,
        basePrice: rec.basePrice,
        baseCost: rec.baseCost,
        category: rec.category,
      };
      setNewQuoteLines((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          category: prod.category || 'HARDWARE',
          quantity: 1,
          unitPrice: prod.basePrice,
          baseCost: prod.baseCost,
          discountPercent: 0,
        },
      ]);
    }
    showToast(`Added ${rec.name} to quotation!`, 'success');
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    const filtered = quotations.filter((q) => {
      // Tab filter
      if (activeTab === 'drafts' && q.status !== 'DRAFT') return false;
      if (activeTab === 'manager' && (q.status !== 'PENDING_APPROVAL' || q.currentStage !== 'SALES_MANAGER')) return false;
      if (activeTab === 'finance' && (q.status !== 'PENDING_APPROVAL' || q.currentStage !== 'FINANCE')) return false;
      if (activeTab === 'sent' && q.status !== 'SENT_TO_CUSTOMER' && q.status !== 'UNDER_NEGOTIATION' && q.status !== 'APPROVED') return false;
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
        const matchesProd = (q.lines || []).some((l) => (l.productName || '').toLowerCase().includes(query));
        return matchesNumber || matchesCust || matchesRep || matchesProd;
      }

      return true;
    });

    // Sort by selected column
    filtered.sort((a, b) => {
      let comp = 0;
      if (sortField === 'order') {
        comp = (a.quoteNumber || '').localeCompare(b.quoteNumber || '');
      } else if (sortField === 'product') {
        const prodA = a.lines?.[0]?.productName || '';
        const prodB = b.lines?.[0]?.productName || '';
        comp = prodA.localeCompare(prodB);
      } else if (sortField === 'price') {
        comp = (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortField === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comp = dateA - dateB;
      } else if (sortField === 'status') {
        comp = (a.status || '').localeCompare(b.status || '');
      }
      return sortDirection === 'asc' ? comp : -comp;
    });

    return filtered;
  }, [quotations, activeTab, statusFilter, riskFilter, searchQuery, sortField, sortDirection]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedQuotations,
    resetPage,
  } = usePagination(filteredQuotations, 10);

  useEffect(() => {
    resetPage();
  }, [activeTab, statusFilter, riskFilter, searchQuery]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    const totalPipeline = quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
    const pendingManagerCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL' && q.currentStage === 'SALES_MANAGER').length;
    const pendingFinanceCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL' && q.currentStage === 'FINANCE').length;
    const sentCount = quotations.filter((q) => q.status === 'SENT_TO_CUSTOMER' || q.status === 'UNDER_NEGOTIATION' || q.status === 'APPROVED').length;
    const draftsCount = quotations.filter((q) => q.status === 'DRAFT').length;
    const confirmedCount = quotations.filter((q) => q.status === 'CONFIRMED').length;
    const avgMargin = quotations.length > 0
      ? (quotations.reduce((acc, q) => acc + (q.totalMarginPercent || 0), 0) / quotations.length).toFixed(1)
      : '0.0';

    return {
      totalPipeline,
      pendingManagerCount,
      pendingFinanceCount,
      sentCount,
      draftsCount,
      confirmedCount,
      avgMargin,
    };
  }, [quotations]);

  // Add line to new quote
  const handleAddLine = async () => {
    let prods = products;
    if (!prods || prods.length === 0) {
      prods = await quotationsService.getLiveProducts();
      if (Array.isArray(prods)) setProducts(prods);
    }
    if (!prods || prods.length === 0) return;
    const defaultProduct = prods[0];
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
  const handleOpenCreateModal = async () => {
    let currentCusts = customers;
    let currentProds = products;

    if (!currentCusts || currentCusts.length === 0) {
      currentCusts = await quotationsService.getLiveCustomers();
      if (Array.isArray(currentCusts)) setCustomers(currentCusts);
    }
    if (!currentProds || currentProds.length === 0) {
      currentProds = await quotationsService.getLiveProducts();
      if (Array.isArray(currentProds)) setProducts(currentProds);
    }

    if (currentCusts && currentCusts.length > 0) {
      setNewQuoteCustomer(currentCusts[0]);
    }
    if (currentProds && currentProds.length > 0) {
      const defaultProd = currentProds[0];
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
        orderDiscountPercent: (evalData?.financials?.totalSubtotal > 0)
          ? Number(((evalData.financials.totalDiscountAmount / evalData.financials.totalSubtotal) * 100).toFixed(1))
          : 0,
        notes: newQuoteNotes,
        lines: newQuoteLines.map((line) => ({
          productId: line.productId,
          quantity: Math.max(1, Number(line.quantity) || 1),
          unitPrice: Number(line.unitPrice) || 0,
          discountPercent: Number(line.discountPercent) || 0,
          variantId: line.variantId || undefined,
        })),
      };

      const created = await quotationsService.createQuotation(quotePayload, user);
      if (statusTarget === 'PENDING_APPROVAL' && created?.id) {
        await quotationsService.submitForApproval(created.id, user, newQuoteNotes);
      }
      const updatedList = await quotationsService.getQuotations();
      setQuotations(updatedList);
      setIsCreateModalOpen(false);
      showToast(
        statusTarget === 'PENDING_APPROVAL'
          ? `Quotation ${created?.quoteNumber || ''} created and submitted for governance approval!`
          : `Draft ${created?.quoteNumber || ''} saved successfully!`
      );
    } catch (e) {
      console.error('Failed to create quotation:', e);
      showToast(e?.message || 'Error saving quotation.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open details drawer
  const handleOpenDetailDrawer = async (quote) => {
    setSelectedQuote(quote);
    setActionComment('');
    setNewRemarkText('');
    setHistoryTab(quote.comments?.length > 0 || quote.status === 'UNDER_NEGOTIATION' ? 'negotiation' : 'audit');
    setIsDetailDrawerOpen(true);
    try {
      const fresh = await apiClient.getQuotation(quote.id);
      if (fresh && fresh.id) {
        setSelectedQuote(fresh);
        if (fresh.comments && fresh.comments.length > 0) {
          setHistoryTab('negotiation');
        } else if (fresh.auditLogs && fresh.auditLogs.length > 0) {
          setHistoryTab('audit');
        }
      }
    } catch (e) {
      console.warn('Could not fetch fresh quotation details:', e);
    }
  };

  // Post a negotiation comment / internal remark
  const handlePostRemark = async (e) => {
    if (e) e.preventDefault();
    if (!newRemarkText.trim() || !selectedQuote) return;
    setIsSubmittingRemark(true);
    try {
      const added = await apiClient.addQuotationComment(selectedQuote.id, newRemarkText.trim());
      const newComment = {
        id: added?.id || `comment-${Date.now()}`,
        authorName: added?.authorName || user?.name || user?.email || 'Sales Team',
        authorRole: added?.authorRole || user?.role || 'SALES_REP',
        message: newRemarkText.trim(),
        createdAt: new Date().toISOString(),
      };
      setSelectedQuote((prev) => ({
        ...prev,
        comments: [...(prev?.comments || []), newComment],
      }));
      setNewRemarkText('');
      showToast('Negotiation remark posted to conversation.');
    } catch (err) {
      console.error('Failed to post remark:', err);
      showToast(err?.message || 'Failed to post remark.', 'error');
    } finally {
      setIsSubmittingRemark(false);
    }
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
        const arId = selectedQuote.approvalRequests?.[0]?.id;
        if (arId) {
          updated = await apiClient.actionApproval(arId, 'APPROVED', actionComment);
        } else {
          updated = await quotationsService.approveQuotation(selectedQuote.id, user, actionComment);
        }
        showToast(
          updated?.status === 'ESCALATED_TO_FINANCE'
            ? `Quotation ${selectedQuote.quoteNumber} approved at L1 — escalated to Finance Controller.`
            : `Quotation ${selectedQuote.quoteNumber} fully approved & sent to customer!`
        );
      } else if (actionType === 'REJECT') {
        const arId = selectedQuote.approvalRequests?.[0]?.id;
        if (arId) {
          updated = await apiClient.actionApproval(arId, 'REJECTED', actionComment);
        } else {
          updated = await apiClient.rejectQuotation(selectedQuote.id, actionComment);
        }
        showToast(`Quotation ${selectedQuote.quoteNumber} rejected.`);
      } else if (actionType === 'RETURN') {
        const arId = selectedQuote.approvalRequests?.[0]?.id;
        if (arId) {
          updated = await apiClient.actionApproval(arId, 'RETURNED_FOR_REVISION', actionComment);
        } else {
          updated = await apiClient.rejectQuotation(selectedQuote.id, actionComment || 'Returned for revision');
        }
        showToast(`Quotation ${selectedQuote.quoteNumber} returned to sales rep for revision.`);
      } else if (actionType === 'CONFIRM') {
        updated = await quotationsService.confirmOrder(selectedQuote.id, user);
        showToast(`Quotation ${selectedQuote.quoteNumber} confirmed into an active Order!`);
      } else if (actionType === 'SEND_TO_CUSTOMER') {
        updated = await quotationsService.updateQuotationStatus(selectedQuote.id, 'SENT_TO_CUSTOMER', user);
        showToast(`Quotation ${selectedQuote.quoteNumber} released to Customer Portal!`);
      }

      if (updated) {
        const updatedList = await quotationsService.getQuotations();
        setQuotations(updatedList);
        try {
          const fresh = await apiClient.getQuotation(selectedQuote.id);
          setSelectedQuote(fresh);
        } catch {
          const refreshed = updatedList.find((q) => q.id === selectedQuote.id) || updated;
          setSelectedQuote(refreshed);
        }
        setActionComment('');
      }
    } catch (e) {
      console.error('Governance action error:', e);
      showToast(e?.message || 'Failed to perform action', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Format order number e.g. #84231
  const formatOrderNumber = (quoteNumber) => {
    if (!quoteNumber) return '#84231';
    if (quoteNumber.startsWith('#')) return quoteNumber;
    const digits = quoteNumber.replace(/\D/g, '');
    if (digits) return `#84${digits.slice(-3)}`;
    return `#${quoteNumber}`;
  };

  // Format date e.g. Aug 14, 2026
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Aug 14, 2026';
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return 'Aug 14, 2026';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Aug 14, 2026';
    }
  };

  // Helper styling for status badge matching screenshot pill outlines
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-zinc-900 text-zinc-900 bg-zinc-100">
            Confirmed
          </span>
        );
      case 'SENT_TO_CUSTOMER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-400 text-blue-700 bg-blue-50">
            Sent to Customer
          </span>
        );
      case 'UNDER_NEGOTIATION':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-400 text-purple-700 bg-purple-50">
            In Negotiation
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-400 text-amber-700 bg-amber-50">
            In Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-zinc-900 text-zinc-900 bg-zinc-100">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-rose-400 text-rose-700 bg-rose-50">
            Rejected
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-300 text-zinc-600 bg-zinc-50">
            Draft
          </span>
        );
    }
  };

  // Helper styling for risk badge
  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"><span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>Low Risk</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Medium Risk (L1)</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>High Risk (L2)</span>;
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
        {/* TOP BAR: HEADER & ACTIONS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Quotations</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage client proposals, pricing policies, and approval workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* CREATE QUOTE BUTTON */}
            <button
              onClick={handleOpenCreateModal}
              className="h-10 px-4 rounded-md bg-zinc-900 hover:bg-black text-white font-medium text-sm transition cursor-pointer shadow-sm flex items-center gap-2"
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
          <div className="p-5 rounded-lg bg-white border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-1">
              <span>Pipeline Value</span>
              <span className="text-zinc-900 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"></span>Live</span>
            </div>
            <div className="text-2xl font-semibold text-zinc-900 tracking-tight">
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
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'sent' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>Sent to Client</span>
              {metrics.sentCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${activeTab === 'sent' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-800'}`}>
                  {metrics.sentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'confirmed' ? 'bg-zinc-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Confirmed ({metrics.confirmedCount})
            </button>
          </div>

          {/* SEARCH */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
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
          </div>
        </div>

        {/* QUOTATIONS LIST TABLE MATCHING TARGET DESIGN */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200/80 text-xs font-medium text-slate-600 select-none">
                  {/* Checkbox */}
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedQuotations.length > 0 && paginatedQuotations.every((q) => selectedQuoteIds.includes(q.id))}
                      onChange={() => {
                        const pageIds = paginatedQuotations.map((q) => q.id);
                        const allPageSelected = pageIds.every((id) => selectedQuoteIds.includes(id));
                        if (allPageSelected) {
                          setSelectedQuoteIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                        } else {
                          setSelectedQuoteIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                    />
                  </th>

                  {/* Order */}
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'order') {
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('order');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Order</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>

                  {/* Product */}
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'product') {
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('product');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>

                  {/* Customer */}
                  <th className="py-3.5 px-4 font-medium text-slate-600">
                    Customer
                  </th>

                  {/* Type */}
                  <th className="py-3.5 px-4 font-medium text-slate-600">
                    Type
                  </th>

                  {/* Price */}
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'price') {
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('price');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Price</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>

                  {/* Date */}
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('date');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>

                  {/* Status */}
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'status') {
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('status');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>

                  {/* Actions Column */}
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      No quotations found matching the selected view or filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedQuotations.map((quote) => {
                    const isSelected = selectedQuoteIds.includes(quote.id);
                    const prodName = quote.lines?.[0]?.productName || 'Enterprise Deal Solution';
                    const customerEmail = quote.customerEmail || `${(quote.customerName || 'customer').toLowerCase().replace(/\s+/g, '.')}@example.com`;
                    const dealType = quote.lines?.[0]?.category === 'SUBSCRIPTION' ? 'Subscription' : 'Sale';

                    return (
                      <tr
                        key={quote.id}
                        onClick={() => handleOpenDetailDrawer(quote)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-4 px-4 w-10 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuoteIds((prev) =>
                              prev.includes(quote.id)
                                ? prev.filter((id) => id !== quote.id)
                                : [...prev, quote.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Order */}
                        <td className="py-4 px-4 font-normal text-slate-500 whitespace-nowrap">
                          {formatOrderNumber(quote.quoteNumber)}
                        </td>

                        {/* Product with Squircle Thumbnail */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 leading-tight">
                                {prodName}
                              </div>
                              {quote.lines?.length > 1 && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  +{quote.lines.length - 1} more line item{quote.lines.length > 2 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Customer (Name + Email) */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-900 leading-tight">
                            {quote.customerName || 'Acme Client'}
                          </div>
                          <div className="text-xs text-slate-400 font-normal mt-0.5">
                            {customerEmail}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-4 px-4 text-slate-700 font-normal">
                          {dealType}
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          ${Number(quote.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(quote.createdAt)}
                        </td>

                        {/* Status (Pill Outlines) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getStatusBadge(quote.status)}
                        </td>

                        {/* Action Dots */}
                        <td className="py-4 px-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailDrawer(quote)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Actions"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
          />
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
                    {customers.length === 0 ? (
                      <option value="">Loading customer accounts...</option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email}) — {c.tier} Tier
                        </option>
                      ))
                    )}
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
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 px-2.5 py-1.5 rounded-md transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Item
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[620px]">
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
                                  {products.length === 0 ? (
                                    <option value="">Loading products...</option>
                                  ) : (
                                    products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (${p.basePrice})
                                      </option>
                                    ))
                                  )}
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
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
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
              </div>

                {/* 2.5 AI UPSELL & CROSS-SELL RECOMMENDATIONS (Screen 4 / B5) */}
                {newQuoteLines.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-zinc-900 text-white text-xs">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </span>
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-900">
                            AI Upsell &amp; Cross-Sell Recommendations
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            Ranked by FP-Growth Market Basket Analysis &amp; Admin Governance Feeds
                          </p>
                        </div>
                      </div>
                      {isLoadingAiRecs && (
                        <span className="text-[11px] text-zinc-600 animate-pulse font-medium">
                          Mining patterns...
                        </span>
                      )}
                    </div>

                    {aiRecommendations.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {aiRecommendations.slice(0, 3).map((rec) => (
                          <div
                            key={rec.productId}
                            className="bg-white p-2.5 rounded-md border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-400 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                                  {rec.source === 'ADMIN_CURATED' ? `Priority #${rec.feedRank}` : `Score: ${rec.score}`}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200">
                                  {rec.promotionTag || `+${rec.marginPct || 25}% Margin`}
                                </span>
                              </div>
                              <h5 className="text-xs font-medium text-gray-900 line-clamp-1" title={rec.name}>
                                {rec.name}
                              </h5>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                ${rec.basePrice} <span className="text-gray-400">({rec.marginPct || 30}% margin)</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddAiRecommendation(rec)}
                              className="mt-2 w-full py-1 px-2 rounded text-[11px] font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-900 hover:text-white border border-zinc-200 hover:border-transparent transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              1-Click Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isLoadingAiRecs && (
                        <p className="text-[11px] text-zinc-500 italic py-1">
                          No additional high-affinity pairings mined for current item combination.
                        </p>
                      )
                    )}
                  </div>
                )}

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
                              : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              blendedEvaluation.blendedRiskScore === 'HIGH'
                                ? 'bg-rose-500'
                                : blendedEvaluation.blendedRiskScore === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-zinc-700'
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
                        <span className="text-base font-semibold text-zinc-900">${blendedEvaluation.financials.totalRevenue}</span>
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
                  className="px-5 h-10 rounded-md bg-zinc-900 hover:bg-black text-white font-medium text-sm transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
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
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-xs text-gray-500 block">Concession Discount</span>
                    <span className="text-sm font-semibold text-rose-700">-${selectedQuote.totalDiscountAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Net Deal Total</span>
                    <span className="text-sm font-semibold text-gray-900">${selectedQuote.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Gross Margin %</span>
                    <span className={`text-sm font-semibold ${selectedQuote.totalMarginPercent < 20 ? 'text-rose-600' : 'text-zinc-900'}`}>
                      {selectedQuote.totalMarginPercent}%
                    </span>
                  </div>
                </div>

                {/* POLICY EVALUATION SUMMARY */}
                {selectedQuote.flagReasonSummary && (
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="font-semibold block">Governance Policy Routing:</span>
                      <span>{selectedQuote.flagReasonSummary}</span>
                    </div>
                  </div>
                )}

                {/* ACTIVE CUSTOMER COUNTER PROPOSAL BANNER */}
                {(selectedQuote.counterDiscountProposed > 0 || selectedQuote.status === 'UNDER_NEGOTIATION') && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                        <span className="font-bold text-sm text-purple-950">Active Customer Counter-Proposal</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-300">
                        {selectedQuote.counterDiscountProposed}% Extra Discount Requested
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-purple-200/60">
                      <div>
                        <span className="text-[10px] text-purple-700 block font-semibold">Requested Concession:</span>
                        <span className="font-bold text-purple-900">{selectedQuote.counterDiscountProposed}% discount</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-700 block font-semibold">Requested Delivery Date:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedQuote.requestedDeliveryDate
                            ? new Date(selectedQuote.requestedDeliveryDate).toLocaleDateString()
                            : 'Standard Delivery'}
                        </span>
                      </div>
                    </div>
                    {selectedQuote.comments && selectedQuote.comments.length > 0 && (
                      <div className="pt-2 border-t border-purple-200/60 text-slate-700">
                        <span className="text-[10px] text-purple-700 block font-semibold mb-1">Customer Note:</span>
                        <p className="italic bg-white/80 p-2 rounded-lg border border-purple-100 text-slate-800">
                          &ldquo;{selectedQuote.comments[0]?.message || selectedQuote.comments[0]}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* LINE ITEMS */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Order Line Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[540px]">
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
                          className="h-9 px-4 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-black transition cursor-pointer shadow-xs"
                        >
                          Approve Quotation (Manager L1)
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
                          className="h-9 px-4 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-black transition cursor-pointer shadow-xs"
                        >
                          Approve Terms (Finance L2)
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

                    {/* CONFIRM ORDER ACTION (When Approved or in Customer Negotiation) */}
                    {(selectedQuote.status === 'APPROVED' || selectedQuote.status === 'SENT_TO_CUSTOMER' || selectedQuote.status === 'UNDER_NEGOTIATION') && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('CONFIRM')}
                        disabled={isSubmittingAction}
                        className="h-9 px-4 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {selectedQuote.status === 'UNDER_NEGOTIATION' ? 'Accept Counter & Confirm Order' : 'Confirm & Convert to Order'}
                      </button>
                    )}

                    {/* RELEASE TO CUSTOMER PORTAL ACTION */}
                    {selectedQuote.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('SEND_TO_CUSTOMER')}
                        disabled={isSubmittingAction}
                        className="h-9 px-3.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        Release to Client Portal
                      </button>
                    )}

                    {/* ADMIN OVERRIDE */}
                    {currentRole === 'admin' && selectedQuote.status !== 'APPROVED' && selectedQuote.status !== 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => handlePerformAction('APPROVE')}
                        disabled={isSubmittingAction}
                        className="h-9 px-3 rounded-md text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-900 transition cursor-pointer shadow-xs"
                      >
                        Admin Override Approve
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTIVITY, NEGOTIATION CONVERSATION & AUDIT HISTORY HUB */}
                <div className="pt-4 border-t border-zinc-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryTab('negotiation')}
                        className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          historyTab === 'negotiation'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <span>Negotiation History</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          historyTab === 'negotiation' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {selectedQuote.comments?.length || 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTab('audit')}
                        className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          historyTab === 'audit'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <span>Audit Trail</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          historyTab === 'audit' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {selectedQuote.auditLogs?.length || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: NEGOTIATION CONVERSATION */}
                  {historyTab === 'negotiation' && (
                    <div className="space-y-3">
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {(!selectedQuote.comments || selectedQuote.comments.length === 0) ? (
                          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                            <p className="text-xs text-zinc-600 font-medium">
                              No negotiation remarks recorded yet.
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Post internal deal notes or clarify terms with the client below.
                            </p>
                          </div>
                        ) : (
                          selectedQuote.comments.map((c, i) => {
                            const isCustomer = (c.authorRole || '').toUpperCase() === 'CUSTOMER';
                            return (
                              <div
                                key={c.id || i}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                  isCustomer
                                    ? 'bg-zinc-50 border-zinc-300'
                                    : 'bg-white border-zinc-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      isCustomer
                                        ? 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                                        : 'bg-zinc-900 text-white'
                                    }`}>
                                      {c.authorRole || (isCustomer ? 'Customer' : 'Sales Rep')}
                                    </span>
                                    <span className="font-semibold text-zinc-900">
                                      {c.authorName || 'Participant'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400">
                                    {c.createdAt
                                      ? `${new Date(c.createdAt).toLocaleDateString()} ${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                      : ''}
                                  </span>
                                </div>
                                <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">
                                  {c.message}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Comment Composer */}
                      <form onSubmit={handlePostRemark} className="pt-2 border-t border-zinc-100 flex gap-2">
                        <input
                          type="text"
                          value={newRemarkText}
                          onChange={(e) => setNewRemarkText(e.target.value)}
                          placeholder="Type negotiation note or response..."
                          className="flex-1 h-9 px-3 text-xs rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingRemark || !newRemarkText.trim()}
                          className="h-9 px-3.5 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
                        >
                          {isSubmittingRemark ? 'Posting...' : 'Send Note'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 2: GOVERNANCE AUDIT TRAIL */}
                  {historyTab === 'audit' && (
                    <div className="space-y-3">
                      {(!selectedQuote.auditLogs || selectedQuote.auditLogs.length === 0) ? (
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                          <p className="text-xs text-zinc-600 font-medium">
                            No formal governance review events recorded yet.
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Approval submissions, manager reviews, and policy overrides will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 max-h-72 overflow-y-auto pr-1">
                          {selectedQuote.auditLogs.map((log, idx) => (
                            <div key={log.id || idx} className="relative flex items-start gap-3 pl-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 border-white shadow-xs shrink-0 mt-1"></span>
                              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex-1">
                                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-zinc-900">
                                      {log.actorName}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      ({log.actorRole})
                                    </span>
                                    {log.action && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                                        {log.action}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-400">
                                    {log.timestamp || log.createdAt
                                      ? `${new Date(log.timestamp || log.createdAt).toLocaleDateString()} ${new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                      : ''}
                                  </span>
                                </div>
                                <p className="text-zinc-700 font-normal leading-relaxed">
                                  {log.comment || log.note || `Action recorded: ${log.action}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* DRAWER FOOTER */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="h-9 px-3.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Client Proposal View
                  </button>

                  {selectedQuote.portalToken && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/portal?token=${selectedQuote.portalToken}`;
                          navigator.clipboard.writeText(url);
                          showToast('Client Portal link copied to clipboard!');
                        }}
                        className="h-9 px-3 rounded-md text-xs font-medium text-zinc-900 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition cursor-pointer flex items-center gap-1"
                        title="Copy direct portal link for this client"
                      >
                        Copy Portal Link
                      </button>
                      <a
                        href={`/portal?token=${selectedQuote.portalToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-md text-xs font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition cursor-pointer flex items-center gap-1"
                      >
                        Open Portal
                      </a>
                    </>
                  )}
                </div>

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
                  <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center font-bold text-white text-xs">
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
                    <h3 className="text-base font-semibold text-gray-900">{selectedQuote.customerName || selectedQuote.customer?.name || 'Direct Customer'}</h3>
                    <p className="text-gray-500">{selectedQuote.customerEmail || selectedQuote.customer?.email}</p>
                    <p className="text-gray-500 mt-1">Tier: <span className="font-medium text-gray-700">{selectedQuote.customerTier || selectedQuote.customer?.tier || 'BRONZE'}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Quotation Ref:</span>
                    <p className="font-mono font-semibold text-gray-900 text-sm">{selectedQuote.quoteNumber}</p>
                    <p className="text-gray-500">Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                    <p className="text-gray-500">Rep: {selectedQuote.salesRepName || selectedQuote.salesRep?.fullName || 'Direct Sales'}</p>
                  </div>
                </div>

                {/* LINE ITEMS */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[540px]">
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
                      <span className="text-zinc-900 font-bold">${selectedQuote.totalAmount?.toLocaleString()} USD</span>
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
