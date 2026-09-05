'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function PipelinePage() {
  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Pipeline</h1>
            <p className="text-xs text-slate-500 mt-1">Kanban deal flow tracking across dynamic validation stages.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#E0F7F6] text-teal-800 border border-teal-200/70 text-xs font-semibold shadow-xs">
            Kanban View
          </span>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Pipeline board initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
