'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function GovernancePage() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  // Ceilings editable state
  const [tierCeilings, setTierCeilings] = useState({
    GOLD: 15,
    SILVER: 10,
    BRONZE: 5,
  });

  const [categoryCeilings, setCategoryCeilings] = useState({
    HARDWARE: 5,
    SERVICES: 10,
    SUBSCRIPTION: 15,
  });

  // Engine 1: Curated Upsells State (Ranks 1 to 5)
  const [curatedUpsells, setCuratedUpsells] = useState([]);
  const [products, setProducts] = useState([]);
  const [isCuratedModalOpen, setIsCuratedModalOpen] = useState(false);
  const [savingCurated, setSavingCurated] = useState(false);
  const [curatedForm, setCuratedForm] = useState({
    baseProductId: '',
    recommendedProductId: '',
    rank: 1,
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCuratedUpsells = async () => {
    try {
      const data = await apiClient.getCuratedUpsells();
      setCuratedUpsells(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load curated upsells:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiClient.getProducts();
      setProducts(Array.isArray(data) ? data : data?.products || []);
    } catch (err) {
      console.warn('Failed to load products list:', err);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDiscountRules();
      setRules(data);

      // Populate editable ceilings if available
      if (data.tierCeilings) {
        const tiers = {};
        data.tierCeilings.forEach((t) => {
          tiers[t.tier] = t.maxDiscount;
        });
        setTierCeilings((prev) => ({ ...prev, ...tiers }));
      }

      if (data.categoryCeilings) {
        const cats = {};
        data.categoryCeilings.forEach((c) => {
          cats[c.category] = c.maxDiscount;
        });
        setCategoryCeilings((prev) => ({ ...prev, ...cats }));
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
      showToast('Could not load discount rules from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    loadCuratedUpsells();
    loadProducts();
  }, []);

  const handleCreateCurated = async (e) => {
    e.preventDefault();
    if (!curatedForm.baseProductId || !curatedForm.recommendedProductId) {
      alert('Please select both a base product and a recommended product.');
      return;
    }
    if (curatedForm.baseProductId === curatedForm.recommendedProductId) {
      alert('Base product and recommended product cannot be the same item.');
      return;
    }
    setSavingCurated(true);
    try {
      await apiClient.createCuratedUpsell({
        baseProductId: curatedForm.baseProductId,
        recommendedProductId: curatedForm.recommendedProductId,
        rank: Number(curatedForm.rank),
      });
      showToast(`Curated Upsell Rank #${curatedForm.rank} configured!`);
      setIsCuratedModalOpen(false);
      await loadCuratedUpsells();
    } catch (err) {
      alert(err.message || 'Failed to configure curated upsell');
    } finally {
      setSavingCurated(false);
    }
  };

  const handleDeleteCurated = async (id) => {
    if (!confirm('Are you sure you want to remove this curated priority rule?')) return;
    try {
      await apiClient.deleteCuratedUpsell(id);
      showToast('Curated rule removed.');
      await loadCuratedUpsells();
    } catch (err) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  const handleUpdateTier = async (tier) => {
    setSavingKey(`tier-${tier}`);
    try {
      await apiClient.updateTierCeiling(tier, tierCeilings[tier]);
      showToast(`Tier ${tier} ceiling updated to ${tierCeilings[tier]}%!`);
      loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to update ceiling', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateCategory = async (category) => {
    setSavingKey(`cat-${category}`);
    try {
      await apiClient.updateCategoryCeiling(category, categoryCeilings[category]);
      showToast(`Category ${category} ceiling updated to ${categoryCeilings[category]}%!`);
      loadRules();
    } catch (err) {
      showToast(err.message || 'Failed to update ceiling', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <RequireRole roles={['manager', 'finance', 'admin']}>
      <AppLayout>
        {/* Flash Toast */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in">
            <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discount Governance &amp; Policy Matrix</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure tier-based caps, category discount ceilings, and multi-tier approval routing chains.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
            Live PostgreSQL Governance Rules
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            Loading governance rules from database...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Customer Tier Ceilings */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Customer Tier Ceilings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Maximum discount reps can offer before triggering automated multi-level sign-offs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gold */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Gold Tier</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">Enterprise</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={tierCeilings.GOLD}
                      onChange={(e) => setTierCeilings({ ...tierCeilings, GOLD: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-amber-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateTier('GOLD')}
                      disabled={savingKey === 'tier-GOLD'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'tier-GOLD' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Silver */}
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Silver Tier</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">Mid-Market</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={tierCeilings.SILVER}
                      onChange={(e) => setTierCeilings({ ...tierCeilings, SILVER: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-slate-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateTier('SILVER')}
                      disabled={savingKey === 'tier-SILVER'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'tier-SILVER' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Bronze */}
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-900 uppercase tracking-wider">Bronze Tier</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 font-bold">Standard</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={tierCeilings.BRONZE}
                      onChange={(e) => setTierCeilings({ ...tierCeilings, BRONZE: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-orange-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateTier('BRONZE')}
                      disabled={savingKey === 'tier-BRONZE'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'tier-BRONZE' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Product Category Ceilings */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Product Category Ceilings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category limits preventing excessive margins erosion across Hardware, Services, and Software Subscriptions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hardware */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Hardware</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">Physical</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={categoryCeilings.HARDWARE}
                      onChange={(e) => setCategoryCeilings({ ...categoryCeilings, HARDWARE: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-blue-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateCategory('HARDWARE')}
                      disabled={savingKey === 'cat-HARDWARE'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'cat-HARDWARE' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Services */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Services</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">Professional</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={categoryCeilings.SERVICES}
                      onChange={(e) => setCategoryCeilings({ ...categoryCeilings, SERVICES: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-emerald-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateCategory('SERVICES')}
                      disabled={savingKey === 'cat-SERVICES'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'cat-SERVICES' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Subscriptions */}
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Subscriptions</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">Recurring</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={categoryCeilings.SUBSCRIPTION}
                      onChange={(e) => setCategoryCeilings({ ...categoryCeilings, SUBSCRIPTION: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-purple-300 bg-white font-bold text-sm text-slate-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-slate-600">% Max</span>
                    <button
                      onClick={() => handleUpdateCategory('SUBSCRIPTION')}
                      disabled={savingKey === 'cat-SUBSCRIPTION'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-900 text-white font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      {savingKey === 'cat-SUBSCRIPTION' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Risk Level Approval Chain Matrix */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Approval Chain Routing Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-tier escalation rules determining required authorizers for each risk level.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Manager Approval (L1)</th>
                      <th className="py-3 px-4">Finance Controller (L2)</th>
                      <th className="py-3 px-4">Routing Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-emerald-700">LOW RISK</td>
                      <td className="py-3.5 px-4 text-slate-500">Auto-approved</td>
                      <td className="py-3.5 px-4 text-slate-500">Not required</td>
                      <td className="py-3.5 px-4 text-slate-600">Within tier and category ceilings. Instant rep sign-off.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-amber-700">MEDIUM RISK</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">✓ Required (L1)</td>
                      <td className="py-3.5 px-4 text-slate-500">Not required</td>
                      <td className="py-3.5 px-4 text-slate-600">Exceeds rep limits up to 5 points. Routed to Sales Manager.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-rose-700">HIGH RISK</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">✓ Required (L1)</td>
                      <td className="py-3.5 px-4 font-semibold text-rose-700">✓ Required (L2)</td>
                      <td className="py-3.5 px-4 text-slate-600">Exceeds limits by &gt;5 points or margin breach. Multi-tier sign-off.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Admin Curated Upsell Feeds (Engine 1: Ranks 1 to 5) */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Admin Curated Upsells (Engine 1: Priority Ranks 1–5)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                      Top Priority Feed
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manual priority pairings that always override algorithmic FP-Growth rules. Guaranteed to fill slots 1–5 in rep and customer drawers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCuratedForm({
                      baseProductId: products[0]?.id || '',
                      recommendedProductId: products[1]?.id || '',
                      rank: 1,
                    });
                    setIsCuratedModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>+</span> Configure Curated Upsell
                </button>
              </div>

              {curatedUpsells.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  No curated upsell rules configured yet. Click above to define a priority pairing.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-28">Priority Rank</th>
                        <th className="py-2.5 px-3">Base Cart Product</th>
                        <th className="py-2.5 px-3">Recommended Product</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Engine Feed</th>
                        <th className="py-2.5 px-3 text-right w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {curatedUpsells.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              Rank #{rule.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>{rule.baseProduct?.name || 'Base Product'}</div>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {rule.baseProduct?.sku} • {rule.baseProduct?.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>{rule.recommendedProduct?.name || 'Recommended Product'}</div>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {rule.recommendedProduct?.sku} • {rule.recommendedProduct?.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            ${rule.recommendedProduct?.basePrice?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              Feed 1: Curated
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCurated(rule.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold p-1 transition"
                              title="Delete rule"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 5: Real-time CPQ Discount Validator & Simulator */}
            <DiscountSimulator />
          </div>
        )}

        {/* Modal: Configure Curated Priority Upsell (Engine 1) */}
        {isCuratedModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure Curated Priority Upsell (Engine 1)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guaranteed priority slot (Rank 1 to 5) that always supersedes algorithmic suggestions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCuratedModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCurated} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Base Cart Product (Trigger)
                  </label>
                  <select
                    value={curatedForm.baseProductId}
                    onChange={(e) => setCuratedForm({ ...curatedForm, baseProductId: e.target.value })}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="">Select Base Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ${p.basePrice} [{p.category}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Recommended Product (Top-Priority Upsell)
                  </label>
                  <select
                    value={curatedForm.recommendedProductId}
                    onChange={(e) => setCuratedForm({ ...curatedForm, recommendedProductId: e.target.value })}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="">Select Recommended Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ${p.basePrice} [{p.category}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority Rank (Slots 1 to 5)
                  </label>
                  <select
                    value={curatedForm.rank}
                    onChange={(e) => setCuratedForm({ ...curatedForm, rank: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-xs focus:outline-none"
                  >
                    <option value={1}>Rank #1 (Highest Priority)</option>
                    <option value={2}>Rank #2</option>
                    <option value={3}>Rank #3</option>
                    <option value={4}>Rank #4</option>
                    <option value={5}>Rank #5 (Fifth Priority Slot)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Slots 1–5 are permanently reserved for admin-curated items before FP-Growth or margin fallbacks run.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCuratedModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCurated}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs disabled:opacity-50"
                  >
                    {savingCurated ? 'Saving...' : 'Save Curated Pairing'}
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

function DiscountSimulator() {
  const [tier, setTier] = useState('GOLD');
  const [category, setCategory] = useState('SERVICES');
  const [discount, setDiscount] = useState(18);
  const [validationResult, setValidationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Blended Risk state
  const [blendedResult, setBlendedResult] = useState(null);
  const [blendedLoading, setBlendedLoading] = useState(false);

  const handleValidateLine = async () => {
    setSimulating(true);
    try {
      const res = await apiClient.validateDiscountLine({
        customerTier: tier,
        category,
        proposedDiscount: Number(discount),
      });
      setValidationResult(res.validation || res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunBlendedSimulation = async () => {
    setBlendedLoading(true);
    try {
      const res = await apiClient.calculateBlendedRisk({
        customerTier: tier,
        lines: [
          {
            productName: 'Hardware Bundle',
            category: 'HARDWARE',
            quantity: 5,
            unitPrice: 1200,
            baseCost: 850,
            discountPercent: Number(discount),
          },
          {
            productName: 'Enterprise SLA Support',
            category: 'SERVICES',
            quantity: 1,
            unitPrice: 3500,
            baseCost: 1500,
            discountPercent: Math.max(0, Number(discount) - 5),
          },
        ],
      });
      setBlendedResult(res.blendedEvaluation || res);
    } catch (err) {
      console.error(err);
    } finally {
      setBlendedLoading(false);
    }
  };

  useEffect(() => {
    handleValidateLine();
  }, [tier, category, discount]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Interactive CPQ Discount &amp; Risk Simulator</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test policy compliance in real-time against live NestJS validation endpoints.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
          POST /api/config/discount-rules/validate-line
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Controls */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test Line Parameters</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="GOLD">GOLD Tier</option>
                <option value="SILVER">SILVER Tier</option>
                <option value="BRONZE">BRONZE Tier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="HARDWARE">Hardware</option>
                <option value="SERVICES">Services</option>
                <option value="SUBSCRIPTION">Subscription</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">Proposed Line Discount</label>
              <span className="text-sm font-black text-slate-900">{discount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleRunBlendedSimulation}
              disabled={blendedLoading}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              {blendedLoading ? 'Evaluating Quotation...' : '⚡ Run Blended Quotation Risk Evaluation'}
            </button>
          </div>
        </div>

        {/* Right: Validation & Blended Results */}
        <div className="space-y-4">
          {validationResult && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Line Compliance Evaluation</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    validationResult.isOverLimit
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {validationResult.statusBadge || (validationResult.isOverLimit ? 'OVER LIMIT' : 'COMPLIANT')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Tier Limit</span>
                  <span className="font-bold text-slate-800">{validationResult.tierLimit}%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Category Limit</span>
                  <span className="font-bold text-slate-800">{validationResult.categoryLimit}%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Allowed Ceiling</span>
                  <span className="font-bold text-slate-900">{validationResult.allowedLimit}%</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <strong>Routing:</strong> {validationResult.routingRecommendation}
              </p>
            </div>
          )}

          {blendedResult && (
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-900">Blended Risk Quotation Score</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    blendedResult.blendedRiskScore === 'HIGH'
                      ? 'bg-rose-100 text-rose-800'
                      : blendedResult.blendedRiskScore === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {blendedResult.blendedRiskScore} RISK
                </span>
              </div>

              <p className="text-xs text-slate-700 mb-2">{blendedResult.flagReasonSummary}</p>

              {blendedResult.financials && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-teal-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Revenue</span>
                    <span className="font-bold text-slate-900">${blendedResult.financials.totalRevenue?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Discount</span>
                    <span className="font-bold text-rose-600">-${blendedResult.financials.totalDiscountAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Net Margin</span>
                    <span className="font-bold text-emerald-600">{blendedResult.financials.totalMarginPercent}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

