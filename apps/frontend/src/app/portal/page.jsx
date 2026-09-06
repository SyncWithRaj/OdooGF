'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

function CustomerPortalInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const quoteParam = searchParams.get('quote');

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    totalItems,
    paginatedItems: paginatedQuotes,
  } = usePagination(quotations, 5);

  // Negotiation Modal
  const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
  const [counterDiscount, setCounterDiscount] = useState(5);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [negotiateNotes, setNegotiateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Comment Box
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Shortage Action Submitting
  const [handlingShortage, setHandlingShortage] = useState(false);

  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  const loadCustomerQuotes = async () => {
    setLoading(true);
    try {
      const customerQuotes = await apiClient.getPortalQuotes();
      const list = customerQuotes || [];
      setQuotations(list);

      // Determine quote to select
      if (list.length > 0) {
        let match = null;
        if (tokenParam) {
          match = list.find((q) => q.portalToken === tokenParam || q.id === tokenParam);
        }
        if (!match && quoteParam) {
          match = list.find((q) => q.quoteNumber?.toLowerCase() === quoteParam.toLowerCase());
        }
        if (!match) {
          match = selectedQuote ? list.find((q) => q.id === selectedQuote.id) || list[0] : list[0];
        }
        setSelectedQuote(match);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not load quotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerQuotes();
  }, [tokenParam, quoteParam]);

  const handleAcceptQuote = async (quote) => {
    if (quote.status === 'PENDING_APPROVAL') {
      alert('This quotation is currently undergoing internal management review. You will be able to digitally sign as soon as sales leadership approves the terms.');
      return;
    }
    if (!confirm(`Confirm acceptance and digitally sign Quotation ${quote.quoteNumber}?`)) {
      return;
    }
    try {
      if (quote.portalToken) {
        await apiClient.acceptPortalQuote(quote.portalToken, {
          acknowledgementNote: `Digitally signed by ${user?.name || user?.email || 'Customer'}`,
        });
      } else {
        await quotationsService.confirmOrder(quote.id, user);
      }
      showToast(`Quotation ${quote.quoteNumber} accepted and confirmed! Delivery order queued.`);
      await loadCustomerQuotes();
    } catch (err) {
      alert(err.message || 'Failed to accept quotation');
    }
  };

  const handleSendCounterOffer = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setSubmitting(true);
    try {
      let res;
      if (selectedQuote.portalToken) {
        res = await apiClient.counterPortalQuote(selectedQuote.portalToken, {
          counterDiscountProposed: Number(counterDiscount),
          counterDiscountPercent: Number(counterDiscount),
          requestedDeliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
          message: negotiateNotes || 'Customer requested counter terms',
        });
      } else {
        res = await quotationsService.updateQuotationStatus(selectedQuote.id, 'UNDER_NEGOTIATION', user);
      }

      if (res?.triggeredReApproval) {
        showToast(`Red-Dashed Loop Triggered: Counter concession (+${res.deviation || 0}pt deviation) auto-routed to Sales Operations for management approval!`, 'info');
      } else {
        showToast(`Counter-proposal of ${counterDiscount}% discount submitted to your Account Executive!`);
      }
      setIsNegotiateModalOpen(false);
      await loadCustomerQuotes();
    } catch (err) {
      alert(err.message || 'Failed to submit counter offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedQuote?.portalToken) return;
    setSubmittingComment(true);
    try {
      await apiClient.commentPortalQuote(selectedQuote.portalToken, commentText.trim());
      setCommentText('');
      showToast('Negotiation note added to deal history.');
      await loadCustomerQuotes();
    } catch (err) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShortageResponse = async (action) => {
    if (!selectedQuote?.portalToken) return;
    setHandlingShortage(true);
    try {
      await apiClient.apiRequest(`/api/portal/quote/${selectedQuote.portalToken}/shortage-action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      showToast(action === 'ACCEPT_PARTIAL' ? 'Accepted partial delivery shipment.' : 'Selected to wait for full restocking.');
      await loadCustomerQuotes();
    } catch (err) {
      showToast(err.message || 'Failed to submit shortage preference', 'error');
    } finally {
      setHandlingShortage(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-white">Accepted</span>;
      case 'SENT_TO_CUSTOMER':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Ready to Sign</span>;
      case 'UNDER_NEGOTIATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">In Negotiation</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Under Review</span>;
      case 'FULFILLED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">Fulfilled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">{status}</span>;
    }
  };

  return (
    <RequireRole roles={['customer', 'admin', 'rep', 'manager']}>
      <AppLayout>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Customer Quote &amp; Acceptance Portal</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Account: <strong className="text-zinc-800">{user?.name || 'Valued Client'}</strong> ({user?.email || 'customer@dealflow.com'})
            </p>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-semibold self-start sm:self-auto shadow-2xs">
            Client Self-Service Portal
          </span>
        </div>

        {/* Content Layout */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            Loading your quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
            You have no pending quotes right now. Your sales representative will notify you when a quote is ready.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* Left: Quotes List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Quotations</h2>
                <span className="text-[11px] font-bold text-slate-500">{quotations.length}</span>
              </div>

              {paginatedQuotes.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold">{q.quoteNumber}</span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20">
                          {q.status}
                        </span>
                      ) : (
                        getStatusBadge(q.status)
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className={`text-xs font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-800'}`}>
                        ₹{q.totalAmount?.toLocaleString()}
                      </p>
                      {q.counterDiscountProposed > 0 && (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-purple-300' : 'text-purple-700'}`}>
                          {q.counterDiscountProposed}% Counter
                        </span>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100/20 flex items-center justify-between text-[10px]">
                      <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>
                        {q.lines?.length || 0} line items
                      </span>
                      <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                        Rep: {q.salesRep?.fullName?.split(' ')[0] || 'Sales Rep'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <Pagination
                compact={true}
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>

            {/* Right: Selected Quotation Details & Digital Sign-off */}
            {selectedQuote && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
                {/* Quotation Top Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-400 uppercase">Commercial Quotation</span>
                      {getStatusBadge(selectedQuote.status)}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">{selectedQuote.quoteNumber}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Issued to <strong className="text-slate-700">{selectedQuote.customer?.name}</strong> ({selectedQuote.customer?.companyName || 'Direct Client'}) • Sales Rep: {selectedQuote.salesRep?.fullName || 'Account Executive'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedQuote.status !== 'CONFIRMED' && selectedQuote.status !== 'FULFILLED' && (
                      <>
                        <button
                          onClick={() => {
                            setCounterDiscount(selectedQuote.counterDiscountProposed || 5);
                            setDeliveryDate(
                              selectedQuote.requestedDeliveryDate
                                ? new Date(selectedQuote.requestedDeliveryDate).toISOString().split('T')[0]
                                : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
                            );
                            setIsNegotiateModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          {selectedQuote.status === 'UNDER_NEGOTIATION' ? 'Adjust Counter Terms' : 'Request Counter Terms'}
                        </button>
                        <button
                          onClick={() => handleAcceptQuote(selectedQuote)}
                          disabled={selectedQuote.status === 'PENDING_APPROVAL'}
                          className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                            selectedQuote.status === 'PENDING_APPROVAL'
                              ? 'bg-zinc-400 cursor-not-allowed opacity-60'
                              : 'bg-zinc-900 hover:bg-black'
                          }`}
                        >
                          {selectedQuote.status === 'PENDING_APPROVAL' ? 'Awaiting Governance Approval' : 'Accept & Digitally Sign'}
                        </button>
                      </>
                    )}
                    {selectedQuote.status === 'CONFIRMED' && (
                      <span className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white font-semibold text-xs flex items-center gap-1.5">
                        Formally Accepted &amp; Digitally Signed
                      </span>
                    )}
                  </div>
                </div>

                {/* NEGOTIATION / GOVERNANCE STATUS BANNER */}
                {selectedQuote.status === 'PENDING_APPROVAL' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                      <span>Red-Dashed Loop Governance Review in Progress</span>
                    </div>
                    <p className="text-amber-800">
                      Your requested counter-concession of <strong className="font-semibold">{selectedQuote.counterDiscountProposed}%</strong> exceeds automated limits and is currently undergoing executive governance sign-off.
                    </p>
                    <p className="text-amber-700 text-[11px]">
                      Your Account Executive will contact you or update the terms shortly once leadership approval is granted. Digital signing is paused until approved.
                    </p>
                  </div>
                )}

                {selectedQuote.status === 'UNDER_NEGOTIATION' && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                        <span>Negotiation Active: Counter Terms Submitted</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-200">
                        {selectedQuote.counterDiscountProposed}% Requested Discount
                      </span>
                    </div>
                    <p className="text-purple-800">
                      You proposed an additional concession of <strong className="font-semibold">{selectedQuote.counterDiscountProposed}%</strong>. Requested delivery: <strong>{selectedQuote.requestedDeliveryDate ? new Date(selectedQuote.requestedDeliveryDate).toLocaleDateString() : 'Standard'}</strong>.
                    </p>
                    <p className="text-purple-700 text-[11px]">
                      Your sales team is reviewing your counter proposal. You may adjust terms or send messages in the discussion thread below.
                    </p>
                  </div>
                )}

                {selectedQuote.status === 'SENT_TO_CUSTOMER' && selectedQuote.counterDiscountProposed > 0 && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-zinc-950 text-sm">
                      <svg className="w-4 h-4 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Counter Terms Approved by Leadership</span>
                    </div>
                    <p className="text-zinc-700">
                      Management has approved your requested <strong>{selectedQuote.counterDiscountProposed}%</strong> discount concession! The updated commercial terms are ready for your digital signature.
                    </p>
                  </div>
                )}

                {/* Engine 5: SHORTAGE REVIEW NOTICE */}
                {selectedQuote.isShortageReviewRequired && (
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-orange-950">Immediate Dispatch Option (Inventory Shortage)</span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px] border border-orange-200">
                        Shortage Review
                      </span>
                    </div>
                    <p className="text-orange-800">
                      Warehouse has {selectedQuote.proposedPartialQuantity} units in stock ready for instant shipment. The remainder will ship upon restocking.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleShortageResponse('ACCEPT_PARTIAL')}
                        disabled={handlingShortage}
                        className="px-3.5 py-1.5 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition cursor-pointer"
                      >
                        Accept Partial Shipment ({selectedQuote.proposedPartialQuantity} units now)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShortageResponse('REJECT_WAIT')}
                        disabled={handlingShortage}
                        className="px-3.5 py-1.5 rounded-lg border border-orange-300 text-orange-800 font-semibold hover:bg-orange-100 transition cursor-pointer"
                      >
                        Wait for Full Restocking
                      </button>
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itemized Catalog Lines</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600 min-w-[580px]">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3 text-center">Category</th>
                            <th className="py-2.5 px-3 text-center">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">Concession %</th>
                            <th className="py-2.5 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedQuote.lines || []).map((line, idx) => (
                            <tr key={line.id || idx}>
                              <td className="py-3 px-3 font-semibold text-slate-900">
                                {line.product?.name || line.productName || 'Catalog Product'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {line.category || line.product?.category || 'Standard'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-800">
                                {line.quantity}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-slate-900">
                                ₹{line.unitPrice?.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-amber-600">
                                {line.discountPercent || 0}%
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-900">
                                ₹{(line.lineTotal || (line.unitPrice * line.quantity * (1 - (line.discountPercent || 0) / 100)))?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2 border-t border-slate-100">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <p className="font-bold text-slate-800">Commercial Terms &amp; Assurance</p>
                    <p className="text-slate-500">• Net 30 payment terms via Wire Transfer / ACH.</p>
                    <p className="text-slate-500">• Estimated dispatch within 5 business days from depot.</p>
                    <p className="text-slate-500">• 1-Year comprehensive enterprise warranty and support SLA included.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Subtotal</span>
                      <span className="font-medium">₹{(selectedQuote.subtotalAmount || selectedQuote.totalAmount)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Approved Concession Discount</span>
                      <span className="font-semibold">-₹{(selectedQuote.totalDiscountAmount || 0)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable Tax (18% GST / VAT)</span>
                      <span className="font-medium">₹{(selectedQuote.totalTaxAmount || 0)?.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-900">Final Order Investment</span>
                      <span className="text-xl font-black text-slate-900">
                        ₹{selectedQuote.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NEGOTIATION DISCUSSION STREAM */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Negotiation Discussion &amp; Remarks
                  </h3>

                  <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto">
                    {(!selectedQuote.comments || selectedQuote.comments.length === 0) ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                        No negotiation remarks recorded yet. You can submit questions or counter terms below.
                      </p>
                    ) : (
                      selectedQuote.comments.map((c, i) => (
                        <div key={c.id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900">
                              {c.authorName || 'User'}{' '}
                              <span className="font-normal text-slate-500">
                                ({c.authorRole?.toLowerCase() || 'participant'})
                              </span>
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString() + ' ' + new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-slate-700">{c.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedQuote.status !== 'CONFIRMED' && selectedQuote.status !== 'FULFILLED' && (
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a remark or clarification request for your sales representative..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !commentText.trim()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        {submittingComment ? 'Posting...' : 'Send Note'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Customer Counter Proposal */}
        {isNegotiateModalOpen && selectedQuote && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Counter Proposal</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedQuote.quoteNumber}</p>
                </div>
                <button onClick={() => setIsNegotiateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-900">
                <span className="font-bold block mb-0.5">Automated Governance Notice:</span>
                Proposals within standard tier policy are directly recorded for your Account Executive. Requests exceeding tier policy will automatically trigger the executive governance approval loop (The Red-Dashed Loop).
              </div>

              <form onSubmit={handleSendCounterOffer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requested Extra Discount Concession (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Standard tier allowable limit: Gold (15%), Silver (10%), Bronze (5%)
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preferred Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Notes / Terms Justification</label>
                  <textarea
                    rows={3}
                    placeholder="e.g., We require dispatch within 14 days and additional concession to align with our annual capital budget."
                    value={negotiateNotes}
                    onChange={(e) => setNegotiateNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNegotiateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Dispatch Counter Offer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 text-sm font-medium">Loading Customer Portal...</div>}>
      <CustomerPortalInner />
    </Suspense>
  );
}
