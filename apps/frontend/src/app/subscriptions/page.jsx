'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: '',
    quotationId: '',
    planName: '',
    cycle: 'MONTHLY',
    amount: '',
  });

  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error(err);
      showToast('Could not load subscriptions', 'error');
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

      // Pre-populate form defaults
      setCreateForm((prev) => ({
        ...prev,
        customerId: prev.customerId || validCusts[0]?.id || '',
        quotationId: prev.quotationId || validQuotes[0]?.id || '',
        planName: prev.planName || 'Enterprise Cloud Operations SLA',
        amount: prev.amount || 2400,
      }));
    } catch (err) {
      console.error('Error loading dependencies:', err);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    loadDependencies();
  }, []);

  // Update status (pause / resume / cancel)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'UPDATE_STATUS', newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(`Subscription status updated to ${newStatus}`);
      await loadSubscriptions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtered
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (activeStatus !== 'ALL' && sub.status !== activeStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sub.planName?.toLowerCase().includes(q) ||
          sub.customer?.name?.toLowerCase().includes(q) ||
          sub.cycle?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [subscriptions, activeStatus, searchQuery]);

  // Financial MRR / ARR Metrics
  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'ACTIVE');
    let mrr = 0;
    active.forEach((s) => {
      const amt = s.amount || 0;
      if (s.cycle === 'MONTHLY') mrr += amt;
      else if (s.cycle === 'QUARTERLY') mrr += amt / 3;
      else if (s.cycle === 'YEARLY') mrr += amt / 12;
      else if (s.cycle === 'WEEKLY') mrr += amt * 4.33;
    });

    const arr = mrr * 12;
    const count = active.length;
    const acv = count > 0 ? Math.round(arr / count) : 0;

    return { mrr: Math.round(mrr), arr: Math.round(arr), count, acv };
  }, [subscriptions]);

  const handleCreateSub = async (e) => {
    e.preventDefault();
    if (!createForm.customerId || !createForm.quotationId || !createForm.planName || !createForm.amount) {
      alert('Please fill in all subscription details.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error('Failed to create subscription');
      showToast(`Subscription plan "${createForm.planName}" activated!`);
      setIsCreateModalOpen(false);
      setCreateForm({ customerId: '', quotationId: '', planName: '', cycle: 'MONTHLY', amount: '' });
      await loadSubscriptions();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Subscriptions &amp; MRR</h1>
            <p className="text-xs text-slate-500 mt-1">
              Automated renewal scheduling, MRR retention tracking, and billing cycle orchestration.
            </p>
          </div>
          <button
            onClick={() => {
              if (customers.length > 0 && quotations.length > 0) {
                setCreateForm({
                  customerId: customers[0]?.id,
                  quotationId: quotations[0]?.id,
                  planName: 'Enterprise SaaS Tier',
                  cycle: 'MONTHLY',
                  amount: 2500,
                });
              }
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            + New Subscription
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Recurring (MRR)</p>
            <p className="text-xl font-black text-emerald-600 mt-1">${metrics.mrr.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Normalized monthly recurring run</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Annual Run Rate (ARR)</p>
            <p className="text-xl font-black text-blue-600 mt-1">${metrics.arr.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">12-month forward contract baseline</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Subscriptions</p>
            <p className="text-xl font-black text-slate-900 mt-1">{metrics.count}</p>
            <p className="text-[10px] text-slate-400 mt-1">Live customer billing accounts</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Contract Value</p>
            <p className="text-xl font-black text-purple-600 mt-1">${metrics.acv.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Annual value per customer</p>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'ACTIVE', 'PAUSED', 'CANCELLED'].map((status) => (
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

            <div className="relative w-full sm:w-64">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search plan, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Billing Cycle</th>
                  <th className="py-3 px-4 text-right">Recurring Fee</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Next Renewal Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading subscriptions...</td>
                  </tr>
                ) : filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No subscriptions found.</td>
                  </tr>
                ) : (
                  filteredSubs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {sub.planName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{sub.customer?.name || 'Client'}</div>
                        <div className="text-[10px] text-slate-400">{sub.customer?.companyName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {sub.cycle}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ${sub.amount?.toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-normal">/{sub.cycle === 'YEARLY' ? 'yr' : 'mo'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : sub.status === 'PAUSED'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-slate-100 border-slate-300 text-slate-500'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        {sub.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, 'PAUSED')}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Pause
                          </button>
                        ) : sub.status === 'PAUSED' ? (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, 'ACTIVE')}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700"
                          >
                            Resume
                          </button>
                        ) : null}
                        {sub.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, 'CANCELLED')}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Subscription */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Provision Subscription</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSub} className="space-y-4 text-xs">
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
                  <label className="block font-semibold text-slate-700 mb-1">Associated Quotation / Order *</label>
                  <select
                    value={createForm.quotationId}
                    onChange={(e) => setCreateForm({ ...createForm, quotationId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    {quotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quoteNumber} — {q.customerName || 'Customer'} [${q.totalAmount?.toLocaleString()}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contract / Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Cloud Operations SLA"
                    value={createForm.planName}
                    onChange={(e) => setCreateForm({ ...createForm, planName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Billing Interval</label>
                    <select
                      value={createForm.cycle}
                      onChange={(e) => setCreateForm({ ...createForm, cycle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Recurring Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                    {submitting ? 'Provisioning...' : 'Activate Subscription'}
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
