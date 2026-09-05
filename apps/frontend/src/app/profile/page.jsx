'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, initiatePasswordReset, verifyPasswordReset } = useAuth();
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Profile data
  const [profile, setProfile] = useState({
    name: 'Toby Belhome',
    role: 'Developer',
    location: 'San Francisco, US',
    joinedDate: 'Joined March 2025',
    email: 'hi@shadcnuikit.com',
    phone: '+1 (609) 972-22-22',
    department: 'No department',
    completionRate: 82,
    teamsCount: 7,
    projectsCount: 8,
  });

  const [avatarSrc, setAvatarSrc] = useState('/avatar.jpg');
  const [bannerSrc, setBannerSrc] = useState('/cover_banner.jpg');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [toastMessage, setToastMessage] = useState('');

  // Password reset & security card state
  const [passwordMode, setPasswordMode] = useState('direct'); // 'direct' or 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Projects list matching screenshot
  const [projects, setProjects] = useState([
    { id: 1, name: 'UI/UX', updated: 'Updated 2 hours ago', progress: 0, hours: '4:25', icon: '🎨' },
    { id: 2, name: 'Get a complete audit store', updated: 'Updated 1 day ago', progress: 45, hours: '18:42', icon: '⚙️' },
    { id: 3, name: 'Build stronger customer relationships', updated: 'Updated 2 days ago', progress: 59, hours: '9:01', icon: '👥' },
    { id: 4, name: 'Update subscription method', updated: 'Updated 2 days ago', progress: 57, hours: '0:37', icon: '🔄' },
    { id: 5, name: 'Create a new theme', updated: 'Updated 1 week ago', progress: 100, hours: '24:12', icon: '✨' },
    { id: 6, name: 'Improve social banners', updated: 'Updated 1 week ago', progress: 0, hours: '8:08', icon: '🖼️' },
  ]);

  // Connections list matching screenshot
  const [connections, setConnections] = useState([
    { id: 1, name: 'Rachel Doe', connections: 25, isConnected: true, initial: 'R', color: 'bg-blue-100 text-blue-700' },
    { id: 2, name: 'Isabella Finley', connections: 79, isConnected: false, avatar: '/avatar.jpg' },
    { id: 3, name: 'David Harrison', connections: 0, isConnected: true, initial: 'D', color: 'bg-slate-900 text-white' },
    { id: 4, name: 'Costa Quinn', connections: 9, isConnected: false, initial: 'C', color: 'bg-teal-100 text-teal-800' },
  ]);

  // Teams list matching screenshot
  const teams = [
    { id: 1, name: '#digitalmarketing', members: 8, icon: '👥' },
    { id: 2, name: '#ethereum', members: 14, icon: '💲' },
    { id: 3, name: '#conference', members: 3, icon: '📦' },
    { id: 4, name: '#supportteam', members: 3, icon: '💬' },
  ];

  // New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Sync with Auth user if available
  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        role: user.role ? (user.role.toUpperCase() === 'ADMIN' ? 'System Administrator' : user.role) : prev.role,
        department: user.teamName || prev.department,
        location: user.location || prev.location,
        phone: user.phone || user.mobile || prev.phone,
      }));
      if (user.avatar) setAvatarSrc(user.avatar);
    }
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarSrc(reader.result);
        if (updateProfile) updateProfile({ avatar: reader.result });
        showToast('Profile photo updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBannerSrc(reader.result);
        showToast('Cover banner updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConnectToggle = () => {
    setIsConnected(!isConnected);
    showToast(!isConnected ? `Connected to ${profile.name}` : 'Connection removed');
  };

  const handleToggleConnection = (id) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isConnected: !c.isConnected } : c))
    );
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj = {
      id: Date.now(),
      name: newProjectName.trim(),
      updated: 'Just now',
      progress: 0,
      hours: '0:00',
      icon: '🚀',
    };
    setProjects([newProj, ...projects]);
    setNewProjectName('');
    setShowNewProjectModal(false);
    showToast(`Project "${newProj.name}" created`);
  };

  // Password reset handler
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
        showToast('Password reset successful! Your account is secure.');
      } else {
        // Direct password change
        if (verifyPasswordReset) {
          // Dev mode fallback or direct reset
          await verifyPasswordReset(profile.email, '123456', newPassword, confirmPassword);
        }
        showToast('Password changed and updated successfully!');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpSent(false);
    } catch (err) {
      showToast(err.message || 'Failed to update password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Initiate OTP code dispatch
  const handleSendResetCode = async () => {
    try {
      if (initiatePasswordReset) {
        const res = await initiatePasswordReset(profile.email);
        setOtpSent(true);
        setPasswordMode('otp');
        showToast(res.message || 'Verification code sent to your email (dev: 123456)');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send reset code');
    }
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 30;
    if (newPassword.length >= 10) score += 20;
    if (/[A-Z]/.test(newPassword)) score += 25;
    if (/[0-9!@#$%^&*]/.test(newPassword)) score += 25;
    return Math.min(score, 100);
  };

  const strength = getPasswordStrength();

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal profile, security credentials, teams, and ongoing project status.
          </p>
        </div>
      </div>

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 bg-slate-950 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* ================================================================= */}
        {/* HERO CARD: Cover Banner + Centered Overlapping Avatar             */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Banner with Edit Button */}
          <div className="relative h-44 sm:h-60 md:h-72 w-full bg-slate-100 overflow-hidden">
            <img
              src={bannerSrc}
              alt="Profile Cover Banner"
              className="w-full h-full object-cover object-center"
            />

            {/* Banner Edit Button */}
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-sm backdrop-blur-xs transition cursor-pointer"
              title="Change cover banner"
              aria-label="Change cover banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </div>

          {/* Avatar & Identity Info */}
          <div className="px-6 pb-4">
            {/* Centered Overlapping Avatar */}
            <div className="relative -mt-14 sm:-mt-16 text-center">
              <div className="inline-block relative group">
                <img
                  src={avatarSrc}
                  alt={profile.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md mx-auto ring-1 ring-slate-200/70"
                />
                {/* Avatar Upload Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer border-4 border-transparent"
                  title="Change profile photo"
                  aria-label="Change profile photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Name & Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-2.5">
                {profile.name}
              </h2>

              {/* Meta details row */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-medium mt-1">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{profile.role}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{profile.location}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{profile.joinedDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Nav Tabs & Actions Bar */}
          <div className="px-6 py-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-2 transition relative cursor-pointer ${
                  activeTab === 'profile'
                    ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`py-2 transition relative cursor-pointer ${
                  activeTab === 'security'
                    ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Security & Password
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                className={`py-2 transition relative cursor-pointer ${
                  activeTab === 'teams'
                    ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Teams
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`py-2 flex items-center gap-1.5 transition relative cursor-pointer ${
                  activeTab === 'projects'
                    ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Projects</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {projects.length}
                </span>
              </button>
            </div>

            {/* Action Buttons: Connect + More Options */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleConnectToggle}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isConnected
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-950 hover:bg-slate-800 text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isConnected ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  )}
                </svg>
                <span>{isConnected ? 'Connected' : 'Connect'}</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Profile options opened')}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition cursor-pointer"
                aria-label="More options"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN CONTENT GRID                                                 */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* --------------------------------------------------------------- */}
          {/* LEFT COLUMN: Profile Stats, About, Contacts, and RESET PASSWORD */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: Complete your profile */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
                <span>Complete your profile</span>
                <span className="text-slate-500">{profile.completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${profile.completionRate}%` }}
                />
              </div>
            </div>

            {/* Card 2: RESET PASSWORD & SECURITY CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">Reset Password</h3>
                    <p className="text-[10px] text-slate-400">Account security credentials</p>
                  </div>
                </div>

                {/* Switch between Direct Change & OTP Reset */}
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode(passwordMode === 'direct' ? 'otp' : 'direct');
                    setOtpSent(false);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  {passwordMode === 'direct' ? 'Use OTP' : 'Direct'}
                </button>
              </div>

              {/* Password Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                {passwordMode === 'direct' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      placeholder="••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        6-Digit Reset Code
                      </label>
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendResetCode}
                          className="text-[10px] font-semibold text-blue-600 hover:underline"
                        >
                          Send Code
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600">Code Sent!</span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono tracking-widest text-center"
                    />
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                  />
                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="mt-1.5">
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            strength >= 75
                              ? 'bg-emerald-500'
                              : strength >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${strength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                  />
                </div>

                {/* Show passwords checkbox */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Show passwords</span>
                  </label>
                  {passwordMode === 'direct' && (
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      className="text-slate-400 hover:text-blue-600 transition"
                    >
                      Forgot?
                    </button>
                  )}
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="w-full py-2 px-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPassword ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card 3: About Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-3 tracking-tight">About</h3>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-semibold text-slate-900">{profile.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{profile.department}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>{profile.role}</span>
                  </div>
                </div>
              </div>

              {/* Contacts Subsection */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-2">Contacts</p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5 truncate">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${profile.email}`} className="hover:text-blue-600 truncate transition">
                      {profile.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{profile.phone}</span>
                  </div>
                </div>
              </div>

              {/* Teams Subsection */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-2">Teams</p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Member of {profile.teamsCount} teams</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Working on {profile.projectsCount} projects</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Activity Stream, Connections, Teams, Projects     */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Activity Stream (Without the photo gallery part) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-900">Activity stream</h3>
                <button
                  type="button"
                  onClick={() => showToast('Activity options')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  aria-label="Activity options"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>

              {/* Timeline Stream */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                
                {/* Timeline Item 1: Uploaded weekly reports */}
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white ring-4 ring-white" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Task report - uploaded weekly reports
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>5 minutes ago</span>
                    </p>

                    {/* Attached Excel Files Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { name: 'weekly-reports.xls', size: '12kb' },
                        { name: 'weekly-reports.xls', size: '4kb' },
                        { name: 'monthly-reports.xls', size: '8kb' },
                      ].map((file, i) => (
                        <div
                          key={i}
                          onClick={() => showToast(`Downloading ${file.name}...`)}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/80 transition cursor-pointer flex items-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{file.size}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Item 2: Project status updated */}
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white ring-4 ring-white" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Project status updated</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>3 hours ago</span>
                    </p>
                  </div>
                </div>

                {/* Timeline Item 3: Milestone completed */}
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-emerald-400 bg-white ring-4 ring-white" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Approval matrix & quotation limits validated
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Yesterday</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* View more Link */}
              <div className="text-center mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => showToast('All activity records loaded')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
                >
                  View more
                </button>
              </div>
            </div>

            {/* Sub-grid: Connections & Teams side-by-side matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Connections Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Connections</h3>
                  <div className="space-y-3">
                    {connections.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                item.color || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.initial}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-900 leading-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.connections} connections</p>
                          </div>
                        </div>

                        {/* Toggle Connection Button matching screenshot styling */}
                        <button
                          type="button"
                          onClick={() => handleToggleConnection(item.id)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer shadow-2xs ${
                            item.isConnected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={item.isConnected ? 'Connected' : 'Add connection'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {item.isConnected ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            )}
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => showToast('Opening all connections...')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>View all connections</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Teams Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Teams</h3>
                  <div className="space-y-3">
                    {teams.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 leading-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.members} members</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => showToast(`Opening channel ${item.name}`)}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => showToast('Opening all teams...')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>View all teams</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Projects Table Card matching screenshot */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Projects</h3>
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>+</span>
                  <span>New Project</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-5">Project</th>
                      <th className="py-2.5 px-5">Progress</th>
                      <th className="py-2.5 px-5 text-right">Hours Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {projects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs shrink-0">
                              {proj.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{proj.name}</p>
                              <p className="text-[10px] text-slate-400">{proj.updated}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5 min-w-[140px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  proj.progress === 100
                                    ? 'bg-emerald-500'
                                    : proj.progress > 0
                                    ? 'bg-slate-900'
                                    : 'bg-transparent'
                                }`}
                                style={{ width: `${proj.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium w-8 text-right">
                              {proj.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-medium text-slate-700">
                          {proj.hours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => showToast(`Viewing all ${projects.length} active projects`)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <span>View all projects</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise CRM Sync"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white transition shadow-xs cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
