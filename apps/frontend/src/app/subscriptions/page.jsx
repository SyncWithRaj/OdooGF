'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function SubscriptionsPage() {
  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Subscriptions</h1>
            <p className="text-xs text-slate-500 mt-1">Manage MRR, renewals, automated recurring billing, and churn alerts.</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition">
            + New Subscription
          </button>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Subscriptions module initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
