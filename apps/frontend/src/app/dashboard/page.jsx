'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
          {/* Top Title & Action Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Hotel & Deal Management
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Operations workspace for <strong className="text-slate-800 font-semibold">{user?.name || 'Aryan'}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-emerald-600 font-medium">● System Live</span>
              </p>
            </div>

            {/* Action Buttons: Solid Black "+ Add New" and White Outline "Reports" */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/quotations"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <span className="text-base font-light leading-none">+</span>
                <span>Add New</span>
              </Link>

              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/80 shadow-xs transition-all active:scale-95"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Reports</span>
              </Link>
            </div>
          </div>

          {/* 4 Signature 2-Tone Pastel Top Header Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
            {/* Card 1: Pastel Ice Aqua (#E0F7F6) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-[#E0F7F6] px-5 py-3 flex items-center justify-between border-b border-[#c8f0ee]">
                <span className="text-xs font-medium text-slate-800">Today's check-in</span>
                <button className="text-slate-500 hover:text-slate-800 p-0.5" title="Options">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="1.75" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 7v5l3 3" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">200</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Unit Number: 1,000</p>
                </div>
              </div>
            </div>

            {/* Card 2: Pastel Sage Mint (#E3F7EB) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-[#E3F7EB] px-5 py-3 flex items-center justify-between border-b border-[#cdefd7]">
                <span className="text-xs font-medium text-slate-800">Today check-out</span>
                <button className="text-slate-500 hover:text-slate-800 p-0.5" title="Options">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">34</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Unit Number: 520</p>
                </div>
              </div>
            </div>

            {/* Card 3: Pastel Blush Rose (#FCE7F3) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-[#FCE7F3] px-5 py-3 flex items-center justify-between border-b border-[#fad2e7]">
                <span className="text-xs font-medium text-slate-800">Total guests</span>
                <button className="text-slate-500 hover:text-slate-800 p-0.5" title="Options">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">3432</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Unit Number: 152</p>
                </div>
              </div>
            </div>

            {/* Card 4: Pastel Buttercream Yellow (#FEF9C3) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-[#FEF9C3] px-5 py-3 flex items-center justify-between border-b border-[#fced98]">
                <span className="text-xs font-medium text-slate-800">Total amount</span>
                <button className="text-slate-500 hover:text-slate-800 p-0.5" title="Options">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <span className="text-base font-semibold text-slate-700">$</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">$668,726</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Unit Number: 266</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Reservations Donut + Campaign Overview Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-7">
            {/* Left Card: Reservations Breakdown with Donut (5 columns) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-6">Reservations</h3>

                {/* Donut Chart with Center Metric */}
                <div className="flex items-center justify-center relative my-2">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                    {/* Ring background */}
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#F1F5F9" strokeWidth="18" />
                    {/* Confirmed Segment (Light grey / slate-300) */}
                    <circle
                      cx="60" cy="60" r="46"
                      fill="none"
                      stroke="#CBD5E1"
                      strokeWidth="18"
                      strokeDasharray="289"
                      strokeDashoffset="90"
                      strokeLinecap="round"
                    />
                    {/* Checked In Segment (Medium slate-600) */}
                    <circle
                      cx="60" cy="60" r="46"
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="18"
                      strokeDasharray="289"
                      strokeDashoffset="170"
                    />
                    {/* Checked Out Segment (Dark slate-900) */}
                    <circle
                      cx="60" cy="60" r="46"
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth="18"
                      strokeDasharray="289"
                      strokeDashoffset="240"
                    />
                  </svg>
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">362</span>
                    <span className="text-[11px] text-slate-400 font-medium">Reservations</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                    <span>Confirmed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                    <span>Checked In</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1E293B]" />
                    <span>Checked Out</span>
                  </div>
                </div>
              </div>

              {/* Bottom Stat */}
              <div className="pt-6 border-t border-slate-100 text-center mt-6">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">$86,000</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Total Sales This Week</p>
              </div>
            </div>

            {/* Right Card: Campaign Overview Wave Graph (8 columns) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs flex flex-col justify-between">
              {/* Header with Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Campaign Overview</h3>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-xs">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                    </svg>
                    <span>This Week</span>
                    <svg className="w-3 h-3 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 shadow-xs" title="Download">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Sub-metric Badges & Performance */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <p className="text-[11px] text-slate-400 font-medium">Booked</p>
                    <p className="text-lg font-bold text-slate-900">290</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <p className="text-[11px] text-slate-400 font-medium">Visited</p>
                    <p className="text-lg font-bold text-slate-900">638</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-900">Performance</p>
                  <p className="text-xs font-medium text-emerald-600 mt-0.5">12+ Compared to last week</p>
                </div>
              </div>

              {/* Smooth Spline Vector Curve Chart */}
              <div className="w-full relative pt-2">
                <svg className="w-full h-44 overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="700" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <text x="15" y="24" className="text-[11px] fill-slate-400 font-medium">140</text>

                  <line x1="40" y1="55" x2="700" y2="55" stroke="#F1F5F9" strokeWidth="1" />
                  <text x="15" y="59" className="text-[11px] fill-slate-400 font-medium">105</text>

                  <line x1="40" y1="90" x2="700" y2="90" stroke="#F1F5F9" strokeWidth="1" />
                  <text x="15" y="94" className="text-[11px] fill-slate-400 font-medium">70</text>

                  <line x1="40" y1="125" x2="700" y2="125" stroke="#F1F5F9" strokeWidth="1" />
                  <text x="15" y="129" className="text-[11px] fill-slate-400 font-medium">35</text>

                  <line x1="40" y1="160" x2="700" y2="160" stroke="#F1F5F9" strokeWidth="1" />
                  <text x="22" y="164" className="text-[11px] fill-slate-400 font-medium">0</text>

                  {/* Primary Wave Curve (Dark Charcoal #1E293B) */}
                  <path
                    d="M 50 145 C 150 140, 200 130, 270 120 C 340 110, 400 80, 480 60 C 560 40, 600 110, 680 90"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.75"
                  />

                  {/* Secondary Comparison Wave Curve (Muted Slate #94A3B8) */}
                  <path
                    d="M 50 155 C 130 150, 220 145, 300 140 C 380 135, 450 100, 520 85 C 590 70, 620 130, 680 115"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </svg>

                {/* X-Axis Date Labels */}
                <div className="flex justify-between pl-10 pr-2 pt-3 text-[11px] font-medium text-slate-400">
                  <span>Aug 15</span>
                  <span>Aug 16</span>
                  <span>Aug 17</span>
                  <span>Aug 18</span>
                  <span>Aug 19</span>
                  <span>Aug 20</span>
                  <span>Aug 21</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Quick Operations & Modules */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                <span>Quick Operations & Modules</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">DealFlow360 Multi-Tier Suite</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/quotations"
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#E0F7F6] text-teal-700 flex items-center justify-center font-bold text-xs mb-2">
                  QP
                </div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">Quotations</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate proposals & tiers</p>
              </Link>

              <Link
                href="/approvals"
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FCE7F3] text-pink-700 flex items-center justify-center font-bold text-xs mb-2">
                  AP
                </div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">Approvals</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Manager sign-offs & SLA</p>
              </Link>

              <Link
                href="/pipeline"
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#E3F7EB] text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">
                  PL
                </div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">Pipeline</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Kanban stage velocity</p>
              </Link>

              <Link
                href="/health"
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] text-amber-800 flex items-center justify-center font-bold text-xs mb-2">
                  DH
                </div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">Deal Health</p>
                <p className="text-[11px] text-slate-400 mt-0.5">AI risk score indicators</p>
              </Link>
            </div>
          </div>
      </AppLayout>
    </RequireRole>
  );
}
