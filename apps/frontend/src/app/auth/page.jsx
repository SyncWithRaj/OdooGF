'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1 = form, 2 = OTP verification
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const {
    user,
    login,
    initiateSignup,
    verifySignup,
    initiatePasswordReset,
    verifyPasswordReset,
    logout,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();

  const handleInitiateReset = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) return setResetError('Please enter your account email.');
    setResetLoading(true);
    try {
      const res = await initiatePasswordReset(resetEmail);
      setResetStep(2);
      setResetSuccess(res.message || 'Password reset OTP dispatched to your email.');
    } catch (err) {
      setResetError(err.message || 'Failed to dispatch reset OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!resetOtp || resetOtp.trim().length !== 6) {
      return setResetError('Please enter the 6-digit OTP.');
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      return setResetError('Password must be at least 6 characters.');
    }
    if (resetNewPassword !== resetConfirmPassword) {
      return setResetError('Passwords do not match.');
    }
    setResetLoading(true);
    try {
      const res = await verifyPasswordReset(resetEmail, resetOtp, resetNewPassword, resetConfirmPassword);
      setResetSuccess('Password reset successfully! You can now log in.');
      setEmail(resetEmail);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetStep(1);
        setResetOtp('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }, 2000);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };


  // Where to route each persona upon authenticating
  const goHome = (u) => router.push(u?.role === 'customer' ? '/portal' : '/dashboard');

  // Handle Login or 2-Step Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (isLogin) {
      if (!email || !password) return setError('Please enter your email and password.');
      setSubmitting(true);
      try {
        const result = await login(email, password);
        goHome(result.user);
      } catch (err) {
        setError(err?.message || 'Invalid email or password.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Signup Flow
      if (signupStep === 1) {
        if (!name || !email || !password || !confirm) {
          return setError('Please fill in all registration fields.');
        }
        if (password !== confirm) {
          return setError('Passwords do not match.');
        }
        if (password.length < 6) {
          return setError('Password must be at least 6 characters.');
        }

        setSubmitting(true);
        try {
          const res = await initiateSignup(name, email, password, confirm);
          setSignupStep(2);
          setInfoMessage(res.message || 'Verification code sent!');
          if (res.devOtp) {
            setInfoMessage(`Verification code sent! (Dev OTP: ${res.devOtp})`);
          }
        } catch (err) {
          setError(err?.message || 'Failed to initiate signup.');
        } finally {
          setSubmitting(false);
        }
      } else {
        // Step 2: Verify OTP
        if (!otp || otp.trim().length !== 6) {
          return setError('Please enter the 6-digit OTP code.');
        }

        setSubmitting(true);
        try {
          const result = await verifySignup(email, otp);
          goHome(result.user);
        } catch (err) {
          setError(err?.message || 'Invalid OTP code.');
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  // ---- Shared style tokens (light theme) ----
  const inputCls =
    'w-full h-10 px-3.5 rounded-md bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm ' +
    'focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition disabled:opacity-50';

  const labelCls = 'block text-sm font-medium text-gray-900 mb-2';

  const linkCls = 'text-gray-900 underline underline-offset-2 hover:text-gray-600 transition cursor-pointer';

  // Already logged in → display active session card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-2xl font-semibold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <p className="text-sm text-gray-500 mb-1">Signed in as</p>
          <p className="text-xl font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
          <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium mb-6 capitalize">
            {user?.role}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => goHome(user)}
              className="flex-1 h-10 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Continue to {user?.role === 'customer' ? 'Portal' : 'Dashboard'}
            </button>
            <button
              onClick={logout}
              className="px-5 h-10 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[42%_58%] bg-white text-gray-900">
      {/* ================= LEFT COLUMN: Auth ================= */}
      <div className="relative flex flex-col min-h-screen border-r border-gray-200">
        {/* Brand */}
        <div className="px-8 sm:px-12 lg:px-16 pt-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-gray-900">DealFlow360</span>
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-10">
          <div className="w-full max-w-[480px] mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-normal text-gray-900 tracking-tight">
                {isLogin ? 'Welcome back' : 'Get started'}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {isLogin ? 'Sign in to your account' : 'Create a new account'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-5 px-3.5 py-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Info / OTP Message */}
            {infoMessage && (
              <div
                role="status"
                className="mb-5 px-3.5 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm"
              >
                {infoMessage}
              </div>
            )}

            {/* Credentials form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {!isLogin && signupStep === 1 && (
                <div>
                  <label htmlFor="name" className={labelCls}>Full name</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aryan Sondharva"
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className={labelCls}>Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={!isLogin && signupStep === 2}
                  className={inputCls}
                />
              </div>

              {!isLogin && signupStep === 2 ? (
                <div>
                  <label htmlFor="otp" className={labelCls}>Verification code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className={`${inputCls} text-center text-lg font-mono tracking-[0.4em]`}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    We sent a 6-digit code to <span className="text-gray-900">{email}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className={`mt-2 text-sm ${linkCls}`}
                  >
                    Edit registration details
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-900">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(true);
                          setResetEmail(email);
                          setResetError('');
                          setResetSuccess('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-900 transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && signupStep === 1 && (
                <div>
                  <label htmlFor="confirm" className={labelCls}>Confirm password</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 mt-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {submitting
                  ? 'Processing…'
                  : isLogin
                  ? 'Sign in'
                  : signupStep === 1
                  ? 'Continue'
                  : 'Verify and sign up'}
              </button>
            </form>

            {/* Switcher */}
            <p className="mt-8 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setInfoMessage('');
                  setSignupStep(1);
                }}
                className={linkCls}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Platform Notice */}
        <div className="px-8 sm:px-12 lg:px-16 pb-8">
          <p className="max-w-[480px] mx-auto text-xs text-gray-400 leading-relaxed text-center">
            DealFlow360 &bull; Enterprise-grade self-governing CPQ and sales operations platform.
          </p>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: Demo Accounts & Capabilities ================= */}
      <aside className="hidden lg:flex flex-col bg-slate-900 text-white min-h-screen p-12 justify-between">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Seed Data Ready
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-slate-700"
          >
            Explore Demo &rarr;
          </Link>
        </div>

        {/* Quick Demo Login Cards */}
        <div className="max-w-md w-full my-auto">
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">
            1-Click Demo Profiles
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Click any account below to autofill verified test credentials (password: <code className="text-emerald-400 font-mono">123456</code>)
          </p>

          <div className="space-y-2.5">
            {[
              {
                role: 'Sales Rep',
                email: 'rep@dealflow.com',
                name: 'J. Rao (Direct Sales)',
                badge: 'Quotations & Pipeline',
                badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              },
              {
                role: 'Sales Manager',
                email: 'manager@dealflow.com',
                name: 'M. Shah (Sales Ops)',
                badge: 'Approval Queue & Nudge',
                badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              },
              {
                role: 'Finance Controller',
                email: 'finance@dealflow.com',
                name: 'R. Iyer (Finance & Ops)',
                badge: 'Tier-2 Audit & Invoicing',
                badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              },
              {
                role: 'Executive Admin',
                email: 'admin@dealflow.com',
                name: 'Aniket Dabhi (Admin)',
                badge: 'Full Governance & Rules',
                badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              },
              {
                role: 'Client Portal',
                email: 'customer@dealflow.com',
                name: 'Vikram Mehta (Procurement)',
                badge: 'Negotiation & Acceptance',
                badgeCls: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
              },
            ].map((item) => (
              <button
                key={item.email}
                type="button"
                onClick={() => {
                  setEmail(item.email);
                  setPassword('123456');
                  setIsLogin(true);
                  setError('');
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {item.role}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${item.badgeCls}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.email}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition">
                  Select &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-xs text-slate-500 border-t border-slate-800 pt-6">
          DealFlow360 &bull; Automated CPQ & Governance Engine
        </div>
      </aside>

      {/* PASSWORD RESET MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reset Your Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {resetStep === 1
                    ? 'Enter your email to receive a 6-digit verification code.'
                    : 'Enter the verification code and choose a new password.'}
                </p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {resetSuccess}
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleInitiateReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-center font-mono tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    ← Back to email
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50"
                  >
                    {resetLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

