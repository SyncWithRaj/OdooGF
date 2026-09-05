'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function FulfillmentPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  // Engine 5 Shortage Proposal Modal
  const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);
  const [shortageOrderId, setShortageOrderId] = useState(null);
  const [shortageQuoteNum, setShortageQuoteNum] = useState('');
  const [proposedQty, setProposedQty] = useState(1);
  const [submittingShortage, setSubmittingShortage] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [whList, fList] = await Promise.all([
        apiClient.getWarehouses(),
        apiClient.getFulfillments(),
      ]);
      setWarehouses(whList || []);
      setFulfillments(fList || []);
      if (fList && fList.length > 0 && !selectedOrder) {
        setSelectedOrder(fList[0]);
      }
    } catch (err) {
      console.error('Failed to load fulfillment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalInStock = warehouses.reduce((acc, w) => acc + (w.totalInStock || 0), 0);
  const totalReserved = warehouses.reduce((acc, w) => acc + (w.totalReserved || 0), 0);
  const totalAvailable = warehouses.reduce((acc, w) => acc + (w.totalAvailable || 0), 0);
  const totalBackorders = fulfillments.filter((f) => f.hasBackorder || f.status === 'BACKORDER').length;

  const handleOpenShortageModal = (order) => {
    setShortageOrderId(order.id);
    setShortageQuoteNum(order.quotation?.quoteNumber || 'Order');
    const totalAlloc = (order.splitItems || []).reduce((acc, i) => acc + (i.quantityFulfilled || 0), 0);
    setProposedQty(totalAlloc > 0 ? totalAlloc : 1);
    setIsShortageModalOpen(true);
  };

  const handleProposeShortage = async (e) => {
    e.preventDefault();
    if (!shortageOrderId || proposedQty <= 0) return;

    setSubmittingShortage(true);
    try {
      await apiClient.proposeShortage(shortageOrderId, proposedQty);
      showToast(`Shortage proposal of ${proposedQty} units recorded and pushed to Customer Portal!`);
      setIsShortageModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to submit shortage proposal', 'error');
    } finally {
      setSubmittingShortage(false);
    }
  };

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            {toast.msg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Fulfillment &amp; Multi-Depot Split</h1>
            <p className="text-xs text-slate-500 mt-1">
              Engine 5 &bull; Haversine proximity routing, multi-warehouse greedy waterfall allocation, and customer shortage governance loop.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/warehouses"
              className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              Manage Stocks &rarr;
            </Link>
          </div>
        </div>

        {/* Aggregate metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Depots Online</p>
            <p className="text-xl font-black text-slate-900 mt-1">{warehouses.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Available</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{totalAvailable}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Splits</p>
            <p className="text-xl font-black text-blue-600 mt-1">{fulfillments.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs">
            <p className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Pending Backorders</p>
            <p className="text-xl font-black text-rose-600 mt-1">{totalBackorders}</p>
          </div>
        </div>

        {/* Section 1: Multi-Warehouse Split Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">📦</span>
                Fulfillment Orders &amp; Split Allocations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Orders routed across nearest facilities via Great-Circle Haversine distance and inventory availability.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {fulfillments.length} Total Orders
            </span>
          </div>

          {fulfillments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No active fulfillment orders. Confirmed quotations automatically trigger intelligent multi-warehouse splits.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Quotation</th>
                    <th className="py-2.5 px-3">Customer / Destination</th>
                    <th className="py-2.5 px-3 text-center">Shipments</th>
                    <th className="py-2.5 px-3 text-right">Freight Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fulfillments.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    const hasShortage = order.hasBackorder || order.status === 'BACKORDER' || order.quotation?.status === 'SHORTAGE_REVIEW';

                    return (
                      <tr key={order.id} className={`hover:bg-slate-50/70 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {order.quotation?.quoteNumber || order.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block">{order.quotation?.customer?.name || 'Direct Customer'}</span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">{order.quotation?.customer?.shippingAddress || 'Address on file'}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {order.totalShipments} Facility{order.totalShipments !== 1 ? 's' : ''}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ${order.estimatedCostTotal?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {hasShortage ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              SHORTAGE / BACKORDER
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {order.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              Inspect Split
                            </button>
                            {hasShortage && (
                              <button
                                type="button"
                                onClick={() => handleOpenShortageModal(order)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                              >
                                Propose Shortage Offer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Selected Order Geo-Proximity Split Breakdown */}
        {selectedOrder && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-slate-400 block uppercase">Fulfillment Split Architecture</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Quotation {selectedOrder.quotation?.quoteNumber} &bull; {selectedOrder.totalShipments} Facility Dispatch
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Destination: {selectedOrder.quotation?.customer?.shippingAddress || 'Customer Address'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Est. Freight: <strong className="text-slate-900">${selectedOrder.estimatedCostTotal}</strong>
                </span>
                {selectedOrder.hasBackorder && (
                  <button
                    type="button"
                    onClick={() => handleOpenShortageModal(selectedOrder)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    Ops: Propose Partial Offer &rarr;
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(selectedOrder.splitItems || []).map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{item.warehouse?.name || 'Warehouse'}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {item.estimatedShipCost > 0 ? `$${item.estimatedShipCost} ship` : 'Backorder Depot'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.warehouse?.location}</p>
                    <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                      <p className="font-semibold text-slate-800">{item.product?.name || item.productId}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Fulfilled: <strong className="text-emerald-700 font-bold">{item.quantityFulfilled} units</strong></span>
                        {item.quantityBackordered > 0 && (
                          <span className="text-rose-600 font-bold">Backordered: {item.quantityBackordered} units</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Facilities Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Active Distribution Hubs</h2>
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

        {/* Propose Shortage Offer Modal (Engine 5) */}
        {isShortageModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>⚠️</span>
                  Engine 5: Propose Partial Shortage Offer
                </h3>
                <button
                  type="button"
                  onClick={() => setIsShortageModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleProposeShortage} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Quotation <strong>{shortageQuoteNum}</strong> cannot be fully fulfilled across the warehouse network. As an Operations/Finance manager, propose an immediate partial quantity for customer review on their portal:
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proposed Partial Quantity (Immediate Dispatch)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={proposedQty}
                    onChange={(e) => setProposedQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The customer will see this offer in their portal with 1-click [Accept] or [Wait Restock] buttons.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsShortageModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShortage}
                    className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submittingShortage ? 'Recording...' : 'Submit to Customer Portal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}
