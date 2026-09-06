'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant management state
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantList, setVariantList] = useState([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantForm, setVariantForm] = useState({
    attribute: 'RAM',
    value: '',
    extraPrice: 0,
    skuSuffix: '',
  });

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
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  const handleOpenVariants = async (product) => {
    setSelectedProductForVariants(product);
    setIsVariantModalOpen(true);
    setVariantLoading(true);
    try {
      const detail = await apiClient.getProduct(product.id);
      setVariantList(detail.variants || []);
    } catch (err) {
      console.error(err);
      showToast('Could not load product variants', 'error');
    } finally {
      setVariantLoading(false);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.attribute || !variantForm.value.trim()) {
      alert('Please provide an attribute and value for this variant.');
      return;
    }
    try {
      await apiClient.addVariant(selectedProductForVariants.id, {
        attribute: variantForm.attribute,
        value: variantForm.value.trim(),
        extraPrice: Number(variantForm.extraPrice) || 0,
        skuSuffix: variantForm.skuSuffix?.trim() || undefined,
      });
      showToast(`Variant "${variantForm.attribute}: ${variantForm.value}" added!`);
      setVariantForm({ attribute: 'RAM', value: '', extraPrice: 0, skuSuffix: '' });
      const detail = await apiClient.getProduct(selectedProductForVariants.id);
      setVariantList(detail.variants || []);
    } catch (err) {
      alert(err.message || 'Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId) => {
    try {
      await apiClient.deleteVariant(selectedProductForVariants.id, variantId);
      showToast('Variant removed');
      const detail = await apiClient.getProduct(selectedProductForVariants.id);
      setVariantList(detail.variants || []);
    } catch (err) {
      alert(err.message || 'Failed to delete variant');
    }
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

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedProducts,
    resetPage,
  } = usePagination(filteredProducts, 10);

  useEffect(() => {
    resetPage();
  }, [activeCategory, searchQuery]);

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
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.hardware}</div>
          <span className="text-[11px] text-slate-400">Physical equipment</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Subscriptions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.subscription}</div>
          <span className="text-[11px] text-slate-400">Recurring revenue</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Services</span>
          <div className="text-2xl font-bold text-zinc-900 mt-1">{metrics.services}</div>
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
          <table className="w-full text-left border-collapse min-w-[760px]">
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
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
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
                            ? 'border-zinc-300 text-zinc-900 bg-zinc-100'
                            : 'border-purple-300 text-purple-700 bg-purple-50/40'
                        }`}>
                          {prod.category}
                        </span>
                      </td>

                      {/* Base Cost */}
                      <td className="py-4 px-4 text-right font-normal text-slate-600 whitespace-nowrap">
                        ₹{Number(prod.baseCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Base Price */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        ₹{Number(prod.basePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Margin % */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className={`font-semibold ${margin < 20 ? 'text-rose-600' : 'text-zinc-900'}`}>
                          {margin}%
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {prod.totalAvailableStock ?? (prod.isSubscription ? 'Unlimited' : '10+')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleOpenVariants(prod)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-[11px] font-semibold transition cursor-pointer"
                          title="Manage Variants"
                        >
                          Variants
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer inline-flex items-center align-middle"
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
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Catalog Product</h3>
                <p className="text-xs text-slate-500 mt-0.5">Provision a new product directly into PostgreSQL.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HW-SRV-DELL"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell PowerEdge R750"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="High-density compute rack server"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-medium"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICES">Services</option>
                    <option value="SUBSCRIPTION">Subscription</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.baseCost}
                    onChange={(e) => setNewProduct({ ...newProduct, baseCost: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.basePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tax Percent (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProduct.taxPercent}
                    onChange={(e) => setNewProduct({ ...newProduct, taxPercent: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
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

      {/* VARIANT MANAGEMENT MODAL */}
      {isVariantModalOpen && selectedProductForVariants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Manage Variants: {selectedProductForVariants.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SKU: {selectedProductForVariants.sku}
                </p>
              </div>
              <button
                onClick={() => setIsVariantModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Existing Variants List */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Existing Product Variants ({variantList.length})
              </p>
              {variantLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading variants...</div>
              ) : variantList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No variants configured yet for this product.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {variantList.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{v.attribute}: </span>
                        <span className="text-slate-900">{v.value}</span>
                        {v.skuSuffix && (
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            ({v.skuSuffix})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-zinc-900">
                          {v.extraPrice > 0 ? `+₹${v.extraPrice}` : 'Included'}
                        </span>
                        <button
                          onClick={() => handleDeleteVariant(v.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete variant"
                          aria-label="Delete variant"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Variant Form */}
            <form onSubmit={handleAddVariant} className="pt-4 border-t border-slate-100 space-y-3 text-xs">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Add New Variant
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Attribute *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAM, Storage, Color"
                    value={variantForm.attribute}
                    onChange={(e) => setVariantForm({ ...variantForm, attribute: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 32GB, 1TB, Midnight"
                    value={variantForm.value}
                    onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Extra Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantForm.extraPrice}
                    onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">SKU Suffix</label>
                  <input
                    type="text"
                    placeholder="e.g. -32GB"
                    value={variantForm.skuSuffix}
                    onChange={(e) => setVariantForm({ ...variantForm, skuSuffix: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition"
                >
                  + Add Variant to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
