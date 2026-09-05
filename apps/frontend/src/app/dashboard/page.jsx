'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { quotationsService } from '@/services/quotationsService';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all live data from PostgreSQL
  useEffect(() => {
    let isCancelled = false;

    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [quotesData, custsData, prodsData] = await Promise.allSettled([
          quotationsService.getQuotations(),
          quotationsService.getLiveCustomers(),
          quotationsService.getLiveProducts(),
        ]);

        if (!isCancelled) {
          if (quotesData.status === 'fulfilled') setQuotations(quotesData.value || []);
          if (custsData.status === 'fulfilled') setCustomers(custsData.value || []);
          if (prodsData.status === 'fulfilled') setProducts(prodsData.value || []);
        }
      } catch (err) {
        console.error('Failed to load live dashboard data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchDashboardData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Compute live KPI metrics
  const stats = useMemo(() => {
    const totalPipeline = quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
    const pendingQuotes = quotations.filter((q) => q.status === 'PENDING_APPROVAL');
    const pendingCount = pendingQuotes.length;
    const pendingValue = pendingQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

    const confirmedQuotes = quotations.filter((q) => q.status === 'CONFIRMED');
    const confirmedCount = confirmedQuotes.length;
    const confirmedValue = confirmedQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

    const draftQuotes = quotations.filter((q) => q.status === 'DRAFT');
    const draftsCount = draftQuotes.length;

    const avgMargin =
      quotations.length > 0
        ? (quotations.reduce((acc, q) => acc + (q.totalMarginPercent || 0), 0) / quotations.length).toFixed(1)
        : '0.0';

    return {
      totalPipeline,
      pendingCount,
      pendingValue,
      confirmedCount,
      confirmedValue,
      draftsCount,
      avgMargin,
      totalQuotes: quotations.length,
      customerCount: customers.length,
      productCount: products.length,
    };
  }, [quotations, customers, products]);

  // Donut chart calculations
  const chartData = useMemo(() => {
    const total = stats.totalQuotes || 1;
    const confirmedPct = Math.round((stats.confirmedCount / total) * 100);
    const pendingPct = Math.round((stats.pendingCount / total) * 100);
    const draftPct = Math.round((stats.draftsCount / total) * 100);

    return { confirmedPct, pendingPct, draftPct };
  }, [stats]);

  // Status badge helper (monochrome)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
            Draft
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-300">
            Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-900 text-white shadow-2xs">
            Approved
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-900 text-white shadow-2xs">
            Confirmed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-400 line-through border border-zinc-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            {status}
          </span>
        );
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Low
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-900 border border-zinc-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            Medium
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-900 text-white border border-zinc-900 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            High
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Top Title & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>DealFlow360 Workspace for <strong className="text-zinc-900 font-semibold">{user?.name || 'Aryan'}</strong></span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="inline-flex items-center gap-1.5 text-zinc-900 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse" />
                Live Connected
              </span>
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Quotation</span>
            </Link>

            <Link
              href="/approvals"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium border border-zinc-200 shadow-2xs transition cursor-pointer"
            >
              <span>Approvals Queue</span>
              {stats.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-zinc-900 text-white">
                  {stats.pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 4 LIVE KPI STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Pipeline Value */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <span>Total Pipeline</span>
              <span className="text-zinc-900 font-bold lowercase text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">live</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ${loading ? '...' : stats.totalPipeline.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {stats.totalQuotes} active proposals in database
            </p>
          </div>

          {/* Card 2: Pending Approvals */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <span>Pending Reviews</span>
              {stats.pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white">
                  Action Required
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {loading ? '...' : stats.pendingCount}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              ${stats.pendingValue.toLocaleString()} awaiting audit review
            </p>
          </div>

          {/* Card 3: Confirmed Revenue */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <span>Confirmed Orders</span>
              <span className="text-zinc-900 font-bold lowercase text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">closed</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              ${loading ? '...' : stats.confirmedValue.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {stats.confirmedCount} order contracts converted
            </p>
          </div>

          {/* Card 4: Average Margin */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <span>Gross Margin</span>
              <span className="text-zinc-400 font-normal text-[11px]">Floor 20%</span>
            </div>
            <div className="text-2xl font-black text-zinc-900 tracking-tight">
              {loading ? '...' : `${stats.avgMargin}%`}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Across live catalog &amp; client tiers
            </p>
          </div>
        </div>

        {/* MIDDLE ROW: Pipeline Health Breakdown & Live Quotations Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Deal Stage Breakdown (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-900">Pipeline Distribution</h2>
                <span className="text-xs text-zinc-400 font-medium">{stats.totalQuotes} Deals</span>
              </div>

              {/* Breakdown Bar Segments */}
              <div className="space-y-4 my-3">
                {/* Confirmed Orders */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-zinc-900" />
                      Confirmed Orders
                    </span>
                    <span className="font-bold text-zinc-900">
                      {stats.confirmedCount} ({chartData.confirmedPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.confirmedPct}%` }}
                    />
                  </div>
                </div>

                {/* Pending Approval */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-zinc-500" />
                      Pending Approval
                    </span>
                    <span className="font-bold text-zinc-900">
                      {stats.pendingCount} ({chartData.pendingPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.pendingPct}%` }}
                    />
                  </div>
                </div>

                {/* Drafts */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-zinc-300" />
                      Draft Proposals
                    </span>
                    <span className="font-bold text-zinc-900">
                      {stats.draftsCount} ({chartData.draftPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-300 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.draftPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Master Data Snapshot at Bottom */}
            <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-2 text-center mt-4">
              <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 block font-medium">Customer Accounts</span>
                <span className="text-base font-bold text-zinc-900">{stats.customerCount}</span>
              </div>
              <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 block font-medium">Catalog Products</span>
                <span className="text-base font-bold text-zinc-900">{stats.productCount}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Quotations & Deals Stream (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Live Quotations Stream</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Real-time proposals from active database</p>
              </div>
              <Link
                href="/quotations"
                className="text-xs text-zinc-900 hover:text-black font-semibold flex items-center gap-1 transition"
              >
                <span>View All ({stats.totalQuotes})</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Table */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Quote #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3 text-right">Value</th>
                      <th className="py-2.5 px-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium">
                          Loading live quotations...
                        </td>
                      </tr>
                    ) : quotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium">
                          No quotations found in database.
                        </td>
                      </tr>
                    ) : (
                      quotations.slice(0, 5).map((q) => (
                        <tr key={q.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-zinc-900">
                            <Link href="/quotations" className="hover:text-black hover:underline">
                              {q.quoteNumber}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-zinc-900 block">{q.customerName}</span>
                            <span className="text-[10px] text-zinc-400">{q.customerTier} Tier</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {getStatusBadge(q.status)}
                          </td>
                          <td className="py-2.5 px-3">
                            {getRiskBadge(q.blendedRiskScore)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                            ${q.totalAmount?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            <span className={q.totalMarginPercent < 20 ? 'text-zinc-900 font-bold underline' : 'text-zinc-700'}>
                              {q.totalMarginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approvals Action Link Banner */}
            {stats.pendingCount > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
                  <span>
                    <strong>{stats.pendingCount} deals</strong> require authorization under discount &amp; margin policy.
                  </span>
                </div>
                <Link
                  href="/approvals"
                  className="font-bold text-zinc-900 underline underline-offset-2 hover:text-black sm:ml-3 shrink-0"
                >
                  Review Approvals &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Quick Module Navigation (Full 8 Core Modules) */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Enterprise Modules &amp; Navigation</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Quick access across the CPQ, billing, and fulfillment lifecycle</p>
            </div>
            <span className="text-xs text-zinc-400 font-mono">v1.0</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Quotations */}
            <Link
              href="/quotations"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Quotations</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{stats.totalQuotes} Active Deals</p>
            </Link>

            {/* 2. Approvals */}
            <Link
              href="/approvals"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Approvals Queue</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{stats.pendingCount} Pending</p>
            </Link>

            {/* 3. Invoices */}
            <Link
              href="/invoices"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Invoices &amp; Payments</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Billing Operations</p>
            </Link>

            {/* 4. Subscriptions */}
            <Link
              href="/subscriptions"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Subscriptions</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Recurring Contracts</p>
            </Link>

            {/* 5. Pipeline */}
            <Link
              href="/pipeline"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Sales Pipeline</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Stage Tracking</p>
            </Link>

            {/* 6. Fulfillment */}
            <Link
              href="/fulfillment"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Fulfillment</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Orders &amp; Shipments</p>
            </Link>

            {/* 7. Governance */}
            <Link
              href="/governance"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Governance &amp; Rules</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Audit &amp; Compliance</p>
            </Link>

            {/* 8. Customer Portal */}
            <Link
              href="/portal"
              className="p-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/70 transition group text-left shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-2 border border-zinc-200 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <p className="text-xs font-bold text-zinc-900 group-hover:text-black">Customer Portal</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">External Negotiations</p>
            </Link>
          </div>
        </div>
      </AppLayout>
    </RequireRole>
  );
}
