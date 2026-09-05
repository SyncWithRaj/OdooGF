'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function FulfillmentPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const list = await apiClient.getWarehouses();
        setWarehouses(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const totalInStock = warehouses.reduce((acc, w) => acc + (w.totalInStock || 0), 0);
  const totalReserved = warehouses.reduce((acc, w) => acc + (w.totalReserved || 0), 0);
  const totalAvailable = warehouses.reduce((acc, w) => acc + (w.totalAvailable || 0), 0);

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Fulfillment & Logistics</h1>
            <p className="text-xs text-slate-500 mt-1">Multi-depot delivery dispatch, stock reservation validation, and warehouse routing.</p>
          </div>
          <Link
            href="/warehouses"
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
          >
            Manage Warehouses & Stocks &rarr;
          </Link>
        </div>

        {/* Aggregate metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Depots Online</p>
            <p className="text-xl font-black text-slate-900 mt-1">{warehouses.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Physical Stock</p>
            <p className="text-xl font-black text-blue-600 mt-1">{totalInStock}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Allocated Deliveries</p>
            <p className="text-xl font-black text-amber-600 mt-1">{totalReserved}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ready to Dispatch</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{totalAvailable}</p>
          </div>
        </div>

        {/* Facilities overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Active Fulfillment Hubs</h2>
          <div className="divide-y divide-slate-100">
            {warehouses.map((w) => (
              <div key={w.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{w.name}</p>
                  <p className="text-[11px] text-slate-500">{w.location} • Logistics Weight {w.shippingCostWeight}x</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">In Stock: <strong className="text-slate-900">{w.totalInStock}</strong></span>
                  <span className="text-emerald-600 font-semibold">{w.totalAvailable} Available</span>
                  <Link
                    href="/warehouses"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    View Stock Lines
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    </RequireRole>
  );
}
