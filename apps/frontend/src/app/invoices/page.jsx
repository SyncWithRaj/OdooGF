'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Wire Transfer',
    reference: '',
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: '',
    quotationId: '',
    amount: '',
    dueDate: '',
  });

  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay checkout script once on mount
  useEffect(() => {
    if (document.getElementById('razorpay-sdk')) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error(err);
      showToast('Could not load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [custList, qData] = await Promise.all([
        apiClient.getCustomers().catch(() => []),
        fetch('/api/quotations').then((r) => r.json()).catch(() => ({ quotations: [] })),
      ]);
      const validCusts = Array.isArray(custList) ? custList : [];
      const validQuotes = qData.quotations || [];
      setCustomers(validCusts);
      setQuotations(validQuotes);

      // Prepopulate default form selection
      setCreateForm((prev) => ({
        ...prev,
        customerId: prev.customerId || validCusts[0]?.id || '',
        quotationId: prev.quotationId || validQuotes[0]?.id || '',
        amount: prev.amount || validQuotes[0]?.totalAmount || 5000,
        dueDate: prev.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error loading dependencies:', err);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadDependencies();
  }, []);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (activeStatus !== 'ALL' && inv.status !== activeStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchCust = inv.customer?.name?.toLowerCase().includes(q);
        const matchQuote = inv.quotation?.quoteNumber?.toLowerCase().includes(q);
        return matchNum || matchCust || matchQuote;
      }
      return true;
    });
  }, [invoices, activeStatus, searchQuery]);

  // Financial Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const paid = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const unpaid = invoices
      .filter((inv) => inv.status === 'UNPAID')
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const overdue = invoices
      .filter((inv) => inv.status === 'OVERDUE')
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);

    return { totalInvoiced, paid, unpaid, overdue };
  }, [invoices]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          action: 'RECORD_PAYMENT',
          amount: Number(paymentForm.amount) || selectedInvoice.amount,
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || `WIRE-${Date.now().toString().slice(-4)}`,
        }),
      });

      if (!res.ok) throw new Error('Payment recording failed');
      showToast(`Payment of $${paymentForm.amount || selectedInvoice.amount} logged successfully!`);
      setIsPayModalOpen(false);
      await loadInvoices();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!createForm.customerId || !createForm.quotationId || !createForm.amount) {
      alert('Please fill in all invoice details.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error('Failed to create invoice');
      showToast('Invoice generated and posted to ledger!');
      setIsCreateModalOpen(false);
      setCreateForm({ customerId: '', quotationId: '', amount: '', dueDate: '' });
      await loadInvoices();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.amount,
      paymentMethod: 'Wire Transfer',
      reference: `PAY-${Date.now().toString().slice(-6)}`,
    });
    setIsPayModalOpen(true);
  };

  // Razorpay checkout handler
  const handleRazorpayPayment = useCallback(async (invoice) => {
    if (!razorpayLoaded) {
      showToast('Razorpay SDK not loaded yet. Please try again.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const orderData = await apiClient.createRazorpayOrder(invoice.id, 'INR');

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DealFlow360',
        description: `Payment for ${invoice.invoiceNumber}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            await apiClient.verifyRazorpayPayment(
              invoice.id,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );
            showToast(`Payment of $${invoice.amount.toLocaleString()} confirmed via Razorpay!`);
            await loadInvoices();
          } catch (err) {
            showToast('Payment verification failed: ' + err.message, 'error');
          }
        },
        prefill: {
          name: invoice.customer?.name || '',
          email: invoice.customer?.email || '',
        },
        theme: { color: '#0f172a' },
        modal: {
          ondismiss: () => showToast('Payment cancelled', 'error'),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showToast('Could not initiate payment: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [razorpayLoaded, loadInvoices]);

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices &amp; Payments</h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-currency receivables tracking, milestone billings, and digital payment receipts.
            </p>
          </div>
          <button
            onClick={() => {
              if (customers.length > 0 && quotations.length > 0) {
                setCreateForm({
                  customerId: customers[0]?.id,
                  quotationId: quotations[0]?.id,
                  amount: quotations[0]?.totalAmount || 5000,
                  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                });
              }
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            + Issue Invoice
          </button>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              ${metrics.totalInvoiced.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Gross billings across all accounts</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Collected / Settled</p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              ${metrics.paid.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Cash received in bank</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Unpaid</p>
            <p className="text-xl font-black text-amber-600 mt-1">
              ${metrics.unpaid.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Active payment terms</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Balances</p>
            <p className="text-xl font-black text-rose-600 mt-1">
              ${metrics.overdue.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Past payment maturity</p>
          </div>
        </div>

        {/* Invoices Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'UNPAID', 'PAID', 'OVERDUE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeStatus === status
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search invoice #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Origin Quotation</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Settlement Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading invoices...</td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No invoices found.</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.customer?.name || 'Client'}</div>
                        <div className="text-[10px] text-slate-400">{inv.customer?.companyName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {inv.quotation?.quoteNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ${inv.amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {inv.status !== 'PAID' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRazorpayPayment(inv)}
                              disabled={submitting || !razorpayLoaded}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#072654] hover:bg-[#0a3a7a] text-white font-semibold text-[11px] shadow-xs transition disabled:opacity-50"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.09 1H5.91C4.31 1 3 2.31 3 3.91V20.09C3 21.69 4.31 23 5.91 23H18.09C19.69 23 21 21.69 21 20.09V3.91C21 2.31 19.69 1 18.09 1ZM12 18.5C10.07 18.5 8.5 16.93 8.5 15C8.5 13.07 10.07 11.5 12 11.5C13.93 11.5 15.5 13.07 15.5 15C15.5 16.93 13.93 18.5 12 18.5ZM12 10C9.24 10 7 12.24 7 15C7 17.76 9.24 20 12 20C14.76 20 17 17.76 17 15C17 12.24 14.76 10 12 10ZM12 6.5C10.62 6.5 9.5 5.38 9.5 4C9.5 2.62 10.62 1.5 12 1.5C13.38 1.5 14.5 2.62 14.5 4C14.5 5.38 13.38 6.5 12 6.5Z"/></svg>
                              Razorpay
                            </button>
                            <button
                              onClick={() => openPayModal(inv)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] transition"
                            >
                              Manual
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            ✓ Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Record Payment */}
        {isPayModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedInvoice.invoiceNumber}</p>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                {/* Razorpay quick-pay option */}
                <div className="p-3 rounded-xl bg-[#072654]/5 border border-[#072654]/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#072654] text-xs">Pay via Razorpay</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Instant online payment — cards, UPI, netbanking & wallets</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayModalOpen(false);
                      handleRazorpayPayment(selectedInvoice);
                    }}
                    disabled={submitting || !razorpayLoaded}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#072654] hover:bg-[#0a3a7a] text-white font-bold text-[11px] shadow-xs transition disabled:opacity-50"
                  >
                    Pay ₹{selectedInvoice?.amount?.toLocaleString()}
                  </button>
                </div>

                <div className="relative flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] text-slate-400 font-medium">or record manually</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Settlement Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="Wire Transfer">Wire Transfer (Fedwire / SWIFT)</option>
                    <option value="ACH">ACH Direct Deposit</option>
                    <option value="Credit Card">Corporate Card (Stripe)</option>
                    <option value="Check">Commercial Check</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transaction Reference / UTR</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TR-9981245-USD"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Recording...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue Invoice */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Issue New Invoice</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Account *</label>
                  <select
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.companyName || c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origin Quotation *</label>
                  <select
                    value={createForm.quotationId}
                    onChange={(e) => {
                      const q = quotations.find((quote) => quote.id === e.target.value);
                      setCreateForm({
                        ...createForm,
                        quotationId: e.target.value,
                        amount: q?.totalAmount || createForm.amount,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    {quotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quoteNumber} — ${q.totalAmount?.toLocaleString()} [{q.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Invoice Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Maturity Due *</label>
                    <input
                      type="date"
                      required
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Generating...' : 'Issue Invoice'}
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
