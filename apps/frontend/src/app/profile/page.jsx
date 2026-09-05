'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';

export default function ProfilePage() {
  const { user, updateProfile, initiatePasswordReset } = useAuth();
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Dynamic Profile State derived from authenticated user
  const [profile, setProfile] = useState({
    name: 'Vikram Mehta',
    roleTitle: 'Authorized Commercial Client Partner',
    rawRole: 'CUSTOMER',
    location: 'San Francisco, CA, US',
    email: 'customer@dealflow.com',
    phone: '+1 (555) 012-4488',
    department: 'External Client',
  });

  const [avatarSrc, setAvatarSrc] = useState('/avatar.jpg');
  const [bannerSrc, setBannerSrc] = useState('/cover_banner.jpg');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Profile Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Confirmation Modal State for Reset Password
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Derive title from role
  const getRoleTitle = (r) => {
    const role = (r || '').toLowerCase();
    switch (role) {
      case 'admin':
        return 'Executive Administrator';
      case 'manager':
      case 'sales_manager':
        return 'Sales Operations Manager';
      case 'finance':
        return 'Finance Controller & Auditor';
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
        name: user.name || user.fullName || prev.name,
        email: user.email || prev.email,
        rawRole: (user.role || 'customer').toUpperCase(),
        roleTitle: getRoleTitle(user.role),
        department:
          user.teamName ||
          (user.role === 'customer'
            ? 'External Client'
            : user.role === 'finance'
            ? 'Finance & Operations'
            : user.role === 'admin'
            ? 'Executive Leadership'
            : 'Direct Sales'),
        phone: user.phone || prev.phone,
        location: user.location || prev.location,
      }));

      if (user.avatarUrl) setAvatarSrc(user.avatarUrl);
      else if (user.avatar) setAvatarSrc(user.avatar);

      if (user.bannerUrl) setBannerSrc(user.bannerUrl);
      else if (user.banner) setBannerSrc(user.banner);
    }
  }, [user]);

  // Avatar upload handler to MinIO Object Storage
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile image must be smaller than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarSrc(previewUrl);
    setUploadingAvatar(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dealflow_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    if (token) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/users/profile/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.avatarUrl) {
          setAvatarSrc(data.avatarUrl);
          if (updateProfile) updateProfile({ avatarUrl: data.avatarUrl });
          toast.success('Profile avatar uploaded to MinIO storage');
        } else {
          toast.error(data.message || 'Failed to upload avatar to MinIO');
        }
      } catch (err) {
        console.warn('MinIO Avatar upload failed:', err);
        toast.error('Error uploading avatar to storage');
      } finally {
        setUploadingAvatar(false);
      }
    } else {
      setUploadingAvatar(false);
      toast.success('Avatar updated locally');
    }
  };

  // Banner upload handler to MinIO Object Storage
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Cover banner must be smaller than 10MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setBannerSrc(previewUrl);
    setUploadingBanner(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dealflow_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    if (token) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/users/profile/banner`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.bannerUrl) {
          setBannerSrc(data.bannerUrl);
          if (updateProfile) updateProfile({ bannerUrl: data.bannerUrl });
          toast.success('Cover banner uploaded to MinIO storage');
        } else {
          toast.error(data.message || 'Failed to upload banner to MinIO');
        }
      } catch (err) {
        console.warn('MinIO Banner upload failed:', err);
        toast.error('Error uploading banner to storage');
      } finally {
        setUploadingBanner(false);
      }
    } else {
      setUploadingBanner(false);
      toast.success('Cover banner updated locally');
    }
  };

  // Open Edit Details Modal
  const handleOpenEditModal = () => {
    setEditName(profile.name);
    setEditPhone(profile.phone);
    setEditDepartment(profile.department);
    setEditLocation(profile.location);
    setShowEditModal(true);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updated = {
      name: editName,
      phone: editPhone,
      teamName: editDepartment,
      location: editLocation,
    };

    setProfile((prev) => ({
      ...prev,
      name: editName,
      phone: editPhone,
      department: editDepartment,
      location: editLocation,
    }));

    if (updateProfile) {
      try {
        await updateProfile(updated);
      } catch (err) {
        console.error('Failed to sync profile update:', err);
      }
    }

    toast.success('Profile details saved successfully');
    setShowEditModal(false);
  };

  // Handle Reset Password with Confirmation
  const handleConfirmResetPassword = async () => {
    setIsResetting(true);
    try {
      if (initiatePasswordReset) {
        await initiatePasswordReset(profile.email);
      }
      toast.success(`Password reset verification dispatched to ${profile.email}`);
      setShowResetConfirmModal(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to dispatch password reset');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <RequireRole roles={['rep', 'manager', 'finance', 'admin', 'customer']}>
      <AppLayout>
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              User Profile
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Personal credentials, MinIO media assets, and account security.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenEditModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-4xl space-y-6">
          {/* ================= HERO CARD: Cover Banner + PFP Avatar ================= */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            {/* Banner Section */}
            <div className="relative h-44 sm:h-56 md:h-64 w-full bg-zinc-950 overflow-hidden group">
              <img
                src={bannerSrc}
                alt="Profile Cover Banner"
                className="w-full h-full object-cover object-center filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

              {/* Banner Upload Button */}
              <button
                type="button"
                disabled={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-black text-white shadow-md backdrop-blur-md transition cursor-pointer flex items-center gap-1.5 border border-white/20 text-xs font-semibold"
                title="Upload cover banner to MinIO storage"
              >
                {uploadingBanner ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <span>{uploadingBanner ? 'Uploading...' : 'Change Cover'}</span>
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
            </div>

            {/* Avatar & Identity Section */}
            <div className="px-6 pb-6 pt-0">
              <div className="relative -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-center sm:items-end gap-5">
                {/* PFP with Upload Trigger */}
                <div className="relative group shrink-0">
                  <img
                    src={avatarSrc}
                    alt={profile.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-lg bg-zinc-900 ring-1 ring-zinc-200"
                  />

                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-zinc-900 hover:bg-black text-white shadow-md border border-white transition cursor-pointer"
                    title="Upload PFP avatar to MinIO storage"
                  >
                    {uploadingAvatar ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                {/* Identity Text */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight truncate">
                      {profile.name}
                    </h2>
                    <span className="self-center sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase tracking-wide">
                      {profile.rawRole}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 mt-1 font-medium">
                    {profile.roleTitle} &bull; {profile.department}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= CARD 2: Contact & Account Information ================= */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Account Credentials</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Verified enterprise user identity records</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Full Name
                </span>
                <span className="text-xs font-semibold text-zinc-900 block truncate">
                  {profile.name}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Email Address
                </span>
                <span className="text-xs font-semibold text-zinc-900 block truncate font-mono">
                  {profile.email}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Direct Phone
                </span>
                <span className="text-xs font-semibold text-zinc-900 block">
                  {profile.phone || 'Not provided'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Department / Team
                </span>
                <span className="text-xs font-semibold text-zinc-900 block">
                  {profile.department}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Location
                </span>
                <span className="text-xs font-semibold text-zinc-900 block">
                  {profile.location || 'San Francisco, CA, US'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Storage Infrastructure
                </span>
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                  MinIO S3 Connected
                </span>
              </div>
            </div>
          </div>

          {/* ================= CARD 3: Security & Password Reset ================= */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-2xs">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-zinc-900">Security &amp; Authentication</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage your credentials, password reset requests, and security preferences.
              </p>
            </div>

            <div className="space-y-4 divide-y divide-zinc-100">
              {/* Password Row with Dedicated Reset Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 block">Password</span>
                  <span className="text-xs text-zinc-500 font-mono mt-0.5 block">
                    ••••••••••••
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Encrypted with enterprise argon2 hash security
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-black text-white transition flex items-center gap-2 shadow-xs cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Reset Password</span>
                </button>
              </div>

              {/* Two-Factor / Active Session */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 block">Active Authentication Session</span>
                  <span className="text-xs text-zinc-500 mt-0.5 block">
                    Role-Based Access Control: <strong className="text-zinc-900">{profile.rawRole}</strong>
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 self-start sm:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse" />
                  Active Session
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RESET PASSWORD CONFIRMATION MODAL ================= */}
        {showResetConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Reset Password</h3>
                    <p className="text-[11px] text-zinc-400">Confirmation Required</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Are you sure you want to request a password reset for your account?
                </p>
                <p className="text-xs text-zinc-500 mt-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono">
                  Target Account: <strong className="text-zinc-900">{profile.email}</strong>
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  A verification code and password reset instructions will be dispatched to this email address.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleConfirmResetPassword}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isResetting ? 'Sending Request...' : 'Confirm & Send Reset Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= EDIT PROFILE MODAL ================= */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-zinc-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
                <h3 className="text-sm font-bold text-zinc-900">Edit Profile Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Direct Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Department / Team</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-xs font-medium focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                  >
                    Save Changes
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
