'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiClient } from '@/services/apiClient';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTier, setActiveTier] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    tier: 'BRONZE',
    historicalAvgDisc: 5,
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
      showToast('Could not load customers from backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (activeTier !== 'ALL' && c.tier !== activeTier) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchCompany = c.companyName?.toLowerCase().includes(q);
        return matchName || matchEmail || matchCompany;
      }
      return true;
    });
  }, [customers, activeTier, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const gold = customers.filter((c) => c.tier === 'GOLD').length;
    const silver = customers.filter((c) => c.tier === 'SILVER').length;
    const bronze = customers.filter((c) => c.tier === 'BRONZE').length;
    return { total, gold, silver, bronze };
  }, [customers]);

  // Handle create customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.email.trim()) {
      alert('Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createCustomer({
        ...newCustomer,
        historicalAvgDisc: Number(newCustomer.historicalAvgDisc) || 0,
      });
      showToast(`Customer "${newCustomer.name}" created!`);
      setIsCreateModalOpen(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        tier: 'BRONZE',
        historicalAvgDisc: 5,
      });
      loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = async (id, name) => {
    if (!confirm(`Delete customer profile "${name}"?`)) return;
    try {
      await apiClient.deleteCustomer(id);
      showToast(`Customer "${name}" deleted.`);
      loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'GOLD':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            Gold (15% max)
          </span>
        );
      case 'SILVER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            Silver (10% max)
          </span>
        );
      case 'BRONZE':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            Bronze (5% max)
          </span>
        );
    }
  };

  return (
    <AppLayout>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in">
          <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers Master</h1>
          <p className="text-xs text-slate-500 mt-1">
            Accounts directory, tier discount eligibility, assigned representatives, and quotation history.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Accounts</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
          <span className="text-[11px] text-slate-400">PostgreSQL Live Data</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Gold Tier</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.gold}</div>
          <span className="text-[11px] text-slate-400">15% discount ceiling</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Silver Tier</span>
          <div className="text-2xl font-bold text-slate-700 mt-1">{metrics.silver}</div>
          <span className="text-[11px] text-slate-400">10% discount ceiling</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Bronze Tier</span>
          <div className="text-2xl font-bold text-orange-600 mt-1">{metrics.bronze}</div>
          <span className="text-[11px] text-slate-400">5% discount ceiling</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 mb-6 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
        {/* Tier Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Tiers' },
            { id: 'GOLD', label: 'Gold (15%)' },
            { id: 'SILVER', label: 'Silver (10%)' },
            { id: 'BRONZE', label: 'Bronze (5%)' },
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeTier === tier.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tier.label}
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
            placeholder="Search name, company, email..."
            className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-medium text-slate-600 select-none">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Discount Tier</th>
                <th className="py-3.5 px-4 text-center">Historical Avg Disc</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading accounts from database...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                          {cust.name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 leading-tight">{cust.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{cust.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-4 px-4 font-normal text-slate-700 whitespace-nowrap">
                      {cust.companyName || 'Individual Client'}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4 font-normal text-slate-600 whitespace-nowrap text-xs">
                      {cust.phone || '—'}
                    </td>

                    {/* Tier */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getTierBadge(cust.tier)}
                    </td>

                    {/* Historical Avg Disc */}
                    <td className="py-4 px-4 text-center font-semibold text-slate-800 whitespace-nowrap">
                      {cust.historicalAvgDisc ?? 5}%
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Customer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Customer Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create a customer account in PostgreSQL.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@acme.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1-555-0199"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Legal Name</label>
                <input
                  type="text"
                  placeholder="Acme Global Industries Inc"
                  value={newCustomer.companyName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount Tier *</label>
                  <select
                    value={newCustomer.tier}
                    onChange={(e) => setNewCustomer({ ...newCustomer, tier: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  >
                    <option value="BRONZE">Bronze (5% max)</option>
                    <option value="SILVER">Silver (10% max)</option>
                    <option value="GOLD">Gold (15% max)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Historical Avg Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={newCustomer.historicalAvgDisc}
                    onChange={(e) => setNewCustomer({ ...newCustomer, historicalAvgDisc: e.target.value })}
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
                  {isSubmitting ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
