'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Clock,
  Send,
  Loader2,
  Flame,
} from 'lucide-react';
import {
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

const STATUS_COLORS = {
  CONFIRMED: '#10b981',
  PENDING_APPROVAL: '#f59e0b',
  UNDER_NEGOTIATION: '#3b82f6',
  SENT_TO_CUSTOMER: '#8b5cf6',
  DRAFT: '#64748b',
  CANCELLED: '#ef4444',
};

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ startDate: '', endDate: '', preset: 'all' });
  const [nudgedQuotes, setNudgedQuotes] = useState({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchManagerData = async (f = filter) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (f.startDate) params.append('startDate', f.startDate);
      if (f.endDate) params.append('endDate', f.endDate);

      const res = await fetch(`${apiUrl}/api/reports/manager?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch manager report`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
      setError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData(filter);
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchManagerData(newFilter);
  };

  const handleSendNudge = (quoteId) => {
    setNudgedQuotes((prev) => ({ ...prev, [quoteId]: true }));
    setTimeout(() => {
      alert(`Deal Nudge sent to representative for quotation. Alert logged.`);
    }, 100);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm">Fetching team performance and deal health analytics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm my-6">
        <p className="font-semibold mb-1">Failed to load team data:</p>
        <p className="text-xs opacity-90">{error}</p>
        <button
          onClick={() => fetchManagerData()}
          className="mt-4 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const teamSummary = data?.teamSummary || {};
  const dealHealth = data?.dealHealth || {};
  const statusDistribution = data?.statusDistribution || {};

  // Format Status for Pie Chart
  const statusChartData = Object.entries(statusDistribution)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      key: status,
      value: count,
    }));

  // PDF / XLS Data Preparation
  const kpiData = [
    { label: 'Team Revenue', value: `$${teamSummary.teamRevenue?.toLocaleString() || '0'}` },
    { label: 'Team Pipeline', value: `$${teamSummary.teamPipeline?.toLocaleString() || '0'}` },
    { label: 'Pending Approvals', value: teamSummary.pendingApprovals || 0 },
    { label: 'Stalled Deals', value: dealHealth.stalledDealsCount || 0 },
    { label: 'Team Win Rate', value: `${teamSummary.winRate || 0}%` },
  ];

  const exportTables = [
    {
      sheetName: 'Team_Reps',
      title: 'Sales Team Performance',
      headers: ['Salesperson', 'Team', 'Quotes', 'Won Orders', 'Win Rate %', 'Avg Discount %', 'Pending Approvals', 'Stalled Deals', 'Revenue ($)'],
      rows: (data?.salespersonPerformance || []).map((r) => [
        r.repName,
        r.teamName,
        r.quotesCount,
        r.ordersCount,
        `${r.winRate}%`,
        `${r.avgDiscount}%`,
        r.pendingApprovals,
        r.stalledDeals,
        r.revenue,
      ]),
    },
    {
      sheetName: 'Stalled_Deals',
      title: 'Stalled Deals & Deal Health Queue',
      headers: ['Quote #', 'Customer', 'Rep', 'Amount ($)', 'Days Inactive', 'Status', 'Risk Level'],
      rows: (dealHealth.stalledQuotations || []).map((q) => [
        q.quoteNumber,
        q.customerName,
        q.salesRepName,
        q.totalAmount,
        q.daysInactive,
        q.status,
        q.riskScore,
      ]),
    },
    {
      sheetName: 'Active_Alerts',
      title: 'Active Deal Health Anomaly Alerts',
      headers: ['Quote #', 'Customer', 'Rep', 'Issue Type', 'Description', 'Amount ($)', 'Escalated'],
      rows: (dealHealth.activeAlerts || []).map((a) => [
        a.quoteNumber,
        a.customerName,
        a.repName,
        a.issueType,
        a.description,
        a.amount,
        a.isEscalated ? 'Yes' : 'No',
      ]),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            Sales Manager Dashboard & Deal Health
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Team revenue, salesperson pipeline, discount anomalies, and deal health throughout sales cycles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportActions
            reportTitle="Sales Manager Team & Deal Health Report"
            reportRole="Manager"
            dateRangeText={filter.preset}
            kpis={kpiData}
            tables={exportTables}
          />
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <DateRangeFilter onFilterChange={handleFilterChange} currentFilter={filter} />

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Team Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${teamSummary.teamRevenue?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {teamSummary.approvedQuotes || 0} Deals Closed
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Team Pipeline</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${teamSummary.teamPipeline?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{teamSummary.totalQuotations || 0} Total Quotes in Play</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Pending Approvals</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{teamSummary.pendingApprovals || 0}</p>
          <p className="text-xs text-amber-400/80 mt-1">Requires manager review</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Stalled Deals (&gt;7d)</p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{dealHealth.stalledDealsCount || 0}</p>
          <p className="text-xs text-rose-400/80 mt-1">High risk of dropoff</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">Active Health Alerts</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400 mt-2">{dealHealth.activeAlertsCount || 0}</p>
          <p className="text-xs text-purple-400/80 mt-1">Slippage & anomalies</p>
        </div>
      </div>

      {/* Visual Analytics Row 1: Salesperson Performance & Pipeline Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salesperson Revenue Leaderboard */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Salesperson Performance Comparison</h3>
              <p className="text-xs text-slate-400">Team closed sales volume per representative</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {data?.salespersonPerformance && data.salespersonPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salespersonPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="repName" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Closed Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No team sales records found
              </div>
            )}
          </div>
        </div>

        {/* Quotations Pipeline Stage Distribution */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Quotation Pipeline Stages</h3>
              <p className="text-xs text-slate-400">Distribution across governance and negotiation states</p>
            </div>
            <FileCheck2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`${val} quotes`, 'Count']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No quotation stage data</p>
            )}
          </div>
        </div>
      </div>

      {/* DEAL HEALTH INTELLIGENCE SECTION (Mandatory per Spec for Sales Manager) */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-rose-500/20 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <AlertTriangle className="w-3 h-3" />
              Deal Health & Anomaly Surveillance
            </div>
            <h3 className="text-lg font-bold text-white">Stalled Deals & Proactive Governance Queue</h3>
            <p className="text-xs text-slate-400">
              The Sales Manager continuously monitors quotes stalled &gt; 7 days, discount spikes, and delivery risks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
              {dealHealth.stalledDealsCount || 0} Stalled Deals
            </span>
            <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold">
              {dealHealth.activeAlertsCount || 0} Active Alerts
            </span>
          </div>
        </div>

        {/* Stalled Deals Queue Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            1. Quotes Inactive &gt; 7 Days (Dropoff Risk)
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Quote Ref</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Assigned Rep</th>
                  <th className="px-4 py-3 text-center">Inactive For</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Risk Level</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-center">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dealHealth.stalledQuotations && dealHealth.stalledQuotations.length > 0 ? (
                  dealHealth.stalledQuotations.map((sq) => (
                    <tr key={sq.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{sq.quoteNumber}</td>
                      <td className="px-4 py-3 font-medium text-white">{sq.customerName}</td>
                      <td className="px-4 py-3 text-slate-400">{sq.salesRepName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                          {sq.daysInactive} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {sq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sq.riskScore === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {sq.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">${sq.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendNudge(sq.id)}
                          disabled={nudgedQuotes[sq.id]}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          {nudgedQuotes[sq.id] ? 'Nudged' : 'Send Nudge'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No stalled quotations detected. Deal momentum is healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Deal Health Alerts List */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            2. Active Anomaly & Risk Alerts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {dealHealth.activeAlerts && dealHealth.activeAlerts.length > 0 ? (
              dealHealth.activeAlerts.map((alert) => (
                <div key={alert.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px] border border-amber-500/20">
                      {alert.issueType}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{alert.quoteNumber}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{alert.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Rep: <strong className="text-slate-400">{alert.repName}</strong></span>
                    <span className="font-semibold text-white">${alert.amount?.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-3">No active health alerts recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
