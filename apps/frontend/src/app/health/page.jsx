'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';
import Link from 'next/link';

export default function DealHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [dealAlerts, setDealAlerts] = useState({ alerts: [], anomalies: [], stalledDeals: [] });
  const [loading, setLoading] = useState(true);
  const [nudgingQuoteId, setNudgingQuoteId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [probeRes, alertsRes] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.getDealHealth(),
      ]);

      if (probeRes.status === 'fulfilled') setHealthData(probeRes.value);
      if (alertsRes.status === 'fulfilled') setDealAlerts(alertsRes.value || {});
    } catch (err) {
      console.error('Failed to load deal health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleNudge = async (quotationId) => {
    setNudgingQuoteId(quotationId);
    try {
      await apiClient.nudgeRep({
        quotationId,
        message: 'Please review stalled quotation terms and contact client.',
      });
      showToast('Nudge alert dispatched to sales representative!');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch nudge', 'error');
    } finally {
      setNudgingQuoteId(null);
    }
  };

  const isHealthy = healthData?.status === 'ok' || healthData?.db === 'connected';
  const totalAnomalies = (dealAlerts.anomalies || []).length;
  const totalStalled = (dealAlerts.stalledDeals || []).length;
  const totalAlerts = (dealAlerts.alerts || []).length;

  return (
    <RequireRole roles={['manager', 'finance', 'admin', 'rep']}>
      <AppLayout>
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            {toast.msg}
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Deal Health &amp; Anomaly Surveillance
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Screen 14 / B9 &bull; Real-time detection of stalled deals, discount anomalies, and rep nudges.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Database Probe Mini Badge */}
            <div className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 ${
              isHealthy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>PostgreSQL 16: {isHealthy ? 'Connected (1ms)' : 'Offline'}</span>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount Anomalies</p>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalAnomalies}</p>
            <p className="text-[11px] text-slate-500 mt-1">Concession exceeds permitted margin limit</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stalled Deals</p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalStalled}</p>
            <p className="text-[11px] text-slate-500 mt-1">Inactive quotes &gt; 7 days without confirmation</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Watchlist</p>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalAnomalies + totalStalled + totalAlerts}</p>
            <p className="text-[11px] text-slate-500 mt-1">High-risk quotations flagged for management</p>
          </div>
        </div>

        {/* Section 1: Discount Anomaly Surveillance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Discount Anomaly Alerts (High Margin Concession)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quotations flagged when offered discount exceeds sales tier limit or category ceiling.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {totalAnomalies} Flagged
            </span>
          </div>

          {totalAnomalies === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No discount anomaly alerts at this time. All active deals comply with governance ceilings.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dealAlerts.anomalies.map((item, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{item.quoteNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        HIGH RISK
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Customer: {item.customerName}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Rep: {item.salesRepName} &bull; Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/approvals"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    >
                      Review in Approvals &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Stalled Deals & Rep Nudge Action */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Stalled Deals &bull; Inactive Pipeline Follow-up
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quotations waiting in negotiation or sent to customer for &gt; 7 days without progress.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              {totalStalled} Stalled
            </span>
          </div>

          {totalStalled === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No stalled deals detected. Deal momentum is healthy across all sales pipeline stages.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dealAlerts.stalledDeals.map((deal, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{deal.quoteNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        STALLED &gt;7D
                      </span>
                      <span className="text-xs text-slate-600 font-medium">{deal.customerName}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{deal.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Rep: {deal.salesRepName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={nudgingQuoteId === deal.quotationId}
                      onClick={() => handleNudge(deal.quotationId)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <span>🔔</span>
                      {nudgingQuoteId === deal.quotationId ? 'Nudging...' : 'Nudge Rep'}
                    </button>
                    <Link
                      href="/quotations"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                    >
                      View Quote &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </RequireRole>
  );
}
