'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';

export default function CustomerPortalPage() {
  const { user } = useAuth();

  return (
    <RequireRole roles={['customer']}>
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Quote Portal</h1>
              <p className="text-xs text-slate-500 mt-1">
                Account: <span className="text-slate-800 font-semibold">{user?.name}</span> ({user?.email})
              </p>
            </div>
            {/* Pastel Buttercream Badge */}
            <span className="px-3.5 py-1 rounded-full bg-[#FEF9C3] text-amber-900 border border-amber-200 text-xs font-semibold shadow-xs">
              Customer Account
            </span>
          </div>

          {/* Crisp White Card */}
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="h-1 bg-[#E0F7F6] absolute top-0 left-0 right-0" />
            <h3 className="text-base font-bold text-slate-900 mb-2">Pending Quotations</h3>
            <p className="text-xs text-slate-500 mb-6">
              Review and electronically approve or decline quotes sent by your sales representative.
            </p>
            {/* Inner box with soft canvas background */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <p className="text-xs font-semibold text-slate-800">You have no quotes awaiting signature right now.</p>
              <p className="text-[11px] text-slate-500 mt-1">Your sales representative will notify you when a quote is ready.</p>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireRole>
  );
}
