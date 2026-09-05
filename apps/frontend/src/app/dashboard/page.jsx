'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import RepDashboard from '@/components/dashboard/RepDashboard';
import { ShieldCheck, UserCheck, Briefcase } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  // Allow toggling view to preview different roles in development/evaluations
  const [activeRoleView, setActiveRoleView] = useState(user?.role || 'admin');

  // Sync if user logs in with different role
  const effectiveRole = activeRoleView || user?.role || 'admin';

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />

        {/* Global Role Perspective Switcher Banner */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-white">Signed in as:</span>
              <span className="text-emerald-400 font-bold">{user?.name || user?.email || 'User'}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize font-medium">
                Real Role: {user?.role}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-medium px-2">Perspective:</span>
              <button
                type="button"
                onClick={() => setActiveRoleView('admin')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  effectiveRole === 'admin'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleView('manager')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  effectiveRole === 'manager'
                    ? 'bg-blue-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Sales Manager
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleView('rep')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  effectiveRole === 'rep'
                    ? 'bg-purple-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Sales Rep
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Dashboard View */}
        <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
          {effectiveRole === 'admin' && <AdminDashboard />}
          {effectiveRole === 'manager' && <ManagerDashboard />}
          {effectiveRole === 'rep' && <RepDashboard user={user} />}
        </main>
      </div>
    </RequireRole>
  );
}
