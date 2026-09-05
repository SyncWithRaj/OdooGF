'use client';

import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          DealFlow360 Platform Active
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Self-Governing Sales Operations
        </h1>

        <p className="text-slate-400 max-w-xl text-sm sm:text-base mb-8">
          Welcome to DealFlow360. Role-based sales operations platform with dynamic approval workflows, quote generation, and deal health tracking.
        </p>

        {isAuthenticated ? (
          <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 max-w-md w-full text-left">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Current Session</h3>
            <div className="text-xs text-slate-400 space-y-1 mb-4 font-mono">
              <p>User: <span className="text-emerald-400">{user?.name}</span></p>
              <p>Email: <span className="text-slate-300">{user?.email}</span></p>
              <p>Role: <span className="text-amber-400 uppercase font-bold">{user?.role}</span></p>
            </div>
            <Link
              href={user?.role === 'customer' ? '/portal' : '/dashboard'}
              className="block w-full text-center py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Go to {user?.role === 'customer' ? 'Customer Portal' : 'Staff Dashboard'} →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth"
              className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Sign In to DealFlow360
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        DealFlow360 &bull; Odoo Hackathon &bull; Next.js 14 App Router
      </footer>
    </div>
  );
}
