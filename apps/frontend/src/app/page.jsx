'use client';

import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        {/* Modern Pill Badge with Pastel Ice Aqua */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F7F6] text-teal-900 border border-teal-200/70 text-xs font-semibold mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
          DealFlow360 Operations Platform
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-5">
          Self-Governing <span className="text-slate-950 underline decoration-[#E0F7F6] decoration-wavy decoration-2">Sales Operations</span>
        </h1>

        <p className="text-slate-500 max-w-xl text-sm sm:text-base mb-10 leading-relaxed">
          Dynamic approval workflows, automated quotation generation, and real-time deal health tracking inspired by modern, clean dashboard engineering.
        </p>

        {isAuthenticated ? (
          /* Active session card with white background and subtle border */
          <div className="p-7 rounded-2xl bg-white border border-slate-200/80 max-w-md w-full text-left shadow-sm relative overflow-hidden">
            {/* Top Accent Strip with Pastel Mint */}
            <div className="h-1 bg-[#E3F7EB] absolute top-0 left-0 right-0" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Session</h3>
            <div className="text-xs space-y-2 mb-6">
              <p className="text-slate-600">User: <strong className="text-slate-900">{user?.name}</strong></p>
              <p className="text-slate-600">Email: <span className="text-slate-800 font-mono">{user?.email}</span></p>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Role:</span>
                <span className="px-2 py-0.5 rounded-md bg-[#FEF9C3] text-amber-900 border border-amber-200/80 font-bold uppercase text-[10px] tracking-wider">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Solid Dark Action Button */}
            <Link
              href={user?.role === 'customer' ? '/portal' : '/dashboard'}
              className="block w-full text-center py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
            >
              Go to {user?.role === 'customer' ? 'Customer Portal' : 'Sales Operations Dashboard'} →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3.5 items-center">
            {/* Solid Dark Primary Button */}
            <Link
              href="/auth"
              className="px-7 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm tracking-wide"
            >
              Sign In to DealFlow360
            </Link>
            {/* Outline Button */}
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200/80 shadow-xs transition"
            >
              Explore Demo Dashboard
            </Link>
          </div>
        )}

        {/* 4 Feature Preview Mini-Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full mt-14">
          <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-left shadow-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E0F7F6] border border-teal-400 mb-1" />
            <p className="text-xs font-semibold text-slate-800">Dynamic Quotes</p>
            <p className="text-[11px] text-slate-400">Multi-tier proposal engine</p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-left shadow-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E3F7EB] border border-emerald-400 mb-1" />
            <p className="text-xs font-semibold text-slate-800">Fast Approvals</p>
            <p className="text-[11px] text-slate-400">Automated manager sign-off</p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-left shadow-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FCE7F3] border border-pink-400 mb-1" />
            <p className="text-xs font-semibold text-slate-800">Deal Health</p>
            <p className="text-[11px] text-slate-400">Risk scoring & alerts</p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-left shadow-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FEF9C3] border border-amber-400 mb-1" />
            <p className="text-xs font-semibold text-slate-800">Billing Sync</p>
            <p className="text-[11px] text-slate-400">Invoicing & subscriptions</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/70 py-5 text-center text-xs text-slate-400">
        DealFlow360 &bull; Odoo Hackathon 2026 &bull; Modern Clean Dashboard Architecture
      </footer>
    </div>
  );
}
