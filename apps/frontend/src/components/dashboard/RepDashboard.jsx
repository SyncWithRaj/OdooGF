'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileCheck2,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DateRangeFilter from '../reports/DateRangeFilter';
import ExportActions from '../reports/ExportActions';

export default function RepDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ startDate: '', endDate: '', preset: 'all' });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchRepData = async (f = filter) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (user?.id) params.append('repId', user.id);
      if (f.startDate) params.append('startDate', f.startDate);
      if (f.endDate) params.append('endDate', f.endDate);

      const res = await fetch(`${apiUrl}/api/reports/rep?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch rep portfolio`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load rep dashboard:', err);
      setError(err.message || 'Error loading rep portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepData(filter);
  }, [user?.id]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchRepData(newFilter);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm">Fetching personal sales portfolio from database...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm my-6">
        <p className="font-semibold mb-1">Failed to load portfolio:</p>
        <p className="text-xs opacity-90">{error}</p>
        <button
          onClick={() => fetchRepData()}
          className="mt-4 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const perf = data?.performance || {};
  const approval = data?.approvalStatus || {};
  const recentQuotes = data?.recentQuotations || [];

  // PDF / XLS Data Preparation
  const kpiData = [
    { label: 'My Closed Revenue', value: `$${perf.ownRevenue?.toLocaleString() || '0'}` },
    { label: 'My Active Pipeline', value: `$${perf.ownPipeline?.toLocaleString() || '0'}` },
    { label: 'My Won Orders', value: perf.wonOrders || 0 },
    { label: 'My Win Rate', value: `${perf.winRate || 0}%` },
    { label: 'My Avg Discount', value: `${perf.avgDiscountPercent || 0}%` },
  ];

  const exportTables = [
    {
      sheetName: 'My_Deals',
      title: `${user?.name || 'Sales Rep'} - Quotation Ledger`,
      headers: ['Quote Ref', 'Customer', 'Created Date', 'Discount %', 'Margin %', 'Status', 'Total ($)'],
      rows: recentQuotes.map((q) => [
        q.quoteNumber,
        q.customerName,
        new Date(q.createdAt).toLocaleDateString(),
        `${q.discountPercent}%`,
        `${q.marginPercent}%`,
        q.status,
        q.totalAmount,
      ]),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            My Sales Performance & Deal Portfolio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strictly scoped to <strong className="text-slate-200">{user?.name || 'Your'}</strong> quotations, approvals, and revenue metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportActions
            reportTitle={`${user?.name || 'Sales Rep'} Performance Report`}
            reportRole="Sales Rep"
            dateRangeText={filter.preset}
            kpis={kpiData}
            tables={exportTables}
          />
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <DateRangeFilter onFilterChange={handleFilterChange} currentFilter={filter} />

      {/* Personal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">My Closed Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${perf.ownRevenue?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {perf.wonOrders || 0} Won Orders
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">My Active Pipeline</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${perf.ownPipeline?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{perf.totalQuotations || 0} Active Quotes</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">My Win Rate</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{perf.winRate || 0}%</p>
          <p className="text-xs text-purple-400 mt-1">Opportunity conversion</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">My Avg Discount</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{perf.avgDiscountPercent || 0}%</p>
          <p className="text-xs text-amber-400 mt-1">Ceiling adherence: Normal</p>
        </div>
      </div>

      {/* Approval Status Tracker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Approved Quotes</p>
            <p className="text-xl font-bold text-white mt-0.5">{approval.approved || 0}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Manager Gate</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{approval.pending || 0}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Returned / Rejected</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{approval.rejected || 0}</p>
          </div>
        </div>
      </div>

      {/* Revenue Trend Area Chart */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">My Revenue Realization Trend</h3>
            <p className="text-xs text-slate-400">Timeline of my closed deals</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Personal Scoped
          </span>
        </div>

        <div className="h-60 w-full">
          {data?.timeline && data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorRepRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val) => [`$${val.toLocaleString()}`, 'Closed Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRepRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No closed deals recorded in selected date window
            </div>
          )}
        </div>
      </div>

      {/* Rep Quotation Ledger Table */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">My Quotations & Deal Ledger</h3>
            <p className="text-xs text-slate-400">Complete listing of your quotations in the pipeline</p>
          </div>
          <span className="text-xs text-slate-400">{recentQuotes.length} Deals</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Quote #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Discount</th>
                <th className="px-4 py-3 text-center">Margin %</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{q.quoteNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{q.customerName}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center text-amber-400">{q.discountPercent}%</td>
                    <td className="px-4 py-3 text-center text-indigo-400 font-semibold">{q.marginPercent}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : q.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : q.status === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">${q.totalAmount.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No quotations found for your account
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
