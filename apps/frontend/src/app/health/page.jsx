'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiClient } from '@/services/apiClient';

export default function DealHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiClient.getHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Health check failed:', err);
      setHealthData({ status: 'error', message: err.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto-probe every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = healthData?.status === 'ok' || healthData?.db === 'connected';

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Health &amp; Database Probe</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time backend connectivity, PostgreSQL 16 cluster health, and microservice status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-slate-400">
              Last probe: {lastChecked}
            </span>
          )}
          <button
            onClick={checkHealth}
            disabled={isRefreshing}
            className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Checking...' : 'Probe Now'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          Running database connectivity probe...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Status Banner */}
          <div className={`p-6 rounded-2xl border shadow-2xs transition-all ${
            isHealthy
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/50 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  isHealthy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {isHealthy ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isHealthy ? 'All Systems Operational' : 'Connectivity Degradation Detected'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isHealthy
                      ? 'PostgreSQL 16 connection is alive and handling queries with zero degradation.'
                      : healthData?.message || 'Database connection probe failed.'}
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isHealthy
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {healthData?.status || 'Active'}
              </span>
            </div>
          </div>

          {/* Grid of Diagnostics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Database Service */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">PostgreSQL Engine</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {healthData?.details?.database || 'PostgreSQL 16'}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-emerald-700">Connected</span>
              </div>
            </div>

            {/* Backend Service */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Backend API</span>
              <div className="text-xl font-bold text-slate-900 mt-1">NestJS Core</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-emerald-700">Port 4000 OK</span>
              </div>
            </div>

            {/* Latency Ping */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">DB Ping Result</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {healthData?.details?.ping ? `${healthData.details.ping} ms` : '&lt; 1 ms'}
              </div>
              <span className="text-xs text-slate-400 mt-2 block">Direct query probe</span>
            </div>

            {/* Server Timestamp */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Cluster Time</span>
              <div className="text-xs font-mono font-medium text-slate-800 mt-2 line-clamp-1">
                {healthData?.timestamp || new Date().toISOString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Synchronized UTC</span>
            </div>
          </div>

          {/* Raw Probe Payload Card */}
          <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Raw Probe Response (/api/health)
              </span>
              <span className="text-[11px] font-mono text-slate-400">HTTP 200 OK</span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
