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

  // Status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Draft
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            Approved
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
            Confirmed Order
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Low</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Medium</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>High</span>;
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
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>DealFlow360 Live Workspace for <strong className="text-gray-800 font-medium">{user?.name || 'Aryan'}</strong></span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                PostgreSQL Live Connected
              </span>
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Quotation</span>
            </Link>

            <Link
              href="/approvals"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium border border-gray-200 shadow-xs transition cursor-pointer"
            >
              <span>Approvals Queue</span>
              {stats.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                  {stats.pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 4 LIVE KPI STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Pipeline Value */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Total Pipeline Value</span>
              <span className="text-emerald-700 font-semibold">Live DB</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              ${loading ? '...' : stats.totalPipeline.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalQuotes} active proposals in database
            </p>
          </div>

          {/* Card 2: Pending Approvals */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Pending Approvals</span>
              {stats.pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Needs Sign-off
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold text-amber-700 tracking-tight">
              {loading ? '...' : stats.pendingCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ${stats.pendingValue.toLocaleString()} awaiting L1 / L2 review
            </p>
          </div>

          {/* Card 3: Confirmed Revenue */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Confirmed Orders</span>
              <span className="text-blue-700 font-semibold">Closed</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              ${loading ? '...' : stats.confirmedValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.confirmedCount} order contracts converted
            </p>
          </div>

          {/* Card 4: Average Margin */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Blended Gross Margin</span>
              <span className="text-gray-500 font-normal">Floor 20%</span>
            </div>
            <div className="text-2xl font-semibold text-emerald-700 tracking-tight">
              {loading ? '...' : `${stats.avgMargin}%`}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Across live catalog & client tiers
            </p>
          </div>
        </div>

        {/* MIDDLE ROW: Pipeline Health Breakdown & Live Quotations Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Deal Stage Breakdown (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Pipeline Distribution</h2>
                <span className="text-xs text-gray-400 font-medium">{stats.totalQuotes} Total Deals</span>
              </div>

              {/* Breakdown Bar Segments */}
              <div className="space-y-4 my-3">
                {/* Confirmed Orders */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      Confirmed Orders
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.confirmedCount} ({chartData.confirmedPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.confirmedPct}%` }}
                    />
                  </div>
                </div>

                {/* Pending Approval */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pending Approval
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.pendingCount} ({chartData.pendingPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.pendingPct}%` }}
                    />
                  </div>
                </div>

                {/* Drafts */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Draft Proposals
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.draftsCount} ({chartData.draftPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full transition-all duration-500"
                      style={{ width: `${chartData.draftPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Master Data Snapshot at Bottom */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-center mt-4">
              <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                <span className="text-[11px] text-gray-500 block">Customer Accounts</span>
                <span className="text-base font-semibold text-gray-900">{stats.customerCount}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                <span className="text-[11px] text-gray-500 block">Catalog Products</span>
                <span className="text-base font-semibold text-gray-900">{stats.productCount}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Quotations & Deals Stream (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Live Quotations Stream</h2>
                <p className="text-xs text-gray-500 mt-0.5">Real-time proposals from PostgreSQL database</p>
              </div>
              <Link
                href="/quotations"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <span>View All ({stats.totalQuotes})</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Quote #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3 text-right">Value</th>
                      <th className="py-2.5 px-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Loading live quotations...
                        </td>
                      </tr>
                    ) : quotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No quotations found in database.
                        </td>
                      </tr>
                    ) : (
                      quotations.slice(0, 5).map((q) => (
                        <tr key={q.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            <Link href="/quotations" className="hover:text-emerald-700 hover:underline">
                              {q.quoteNumber}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-gray-900 block">{q.customerName}</span>
                            <span className="text-[10px] text-gray-400">{q.customerTier} Tier</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {getStatusBadge(q.status)}
                          </td>
                          <td className="py-2.5 px-3">
                            {getRiskBadge(q.blendedRiskScore)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                            ${q.totalAmount?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            <span className={q.totalMarginPercent < 20 ? 'text-rose-600 font-semibold' : 'text-gray-700'}>
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
              <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong>{stats.pendingCount} deals</strong> require authorization under discount &amp; margin policy.
                  </span>
                </div>
                <Link
                  href="/approvals"
                  className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 sm:ml-3 shrink-0"
                >
                  Go to Approvals &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Quick Module Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Quick Modules &amp; Navigation</h2>
            <span className="text-xs text-gray-400">DealFlow360 Multi-Tier Suite</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/quotations"
              className="p-3.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 transition group text-left"
            >
              <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2 border border-emerald-200">
                QP
              </div>
              <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700">Quotations</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stats.totalQuotes} Proposals in DB</p>
            </Link>

            <Link
              href="/approvals"
              className="p-3.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 transition group text-left"
            >
              <div className="w-8 h-8 rounded bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs mb-2 border border-amber-200">
                AP
              </div>
              <p className="text-xs font-semibold text-gray-900 group-hover:text-amber-700">Approvals Queue</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stats.pendingCount} Pending Reviews</p>
            </Link>

            <Link
              href="/portal"
              className="p-3.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 transition group text-left"
            >
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs mb-2 border border-blue-200">
                CP
              </div>
              <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700">Customer Portal</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stats.customerCount} Active Accounts</p>
            </Link>

            <Link
              href="/profile"
              className="p-3.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 transition group text-left"
            >
              <div className="w-8 h-8 rounded bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs mb-2 border border-purple-200">
                UP
              </div>
              <p className="text-xs font-semibold text-gray-900 group-hover:text-purple-700">User Profile</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Account &amp; Security</p>
            </Link>
          </div>
        </div>
      </AppLayout>
    </RequireRole>
  );
}
