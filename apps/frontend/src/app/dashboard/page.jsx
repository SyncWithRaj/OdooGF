'use client';

import Navbar from '@/components/Navbar';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Sales Operations Dashboard</h1>
              <p className="text-xs text-slate-400 mt-1">
                Welcome back, <span className="text-emerald-400 font-semibold">{user?.name}</span> ({user?.role})
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              Live Session Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Active Quotes', value: '12', change: '+2 this week' },
              { label: 'Pending Approvals', value: '3', change: 'Requires attention' },
              { label: 'Won Deals', value: '$48,500', change: '+14% MoM' },
              { label: 'Pipeline Value', value: '$124,000', change: '8 opportunities' },
            ].map((stat) => (
              <div key={stat.label} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white mt-2">{stat.value}</p>
                <p className="text-xs text-emerald-400 mt-1">{stat.change}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
