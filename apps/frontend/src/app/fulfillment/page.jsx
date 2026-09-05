'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function FulfillmentPage() {
  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Fulfillment</h1>
            <p className="text-xs text-slate-500 mt-1">Warehouse stock verification and automatic delivery order generation.</p>
          </div>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Fulfillment operations initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
