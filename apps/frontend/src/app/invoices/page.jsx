'use client';

import { useState, useEffect, useMemo } from 'react';
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

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getInvoices();
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
      showToast('Could not load invoices from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [custList, qList] = await Promise.all([
        apiClient.getCustomers().catch(() => []),
        apiClient.getQuotations().catch(() => []),
      ]);
      const validCusts = Array.isArray(custList) ? custList : [];
      const validQuotes = Array.isArray(qList) ? qList : [];
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
      await apiClient.payInvoice(selectedInvoice.id, {
        amount: Number(paymentForm.amount) || selectedInvoice.amount,
        paymentMethod: paymentForm.paymentMethod || 'Wire Transfer',
        reference: paymentForm.reference || `WIRE-${Date.now().toString().slice(-4)}`,
      });

      showToast(`Payment of $${paymentForm.amount || selectedInvoice.amount} logged successfully!`);
      setIsPayModalOpen(false);
      await loadInvoices();
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!createForm.quotationId) {
      alert('Please select a quotation.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.generateInvoicesFromQuotation(createForm.quotationId);
      showToast('Invoice generated from quotation successfully!');
      setIsCreateModalOpen(false);
      setCreateForm({ customerId: '', quotationId: '', amount: '', dueDate: '' });
      await loadInvoices();
    } catch (err) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = (inv) => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${inv.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .brand span { color: #10b981; }
    .inv-title { text-align: right; }
    .inv-number { font-size: 20px; font-weight: 800; color: #0f172a; font-family: monospace; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
    .badge-paid { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-unpaid { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-overdue { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
    .col { flex: 1; font-size: 13px; line-height: 1.6; }
    .col h4 { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; font-size: 13px; margin-bottom: 30px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals-row.grand { border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; margin-top: 8px; padding-top: 10px; }
    .remittance { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 12px; color: #475569; }
    .remittance h4 { font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 6px; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">DealFlow<span>360</span></div>
      <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Enterprise CPQ &amp; Sales Operations Platform</p>
      <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">100 Montgomery St, Suite 1400, San Francisco, CA</p>
    </div>
    <div class="inv-title">
      <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Commercial Invoice</div>
      <div class="inv-number">${inv.invoiceNumber}</div>
      <span class="badge ${inv.status === 'PAID' ? 'badge-paid' : inv.status === 'OVERDUE' ? 'badge-overdue' : 'badge-unpaid'}">
        ${inv.status}
      </span>
    </div>
  </div>

  <div class="grid">
    <div class="col">
      <h4>Billed To</h4>
      <strong>${inv.customer?.name || 'Customer Account'}</strong><br>
      ${inv.customer?.companyName ? inv.customer.companyName + '<br>' : ''}
      ${inv.customer?.email ? inv.customer.email + '<br>' : ''}
      Account Tier: <strong>${inv.customer?.tier || 'SILVER'}</strong>
    </div>
    <div class="col" style="text-align: right;">
      <h4>Invoice Summary</h4>
      Date Issued: <strong>${new Date(inv.createdAt).toLocaleDateString()}</strong><br>
      Payment Due: <strong>${new Date(inv.dueDate).toLocaleDateString()}</strong><br>
      Origin Quotation: <strong>${inv.quotation?.quoteNumber || 'Q-1506'}</strong><br>
      Billing Type: <strong>${inv.invoiceType || 'ONE_TIME'}</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description / Billing Item</th>
        <th>Type</th>
        <th class="text-right">Unit Rate</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Commercial Proposal Order (${inv.quotation?.quoteNumber || inv.invoiceNumber})</strong><br>
          <span style="font-size: 11px; color: #64748b;">Enterprise CPQ contracted line items and SLA delivery</span>
        </td>
        <td>${inv.invoiceType || 'ONE_TIME'}</td>
        <td class="text-right">$${inv.amount?.toLocaleString()}</td>
        <td class="text-right"><strong>$${inv.amount?.toLocaleString()}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Net Subtotal:</span>
      <span>$${inv.amount?.toLocaleString()}</span>
    </div>
    <div class="totals-row">
      <span>Applicable Tax:</span>
      <span>$0.00</span>
    </div>
    <div class="totals-row grand">
      <span>Total Investment:</span>
      <span>$${inv.amount?.toLocaleString()}</span>
    </div>
  </div>

  <div class="remittance">
    <h4>Payment &amp; Remittance Wire Instructions</h4>
    <p style="margin: 0 0 6px 0;">Please wire payments quoting invoice number <strong>${inv.invoiceNumber}</strong> as remittance memo.</p>
    <p style="margin: 0; font-family: monospace;">Silicon Valley Bank &bull; Routing: 121000358 &bull; Account: 9844-0192-3819 &bull; SWIFT: SVBUS6S</p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWin = window.open(url, '_blank');
    if (printWin) {
      printWin.focus();
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${inv.invoiceNumber}.html`;
      a.click();
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

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Flash Toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
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
            <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
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
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inv)}
                          title="Download / Print Invoice"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        {inv.status !== 'PAID' ? (
                          <button
                            onClick={() => openPayModal(inv)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                          >
                            Record Payment
                          </button>
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
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
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
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
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
