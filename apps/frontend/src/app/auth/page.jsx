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

  // ---- Shared style tokens (monochrome theme) ----
  const inputCls =
    'w-full h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 text-xs font-medium ' +
    'focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition disabled:opacity-50';

  const labelCls = 'block text-xs font-semibold text-zinc-700 mb-1.5';

  const linkCls = 'text-zinc-900 font-semibold underline underline-offset-2 hover:text-zinc-600 transition cursor-pointer';

  // Already logged in → display active session card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-xl font-black shadow-xs">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Signed in as</p>
          <p className="text-xl font-bold text-zinc-900">{user?.name}</p>
          <p className="text-xs text-zinc-500 font-mono mt-0.5 mb-3">{user?.email}</p>
          <span className="inline-block px-3 py-1 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-bold mb-6 capitalize">
            {user?.role}
          </span>
          <div className="flex gap-2.5">
            <button
              onClick={() => goHome(user)}
              className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            >
              Continue to {user?.role === 'customer' ? 'Portal' : 'Dashboard'}
            </button>
            <button
              onClick={logout}
              className="px-5 h-10 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs transition cursor-pointer shadow-2xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[44%_56%] bg-white text-zinc-900">
      {/* ================= LEFT COLUMN: Auth ================= */}
      <div className="relative flex flex-col min-h-screen border-r border-zinc-200">
        {/* Brand */}
        <div className="px-8 sm:px-12 lg:px-16 pt-8">
          <Link href="/auth" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              DF
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-zinc-900 block leading-tight">DealFlow360</span>
              <span className="text-[10px] text-zinc-400 block leading-none">Self-Governing Sales CPQ</span>
            </div>
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-10">
          <div className="w-full max-w-[440px] mx-auto">
            {/* Pill Tab Toggle */}
            <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setInfoMessage('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isLogin ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setInfoMessage('');
                  setSignupStep(1);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !isLogin ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                {isLogin ? 'Welcome back' : 'Create an enterprise account'}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {isLogin ? 'Enter your credentials to access your live CPQ workspace.' : 'Register with email verification to access DealFlow360.'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-5 px-3.5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Info / OTP Message */}
            {infoMessage && (
              <div
                role="status"
                className="mb-5 px-3.5 py-3 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-medium"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className={labelCls}>Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(true);
                          setResetEmail(email);
                          setResetError('');
                          setResetSuccess('');
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition cursor-pointer focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                className="w-full h-10 mt-1 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
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
            <p className="mt-6 text-center text-xs text-zinc-500">
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
          <p className="max-w-[480px] mx-auto text-[11px] text-zinc-400 leading-relaxed text-center">
            DealFlow360 &bull; Enterprise-grade self-governing CPQ and sales operations platform.
          </p>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: Enterprise CPQ Platform Showcase ================= */}
      <aside className="hidden lg:flex flex-col bg-zinc-950 text-white min-h-screen p-10 lg:p-12 justify-between border-l border-zinc-800 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-zinc-200 border border-zinc-800 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Enterprise Sales Engine
          </div>
          <span className="text-xs text-zinc-400 font-mono">v1.0.4</span>
        </div>

        {/* Center: Image & Showcase */}
        <div className="my-auto z-10 max-w-lg w-full">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900 group">
            {/* Image */}
            <img
              src="/dealflow_cpq_showcase.jpg"
              alt="DealFlow360 Enterprise CPQ Platform"
              className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition duration-700"
            />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 text-left pointer-events-none">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white text-zinc-950 mb-1 inline-block">
                CPQ &bull; Dynamic Pricing &bull; Multi-Tier Approvals
              </span>
              <p className="text-xs font-medium text-zinc-200">
                Automated deal governance, real-time margin thresholds, and instant customer portal negotiation.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Self-Governing CPQ for High-Velocity Teams
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Empower sales representatives with real-time margin guardrails, auto-routed multi-tier approvals, and seamless contract fulfillment.
            </p>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-xs text-zinc-500 border-t border-zinc-800/80 pt-6 z-10 flex items-center justify-between">
          <span>DealFlow360 Platform</span>
          <span>Enterprise Sales Operations</span>
        </div>
      </aside>

      {/* PASSWORD RESET MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-md w-full p-6 text-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Reset Your Password</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {resetStep === 1
                    ? 'Enter your email to receive a 6-digit verification code.'
                    : 'Enter the verification code and choose a new password.'}
                </p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 text-xs font-medium">
                {resetSuccess}
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleInitiateReset} className="space-y-4">
                <div>
                  <label className={labelCls}>Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {resetLoading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div>
                  <label className={labelCls}>6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    className={`${inputCls} text-center font-mono tracking-widest text-base`}
                  />
                </div>

                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline transition cursor-pointer"
                  >
                    &larr; Back to email
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
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

