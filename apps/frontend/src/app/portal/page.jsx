'use client';

import Navbar from '@/components/Navbar';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';

export default function CustomerPortalPage() {
  const { user } = useAuth();

  return (
    <RequireRole roles={['customer']}>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Navbar />
        <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1">
          <h1 className="text-2xl font-bold text-white mb-2">Customer Quote Portal</h1>
          <p className="text-xs text-slate-400 mb-6">
            Welcome, <span className="text-emerald-400 font-semibold">{user?.name}</span> ({user?.email})
          </p>
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Your Quotations</h3>
            <p className="text-xs text-slate-400">You currently have no active quotations pending review.</p>
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
