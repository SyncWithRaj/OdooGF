'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function FulfillmentPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Selected Order for Split Inspection Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Engine 5 Shortage Proposal Modal
  const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);
  const [shortageOrderId, setShortageOrderId] = useState(null);
  const [shortageQuoteNum, setShortageQuoteNum] = useState('');
  const [proposedQty, setProposedQty] = useState(1);
  const [submittingShortage, setSubmittingShortage] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wList, fList, qList] = await Promise.all([
        apiClient.getWarehouses().catch(() => []),
        apiClient.getFulfillments().catch(() => []),
        apiClient.getQuotations().catch(() => []),
      ]);
      setWarehouses(Array.isArray(wList) ? wList : []);
      setFulfillments(Array.isArray(fList) ? fList : []);
      setQuotations(Array.isArray(qList) ? qList : []);
    } catch (err) {
      console.error(err);
      showToast('Could not load fulfillment orders from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Dispatch Shipments
  const handleDispatch = async (orderId) => {
    setProcessingId(orderId);
    try {
      const trk = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      await apiClient.dispatchFulfillment(orderId, trk);
      showToast(`Shipments dispatched! Tracking issued: ${trk}`);
      await loadData();
    } catch (err) {
      alert(err.message || 'Dispatch failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Consolidate Backorders
  const handleConsolidate = async (orderId) => {
    setProcessingId(orderId);
    try {
      await apiClient.consolidateBackorders(orderId);
      showToast('Backorders successfully consolidated into shipments!');
      await loadData();
    } catch (err) {
      alert(err.message || 'Consolidation failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Auto-Split for a Quotation
  const handleAutoSplit = async (quoteId) => {
    setProcessingId(quoteId);
    try {
      await apiClient.splitQuotation(quoteId);
      showToast('Intelligent multi-warehouse inventory split calculated!');
      await loadData();
    } catch (err) {
      alert(err.message || 'Auto-split failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Engine 5 Shortage Proposal Handlers
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

  // Metrics
  const totalInStock = warehouses.reduce((acc, w) => acc + (w.totalInStock || 0), 0);
  const totalReserved = warehouses.reduce((acc, w) => acc + (w.totalReserved || 0), 0);
  const totalAvailable = warehouses.reduce((acc, w) => acc + (w.totalAvailable || 0), 0);
  const totalOrders = fulfillments.length;
  const backorderCount = fulfillments.filter((f) => f.hasBackorder || f.status === 'BACKORDER').length;

  // Filtered Fulfillment Orders
  const filteredOrders = useMemo(() => {
    return fulfillments.filter((f) => {
      if (activeTab === 'BACKORDER' && !f.hasBackorder && f.status !== 'BACKORDER') return false;
      if (activeTab === 'FULFILLED' && f.status !== 'FULFILLED') return false;
      if (activeTab === 'PARTIAL' && f.status !== 'PARTIAL') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQuote = f.quotation?.quoteNumber?.toLowerCase().includes(q);
        const matchCust = f.quotation?.customer?.name?.toLowerCase().includes(q);
        const matchId = f.id?.toLowerCase().includes(q);
        return matchQuote || matchCust || matchId;
      }
      return true;
    });
  }, [fulfillments, activeTab, searchQuery]);

  // Quotations eligible for split (confirmed or approved quotes that haven't been split yet)
  const readyToSplitQuotes = useMemo(() => {
    const existingQuoteIds = new Set(fulfillments.map((f) => f.quotationId));
    return quotations.filter((q) => !existingQuoteIds.has(q.id) && (q.status === 'CONFIRMED' || q.status === 'APPROVED'));
  }, [quotations, fulfillments]);

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Flash Toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Fulfillment &amp; Logistics</h1>
            <p className="text-xs text-slate-500 mt-1">
              Engine 5 &bull; Haversine proximity routing, multi-warehouse greedy waterfall allocation, and customer shortage governance loop.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/warehouses"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5"
            >
              Warehouse Facilities &rarr;
            </Link>
          </div>
        </div>

        {/* Aggregate KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Orders</p>
            <p className="text-xl font-black text-slate-900 mt-1">{totalOrders}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Partitioned shipments</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Backordered</p>
            <p className="text-xl font-black text-amber-600 mt-1">{backorderCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting depot replenishment</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Physical Stock</p>
            <p className="text-xl font-black text-blue-600 mt-1">{totalInStock}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Across {warehouses.length} hubs</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reserved</p>
            <p className="text-xl font-black text-purple-600 mt-1">{totalReserved}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Allocated to active orders</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ready to Ship</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{totalAvailable}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Immediately dispatchable</p>
          </div>
        </div>

        {/* Ready to Auto-Split Banner (if any approved quotes ready) */}
        {readyToSplitQuotes.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Orders Awaiting Multi-Warehouse Split ({readyToSplitQuotes.length})
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                {readyToSplitQuotes.map((q) => `${q.quoteNumber} (${q.customer?.name || 'Client'})`).slice(0, 3).join(', ')}
              </p>
            </div>
            <button
              onClick={() => handleAutoSplit(readyToSplitQuotes[0].id)}
              disabled={processingId === readyToSplitQuotes[0].id}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              {processingId === readyToSplitQuotes[0].id ? 'Partitioning...' : `⚡ Auto-Split ${readyToSplitQuotes[0].quoteNumber}`}
            </button>
          </div>
        )}

        {/* Fulfillment Orders Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'BACKORDER', 'PARTIAL', 'FULFILLED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search quote # or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Fulfillment Order</th>
                  <th className="py-3 px-4">Origin Quotation</th>
                  <th className="py-3 px-4">Depot Allocation</th>
                  <th className="py-3 px-4 text-right">Est. Freight Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading fulfillment orders...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No fulfillment orders matching filter.</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const splitCount = (order.splitItems || []).length;
                    const totalFulfilled = (order.splitItems || []).reduce((sum, item) => sum + (item.quantityFulfilled || 0), 0);
                    const totalBackordered = (order.splitItems || []).reduce((sum, item) => sum + (item.quantityBackordered || 0), 0);
                    const hasShortage = order.hasBackorder || order.status === 'BACKORDER' || order.quotation?.status === 'SHORTAGE_REVIEW';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 font-mono">{order.quotation?.quoteNumber || 'Q-Order'}</div>
                          <div className="text-[10px] text-slate-400">{order.quotation?.customer?.name || 'Customer'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {totalFulfilled} Fulfilled
                            </span>
                            {totalBackordered > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {totalBackordered} Backordered
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              ({splitCount} split lines)
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          ${order.estimatedCostTotal?.toLocaleString() || '0'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              order.status === 'FULFILLED'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : order.status === 'BACKORDER' || order.hasBackorder
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            View Splits
                          </button>
                          {order.status !== 'FULFILLED' && (
                            <button
                              type="button"
                              onClick={() => handleDispatch(order.id)}
                              disabled={processingId === order.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              {processingId === order.id ? 'Dispatching...' : 'Dispatch'}
                            </button>
                          )}
                          {order.hasBackorder && (
                            <button
                              type="button"
                              onClick={() => handleConsolidate(order.id)}
                              disabled={processingId === order.id}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              Consolidate
                            </button>
                          )}
                          {hasShortage && (
                            <button
                              type="button"
                              onClick={() => handleOpenShortageModal(order)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              Propose Shortage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Facilities Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Active Warehouse Facilities &amp; Stock Capacity</h2>
          <div className="divide-y divide-slate-100">
            {warehouses.map((w) => (
              <div key={w.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900">{w.name}</p>
                  <p className="text-[11px] text-slate-500">{w.location} • Freight Coefficient {w.shippingCostWeight}x</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-500">In Stock: <strong className="text-slate-900">{w.totalInStock}</strong></span>
                  <span className="text-emerald-600 font-semibold">{w.totalAvailable} Available</span>
                  <Link
                    href="/warehouses"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Manage Inventory Lines &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: View Split Details */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multi-Depot Partition Breakdown</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Quotation {selectedOrder.quotation?.quoteNumber || 'Order'}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {(selectedOrder.splitItems || []).map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900">{item.product?.name || item.sku || 'Product Item'}</span>
                      <span className="font-mono text-[10px] text-slate-500">{item.warehouse?.name || 'Warehouse Depot'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Fulfilled: <strong className="text-emerald-700">{item.quantityFulfilled} units</strong></span>
                      <span>Backordered: <strong className="text-amber-700">{item.quantityBackordered} units</strong></span>
                      <span>Est. Ship: <strong>${item.estimatedShipCost || 0}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700">Total Estimated Freight: ${selectedOrder.estimatedCostTotal?.toLocaleString() || 0}</span>
                <div className="flex items-center gap-2">
                  {(selectedOrder.hasBackorder || selectedOrder.status === 'BACKORDER') && (
                    <button
                      onClick={() => {
                        handleOpenShortageModal(selectedOrder);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition cursor-pointer"
                    >
                      Propose Shortage Offer
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 rounded-xl bg-slate-950 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
