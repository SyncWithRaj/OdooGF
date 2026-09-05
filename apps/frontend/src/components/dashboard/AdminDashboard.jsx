'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileCheck2,
  Percent,
  Users,
  Package,
  Layers,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import DateRangeFilter from '../reports/DateRangeFilter';
import ExportActions from '../reports/ExportActions';

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];
const APPROVAL_COLORS = {
  APPROVED: '#10b981',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
  RETURNED_FOR_REVISION: '#6366f1',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ startDate: '', endDate: '', preset: 'all' });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchAdminData = async (f = filter) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (f.startDate) params.append('startDate', f.startDate);
      if (f.endDate) params.append('endDate', f.endDate);

      const res = await fetch(`${apiUrl}/api/reports/admin?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch admin report`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData(filter);
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchAdminData(newFilter);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm">Fetching real-time sales intelligence from database...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm my-6">
        <p className="font-semibold mb-1">Failed to load live data:</p>
        <p className="text-xs opacity-90">{error}</p>
        <button
          onClick={() => fetchAdminData()}
          className="mt-4 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const overview = data?.overview || {};
  const approvalStats = data?.approvalStats || {};
  const discountAnalytics = data?.discountAnalytics || {};

  // PDF / XLS Data Preparation
  const kpiData = [
    { label: 'Overall Revenue', value: `$${overview.overallRevenue?.toLocaleString() || '0'}` },
    { label: 'Active Pipeline', value: `$${overview.totalPipeline?.toLocaleString() || '0'}` },
    { label: 'Total Quotations', value: overview.totalQuotations || 0 },
    { label: 'Conversion Rate', value: `${overview.conversionRate || 0}%` },
    { label: 'Average Discount', value: `${overview.avgDiscountPercent || 0}%` },
  ];

  const exportTables = [
    {
      sheetName: 'Sales_By_Rep',
      title: 'Sales Performance by Representative',
      headers: ['Rep Name', 'Team', 'Quotes', 'Orders', 'Win Rate %', 'Avg Margin %', 'Avg Discount %', 'Revenue ($)'],
      rows: (data?.salesByRep || []).map((r) => [
        r.repName,
        r.teamName,
        r.quotesCount,
        r.ordersCount,
        `${r.winRate}%`,
        `${r.avgMarginPercent}%`,
        `${r.avgDiscountPercent}%`,
        r.revenue,
      ]),
    },
    {
      sheetName: 'Categories',
      title: 'Performance by Product Category',
      headers: ['Category', 'Units Sold', 'Revenue ($)'],
      rows: (data?.categoryPerformance || []).map((c) => [c.name, c.units, c.revenue]),
    },
    {
      sheetName: 'Top_Products',
      title: 'Top 10 Products by Revenue',
      headers: ['Product Name', 'SKU', 'Category', 'Units Sold', 'Revenue ($)'],
      rows: (data?.productPerformance || []).map((p) => [p.name, p.sku, p.category, p.units, p.revenue]),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls: Date Filter & Export Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Executive Admin Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise-wide revenue, rep sales leaderboard, discount governance, and product analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportActions
            reportTitle="Executive Admin Sales Report"
            reportRole="Admin"
            dateRangeText={filter.preset}
            kpis={kpiData}
            tables={exportTables}
          />
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <DateRangeFilter onFilterChange={handleFilterChange} currentFilter={filter} />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Overall Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${overview.overallRevenue?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {overview.totalOrders || 0} Confirmed Orders
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Active Pipeline</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${overview.totalPipeline?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Under review & negotiation</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Total Quotations</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{overview.totalQuotations || 0}</p>
          <p className="text-xs text-purple-400 mt-1">{overview.conversionRate || 0}% Conversion Rate</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Avg Discount</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{overview.avgDiscountPercent || 0}%</p>
          <p className="text-xs text-amber-400 mt-1">Across all quotations</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Pending Approvals</p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{approvalStats.pendingCount || 0}</p>
          <p className="text-xs text-rose-400 mt-1">Requires Manager/Finance gate</p>
        </div>
      </div>

      {/* Visual Analytics Row 1: Revenue Timeline & Sales by Rep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth Trend */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Revenue Generation Timeline</h3>
              <p className="text-xs text-slate-400">Daily closed order revenue distribution</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Real-time
            </span>
          </div>

          <div className="h-64 w-full">
            {data?.timeline && data.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No revenue events in selected date range
              </div>
            )}
          </div>
        </div>

        {/* Sales by Representative Leaderboard */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Sales by Representative</h3>
              <p className="text-xs text-slate-400">Total closed sales comparison per sales rep</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {data?.salesByRep && data.salesByRep.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesByRep} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                  <YAxis dataKey="repName" type="category" stroke="#64748b" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Closed Sales']}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No rep sales records found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Analytics Row 2: Category Split & Discount Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Category Revenue Donut */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Product Category Split</h3>
          <p className="text-xs text-slate-400 mb-4">Hardware vs Services vs Subscriptions</p>

          <div className="h-56 w-full flex items-center justify-center">
            {data?.categoryPerformance && data.categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryPerformance}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {data.categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No category data</p>
            )}
          </div>
        </div>

        {/* Approval Governance Statistics */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Approval Governance Statistics</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown of audit chain decisions</p>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Approved Requests', count: approvalStats.approvedCount || 0, color: 'text-emerald-400', bar: 'bg-emerald-500' },
              { label: 'Pending Approvals', count: approvalStats.pendingCount || 0, color: 'text-amber-400', bar: 'bg-amber-500' },
              { label: 'Returned for Revision', count: approvalStats.returnedCount || 0, color: 'text-indigo-400', bar: 'bg-indigo-500' },
              { label: 'Rejected Quotes', count: approvalStats.rejectedCount || 0, color: 'text-rose-400', bar: 'bg-rose-500' },
            ].map((item) => {
              const total = Math.max(1, (approvalStats.totalRequests || 0) + (approvalStats.pendingCount || 0));
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.label} className="text-xs">
                  <div className="flex justify-between font-medium mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={item.color}>{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className={`${item.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discount Distribution Analytics */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Discount Analytics</h3>
          <p className="text-xs text-slate-400 mb-4">Quotation distribution by discount band</p>

          <div className="h-56 w-full">
            {discountAnalytics.distribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discountAnalytics.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`${val} quotes`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No discount distribution</p>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Sales Rep Performance Table */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Sales Representative Leaderboard</h3>
            <p className="text-xs text-slate-400">Detailed metric breakdown across sales teams</p>
          </div>
          <span className="text-xs text-slate-400">
            {data?.salesByRep?.length || 0} active representatives
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Quotes Created</th>
                <th className="px-4 py-3 text-center">Orders Won</th>
                <th className="px-4 py-3 text-center">Win Rate</th>
                <th className="px-4 py-3 text-center">Avg Margin</th>
                <th className="px-4 py-3 text-center">Avg Discount</th>
                <th className="px-4 py-3 text-right">Closed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.salesByRep && data.salesByRep.length > 0 ? (
                data.salesByRep.map((r, i) => (
                  <tr key={r.repId} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      {r.repName}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{r.teamName}</td>
                    <td className="px-4 py-3 text-center">{r.quotesCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-400">{r.ordersCount}</td>
                    <td className="px-4 py-3 text-center">{r.winRate}%</td>
                    <td className="px-4 py-3 text-center text-indigo-400 font-semibold">{r.avgMarginPercent}%</td>
                    <td className="px-4 py-3 text-center text-amber-400 font-semibold">{r.avgDiscountPercent}%</td>
                    <td className="px-4 py-3 text-right font-black text-white">${r.revenue.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No sales representative performance data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
