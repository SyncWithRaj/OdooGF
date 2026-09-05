'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';

export default function ApprovalsPage() {
  const { user, login } = useAuth();
  const currentRole = (user?.role || 'manager').toLowerCase();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all | manager | finance
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionNote, setActionNote] = useState('');

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load live quotations from PostgreSQL
  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await quotationsService.getQuotations();
      setQuotations(data);
    } catch (err) {
      console.error('Failed to load pending quotations:', err);
      showToast('Error loading approvals queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [user?.role]);

  // Filter only quotations needing approval
  const pendingQuotes = useMemo(() => {
    return quotations.filter((q) => q.status === 'PENDING_APPROVAL');
  }, [quotations]);

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
        const matchesNumber = q.quoteNumber?.toLowerCase().includes(query);
        const matchesCustomer = q.customerName?.toLowerCase().includes(query);
        const matchesRep = q.salesRepName?.toLowerCase().includes(query);
        return matchesNumber || matchesCustomer || matchesRep;
      }
      return true;
    });
  }, [pendingQuotes, activeTab, searchQuery]);

  // Quick Persona Switch for testing
  const handleSwitchPersona = async (targetEmail) => {
    try {
      const res = await login(targetEmail, '123456');
      if (res && res.success) {
        showToast(`Switched persona to ${res.user?.fullName} (${res.user?.role})`, 'info');
      } else {
        const res2 = await login(targetEmail, 'password123');
        if (res2 && res2.success) {
          showToast(`Switched persona to ${res2.user?.fullName} (${res2.user?.role})`, 'info');
        }
      }
    } catch (e) {
      console.warn('Persona switch error:', e);
    }
  };

  // Governance Actions
  const handleAction = async (quote, actionType, customNote = '') => {
    setProcessingId(quote.id);
    try {
      if (actionType === 'APPROVE') {
        const res = await quotationsService.approveQuotation(quote.id, user, customNote);
        showToast(
          res.status === 'APPROVED'
            ? `Quotation ${quote.quoteNumber} approved!`
            : `Quotation ${quote.quoteNumber} approved at L1 and sent to Finance.`
        );
      } else if (actionType === 'RETURN') {
        await quotationsService.returnForRevision(quote.id, user, customNote);
        showToast(`Quotation ${quote.quoteNumber} returned for revision.`);
      } else if (actionType === 'REJECT') {
        await quotationsService.rejectQuotation(quote.id, user, customNote);
        showToast(`Quotation ${quote.quoteNumber} rejected.`, 'info');
      }
      if (selectedQuote?.id === quote.id) {
        setSelectedQuote(null);
      }
      await loadApprovals();
    } catch (err) {
      console.error('Governance action failed:', err);
      showToast('Action failed. Please try again.', 'error');
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
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Low Risk</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Medium Risk</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>High Risk</span>;
      default:
        return null;
    }
  };

  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        {/* FLASH TOAST */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-md shadow-lg bg-gray-900 text-white text-xs font-medium border border-gray-800 animate-in fade-in slide-in-from-top-4">
            <span className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : notification.type === 'info' ? 'bg-blue-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Approvals</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                pendingQuotes.length > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {pendingQuotes.length} Pending
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Review and authorize quotation discount requests and margin limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick role switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200">
              <span className="text-xs font-medium text-gray-500 px-2">Role:</span>
              <button
                onClick={() => handleSwitchPersona('manager@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${currentRole === 'manager' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Manager
              </button>
              <button
                onClick={() => handleSwitchPersona('finance@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${currentRole === 'finance' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Finance
              </button>
              <button
                onClick={() => handleSwitchPersona('admin@dealflow.com')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${currentRole === 'admin' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Admin
              </button>
            </div>

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
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
              <table className="w-full text-left text-xs border-collapse">
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
                  {displayedQuotes.map((quote) => {
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
                            onClick={() => setSelectedQuote(quote)}
                            className="font-semibold text-gray-900 hover:text-emerald-700 hover:underline cursor-pointer text-left"
                          >
                            {quote.quoteNumber}
                          </button>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{quote.customerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getTierBadge(quote.customerTier)}
                            <span className="text-[10px] text-gray-400 truncate max-w-[140px]">{quote.customerEmail}</span>
                          </div>
                        </td>

                        {/* Sales Rep */}
                        <td className="py-3 px-4 text-gray-600">
                          {quote.salesRepName}
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
                          <span className="block text-[10px] text-gray-400">-${quote.totalDiscountAmount}</span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          ${quote.totalAmount?.toLocaleString()}
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
                                  className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
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
                              onClick={() => setSelectedQuote(quote)}
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
          </div>
        )}

        {/* SIMPLE DETAIL & ACTION MODAL */}
        {selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      {selectedQuote.quoteNumber}
                    </h2>
                    {getTierBadge(selectedQuote.customerTier)}
                    {getRiskBadge(selectedQuote.blendedRiskScore)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: {selectedQuote.customerName} ({selectedQuote.customerEmail})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Financial Summary */}
                <div className="grid grid-cols-4 gap-3 p-3 rounded bg-gray-50 border border-gray-200 text-center">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Subtotal</span>
                    <span className="font-semibold text-gray-900">${selectedQuote.subtotalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Discount ({selectedQuote.orderDiscountPercent}%)</span>
                    <span className="font-semibold text-amber-700">-${selectedQuote.totalDiscountAmount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Total</span>
                    <span className="font-semibold text-emerald-700">${selectedQuote.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Margin</span>
                    <span className="font-semibold text-gray-900">{selectedQuote.totalMarginPercent}%</span>
                  </div>
                </div>

                {/* Line Items Table */}
                {selectedQuote.lines && selectedQuote.lines.length > 0 && (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-left">
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
                            <td className="py-2 px-3 text-right">${l.unitPrice}</td>
                            <td className="py-2 px-3 text-right text-amber-700">{l.discountPercent}%</td>
                            <td className="py-2 px-3 text-right font-semibold">
                              ${l.lineRevenue || (l.quantity * l.unitPrice * (1 - l.discountPercent / 100)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

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
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="h-8 px-3 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
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
                    className="h-8 px-4 rounded text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs"
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
