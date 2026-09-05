'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';
import { toast } from 'react-toastify';

export default function GovernancePage() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
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
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Discount Governance &amp; Policy Matrix</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Configure tier-based caps, category discount ceilings, and multi-tier approval routing chains.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-semibold self-start sm:self-auto">
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
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Services</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 font-bold">Professional</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={categoryCeilings.SERVICES}
                      onChange={(e) => setCategoryCeilings({ ...categoryCeilings, SERVICES: e.target.value })}
                      className="w-24 h-9 px-3 rounded-lg border border-zinc-300 bg-white font-bold text-sm text-zinc-900 focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-zinc-600">% Max</span>
                    <button
                      onClick={() => handleUpdateCategory('SERVICES')}
                      disabled={savingKey === 'cat-SERVICES'}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white font-medium text-xs transition cursor-pointer shadow-2xs"
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
                <table className="w-full text-left border-collapse text-xs min-w-[620px]">
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
                      <td className="py-3.5 px-4 font-semibold text-zinc-900">LOW RISK</td>
                      <td className="py-3.5 px-4 text-slate-500">Auto-approved</td>
                      <td className="py-3.5 px-4 text-slate-500">Not required</td>
                      <td className="py-3.5 px-4 text-slate-600">Within tier and category ceilings. Instant rep sign-off.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-amber-700">MEDIUM RISK</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">Required (L1)</td>
                      <td className="py-3.5 px-4 text-slate-500">Not required</td>
                      <td className="py-3.5 px-4 text-slate-600">Exceeds rep limits up to 5 points. Routed to Sales Manager.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-rose-700">HIGH RISK</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">Required (L1)</td>
                      <td className="py-3.5 px-4 font-semibold text-rose-700">Required (L2)</td>
                      <td className="py-3.5 px-4 text-slate-600">Exceeds limits by &gt;5 points or margin breach. Multi-tier sign-off.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Real-time CPQ Discount Validator & Simulator */}
            <DiscountSimulator />
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
              className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition"
            >
              {blendedLoading ? 'Evaluating Quotation...' : 'Run Blended Quotation Risk Evaluation'}
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
                      : 'bg-zinc-100 border-zinc-200 text-zinc-800'
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
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-900">Blended Risk Quotation Score</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    blendedResult.blendedRiskScore === 'HIGH'
                      ? 'bg-rose-100 text-rose-800'
                      : blendedResult.blendedRiskScore === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {blendedResult.blendedRiskScore} RISK
                </span>
              </div>

              <p className="text-xs text-slate-700 mb-2">{blendedResult.flagReasonSummary}</p>

              {blendedResult.financials && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-zinc-200">
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
                    <span className="font-bold text-zinc-900">{blendedResult.financials.totalMarginPercent}%</span>
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

