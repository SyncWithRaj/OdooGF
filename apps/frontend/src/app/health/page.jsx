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
  const summary = dealAlerts?.summary || {};
  const idleDeals = dealAlerts?.idleDeals || [];
  const discountAnomalies = dealAlerts?.discountAnomalies || dealAlerts?.anomalies || [];
  const deliverySlippages = dealAlerts?.deliverySlippages || [];

  const idleCriticalCount = summary.idleStalledCritical ?? idleDeals.filter(d => d.severity === 'CRITICAL').length;
  const idleWarningCount = summary.idleWarningMedium ?? idleDeals.filter(d => d.severity === 'MEDIUM').length;
  const idleHealthyCount = summary.idleHealthyLow ?? idleDeals.filter(d => d.severity === 'LOW').length;

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
              Deal Health, SLA &amp; Logistics Surveillance
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Engines 2, 3 &amp; 4 &bull; Tri-state idle time tracking, 90-day rep discount anomaly detection, and delivery promise slippage monitoring.
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

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Critical Idle (&ge;14d)</p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-2xl font-extrabold text-rose-700 mt-2">{idleCriticalCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Stalled deals requiring immediate rep nudge</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Warning Idle (7–14d)</p>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-2">{idleWarningCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Approaching SLA threshold ({idleHealthyCount} on track)</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Discount Anomalies</p>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            </div>
            <p className="text-2xl font-extrabold text-purple-700 mt-2">{discountAnomalies.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Exceeds rep 90-day median +10%</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Delivery Slippages</p>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-2xl font-extrabold text-blue-700 mt-2">{deliverySlippages.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Lead time exceeds customer promise</p>
          </div>
        </div>

        {/* Section 1: Engine 2 - Tri-State Deal Velocity & Idle-Time SLA */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">⏱️</span>
                Engine 2: Deal Velocity &amp; Idle-Time SLA Tracker
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates active pipeline deals against &lt;7d (Healthy), 7–14d (Medium Warning), and &ge;14d (Critical Stalled) thresholds.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {idleDeals.length} Active Deals
            </span>
          </div>

          {idleDeals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No active pipeline deals currently tracked.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {idleDeals.map((deal, idx) => {
                const isCritical = deal.severity === 'CRITICAL' || deal.idleTimeDays >= 14;
                const isWarning = deal.severity === 'MEDIUM' || (deal.idleTimeDays >= 7 && deal.idleTimeDays < 14);

                return (
                  <div key={deal.quotationId || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{deal.quoteNumber}</span>
                        {isCritical ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            CRITICAL &ge;14d ({deal.idleTimeDays}d idle)
                          </span>
                        ) : isWarning ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            WARNING 7-14d ({deal.idleTimeDays}d idle)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            HEALTHY &lt;7d ({deal.idleTimeDays}d idle)
                          </span>
                        )}
                        <span className="text-xs text-slate-700 font-medium">Customer: {deal.customerName}</span>
                        <span className="text-xs text-slate-400 font-mono">(${deal.totalAmount?.toLocaleString()})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Assigned Rep: <strong className="text-slate-700">{deal.salesRepName}</strong> &bull; Status: <span className="font-mono">{deal.status}</span> &bull; Last Activity: {new Date(deal.lastActivityAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(isCritical || isWarning) && (
                        <button
                          type="button"
                          disabled={nudgingQuoteId === deal.quotationId}
                          onClick={() => handleNudge(deal.quotationId)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          <span>🔔</span>
                          {nudgingQuoteId === deal.quotationId ? 'Nudging...' : 'Nudge Rep'}
                        </button>
                      )}
                      <Link
                        href="/quotations"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                      >
                        View Quote &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Engine 3 - 90-Day Rolling Rep Discount Anomalies */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">📊</span>
                Engine 3: 90-Day Rolling Rep Discount Anomalies
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Flags deals where line discounts exceed the sales rep's 90-day historical median baseline by more than +10.0%.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              {discountAnomalies.length} Flagged
            </span>
          </div>

          {discountAnomalies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No discount anomaly alerts. All rep discounts are within +10% of their 90-day rolling baseline.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {discountAnomalies.map((item, idx) => (
                <div key={item.quotationId || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{item.quoteNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        MEDIAN ANOMALY
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Customer: {item.customerName}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{item.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Sales Rep: {item.salesRepName} &bull; Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
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

        {/* Section 3: Engine 4 - Delivery Promise Slippage Surveillance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">🚚</span>
                Engine 4: Delivery Promise Slippage Surveillance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitors orders where promised delivery date is earlier than earliest warehouse dispatch &amp; Haversine transit arrival.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              {deliverySlippages.length} Slippages
            </span>
          </div>

          {deliverySlippages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No delivery slippage alerts detected. All promised delivery dates are logistically achievable.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deliverySlippages.map((slip, idx) => (
                <div key={slip.quotationId || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{slip.quoteNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        SLIPPAGE: +{slip.slippageDays} DAY(S)
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Customer: {slip.customerName}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{slip.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span>Promised: <strong className="text-slate-800">{slip.promisedDeliveryDate ? new Date(slip.promisedDeliveryDate).toLocaleDateString() : 'N/A'}</strong></span>
                      <span>&bull;</span>
                      <span>Earliest Possible: <strong className="text-blue-700">{slip.possibleDeliveryDate ? new Date(slip.possibleDeliveryDate).toLocaleDateString() : 'N/A'}</strong></span>
                      <span>&bull;</span>
                      <span>Rep: {slip.salesRepName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/fulfillment"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                    >
                      View in Fulfillment &rarr;
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
