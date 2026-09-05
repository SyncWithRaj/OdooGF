'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function ApprovalsPage() {
  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Approvals Queue</h1>
            <p className="text-xs text-slate-500 mt-1">Special discount and margin threshold authorizations.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#FCE7F3] text-pink-800 border border-pink-200/70 text-xs font-semibold shadow-xs">
            3 Pending Review
          </span>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Approvals management initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
