'use client';

import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';

export default function ProductsPage() {
  return (
    <RequireRole roles={['admin']}>
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
            <p className="text-xs text-slate-500 mt-1">Multi-currency price lists, SKU definitions, and discount limits.</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition">
            + Add Product
          </button>
        </div>
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-sm shadow-xs">
          Product catalog management initialized.
        </div>
      </AppLayout>
    </RequireRole>
  );
}
