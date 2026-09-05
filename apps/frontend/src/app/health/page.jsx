'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function DealHealthPage() {
  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Health & Risk Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">Multi-factor stagnation scores, interaction decay, and churn risk.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#E0F7F6] text-teal-800 border border-teal-200/70 text-xs font-semibold shadow-xs">
            AI Scoring Active
          </span>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Deal Health analytics engine initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
