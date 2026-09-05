'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [notification, setNotification] = useState(null);

  // Negotiation Modal
  const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
  const [counterDiscount, setCounterDiscount] = useState(5);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [negotiateNotes, setNegotiateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCustomerQuotes = async () => {
    setLoading(true);
    try {
      const all = await quotationsService.getQuotations();
      // Show quotes where customer matches or all active quotes for demo customer preview
      const customerQuotes = all.filter(
        (q) =>
          !user ||
          user.role !== 'customer' ||
          q.customer?.email === user.email ||
          q.customerId === user.id ||
          true // Allow demo preview
      );
      setQuotations(customerQuotes);
      if (customerQuotes.length > 0 && !selectedQuote) {
        setSelectedQuote(customerQuotes[0]);
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
  }, []);

  const handleAcceptQuote = async (quote) => {
    if (!confirm(`Confirm acceptance and digitally sign Quotation ${quote.quoteNumber}?`)) {
      return;
    }
    try {
      await quotationsService.confirmOrder(quote.id, user);
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
      await quotationsService.updateQuotationStatus(selectedQuote.id, 'UNDER_NEGOTIATION', user);
      showToast(`Counter-proposal of ${counterDiscount}% discount submitted to your Account Executive!`);
      setIsNegotiateModalOpen(false);
      await loadCustomerQuotes();
    } catch (err) {
      alert(err.message || 'Failed to submit counter offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireRole roles={['customer', 'admin', 'rep', 'manager']}>
      <AppLayout>
        {/* Flash Toast */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in">
            <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Quote &amp; Acceptance Portal</h1>
            <p className="text-xs text-slate-500 mt-1">
              Account: <strong className="text-slate-800">{user?.name || 'Valued Client'}</strong> ({user?.email || 'customer@dealflow.com'})
            </p>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto shadow-2xs">
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
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Quotations</h2>
              {quotations.map((q) => {
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
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                          isSelected
                            ? 'bg-white/10 text-white border-white/20'
                            : q.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p className={`text-xs font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-800'}`}>
                      ${q.totalAmount?.toLocaleString()}
                    </p>
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
            </div>

            {/* Right: Selected Quotation Details & Digital Sign-off */}
            {selectedQuote && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
                {/* Quotation Top Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block uppercase">Commercial Quotation</span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">{selectedQuote.quoteNumber}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Issued to {selectedQuote.customer?.name} ({selectedQuote.customer?.companyName || 'Direct Client'})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedQuote.status !== 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => {
                            setCounterDiscount(5);
                            setDeliveryDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
                            setIsNegotiateModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          💬 Request Counter Terms
                        </button>
                        <button
                          onClick={() => handleAcceptQuote(selectedQuote)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                        >
                          ✓ Accept &amp; Digitally Sign
                        </button>
                      </>
                    )}
                    {selectedQuote.status === 'CONFIRMED' && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                        ✓ Formally Accepted &amp; Confirmed
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itemized Catalog Lines</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
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
                                {line.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              {line.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-900">
                              ${line.unitPrice?.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-amber-600">
                              {line.discountPercent || 0}%
                            </td>
                            <td className="py-3 px-3 text-right font-black text-slate-900">
                              ${(line.lineTotal || (line.unitPrice * line.quantity))?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-4 border-t border-slate-100">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <p className="font-bold text-slate-800">Delivery &amp; Contract Terms</p>
                    <p className="text-slate-500">• Net 30 payment terms via Wire Transfer / ACH.</p>
                    <p className="text-slate-500">• Estimated dispatch within 5 business days from depot.</p>
                    <p className="text-slate-500">• 1-Year hardware warranty and 24/7 incident response SLA included.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Subtotal</span>
                      <span className="font-medium">${(selectedQuote.subtotalAmount || selectedQuote.totalAmount)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Approved Concession Discount</span>
                      <span className="font-semibold">-${(selectedQuote.totalDiscountAmount || 0)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable Tax (18% GST / VAT)</span>
                      <span className="font-medium">${(selectedQuote.totalTaxAmount || 0)?.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-900">Final Order Investment</span>
                      <span className="text-xl font-black text-slate-900">
                        ${selectedQuote.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Customer Counter Proposal */}
        {isNegotiateModalOpen && selectedQuote && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Counter Proposal</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedQuote.quoteNumber}</p>
                </div>
                <button onClick={() => setIsNegotiateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendCounterOffer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requested Extra Discount Concession (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    required
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Subject to Sales Manager and Finance approval</p>
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
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Notes / Terms</label>
                  <textarea
                    rows={3}
                    placeholder="We require dispatch within 14 days and additional discount to align with our annual budget."
                    value={negotiateNotes}
                    onChange={(e) => setNegotiateNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNegotiateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs disabled:opacity-50"
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
