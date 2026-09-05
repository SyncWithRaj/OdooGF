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

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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
  }, []);

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
          </div>
        )}
      </AppLayout>
    </RequireRole>
  );
}
