'use client';

import { useEffect, useState, useCallback } from 'react';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/health`, {
        cache: 'no-store',
      });
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
      setLatency(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const isFeConnected = true;
  const isBeConnected = health?.status === 'ok';
  const isDbConnected = health?.db === 'connected';
  const allConnected = isFeConnected && isBeConnected && isDbConnected;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse" />
            <span className="font-semibold text-sm tracking-wide text-slate-200">
              ODOO HACKATHON STACK
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Auto-refresh: <span className="text-emerald-400 font-mono">4s</span></span>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Master Status Banner */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border mb-4 text-xs font-medium transition-all duration-300"
            style={{
              borderColor: allConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              backgroundColor: allConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              color: allConnected ? '#34d399' : '#f87171'
            }}
          >
            <span className={`h-2 w-2 rounded-full ${allConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
            {allConnected
              ? 'ALL SYSTEMS CONNECTED & OPERATIONAL'
              : 'SYSTEMS INITIALIZING / PARTIALLY OFFLINE'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Full-Stack Connection Dashboard
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Live health probe monitoring Frontend (Next.js JS), Backend (NestJS TS), and Database (PostgreSQL 16 via Prisma).
          </p>
        </div>

        {/* 3 Status Cards: FE, BE, DB */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* 1. Frontend */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition hover:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Frontend</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Next.js 14</h3>
            <p className="text-xs text-slate-400 mb-4">JavaScript App Router & Tailwind</p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Port: <span className="text-slate-300 font-mono">3000</span></span>
              <span className="text-emerald-400 font-mono">Active UI</span>
            </div>
          </div>

          {/* 2. Backend */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition hover:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Backend API</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isBeConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isBeConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isBeConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">NestJS 10 (TS)</h3>
            <p className="text-xs text-slate-400 mb-4">Modular REST API & Swagger UI</p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Port: <span className="text-slate-300 font-mono">4000</span></span>
              <span className="text-slate-400 font-mono">
                {latency !== null ? `${latency}ms` : '---'}
              </span>
            </div>
          </div>

          {/* 3. Database */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition hover:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Database</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isDbConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isDbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">PostgreSQL 16</h3>
            <p className="text-xs text-slate-400 mb-4">Prisma ORM & Connection Pooling</p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Port: <span className="text-slate-300 font-mono">5432</span></span>
              <span className="text-slate-400 font-mono">odoo_hackathon</span>
            </div>
          </div>
        </div>

        {/* Live Payload Inspector */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400">GET</span>
              <span className="font-mono text-emerald-400">http://localhost:4000/api/health</span>
            </div>
            <span className="text-slate-500">
              Last probe: {lastChecked || 'Pending...'}
            </span>
          </div>
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            {loading && !health ? (
              <span className="text-slate-500 animate-pulse">Querying health status...</span>
            ) : health ? (
              <pre className="text-emerald-300 leading-relaxed">
                {JSON.stringify(health, null, 2)}
              </pre>
            ) : (
              <span className="text-rose-400">
                Backend server is not reachable on port 4000. Start it using `make backend` or `make dev`.
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        Odoo Hackathon 24h Monorepo Boilerplate &bull; Next.js (JS) &bull; NestJS (TS) &bull; Prisma &bull; PostgreSQL &bull; Redis
      </footer>
    </div>
  );
}
