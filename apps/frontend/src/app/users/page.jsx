'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { apiClient } from '@/services/apiClient';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: 'SALES_REP',
    teamName: 'Direct Sales',
    password: 'TemporaryPass123!',
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Could not load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeRole !== 'ALL' && u.role !== activeRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchTeam = u.teamName?.toLowerCase().includes(q);
        return matchName || matchEmail || matchTeam;
      }
      return true;
    });
  }, [users, activeRole, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const reps = users.filter((u) => u.role === 'SALES_REP').length;
    const managers = users.filter((u) => u.role === 'SALES_MANAGER').length;
    const finance = users.filter((u) => u.role === 'FINANCE').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { total, reps, managers, finance, admins };
  }, [users]);

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email.trim() || !newUser.fullName.trim() || !newUser.password.trim()) {
      alert('Full Name, Email, and Password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createUser(newUser);
      showToast(`User "${newUser.fullName}" provisioned successfully!`);
      setIsCreateModalOpen(false);
      setNewUser({
        fullName: '',
        email: '',
        role: 'SALES_REP',
        teamName: 'Direct Sales',
        password: 'TemporaryPass123!',
      });
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to provision user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await apiClient.deleteUser(id);
      showToast(`User "${name}" removed.`);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">Admin</span>;
      case 'SALES_MANAGER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">Sales Manager</span>;
      case 'FINANCE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Finance Controller</span>;
      case 'SALES_REP':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Sales Rep</span>;
      case 'CUSTOMER':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Customer</span>;
    }
  };

  return (
    <RequireRole roles={['admin']}>
      <AppLayout>
        {/* Flash Toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <span className={`w-2.5 h-2.5 rounded-full ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management (Admin)</h1>
            <p className="text-xs text-slate-500 mt-1">
              Provision internal users, configure team designations, and administer system roles.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Provision User</span>
          </button>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Total Users</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
            <span className="text-[11px] text-slate-400">Database Accounts</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Sales Reps</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.reps}</div>
            <span className="text-[11px] text-slate-400">Direct Sales</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Sales Managers</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.managers}</div>
            <span className="text-[11px] text-slate-400">L1 Approval</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Finance</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.finance}</div>
            <span className="text-[11px] text-slate-400">L2 Controller</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Admins</span>
            <div className="text-2xl font-bold text-purple-600 mt-1">{metrics.admins}</div>
            <span className="text-[11px] text-slate-400">Superuser</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 mb-6 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Roles' },
              { id: 'SALES_REP', label: 'Sales Reps' },
              { id: 'SALES_MANAGER', label: 'Managers' },
              { id: 'FINANCE', label: 'Finance' },
              { id: 'ADMIN', label: 'Admins' },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  activeRole === role.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {role.label}
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
              placeholder="Search user, email, team..."
              className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-slate-200/80 text-xs font-medium text-slate-600 select-none">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Loading users from database...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name + Email */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {u.fullName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 leading-tight">{u.fullName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Team */}
                      <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                        {u.teamName || 'General'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-300 text-emerald-700 bg-emerald-50/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete User"
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

        {/* PROVISION USER MODAL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Provision Internal User</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Create user account with Role in PostgreSQL.</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Patel"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="priya.finance@dealflow.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Assigned Role *</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-semibold"
                    >
                      <option value="SALES_REP">Sales Rep</option>
                      <option value="SALES_MANAGER">Sales Manager</option>
                      <option value="FINANCE">Finance Controller</option>
                      <option value="ADMIN">System Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Team Name</label>
                    <input
                      type="text"
                      placeholder="Enterprise Sales"
                      value={newUser.teamName}
                      onChange={(e) => setNewUser({ ...newUser, teamName: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default: TemporaryPass123!</p>
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
                    {isSubmitting ? 'Provisioning...' : 'Provision User'}
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
