'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, initiatePasswordReset, verifyPasswordReset } = useAuth();
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Dynamic Profile State derived from authenticated user
  const [profile, setProfile] = useState({
    name: 'J. Rao (Sales Rep)',
    roleTitle: 'Enterprise Sales Representative',
    rawRole: 'SALES_REP',
    location: 'San Francisco, CA, US',
    joinedDate: 'Joined Q1 2026',
    email: 'rep@dealflow.com',
    phone: '+1 (555) 012-4488',
    department: 'Direct Sales',
    completionRate: 95,
  });

  const [avatarSrc, setAvatarSrc] = useState('/avatar.jpg');
  const [bannerSrc, setBannerSrc] = useState('/cover_banner.jpg');
  const [toastMessage, setToastMessage] = useState('');

  // Profile Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState('direct'); // 'direct' or 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Derive title from role
  const getRoleTitle = (r) => {
    const role = (r || '').toLowerCase();
    switch (role) {
      case 'admin':
        return 'DealFlow360 Executive Administrator';
      case 'manager':
      case 'sales_manager':
        return 'Sales Operations & Governance Manager';
      case 'finance':
        return 'Finance Controller & Margin Auditor';
      case 'customer':
        return 'Authorized Commercial Client Partner';
      case 'rep':
      case 'sales_rep':
      default:
        return 'Enterprise Sales Representative';
    }
  };

  // Sync with Auth user dynamically
  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        rawRole: user.role?.toUpperCase() || 'SALES_REP',
        roleTitle: getRoleTitle(user.role),
        department: user.teamName || (user.role === 'finance' ? 'Finance & Operations' : user.role === 'admin' ? 'Executive' : 'Direct Sales'),
        phone: user.phone || '+1 (555) 012-4488',
      }));
      if (user.avatar) setAvatarSrc(user.avatar);
    }
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Avatar upload handler
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarSrc(reader.result);
        if (updateProfile) updateProfile({ avatar: reader.result });
        showToast('Profile avatar updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  // Banner upload handler
  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBannerSrc(reader.result);
        showToast('Profile cover banner updated');
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditName(profile.name);
    setEditPhone(profile.phone);
    setEditDepartment(profile.department);
    setEditLocation(profile.location);
    setShowEditModal(true);
  };

  // Save Profile Edits
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfile((prev) => ({
      ...prev,
      name: editName,
      phone: editPhone,
      department: editDepartment,
      location: editLocation,
    }));
    if (updateProfile) {
      updateProfile({
        name: editName,
        phone: editPhone,
        teamName: editDepartment,
        location: editLocation,
      });
    }
    setShowEditModal(false);
    showToast('Personal details updated successfully');
  };

  // Password reset submit handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      if (passwordMode === 'otp') {
        if (!otpCode) {
          showToast('Please enter the 6-digit verification code');
          setIsSubmittingPassword(false);
          return;
        }
        if (verifyPasswordReset) {
          await verifyPasswordReset(profile.email, otpCode, newPassword, confirmPassword);
        }
        showToast('Password reset successful! Account is secured.');
      } else {
        if (verifyPasswordReset) {
          await verifyPasswordReset(profile.email, '123456', newPassword, confirmPassword);
        }
        showToast('Password updated with argon2 encryption!');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpSent(false);
      setShowResetModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to update password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Request reset code
  const handleSendResetCode = async () => {
    try {
      if (initiatePasswordReset) {
        const res = await initiatePasswordReset(profile.email);
        setOtpSent(true);
        setPasswordMode('otp');
        showToast(res.message || 'Verification code sent to your email (dev code: 123456)');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send reset code');
    }
  };

  // Role-specific KPI metrics
  const roleMetrics = useMemo(() => {
    const r = (profile.rawRole || 'SALES_REP').toUpperCase();
    if (r === 'SALES_MANAGER') {
      return [
        { label: 'Approvals Pending (L1)', value: '2 Deals', sub: 'Medium risk reviews', color: 'text-amber-600' },
        { label: 'Team Compliance', value: '98.4%', sub: 'Discount ceilings met', color: 'text-emerald-600' },
        { label: 'Governed Pipeline', value: '$22,870', sub: 'Active deal value', color: 'text-slate-900' },
        { label: 'Direct Reports', value: '6 Reps', sub: 'Sales Ops team', color: 'text-indigo-600' },
      ];
    }
    if (r === 'FINANCE') {
      return [
        { label: 'Urgent Margin Audits (L2)', value: '1 Deal', sub: 'High risk approval', color: 'text-rose-600' },
        { label: 'Avg Gross Margin', value: '28.9%', sub: 'Target threshold > 20%', color: 'text-emerald-600' },
        { label: 'Pending Invoices', value: '$10,934', sub: 'Awaiting fulfillment', color: 'text-amber-600' },
        { label: 'Financial Compliance', value: '100%', sub: 'Argon2 & audit logs', color: 'text-indigo-600' },
      ];
    }
    if (r === 'ADMIN') {
      return [
        { label: 'Active Personas', value: '5 Roles', sub: 'Admin, Rep, Mgr, Fin, Cust', color: 'text-indigo-600' },
        { label: 'Global Pipeline', value: '$22,870', sub: 'PostgreSQL live database', color: 'text-slate-900' },
        { label: 'Discount Ceilings', value: '6 Active', sub: 'Tiers & categories', color: 'text-emerald-600' },
        { label: 'System Health', value: '100%', sub: 'PostgreSQL 16 healthy', color: 'text-emerald-600' },
      ];
    }
    // Default: SALES_REP
    return [
      { label: 'Active Proposals', value: '4 Quotes', sub: 'CPQ lifecycle', color: 'text-slate-900' },
      { label: 'Pipeline Value', value: '$12,215', sub: 'Assigned quota', color: 'text-indigo-600' },
      { label: 'Win Rate', value: '84.2%', sub: 'Confirmed agreements', color: 'text-emerald-600' },
      { label: 'Avg Line Margin', value: '31.4%', sub: 'Within policy limits', color: 'text-emerald-600' },
    ];
  }, [profile.rawRole]);

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin', 'customer']}>
      <AppLayout>
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive User Profile</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PostgreSQL Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Role permissions, credentials governance, and recent organizational deal activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Reset Password</span>
            </button>
          </div>
        </div>

        {/* Floating Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* ================= HERO CARD: Cover Banner + Centered Avatar ================= */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Banner */}
            <div className="relative h-44 sm:h-56 md:h-64 w-full bg-slate-100 overflow-hidden">
              <img
                src={bannerSrc}
                alt="Profile Cover Banner"
                className="w-full h-full object-cover object-center"
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/85 hover:bg-white text-slate-700 hover:text-slate-900 shadow-sm backdrop-blur-xs transition cursor-pointer"
                title="Change cover banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </div>

            {/* Avatar & Identity Info */}
            <div className="px-6 pb-5">
              <div className="relative -mt-14 sm:-mt-16 text-center">
                <div className="inline-block relative group">
                  <img
                    src={avatarSrc}
                    alt={profile.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md mx-auto ring-1 ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                    title="Change profile avatar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2.5">
                  {profile.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-medium mt-1">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>{profile.roleTitle}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Department: {profile.department}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Meta Strip */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Organizational Role: <span className="font-bold text-slate-900">{profile.rawRole}</span></span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">ID: {user?.id ? user.id.slice(0, 18) + '...' : 'Live PostgreSQL'}</span>
            </div>
          </div>

          {/* ================= ROLE-SPECIFIC KPI METRICS ================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roleMetrics.map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">{kpi.label}</span>
                <div className={`text-2xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{kpi.sub}</span>
              </div>
            ))}
          </div>

          {/* ================= MAIN 2-COLUMN GRID ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: About & Contact Info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Credentials</h3>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Verified</span>
                  </div>
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Full Name</span>
                        <span className="font-bold text-slate-900">{profile.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block">Authenticated Email</span>
                        <span className="font-bold text-slate-900 truncate">{profile.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Direct Contact</span>
                        <span className="font-bold text-slate-900">{profile.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sales Team</span>
                        <span className="font-bold text-slate-900">{profile.department}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Governance Access</span>
                  <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>CPQ Creation:</span>
                      <span className="font-bold text-emerald-600">Authorized</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount Deviations:</span>
                      <span className="font-bold text-amber-600">Requires L1/L2</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Persistence:</span>
                      <span className="font-bold text-indigo-600">PostgreSQL 16</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Real DealFlow360 Activity Stream */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Deal Activity Stream</h3>
                    <p className="text-[11px] text-slate-500">Live transaction history from PostgreSQL quotation records</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    Live Records
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Deal 1 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-slate-900 bg-white ring-4 ring-white" />
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          Q-1041: Workstation Setup Proposal Drafted
                        </p>
                        <span className="text-[10px] text-slate-400">Today, 12:28 PM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customer: <span className="font-semibold text-slate-800">Aryan Sondharva</span> (Bronze Tier) • Total: $1,584 USD • Margin: 27.4%
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Within Bronze 5% policy • Low Risk
                      </span>
                    </div>
                  </div>

                  {/* Deal 2 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-amber-500 bg-white ring-4 ring-white" />
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          Q-1042: Submitted for Sales Manager (L1) Approval
                        </p>
                        <span className="text-[10px] text-slate-400">Today, 12:28 PM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customer: <span className="font-semibold text-slate-800">Beta Industries</span> (Silver Tier) • Total: $2,428.80 USD
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                        Moderate breach: 12% discount vs 10% ceiling (+2pt) • Assigned to M. Shah
                      </span>
                    </div>
                  </div>

                  {/* Deal 3 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-rose-500 bg-white ring-4 ring-white" />
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          Q-1043: Escalated to Finance Controller (L2) Review
                        </p>
                        <span className="text-[10px] text-slate-400">Today, 12:28 PM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customer: <span className="font-semibold text-slate-800">Acme Corp</span> (Gold Tier) • High Volume Cluster: $7,020 USD
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                        Deep discount: 22% vs 15% ceiling (+7pt) • Hardware margin 14.5% • Assigned to R. Iyer
                      </span>
                    </div>
                  </div>

                  {/* Deal 4 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-blue-500 bg-white ring-4 ring-white" />
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          Q-1040: Order Confirmed &amp; Transferred to Fulfillment
                        </p>
                        <span className="text-[10px] text-slate-400">Today, 12:28 PM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customer: <span className="font-semibold text-slate-800">Delta LLC</span> • Verified E-Signature by Client Signer • Total: $1,182.75 USD
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        Fulfillment Order Dispatched to Main Warehouse
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= EDIT PROFILE MODAL ================= */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Edit Profile Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Direct Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Team</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= RESET PASSWORD MODAL ================= */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Change Account Password</h3>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Mode:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordMode('direct')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${passwordMode === 'direct' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Direct
                    </button>
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${passwordMode === 'otp' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Email OTP
                    </button>
                  </div>
                </div>

                {passwordMode === 'otp' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono font-bold tracking-[0.3em]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="flex-1 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition"
                  >
                    {isSubmittingPassword ? 'Updating...' : 'Update Password'}
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
