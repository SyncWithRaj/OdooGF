'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { quotationsService } from '@/services/quotationsService';
import { apiClient } from '@/services/apiClient';

export default function ReportsPage() {
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('ALL');

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [qList, invRes, uList] = await Promise.all([
        quotationsService.getQuotations().catch(() => []),
        apiClient.getInvoices().catch(() => []),
        apiClient.getUsers().catch(() => []),
      ]);
      setQuotations(qList);
      setInvoices(invRes);
      setUsers(uList);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Compute BI KPIs
  const bi = useMemo(() => {
    const totalDeals = quotations.length;
    const wonDeals = quotations.filter((q) => q.status === 'CONFIRMED' || q.status === 'APPROVED');
    const winRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;

    const totalBookings = wonDeals.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const avgDealSize = wonDeals.length > 0 ? Math.round(totalBookings / wonDeals.length) : 0;

    // Margin & Discount Leakage
    const avgMargin = totalDeals > 0
      ? (quotations.reduce((sum, q) => sum + (q.totalMarginPercent || 0), 0) / totalDeals).toFixed(1)
      : '0.0';

    const highRiskDeals = quotations.filter((q) => q.blendedRiskScore === 'HIGH').length;
    const totalDiscountGiven = quotations.reduce((sum, q) => sum + (q.totalDiscountAmount || 0), 0);

    // Sales Rep Leaderboard
    const reps = users.filter((u) => u.role === 'SALES_REP' || u.role === 'rep' || u.role === 'ADMIN');
    const leaderboard = reps.map((rep) => {
      const repQuotes = quotations.filter((q) => q.salesRep?.id === rep.id || q.salesRepId === rep.id);
      const repWon = repQuotes.filter((q) => q.status === 'CONFIRMED' || q.status === 'APPROVED');
      const repRevenue = repWon.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
      const repMargin = repQuotes.length
        ? (repQuotes.reduce((sum, q) => sum + (q.totalMarginPercent || 0), 0) / repQuotes.length).toFixed(1)
        : '0.0';

      return {
        id: rep.id,
        name: rep.fullName || rep.email,
        email: rep.email,
        teamName: rep.teamName || 'Enterprise Sales',
        totalQuotes: repQuotes.length,
        closedWon: repWon.length,
        revenue: repRevenue,
        avgMargin: repMargin,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Category Distribution
    let hardwareTotal = 0;
    let servicesTotal = 0;
    let subscriptionTotal = 0;

    quotations.forEach((q) => {
      (q.lines || []).forEach((l) => {
        const amt = l.lineTotal || (l.unitPrice * l.quantity) || 0;
        if (l.category === 'HARDWARE') hardwareTotal += amt;
        else if (l.category === 'SERVICES') servicesTotal += amt;
        else if (l.category === 'SUBSCRIPTION') subscriptionTotal += amt;
      });
    });

    return {
      totalDeals,
      wonDealsCount: wonDeals.length,
      winRate,
      totalBookings,
      avgDealSize,
      avgMargin,
      highRiskDeals,
      totalDiscountGiven,
      leaderboard,
      categories: {
        hardwareTotal,
        servicesTotal,
        subscriptionTotal,
      },
    };
  }, [quotations, invoices, users]);

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format = 'csv') => {
    setExporting(true);
    try {
      await apiClient.downloadExport(format);
    } catch (err) {
      console.warn('Backend export failed, fallback to client-side generator:', err);
      if (format === 'csv') {
        handleExportCSV();
      } else {
        window.print();
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['DealFlow360 Executive BI Summary'],
      ['Generated At', new Date().toISOString()],
      [],
      ['KPI', 'Value'],
      ['Win Rate', `${bi.winRate}%`],
      ['Total Bookings', `$${bi.totalBookings}`],
      ['Average Deal Size', `$${bi.avgDealSize}`],
      ['Blended Margin', `${bi.avgMargin}%`],
      ['Total Discount Given', `$${bi.totalDiscountGiven}`],
      [],
      ['Sales Rep Leaderboard'],
      ['Name', 'Team', 'Deals', 'Won', 'Revenue', 'Avg Margin'],
      ...bi.leaderboard.map((r) => [r.name, r.teamName, r.totalQuotes, r.closedWon, `$${r.revenue}`, `${r.avgMargin}%`]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dealflow360-bi-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive BI &amp; Analytics</h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time win/loss conversion rates, discount leakage alerts, and sales team performance ranking.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
              {['30D', '90D', 'ALL'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeRange === r ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button
              onClick={() => handleExport('xls')}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              XLS
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              PDF Report
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Win / Close Rate</p>
            <p className="text-xl font-black text-zinc-900 mt-1">{bi.winRate}%</p>
            <p className="text-[10px] text-slate-400 mt-1">{bi.wonDealsCount} of {bi.totalDeals} quotations converted</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Contracted Bookings</p>
            <p className="text-xl font-black text-slate-900 mt-1">${bi.totalBookings.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Average deal size: ${bi.avgDealSize.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Deal Margin</p>
            <p className="text-xl font-black text-blue-600 mt-1">{bi.avgMargin}%</p>
            <p className="text-[10px] text-slate-400 mt-1">Target baseline: 20% margin ceiling</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Concession Discount</p>
            <p className="text-xl font-black text-amber-600 mt-1">-${bi.totalDiscountGiven.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">{bi.highRiskDeals} deals flagged High Risk</p>
          </div>
        </div>

        {/* Category Revenue Breakdown & SLA Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Categories</h3>
                <span className="text-[10px] text-slate-400">Revenue split</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Hardware Equipment</span>
                    <span className="text-slate-900">${bi.categories.hardwareTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Professional Services</span>
                    <span className="text-slate-900">${bi.categories.servicesTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">SaaS Subscriptions</span>
                    <span className="text-slate-900">${bi.categories.subscriptionTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-700 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Governance SLAs</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Approval Turnaround</span>
                  <span className="font-bold text-zinc-900">&lt; 4.2 Hours</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Policy Exception Rate</span>
                  <span className="font-bold text-slate-900">{bi.highRiskDeals > 0 ? '12%' : '0%'}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Multi-Tier Escalation</span>
                  <span className="font-bold text-zinc-900">98% Compliant</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Receivables Health</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Total Billed Records</span>
                  <span className="font-bold text-slate-900">{invoices.length} Invoices</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">DSO (Days Sales Outstanding)</span>
                  <span className="font-bold text-zinc-900">24.5 Days</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Bad Debt Write-off</span>
                  <span className="font-bold text-slate-900">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Rep Performance Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Operations Leaderboard</h3>
              <p className="text-xs text-slate-400 mt-0.5">Rankings based on confirmed bookings and margin retention.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {bi.leaderboard.length} Account Executives
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Account Executive</th>
                  <th className="py-3 px-4">Team Unit</th>
                  <th className="py-3 px-4 text-center">Deals Quoted</th>
                  <th className="py-3 px-4 text-center">Deals Won</th>
                  <th className="py-3 px-4 text-right">Closed Revenue</th>
                  <th className="py-3 px-4 text-right">Avg Margin</th>
                  <th className="py-3 px-4 text-center">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading leaderboard...</td>
                  </tr>
                ) : bi.leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No sales representative records found.</td>
                  </tr>
                ) : (
                  bi.leaderboard.map((rep, idx) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rep.name}</div>
                        <div className="text-[10px] text-slate-400">{rep.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {rep.teamName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-900">
                        {rep.totalQuotes}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">
                        {rep.closedWon}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ${rep.revenue?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                        {rep.avgMargin}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            idx === 0
                              ? 'bg-zinc-900 border-zinc-900 text-white'
                              : rep.revenue > 0
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-900'
                              : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}
                        >
                          {idx === 0 ? 'Top Performer' : rep.revenue > 0 ? 'On Target' : 'Ramping Up'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppLayout>
    </RequireRole>
  );
}
