'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiClient } from '@/services/apiClient';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // New product form
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'HARDWARE',
    unit: 'Each',
    baseCost: 100,
    basePrice: 150,
    taxPercent: 15,
    isSubscription: false,
    recurringInterval: 'MONTHLY',
    minMarginThreshold: 20,
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getProducts();
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('Could not load products from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory !== 'ALL' && p.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        return matchSku || matchName || matchDesc;
      }
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const hardware = products.filter((p) => p.category === 'HARDWARE').length;
    const subscription = products.filter((p) => p.category === 'SUBSCRIPTION' || p.isSubscription).length;
    const services = products.filter((p) => p.category === 'SERVICES').length;
    return { total, hardware, subscription, services };
  }, [products]);

  // Handle create product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.sku.trim() || !newProduct.name.trim()) {
      alert('SKU and Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createProduct({
        ...newProduct,
        baseCost: Number(newProduct.baseCost),
        basePrice: Number(newProduct.basePrice),
        taxPercent: Number(newProduct.taxPercent),
        minMarginThreshold: Number(newProduct.minMarginThreshold),
      });
      showToast(`Product "${newProduct.name}" created successfully!`);
      setIsCreateModalOpen(false);
      setNewProduct({
        sku: '',
        name: '',
        description: '',
        category: 'HARDWARE',
        unit: 'Each',
        baseCost: 100,
        basePrice: 150,
        taxPercent: 15,
        isSubscription: false,
        recurringInterval: 'MONTHLY',
        minMarginThreshold: 20,
      });
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Failed to create product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await apiClient.deleteProduct(id);
      showToast(`Product "${name}" deleted.`);
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <AppLayout>
      {/* Flash toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in">
          <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products &amp; Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Live catalog products, pricing rules, inventory thresholds, and margin governance.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Product</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Products</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
          <span className="text-[11px] text-slate-400">In PostgreSQL Database</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Hardware SKUs</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.hardware}</div>
          <span className="text-[11px] text-slate-400">Physical equipment</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Subscriptions</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{metrics.subscription}</div>
          <span className="text-[11px] text-slate-400">Recurring revenue</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Services</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.services}</div>
          <span className="text-[11px] text-slate-400">Setup &amp; Consulting</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 mb-6 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Products' },
            { id: 'HARDWARE', label: 'Hardware' },
            { id: 'SERVICES', label: 'Services' },
            { id: 'SUBSCRIPTION', label: 'Subscriptions' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, product name..."
            className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-medium text-slate-600 select-none">
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Base Cost</th>
                <th className="py-3.5 px-4 text-right">Base Price</th>
                <th className="py-3.5 px-4 text-right">Margin %</th>
                <th className="py-3.5 px-4 text-center">Stock</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Loading live products from database...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const margin = prod.baseMarginPercent ?? (
                    prod.basePrice > 0
                      ? Number((((prod.basePrice - prod.baseCost) / prod.basePrice) * 100).toFixed(1))
                      : 0
                  );

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* SKU */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-500 font-medium whitespace-nowrap">
                        {prod.sku}
                      </td>

                      {/* Product (Squircle Thumbnail + Title) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs text-slate-700">
                            {prod.category === 'SUBSCRIPTION' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : prod.category === 'SERVICES' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 leading-tight">{prod.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{prod.description}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          prod.category === 'HARDWARE'
                            ? 'border-blue-300 text-blue-700 bg-blue-50/40'
                            : prod.category === 'SERVICES'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50/40'
                            : 'border-purple-300 text-purple-700 bg-purple-50/40'
                        }`}>
                          {prod.category}
                        </span>
                      </td>

                      {/* Base Cost */}
                      <td className="py-4 px-4 text-right font-normal text-slate-600 whitespace-nowrap">
                        ${Number(prod.baseCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Base Price */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        ${Number(prod.basePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Margin % */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className={`font-semibold ${margin < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {margin}%
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {prod.totalAvailableStock ?? (prod.isSubscription ? '∞' : '10+')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Catalog Product</h3>
                <p className="text-xs text-slate-500 mt-0.5">Provision a new product directly into PostgreSQL.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HW-LAP-PRO16"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICES">Services</option>
                    <option value="SUBSCRIPTION">Subscription</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Workstation Pro"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Product specifications and details..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProduct.baseCost}
                    onChange={(e) => setNewProduct({ ...newProduct, baseCost: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProduct.basePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Margin %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProduct.minMarginThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, minMarginThreshold: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
