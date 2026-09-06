'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [warehouseDetail, setWarehouseDetail] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    location: '',
    shippingCostWeight: 1.0,
  });

  const [adjustForm, setAdjustForm] = useState({
    warehouseId: '',
    productId: '',
    deltaInStock: 0,
    deltaReserved: 0,
    reason: 'Restocking inventory',
  });

  const [replenishForm, setReplenishForm] = useState({
    warehouseId: '',
    productId: '',
    minStockLevel: 10,
    reorderQuantity: 50,
  });

  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const [wList, pList] = await Promise.all([
        apiClient.getWarehouses(),
        apiClient.getProducts().catch(() => []),
      ]);
      setWarehouses(wList);
      setProductsList(pList);
      if (wList.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(wList[0].id);
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      showToast('Could not load warehouses from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const detail = await apiClient.getWarehouse(id);
      setWarehouseDetail(detail);
    } catch (err) {
      console.error('Failed to load warehouse detail:', err);
      showToast('Failed to load stock details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      loadWarehouseDetail(selectedWarehouseId);
    }
  }, [selectedWarehouseId]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalFacilities = warehouses.length;
    const totalInStock = warehouses.reduce((acc, w) => acc + (w.totalInStock || 0), 0);
    const totalReserved = warehouses.reduce((acc, w) => acc + (w.totalReserved || 0), 0);
    const totalAvailable = warehouses.reduce((acc, w) => acc + (w.totalAvailable || 0), 0);
    return { totalFacilities, totalInStock, totalReserved, totalAvailable };
  }, [warehouses]);

  // Filtered Stock Lines for the active facility
  const filteredStockLines = useMemo(() => {
    const stocks = warehouseDetail?.stocks || [];
    if (!searchQuery.trim()) return stocks;
    const q = searchQuery.toLowerCase();
    return stocks.filter(
      (s) =>
        s.productName?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
    );
  }, [warehouseDetail, searchQuery]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedStockLines,
    resetPage,
  } = usePagination(filteredStockLines, 10);

  useEffect(() => {
    resetPage();
  }, [selectedWarehouseId, searchQuery]);

  // Handle Create Facility
  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (!facilityForm.name.trim() || !facilityForm.location.trim()) {
      alert('Facility name and location are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createWarehouse({
        name: facilityForm.name.trim(),
        location: facilityForm.location.trim(),
        shippingCostWeight: Number(facilityForm.shippingCostWeight) || 1.0,
      });
      showToast(`Warehouse facility "${facilityForm.name}" registered!`);
      setIsFacilityModalOpen(false);
      setFacilityForm({ name: '', location: '', shippingCostWeight: 1.0 });
      await loadWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to create warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Stock Adjustment
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustForm.warehouseId || !adjustForm.productId) {
      alert('Please select both a facility and a product.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.adjustStock({
        warehouseId: adjustForm.warehouseId,
        productId: adjustForm.productId,
        deltaInStock: Number(adjustForm.deltaInStock) || 0,
        deltaReserved: Number(adjustForm.deltaReserved) || 0,
        reason: adjustForm.reason || 'Inventory Adjustment',
      });
      showToast('Stock levels adjusted successfully!');
      setIsAdjustModalOpen(false);
      await loadWarehouses();
      if (selectedWarehouseId) {
        await loadWarehouseDetail(selectedWarehouseId);
      }
    } catch (err) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Replenishment Rule
  const handleSetReplenishRule = async (e) => {
    e.preventDefault();
    if (!replenishForm.warehouseId || !replenishForm.productId) {
      alert('Please select both a facility and a product.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.setReplenishmentRule({
        warehouseId: replenishForm.warehouseId,
        productId: replenishForm.productId,
        minStockLevel: Number(replenishForm.minStockLevel),
        reorderQuantity: Number(replenishForm.reorderQuantity),
      });
      showToast('Replenishment threshold configured successfully!');
      setIsReplenishModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to set replenishment rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Facility
  const handleDeleteFacility = async (id, name) => {
    if (!confirm(`Are you sure you want to delete warehouse facility "${name}"? This will unlink all inventory stock records.`)) {
      return;
    }
    try {
      await apiClient.deleteWarehouse(id);
      showToast(`Facility "${name}" removed`);
      if (selectedWarehouseId === id) {
        setSelectedWarehouseId(null);
        setWarehouseDetail(null);
      }
      await loadWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to delete warehouse');
    }
  };

  const openAdjustForProduct = (stock) => {
    setAdjustForm({
      warehouseId: selectedWarehouseId || (warehouses[0]?.id || ''),
      productId: stock.productId,
      deltaInStock: 0,
      deltaReserved: 0,
      reason: `Adjustment for ${stock.productName}`,
    });
    setIsAdjustModalOpen(true);
  };

  const openReplenishForProduct = (stock) => {
    setReplenishForm({
      warehouseId: selectedWarehouseId || (warehouses[0]?.id || ''),
      productId: stock.productId,
      minStockLevel: 10,
      reorderQuantity: 50,
    });
    setIsReplenishModalOpen(true);
  };

  return (
    <AppLayout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouses & Stock</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-depot inventory breakdown, physical stock adjustments, and replenishment rules.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAdjustForm({
                warehouseId: selectedWarehouseId || (warehouses[0]?.id || ''),
                productId: productsList[0]?.id || '',
                deltaInStock: 10,
                deltaReserved: 0,
                reason: 'Stock shipment intake',
              });
              setIsAdjustModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Adjust Stock
          </button>
          <button
            onClick={() => setIsFacilityModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            + Register Facility
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Facilities</p>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.totalFacilities}</p>
          <p className="text-[10px] text-slate-400 mt-1">Active logistics hubs</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Physical In-Stock</p>
          <p className="text-xl font-black text-blue-600 mt-1">{metrics.totalInStock}</p>
          <p className="text-[10px] text-slate-400 mt-1">Aggregated warehouse units</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Allocated / Reserved</p>
          <p className="text-xl font-black text-amber-600 mt-1">{metrics.totalReserved}</p>
          <p className="text-[10px] text-slate-400 mt-1">Committed to pending orders</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available for Quotations</p>
          <p className="text-xl font-black text-slate-900 mt-1">{metrics.totalAvailable}</p>
          <p className="text-[10px] text-slate-400 mt-1">Immediately sellable stock</p>
        </div>
      </div>

      {/* Facility Selectors / Grid Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logistics Facilities</h2>
          <span className="text-xs text-slate-400">Click facility to view warehouse stock lines</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {warehouses.map((w) => {
            const isSelected = selectedWarehouseId === w.id;
            return (
              <div
                key={w.id}
                onClick={() => setSelectedWarehouseId(w.id)}
                className={`p-4 rounded-xl border transition cursor-pointer text-left relative group ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{w.name}</p>
                      <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {w.location}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFacility(w.id, w.name);
                    }}
                    className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition ${
                      isSelected ? 'text-rose-300 hover:bg-rose-500/20' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Delete facility"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/20 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className={`block text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>In Stock</span>
                    <span className="font-bold">{w.totalInStock}</span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>Reserved</span>
                    <span className={`font-bold ${isSelected ? 'text-amber-300' : 'text-amber-600'}`}>{w.totalReserved}</span>
                  </div>
                  <div>
                    <span className={`block text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>Available</span>
                    <span className={`font-bold ${isSelected ? 'text-zinc-200' : 'text-zinc-900'}`}>{w.totalAvailable}</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                    Shipping Weight: {w.shippingCostWeight}x
                  </span>
                  <span className={isSelected ? 'text-slate-300' : 'text-slate-400'}>
                    {w.uniqueProductsCount} catalog items
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Facility Product Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {warehouseDetail?.warehouse?.name || 'Warehouse Stock Inventory'}
            </h3>
            <span className="text-xs text-slate-400">
              ({filteredStockLines.length} product lines in facility)
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search product name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Stock Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
            <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Base Price</th>
                <th className="py-3 px-4 text-right">Physical In Stock</th>
                <th className="py-3 px-4 text-right">Reserved</th>
                <th className="py-3 px-4 text-right">Available</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading facility inventory...
                  </td>
                </tr>
              ) : paginatedStockLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No product stock lines found for this facility.
                  </td>
                </tr>
              ) : (
                paginatedStockLines.map((stock) => (
                  <tr key={stock.stockId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{stock.productName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{stock.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {stock.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{stock.unit || 'Each'}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      ${stock.basePrice?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      {stock.inStock}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600">
                      {stock.reserved}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {stock.available}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          stock.available === 0
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : stock.available <= 20
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                        }`}
                      >
                        {stock.available === 0 ? 'Out of Stock' : stock.available <= 20 ? 'Low Stock' : 'Optimal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => openAdjustForProduct(stock)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Adjust
                      </button>
                      <button
                        onClick={() => openReplenishForProduct(stock)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Rule
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      {/* Modal: Register Facility */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Register Warehouse Facility</h3>
              <button
                onClick={() => setIsFacilityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Coast Distribution"
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reno Industrial Parkway - Dock 8"
                  value={facilityForm.location}
                  onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Cost Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="5.0"
                  value={facilityForm.shippingCostWeight}
                  onChange={(e) => setFacilityForm({ ...facilityForm, shippingCostWeight: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">1.0 = standard rate, 1.2 = 20% logistics markup</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFacilityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Physical Stock */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Adjust Physical Stock</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Warehouse</label>
                <select
                  value={adjustForm.warehouseId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catalog Product</label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delta In-Stock (+/-)
                  </label>
                  <input
                    type="number"
                    value={adjustForm.deltaInStock}
                    onChange={(e) => setAdjustForm({ ...adjustForm, deltaInStock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">e.g. +25 for intake, -5 damaged</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delta Reserved (+/-)
                  </label>
                  <input
                    type="number"
                    value={adjustForm.deltaReserved}
                    onChange={(e) => setAdjustForm({ ...adjustForm, deltaReserved: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">e.g. +10 reserved for order</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supplier PO receipt #PO-8812"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adjusting...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Replenishment Threshold */}
      {isReplenishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Set Replenishment Threshold</h3>
              <button
                onClick={() => setIsReplenishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSetReplenishRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Warehouse</label>
                <select
                  value={replenishForm.warehouseId}
                  onChange={(e) => setReplenishForm({ ...replenishForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
                <select
                  value={replenishForm.productId}
                  onChange={(e) => setReplenishForm({ ...replenishForm, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={replenishForm.minStockLevel}
                    onChange={(e) => setReplenishForm({ ...replenishForm, minStockLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Triggers reorder flag</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auto Reorder Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={replenishForm.reorderQuantity}
                    onChange={(e) => setReplenishForm({ ...replenishForm, reorderQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Batch restock volume</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplenishModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Replenishment Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
