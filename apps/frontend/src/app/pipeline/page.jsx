'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { quotationsService } from '@/services/quotationsService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';

const PAGE_SIZE = 10;

const STAGES = [
  {
    id: 'DRAFT',
    label: 'Draft',
    border: 'border-slate-200/90',
    topBorder: 'border-t-slate-400',
    headerBg: 'bg-slate-100/70',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    bg: 'bg-slate-50/70',
  },
  {
    id: 'PENDING_APPROVAL',
    label: 'In Approval',
    border: 'border-amber-200/90',
    topBorder: 'border-t-amber-500',
    headerBg: 'bg-amber-50/80',
    badge: 'bg-amber-100/80 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50/30',
  },
  {
    id: 'SENT_TO_CUSTOMER',
    label: 'Sent to Customer',
    border: 'border-blue-200/90',
    topBorder: 'border-t-blue-500',
    headerBg: 'bg-blue-50/80',
    badge: 'bg-blue-100/80 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50/30',
  },
  {
    id: 'UNDER_NEGOTIATION',
    label: 'Negotiation',
    border: 'border-purple-200/90',
    topBorder: 'border-t-purple-500',
    headerBg: 'bg-purple-50/80',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    bg: 'bg-purple-50/30',
  },
  {
    id: 'CONFIRMED',
    label: 'Confirmed / Won',
    border: 'border-emerald-200/90',
    topBorder: 'border-t-emerald-500',
    headerBg: 'bg-emerald-50/80',
    badge: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50/30',
  },
];

