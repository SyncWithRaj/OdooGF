'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const roleMap = { SALES_MANAGER: 'manager', FINANCE: 'finance', ADMIN: 'admin' };
  const currentRole = roleMap[user?.role] || (user?.role || 'manager').toLowerCase();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(currentRole === 'finance' ? 'finance' : currentRole === 'manager' ? 'manager' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [modalTab, setModalTab] = useState('negotiation');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  const handleOpenApprovalModal = async (quote) => {
    setSelectedQuote(quote);
    setActionNote('');
    setNewRemarkText('');
    setModalTab(quote.comments?.length > 0 || quote.counterDiscountProposed > 0 ? 'negotiation' : 'audit');
    try {
      const fresh = await apiClient.getQuotation(quote.id);
      if (fresh && fresh.id) {
        setSelectedQuote((prev) => ({
          ...prev,
          ...fresh,
          auditLogs: fresh.auditLogs || prev.auditLogs,
          comments: fresh.comments || [],
        }));
      }
    } catch (e) {
      console.warn('Could not fetch fresh quotation in approvals:', e);
    }
  };

  const handlePostApprovalRemark = async (e) => {
    if (e) e.preventDefault();
    if (!newRemarkText.trim() || !selectedQuote) return;
    setIsSubmittingRemark(true);
    try {
      const added = await apiClient.addQuotationComment(selectedQuote.id, newRemarkText.trim());
      const newComment = {
        id: added?.id || `comment-${Date.now()}`,
        authorName: added?.authorName || user?.name || user?.email || 'Approver',
        authorRole: added?.authorRole || user?.role || 'SALES_MANAGER',
        message: newRemarkText.trim(),
        createdAt: new Date().toISOString(),
      };
      setSelectedQuote((prev) => ({
        ...prev,
        comments: [...(prev?.comments || []), newComment],
      }));
      setNewRemarkText('');
      showToast('Negotiation note added to record.');
    } catch (err) {
      showToast(err?.message || 'Failed to add note.', 'error');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  // Load approval queue from backend (auto-filters by user role)
  const loadApprovals = async () => {
    setLoading(true);
    try {
      // Fetch the real approval queue — backend filters by role automatically
      const queue = await apiClient.getApprovalsQueue();
      // Flatten ApprovalRequest → quote-like shape for the table
      const flattened = queue.map((ar) => {
        const q = ar.quotation || {};
        return {
          id: q.id,
          quoteNumber: q.quoteNumber,
          status: q.status,
          customerName: q.customer?.name || q.customer?.companyName || 'Direct Client',
          customerEmail: q.customer?.email || '',
          customerTier: q.customer?.tier || 'BRONZE',
          salesRepName: q.salesRep?.fullName || q.salesRep?.email || 'Direct Sales Rep',
          totalAmount: q.totalAmount,
          totalDiscountAmount: q.totalDiscountAmount,
          orderDiscountPercent: q.orderDiscountPercent,
          counterDiscountProposed: q.counterDiscountProposed,
          requestedDeliveryDate: q.requestedDeliveryDate,
          portalToken: q.portalToken,
          totalMarginPercent: q.totalMarginPercent,
          blendedRiskScore: q.blendedRiskScore || ar.blendedRiskLevel,
          currentStage: ar.currentStage, // source of truth from ApprovalRequest
          flagReasonSummary: ar.flagReasonSummary,
          approvalRequests: [{ id: ar.id, currentStage: ar.currentStage, blendedRiskLevel: ar.blendedRiskLevel }],
          customer: q.customer,
          salesRep: q.salesRep,
          lines: q.lines,
          auditLogs: ar.auditLogs,
          notes: q.notes,
        };
      });
      setQuotations(flattened);
    } catch (err) {
      console.error('Failed to load approval queue:', err);
      showToast('Error loading approvals queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [user?.role]);

  // All items from queue are already pending (no extra filter needed)
  const pendingQuotes = quotations;

  const managerPending = useMemo(() => {
    return pendingQuotes.filter((q) => q.currentStage === 'SALES_MANAGER');
  }, [pendingQuotes]);

  const financePending = useMemo(() => {
    return pendingQuotes.filter((q) => q.currentStage === 'FINANCE');
  }, [pendingQuotes]);

  // Filtered quotes based on tab and search
  const displayedQuotes = useMemo(() => {
    return pendingQuotes.filter((q) => {
      if (activeTab === 'manager' && q.currentStage !== 'SALES_MANAGER') return false;
      if (activeTab === 'finance' && q.currentStage !== 'FINANCE') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.quoteNumber?.toLowerCase().includes(query) ||
          q.customerName?.toLowerCase().includes(query) ||
          q.salesRepName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [pendingQuotes, activeTab, searchQuery]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedQuotes,
    resetPage,
  } = usePagination(displayedQuotes, 10);

  useEffect(() => {
    resetPage();
  }, [activeTab, searchQuery]);



  // Governance Actions — route through /api/approvals/:approvalRequestId/action
  const handleAction = async (quote, actionType, customNote = '') => {
    setProcessingId(quote.id);
    try {
      // Find the active approval request ID for this quotation
      const approvalRequestId = quote.approvalRequests?.[0]?.id;
      if (!approvalRequestId) {
        showToast('No active approval request found for this quotation.', 'error');
        return;
      }

      // Map frontend action names to backend ApprovalAction enum values
      const actionMap = {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
        RETURN: 'RETURNED_FOR_REVISION',
      };
      const backendAction = actionMap[actionType];

      const res = await apiClient.actionApproval(approvalRequestId, backendAction, customNote);

      if (actionType === 'APPROVE') {
        showToast(
          res.status === 'ESCALATED_TO_FINANCE'
            ? `Quotation ${quote.quoteNumber} approved at L1 — escalated to Finance for Tier-2 sign-off.`
            : `Quotation ${quote.quoteNumber} fully approved & sent to customer!`
        );
      } else if (actionType === 'RETURN') {
        showToast(`Quotation ${quote.quoteNumber} returned for revision.`);
      } else if (actionType === 'REJECT') {
        showToast(`Quotation ${quote.quoteNumber} rejected.`, 'info');
      }

      if (selectedQuote?.id === quote.id) {
        setSelectedQuote(null);
      }
      await loadApprovals();
    } catch (err) {
      console.error('Governance action failed:', err);
      showToast(err?.message || 'Action failed. Please try again.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Badges
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'GOLD':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Gold</span>;
      case 'SILVER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">Silver</span>;
      case 'BRONZE':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">Bronze</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"><span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>Low Risk</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Medium Risk</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>High Risk</span>;
      default:
        return null;
    }
  };

  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Approvals</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                pendingQuotes.length > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}>
                {pendingQuotes.length} Pending
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Review and authorize quotation discount requests and margin limits.
            </p>
          </div>

          <div className="flex items-center gap-3">


            <Link
              href="/quotations"
              className="h-8 px-3 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium text-xs transition cursor-pointer flex items-center"
            >
              All Quotes
            </Link>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 mb-4 rounded-md bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All ({pendingQuotes.length})
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'manager' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Manager Review ({managerPending.length})
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeTab === 'finance' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Finance Review ({financePending.length})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quote or customer..."
              className="w-full h-8 pl-8 pr-2.5 rounded text-xs bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="p-10 rounded-md bg-white border border-gray-200 text-center shadow-xs">
            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">Loading pending approvals...</p>
          </div>
        ) : displayedQuotes.length === 0 ? (
          <div className="p-10 rounded-md bg-white border border-gray-200 text-center shadow-xs">
            <p className="text-sm font-medium text-gray-900">No pending approvals</p>
            <p className="text-xs text-gray-500 mt-1">All discount and margin requests have been reviewed.</p>
          </div>
        ) : (
          /* SIMPLE CLASSIC TABLE VIEW */
          <div className="bg-white rounded-md border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Quote</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Sales Rep</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Risk</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {paginatedQuotes.map((quote) => {
                    const isProcessing = processingId === quote.id;
                    const isManagerStage = quote.currentStage === 'SALES_MANAGER';
                    const isFinanceStage = quote.currentStage === 'FINANCE';
                    const canApprove =
                      currentRole === 'admin' ||
                      (isManagerStage && currentRole === 'manager') ||
                      (isFinanceStage && currentRole === 'finance');

                    return (
                      <tr
                        key={quote.id}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        {/* Quote # */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenApprovalModal(quote)}
                            className="font-semibold text-gray-900 hover:text-black hover:underline cursor-pointer text-left"
                          >
                            {quote.quoteNumber}
                          </button>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {quote.customerName || quote.customer?.name || quote.customer?.companyName || 'Direct Client'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getTierBadge(quote.customerTier || quote.customer?.tier)}
                            <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                              {quote.customerEmail || quote.customer?.email}
                            </span>
                          </div>
                        </td>

                        {/* Sales Rep */}
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {quote.salesRepName || quote.salesRep?.fullName || quote.salesRep?.email || 'Direct Sales Rep'}
                        </td>

                        {/* Stage */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            isManagerStage
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {isManagerStage ? 'Manager (L1)' : 'Finance (L2)'}
                          </span>
                        </td>

                        {/* Risk */}
                        <td className="py-3 px-4">
                          {getRiskBadge(quote.blendedRiskScore)}
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-4 text-right font-medium text-amber-700">
                          {quote.orderDiscountPercent}%
                          <span className="block text-[10px] text-gray-400">-₹{quote.totalDiscountAmount}</span>
                          {quote.counterDiscountProposed > 0 && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Counter: {quote.counterDiscountProposed}%
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          ₹{quote.totalAmount?.toLocaleString()}
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${quote.totalMarginPercent < 20 ? 'text-rose-600' : 'text-gray-900'}`}>
                            {quote.totalMarginPercent}%
                          </span>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canApprove ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleAction(quote, 'APPROVE')}
                                  className="h-7 px-2.5 rounded bg-zinc-900 hover:bg-black text-white font-medium text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                                  title="Approve Quotation"
                                >
                                  {isProcessing ? '...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleAction(quote, 'REJECT')}
                                  className="h-7 px-2 rounded bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 font-medium text-xs transition cursor-pointer"
                                  title="Reject Quotation"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">
                                {isManagerStage ? 'Needs Manager' : 'Needs Finance'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenApprovalModal(quote)}
                              className="h-7 px-2 rounded bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 text-xs transition cursor-pointer"
                              title="Inspect details & line items"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
        )}

        {/* SIMPLE DETAIL & ACTION MODAL */}
        {selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-gray-900">
                      {selectedQuote.quoteNumber}
                    </h2>
                    {getTierBadge(selectedQuote.customerTier || selectedQuote.customer?.tier)}
                    {getRiskBadge(selectedQuote.blendedRiskScore)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: {selectedQuote.customerName || selectedQuote.customer?.name || selectedQuote.customer?.companyName} ({selectedQuote.customerEmail || selectedQuote.customer?.email}) &bull; Rep: {selectedQuote.salesRepName || selectedQuote.salesRep?.fullName || 'Direct Sales Rep'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded border border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-500 block">Total Value</span>
                    <span className="font-semibold text-gray-900">₹{selectedQuote.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Requested Discount</span>
                    <span className="font-semibold text-amber-700">{selectedQuote.orderDiscountPercent}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Concession</span>
                    <span className="font-semibold text-gray-900">-₹{selectedQuote.totalDiscountAmount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Margin</span>
                    <span className="font-semibold text-gray-900">{selectedQuote.totalMarginPercent}%</span>
                  </div>
                </div>

                {/* Active Customer Counter-Proposal Notice */}
                {selectedQuote.counterDiscountProposed > 0 && (
                  <div className="p-3.5 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-purple-900">
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                        Red-Dashed Loop: Customer Counter-Proposal
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                        +{selectedQuote.counterDiscountProposed}% Concession Requested
                      </span>
                    </div>
                    <p className="text-purple-800">
                      Customer requested an additional discount of <strong>{selectedQuote.counterDiscountProposed}%</strong> (Delivery: {selectedQuote.requestedDeliveryDate ? new Date(selectedQuote.requestedDeliveryDate).toLocaleDateString() : 'Standard'}). Approving will advance the quote back to <strong>SENT_TO_CUSTOMER</strong> with the approved concession.
                    </p>
                  </div>
                )}

                {/* Line Items Table */}
                {selectedQuote.lines && selectedQuote.lines.length > 0 && (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[500px]">
                        <thead className="bg-gray-50 text-[11px] font-medium text-gray-500 uppercase border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3">Product</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Unit Price</th>
                            <th className="py-2 px-3 text-right">Discount</th>
                            <th className="py-2 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {selectedQuote.lines.map((l, i) => (
                            <tr key={i}>
                              <td className="py-2 px-3 font-medium">{l.productName}</td>
                              <td className="py-2 px-2 text-center">{l.quantity}</td>
                              <td className="py-2 px-3 text-right">₹{l.unitPrice}</td>
                              <td className="py-2 px-3 text-right text-amber-700">{l.discountPercent}%</td>
                              <td className="py-2 px-3 text-right font-semibold">
                                ₹{l.lineRevenue || (l.quantity * l.unitPrice * (1 - l.discountPercent / 100)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ACTIVITY, NEGOTIATION CONVERSATION & AUDIT HISTORY HUB */}
                <div className="pt-3 border-t border-zinc-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setModalTab('negotiation')}
                        className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          modalTab === 'negotiation'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <span>Negotiation History</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          modalTab === 'negotiation' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {selectedQuote.comments?.length || 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('audit')}
                        className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          modalTab === 'audit'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <span>Audit Trail</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          modalTab === 'audit' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          {selectedQuote.auditLogs?.length || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: NEGOTIATION CONVERSATION */}
                  {modalTab === 'negotiation' && (
                    <div className="space-y-2.5">
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(!selectedQuote.comments || selectedQuote.comments.length === 0) ? (
                          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                            <p className="text-xs text-zinc-600 font-medium">
                              No negotiation remarks recorded yet.
                            </p>
                          </div>
                        ) : (
                          selectedQuote.comments.map((c, i) => {
                            const isCustomer = (c.authorRole || '').toUpperCase() === 'CUSTOMER';
                            return (
                              <div
                                key={c.id || i}
                                className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                  isCustomer
                                    ? 'bg-zinc-50 border-zinc-300'
                                    : 'bg-white border-zinc-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      isCustomer
                                        ? 'bg-zinc-200 text-zinc-800'
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
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newRemarkText}
                          onChange={(e) => setNewRemarkText(e.target.value)}
                          placeholder="Add negotiation note or remark..."
                          className="flex-1 h-8 px-2.5 text-xs rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                        <button
                          type="button"
                          onClick={handlePostApprovalRemark}
                          disabled={isSubmittingRemark || !newRemarkText.trim()}
                          className="h-8 px-3 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
                        >
                          {isSubmittingRemark ? 'Adding...' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: GOVERNANCE AUDIT TRAIL */}
                  {modalTab === 'audit' && (
                    <div>
                      {(!selectedQuote.auditLogs || selectedQuote.auditLogs.length === 0) ? (
                        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                          <p className="text-xs text-zinc-600 font-medium">
                            No previous governance reviews recorded yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 max-h-56 overflow-y-auto pr-1">
                          {selectedQuote.auditLogs.map((log, idx) => (
                            <div key={log.id || idx} className="relative flex items-start gap-2.5 pl-1">
                              <span className="w-2 rounded-full bg-zinc-900 border border-white shadow-xs shrink-0 mt-1"></span>
                              <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex-1">
                                <div className="flex items-center justify-between mb-0.5 gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-zinc-900 text-[11px]">
                                      {log.actorName}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      ({log.actorRole})
                                    </span>
                                    {log.action && (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
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
                                <p className="text-zinc-700 font-normal text-[11px] leading-relaxed">
                                  {log.comment || log.note || `Action: ${log.action}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Note input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Approval / Revision Note <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Enter approval conditions or revision instructions..."
                    className="w-full h-8 px-3 rounded text-xs bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="h-8 px-3 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer self-start sm:self-auto"
                >
                  Close
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={processingId === selectedQuote.id}
                    onClick={() => handleAction(selectedQuote, 'RETURN', actionNote)}
                    className="h-8 px-3 rounded text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                  >
                    Request Revision
                  </button>
                  <button
                    type="button"
                    disabled={processingId === selectedQuote.id}
                    onClick={() => handleAction(selectedQuote, 'REJECT', actionNote)}
                    className="h-8 px-3 rounded text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={processingId === selectedQuote.id}
                    onClick={() => handleAction(selectedQuote, 'APPROVE', actionNote)}
                    className="h-8 px-4 rounded text-xs font-medium text-white bg-zinc-900 hover:bg-black transition cursor-pointer shadow-xs"
                  >
                    {processingId === selectedQuote.id ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}
