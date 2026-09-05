'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { quotationsService } from '@/services/quotationsService';
import { useAuth } from '@/context/AuthContext';

const STAGES = [
  { id: 'DRAFT', label: 'Draft', color: 'slate', border: 'border-slate-300', bg: 'bg-slate-50' },
  { id: 'PENDING_APPROVAL', label: 'In Approval', color: 'amber', border: 'border-amber-300', bg: 'bg-amber-50/50' },
  { id: 'SENT_TO_CUSTOMER', label: 'Sent to Customer', color: 'blue', border: 'border-blue-300', bg: 'bg-blue-50/50' },
  { id: 'UNDER_NEGOTIATION', label: 'Negotiation', color: 'purple', border: 'border-purple-300', bg: 'bg-purple-50/50' },
  { id: 'CONFIRMED', label: 'Confirmed / Won', color: 'emerald', border: 'border-emerald-300', bg: 'bg-emerald-50/50' },
];

export default function PipelinePage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [movingId, setMovingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const list = await quotationsService.getQuotations();
      setQuotations(list);
    } catch (err) {
      console.error('Failed to load quotations:', err);
      showToast('Could not load deal pipeline', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // Move deal stage
  const handleMoveStage = async (quoteId, newStage) => {
    setMovingId(quoteId);
    try {
      await quotationsService.updateQuotationStatus(quoteId, newStage, user);
      showToast(`Deal moved to ${newStage.replace(/_/g, ' ')}`);
      await loadQuotations();
    } catch (err) {
      alert(err.message || 'Failed to update deal stage');
    } finally {
      setMovingId(null);
    }
  };

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = searchQuery.toLowerCase();
    return quotations.filter(
      (item) =>
        item.quoteNumber?.toLowerCase().includes(q) ||
        item.customer?.name?.toLowerCase().includes(q) ||
        item.salesRep?.fullName?.toLowerCase().includes(q)
    );
  }, [quotations, searchQuery]);

  // Pipeline Metrics
  const metrics = useMemo(() => {
    const activeDeals = quotations.filter((q) => q.status !== 'CONFIRMED' && q.status !== 'CANCELLED');
    const totalPipelineValue = activeDeals.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const wonValue = quotations
      .filter((q) => q.status === 'CONFIRMED')
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const avgMargin = quotations.length
      ? (quotations.reduce((sum, q) => sum + (q.totalMarginPercent || 0), 0) / quotations.length).toFixed(1)
      : '0.0';

    return {
      totalPipelineValue,
      activeCount: activeDeals.length,
      wonValue,
      wonCount: quotations.filter((q) => q.status === 'CONFIRMED').length,
      avgMargin,
    };
  }, [quotations]);

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Pipeline &amp; Stage Flow</h1>
            <p className="text-xs text-slate-500 mt-1">
              Visual Kanban workflow tracking quotes across CPQ stages, discount approvals, and closing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-64">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search deal or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <Link
              href="/quotations"
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition whitespace-nowrap"
            >
              + New Quotation
            </Link>
          </div>
        </div>

        {/* Pipeline KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Pipeline</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              ${metrics.totalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{metrics.activeCount} deals currently in flight</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Closed Won Revenue</p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              ${metrics.wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{metrics.wonCount} finalized orders</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Deal Margin</p>
            <p className="text-xl font-black text-blue-600 mt-1">{metrics.avgMargin}%</p>
            <p className="text-[10px] text-slate-400 mt-1">Across all quotation lines</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Closing Ratio</p>
            <p className="text-xl font-black text-purple-600 mt-1">
              {quotations.length ? Math.round((metrics.wonCount / quotations.length) * 100) : 0}%
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Win conversion adherence</p>
          </div>
        </div>

        {/* Kanban Board Container */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            Loading deal pipeline from database...
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 items-start min-w-[1300px]">
            {STAGES.map((stage) => {
              const stageDeals = filteredQuotations.filter((q) => {
                if (stage.id === 'DRAFT') return q.status === 'DRAFT' || !q.status;
                if (stage.id === 'PENDING_APPROVAL') return q.status === 'PENDING_APPROVAL';
                if (stage.id === 'SENT_TO_CUSTOMER') return q.status === 'SENT_TO_CUSTOMER';
                if (stage.id === 'UNDER_NEGOTIATION') return q.status === 'UNDER_NEGOTIATION';
                if (stage.id === 'CONFIRMED') return q.status === 'CONFIRMED' || q.status === 'APPROVED';
                return false;
              });

              const stageValue = stageDeals.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

              return (
                <div
                  key={stage.id}
                  className={`rounded-2xl border ${stage.border} ${stage.bg} p-3 min-w-[260px] flex flex-col`}
                >
                  {/* Stage Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold text-slate-900">{stage.label}</h2>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                          {stageDeals.length}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        ${stageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Deals Stack */}
                  <div className="space-y-3 min-h-[350px]">
                    {stageDeals.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        No deals in {stage.label}
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const isMoving = movingId === deal.id;
                        return (
                          <div
                            key={deal.id}
                            className={`p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs transition hover:shadow-md hover:border-slate-300 relative ${
                              isMoving ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            {/* Card Top: Number and Tier */}
                            <div className="flex items-center justify-between mb-1.5">
                              <Link
                                href="/quotations"
                                className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600 transition"
                              >
                                {deal.quoteNumber}
                              </Link>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                                  deal.customer?.tier === 'GOLD'
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : deal.customer?.tier === 'SILVER'
                                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                                    : 'bg-orange-50 border-orange-200 text-orange-800'
                                }`}
                              >
                                {deal.customer?.tier || 'BRONZE'}
                              </span>
                            </div>

                            {/* Client Name */}
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {deal.customer?.name || deal.customerName || 'Direct Client'}
                            </p>

                            {/* Financial Amount & Margin */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block leading-none">Deal Value</span>
                                <span className="font-black text-slate-900 mt-0.5 block">
                                  ${deal.totalAmount?.toLocaleString()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block leading-none">Margin</span>
                                <span
                                  className={`font-bold mt-0.5 block ${
                                    (deal.totalMarginPercent || 0) < 20 ? 'text-rose-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {deal.totalMarginPercent || 0}%
                                </span>
                              </div>
                            </div>

                            {/* Blended Risk & Rep */}
                            <div className="mt-2.5 flex items-center justify-between text-[10px] flex-wrap gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                                  deal.blendedRiskScore === 'HIGH'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : deal.blendedRiskScore === 'MEDIUM'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {deal.blendedRiskScore || 'LOW'} RISK
                              </span>

                              {deal.counterDiscountProposed > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-purple-50 text-purple-700 border border-purple-200">
                                  💬 {deal.counterDiscountProposed}% Counter
                                </span>
                              )}

                              <span className="text-slate-500 font-medium">
                                {deal.salesRep?.fullName?.split(' ')[0] || 'Direct Rep'}
                              </span>
                            </div>

                            {/* Move Stage Quick Switcher */}
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Stage:</span>
                              <select
                                value={deal.status || 'DRAFT'}
                                onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                                className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 focus:outline-none"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    &rarr; {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}