export default function PipelinePage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [movingId, setMovingId] = useState(null);
  const [stagePages, setStagePages] = useState({});

  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const list = await quotationsService.getQuotations();
      setQuotations(list || []);
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

  // Reset pagination when search query changes
  useEffect(() => {
    setStagePages({});
  }, [searchQuery]);

  const getPage = (stageId) => stagePages[stageId] || 1;

  const setPage = (stageId, pageNumber) => {
    setStagePages((prev) => ({
      ...prev,
      [stageId]: pageNumber,
    }));
  };

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

  const formatCurrency = (val) =>
    '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return null;
    }
  };

  const getTierBadgeClass = (tier) => {
    const t = (tier || 'BRONZE').toUpperCase();
    if (t === 'GOLD') return 'bg-amber-50 text-amber-800 border-amber-200/90';
    if (t === 'PLATINUM') return 'bg-indigo-50 text-indigo-800 border-indigo-200/90';
    if (t === 'SILVER') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-orange-50 text-orange-800 border-orange-200/90';
  };

  const getMarginBadgeClass = (margin) => {
    const m = Number(margin || 0);
    if (m >= 25) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (m >= 20) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getRiskBadgeClass = (score) => {
    const s = (score || 'LOW').toUpperCase();
    if (s === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'MEDIUM') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout maxWidth="max-w-[1580px]">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Pipeline &amp; Stage Flow</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-white">
                Kanban
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visual workflow tracking quotes across CPQ stages, margin thresholds, approvals, and closing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-56 sm:w-72">
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search deals, clients, reps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <Link
              href="/quotations"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Quotation
            </Link>
          </div>
        </div>

        {/* Pipeline KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Pipeline</p>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.totalPipelineValue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{metrics.activeCount} active deals in flight</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Closed Won Revenue</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-xl font-black text-zinc-900 mt-1">
              {formatCurrency(metrics.wonValue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{metrics.wonCount} finalized orders</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Deal Margin</p>
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <p className="text-xl font-black text-blue-600 mt-1">{metrics.avgMargin}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across current quotation lines</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Closing Conversion</p>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <p className="text-xl font-black text-purple-600 mt-1">
              {quotations.length ? Math.round((metrics.wonCount / quotations.length) * 100) : 0}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Won vs total pipeline adherence</p>
          </div>
        </div>

        {/* Kanban Board Container */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-slate-300 border-t-zinc-900 mb-3"></div>
            <p>Loading deal pipeline from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex gap-3.5 items-start min-w-[1420px] pb-2">
              {STAGES.map((stage) => {
                const stageDeals = filteredQuotations.filter((q) => {
                  if (stage.id === 'DRAFT') return q.status === 'DRAFT' || !q.status;
                  if (stage.id === 'PENDING_APPROVAL') return q.status === 'PENDING_APPROVAL';
                  if (stage.id === 'SENT_TO_CUSTOMER') return q.status === 'SENT_TO_CUSTOMER';
                  if (stage.id === 'UNDER_NEGOTIATION') return q.status === 'UNDER_NEGOTIATION';
                  if (stage.id === 'CONFIRMED') return q.status === 'CONFIRMED' || q.status === 'APPROVED';
                  return false;
                });

                const totalDeals = stageDeals.length;
                const stageValue = stageDeals.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

                // Pagination (10 per page)
                const totalPages = Math.max(1, Math.ceil(totalDeals / PAGE_SIZE));
                const rawCurrentPage = getPage(stage.id);
                const currentPage = Math.min(rawCurrentPage, totalPages);
                const startIndex = (currentPage - 1) * PAGE_SIZE;
                const paginatedDeals = stageDeals.slice(startIndex, startIndex + PAGE_SIZE);

                return (
                  <div
                    key={stage.id}
                    className={`rounded-2xl border ${stage.border} border-t-4 ${stage.topBorder} ${stage.bg} w-[270px] xl:w-[280px] flex-shrink-0 flex flex-col shadow-2xs transition-all`}
                  >
                    {/* Stage Header */}
                    <div className="p-3.5 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs rounded-t-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`}></span>
                          <h2 className="text-xs font-bold text-slate-900 tracking-tight">{stage.label}</h2>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stage.badge}`}>
                          {totalDeals}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                        <span className="text-[11px] font-medium text-slate-500">Stage Total:</span>
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(stageValue)}
                        </span>
                      </div>
                    </div>

                    {/* Deals Stack */}
                    <div className="p-3 space-y-3 min-h-[460px] flex-1 flex flex-col">
                      {stageDeals.length === 0 ? (
                        <div className="my-auto py-12 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-200 bg-white/40 text-slate-400">
                          <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs font-medium text-slate-500">No deals in {stage.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Move deals here via stage selector</p>
                        </div>
                      ) : (
                        paginatedDeals.map((deal) => {
                          const isMoving = movingId === deal.id;
                          const createdDateFormatted = formatDate(deal.createdAt);

                          return (
                            <div
                              key={deal.id}
                              className={`p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs transition-all hover:shadow-md hover:border-slate-300 relative group ${
                                isMoving ? 'opacity-50 pointer-events-none' : ''
                              }`}
                            >
                              {/* Top row: Quote number & Customer Tier */}
                              <div className="flex items-center justify-between mb-1.5 gap-2">
                                <Link
                                  href={`/quotations`}
                                  className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1 group-hover:text-blue-600"
                                >
                                  <span>{deal.quoteNumber}</span>
                                  <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </Link>

                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTierBadgeClass(
                                    deal.customer?.tier
                                  )}`}
                                >
                                  {deal.customer?.tier || 'BRONZE'}
                                </span>
                              </div>

                              {/* Client Name */}
                              <div className="mb-2.5">
                                <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                                  {deal.customer?.name || deal.customerName || 'Direct Client'}
                                </p>
                                {createdDateFormatted && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Created: {createdDateFormatted}
                                  </p>
                                )}
                              </div>

                              {/* Financial Amount & Margin Box */}
                              <div className="p-2.5 rounded-lg bg-slate-50/90 border border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                                    Deal Value
                                  </span>
                                  <span className="font-extrabold text-slate-900 mt-0.5 block text-sm">
                                    {formatCurrency(deal.totalAmount)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                                    Margin
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold mt-0.5 inline-block border ${getMarginBadgeClass(
                                      deal.totalMarginPercent
                                    )}`}
                                  >
                                    {deal.totalMarginPercent || 0}%
                                  </span>
                                </div>
                              </div>

                              {/* Badges Row: Risk, Counter, Rep */}
                              <div className="mt-2.5 flex items-center justify-between text-[10px] flex-wrap gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold uppercase border ${getRiskBadgeClass(
                                      deal.blendedRiskScore
                                    )}`}
                                  >
                                    {deal.blendedRiskScore || 'LOW'} RISK
                                  </span>

                                  {deal.counterDiscountProposed > 0 && (
                                    <span className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-purple-50 text-purple-700 border border-purple-200">
                                      Counter {deal.counterDiscountProposed}%
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-slate-500 font-medium text-[10px]">
                                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="line-clamp-1 max-w-[90px]">
                                    {deal.salesRep?.fullName?.split(' ')[0] || 'Rep'}
                                  </span>
                                </div>
                              </div>

                              {/* Move Stage Quick Switcher */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Stage:</span>
                                <div className="relative flex-1">
                                  <select
                                    value={deal.status || 'DRAFT'}
                                    disabled={isMoving}
                                    onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                                    className="w-full text-[10px] font-bold text-slate-700 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer"
                                  >
                                    {STAGES.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        &rarr; {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <svg
                                    className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Stage Footer & Pagination Controls (10 items per page) */}
                    <div className="p-3 border-t border-slate-200/80 bg-white/80 rounded-b-xl">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {totalDeals === 0 ? (
                            '0 deals'
                          ) : totalPages > 1 ? (
                            <>
                              Showing <strong className="text-slate-800 font-semibold">{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalDeals)}</strong> of {totalDeals}
                            </>
                          ) : (
                            <>
                              Showing all <strong className="text-slate-800 font-semibold">{totalDeals}</strong> deal{totalDeals !== 1 ? 's' : ''}
                            </>
                          )}
                        </span>

                        {totalPages > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPage(stage.id, Math.max(1, currentPage - 1))}
                              disabled={currentPage <= 1}
                              aria-label="Previous 10 deals"
                              className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition shadow-2xs"
                              title="Previous 10 deals"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>

                            <span className="px-1.5 py-0.5 font-semibold text-[10px] text-slate-700 bg-white border border-slate-200 rounded shadow-2xs">
                              {currentPage}/{totalPages}
                            </span>

                            <button
                              type="button"
                              onClick={() => setPage(stage.id, Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage >= totalPages}
                              aria-label="Next 10 deals"
                              className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-black disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition shadow-2xs"
                              title="Next 10 deals"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
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
