'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RequireRole from '@/components/RequireRole';
import DateRangeFilter from '@/components/reports/DateRangeFilter';
import ExportActions from '@/components/reports/ExportActions';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Package,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState({ startDate: '', endDate: '', preset: 'all' });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchReportData = async (f = filter) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (f.startDate) params.append('startDate', f.startDate);
      if (f.endDate) params.append('endDate', f.endDate);

      const res = await fetch(`${apiUrl}/api/reports/admin?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch reporting data`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Error fetching report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(filter);
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchReportData(newFilter);
  };

  const overview = data?.overview || {};
  const approvalStats = data?.approvalStats || {};
  const discountAnalytics = data?.discountAnalytics || {};

  // Export Data Preparation
  const kpiData = [
    { label: 'Overall Revenue', value: `$${overview.overallRevenue?.toLocaleString() || '0'}` },
    { label: 'Active Pipeline', value: `$${overview.totalPipeline?.toLocaleString() || '0'}` },
    { label: 'Total Quotations', value: overview.totalQuotations || 0 },
    { label: 'Total Orders', value: overview.totalOrders || 0 },
    { label: 'Conversion Rate', value: `${overview.conversionRate || 0}%` },
    { label: 'Avg Discount', value: `${overview.avgDiscountPercent || 0}%` },
  ];

  const exportTables = [
    {
      sheetName: 'Reps_Performance',
      title: 'Sales Performance by Representative',
      headers: ['Salesperson', 'Team', 'Quotes', 'Orders Won', 'Win Rate %', 'Avg Margin %', 'Avg Discount %', 'Revenue ($)'],
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
      sheetName: 'Product_Categories',
      title: 'Product Category Breakdown',
      headers: ['Category', 'Units Sold', 'Total Revenue ($)'],
      rows: (data?.categoryPerformance || []).map((c) => [c.name, c.units, c.revenue]),
    },
    {
      sheetName: 'Top_Products',
      title: 'Top Products by Sales Volume',
      headers: ['Product Name', 'SKU', 'Category', 'Units Sold', 'Revenue ($)'],
      rows: (data?.productPerformance || []).map((p) => [p.name, p.sku, p.category, p.units, p.revenue]),
    },
  ];

  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />

        <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1 space-y-6">
          {/* Header & Export Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-400" />
                Sales Performance & Intelligence Reports
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Multi-dimensional enterprise analytics, rep performance matrices, category splits, and export engine
              </p>
            </div>

            <ExportActions
              reportTitle="Enterprise Sales Performance Report"
              reportRole="Executive"
              dateRangeText={filter.preset}
              kpis={kpiData}
              tables={exportTables}
            />
          </div>

          {/* Date Range Filter Bar */}
          <DateRangeFilter onFilterChange={handleFilterChange} currentFilter={filter} />

          {/* Report Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-2 overflow-x-auto text-xs">
            {[
              { id: 'overview', label: 'Executive Overview', icon: TrendingUp },
              { id: 'reps', label: 'Sales by Rep & Team', icon: Users },
              { id: 'products', label: 'Products & Categories', icon: Package },
              { id: 'governance', label: 'Discounts & Governance', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    active
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900/40'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm">Aggregating real-time report records from database...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Closed Sales Revenue</p>
                      <p className="text-2xl font-black text-white mt-1">
                        ${overview.overallRevenue?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1">{overview.totalOrders || 0} Deals Won</p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Pipeline Opportunity</p>
                      <p className="text-2xl font-black text-white mt-1">
                        ${overview.totalPipeline?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-blue-400 mt-1">{overview.totalQuotations || 0} Total Quotes</p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Overall Conversion Rate</p>
                      <p className="text-2xl font-black text-white mt-1">{overview.conversionRate || 0}%</p>
                      <p className="text-xs text-purple-400 mt-1">Quotes to Orders</p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Average Discount Level</p>
                      <p className="text-2xl font-black text-white mt-1">{overview.avgDiscountPercent || 0}%</p>
                      <p className="text-xs text-amber-400 mt-1">Weighted against order total</p>
                    </div>
                  </div>

                  {/* Revenue Growth Trend Chart */}
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-1">Sales Revenue Realization Trend</h3>
                    <p className="text-xs text-slate-400 mb-4">Historical revenue progression across selected date range</p>

                    <div className="h-72 w-full">
                      {data?.timeline && data.timeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.timeline}>
                            <defs>
                              <linearGradient id="colorReportRev" x1="0" y1="0" x2="0" y2="1">
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
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorReportRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">
                          No revenue events recorded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SALES BY REP & TEAM */}
              {activeTab === 'reps' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-1">Sales Representative Performance Matrix</h3>
                    <p className="text-xs text-slate-400 mb-4">Live comparison of volume, quota achievement, and margin metrics</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Salesperson</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3 text-center">Quotes</th>
                            <th className="px-4 py-3 text-center">Won Orders</th>
                            <th className="px-4 py-3 text-center">Win Rate</th>
                            <th className="px-4 py-3 text-center">Avg Margin %</th>
                            <th className="px-4 py-3 text-center">Avg Discount %</th>
                            <th className="px-4 py-3 text-right">Closed Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {data?.salesByRep && data.salesByRep.length > 0 ? (
                            data.salesByRep.map((r) => (
                              <tr key={r.repId} className="hover:bg-slate-800/30 transition">
                                <td className="px-4 py-3 font-semibold text-white">{r.repName}</td>
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
                              <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                                No sales data found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCTS & CATEGORIES */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Category Donut */}
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <h3 className="text-sm font-bold text-white mb-1">Revenue by Category</h3>
                      <p className="text-xs text-slate-400 mb-4">Hardware vs Services vs Subscriptions</p>

                      <div className="h-64 w-full flex items-center justify-center">
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
                                  <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
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
                          <p className="text-xs text-slate-500">No category breakdown</p>
                        )}
                      </div>
                    </div>

                    {/* Top Products Table */}
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2">
                      <h3 className="text-sm font-bold text-white mb-1">Top Selling Products</h3>
                      <p className="text-xs text-slate-400 mb-4">Ranked by aggregate revenue generation</p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-2.5">Product</th>
                              <th className="px-4 py-2.5">SKU</th>
                              <th className="px-4 py-2.5">Category</th>
                              <th className="px-4 py-2.5 text-center">Units</th>
                              <th className="px-4 py-2.5 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {data?.productPerformance && data.productPerformance.length > 0 ? (
                              data.productPerformance.map((p) => (
                                <tr key={p.sku} className="hover:bg-slate-800/30 transition">
                                  <td className="px-4 py-2.5 font-medium text-white">{p.name}</td>
                                  <td className="px-4 py-2.5 font-mono text-slate-400">{p.sku}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                      {p.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">{p.units}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                                    ${p.revenue.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                  No product sales records
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DISCOUNTS & GOVERNANCE */}
              {activeTab === 'governance' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-1">Discount Band Distribution</h3>
                    <p className="text-xs text-slate-400 mb-4">Volume of quotations grouped by applied discount range</p>

                    <div className="h-64 w-full">
                      {discountAnalytics.distribution ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={discountAnalytics.distribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                              formatter={(val) => [`${val} quotes`, 'Count']}
                            />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-xs text-slate-500">No discount band data</p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-1">Approval Governance Decisions</h3>
                    <p className="text-xs text-slate-400 mb-4">Audit log breakdown of approval requests</p>

                    <div className="space-y-4 pt-2">
                      {[
                        { label: 'Approved Requests', count: approvalStats.approvedCount || 0, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                        { label: 'Pending Decisions', count: approvalStats.pendingCount || 0, color: 'text-amber-400', bar: 'bg-amber-500' },
                        { label: 'Returned for Revision', count: approvalStats.returnedCount || 0, color: 'text-indigo-400', bar: 'bg-indigo-500' },
                        { label: 'Rejected Proposals', count: approvalStats.rejectedCount || 0, color: 'text-rose-400', bar: 'bg-rose-500' },
                      ].map((item) => {
                        const total = Math.max(1, (approvalStats.totalRequests || 0) + (approvalStats.pendingCount || 0));
                        const pct = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.label} className="text-xs">
                            <div className="flex justify-between font-medium mb-1">
                              <span className="text-slate-300">{item.label}</span>
                              <span className={item.color}>{item.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                              <div className={`${item.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </RequireRole>
  );
}
