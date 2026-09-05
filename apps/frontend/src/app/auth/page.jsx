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
          // Removed Dev OTP display from UI for production
          // if (res.devOtp) {
          //   setInfoMessage(`Verification code sent! (Dev OTP: ${res.devOtp})`);
          // }
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
    'w-full h-10 px-3.5 rounded-md bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm shadow-xs ' +
    'focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition disabled:opacity-50';

  const labelCls = 'block text-xs sm:text-[13px] font-medium text-gray-700 mb-1.5';

  const linkCls = 'text-gray-900 font-medium underline underline-offset-2 hover:text-gray-600 transition cursor-pointer';

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
              className="flex-1 h-10 rounded-md bg-black hover:bg-neutral-800 text-white font-medium text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[45%_55%] lg:grid-cols-[42%_58%] bg-white text-gray-900">
      {/* ================= LEFT COLUMN: Auth ================= */}
      <div className="relative flex flex-col justify-center items-center min-h-screen border-r border-gray-200 px-6 sm:px-10 py-12">
        {/* Brand - pinned top-left matching the documentation button on the right */}
        <div className="absolute top-8 left-8 sm:top-10 sm:left-12 z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-7.5 h-7.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">DealFlow360</span>
          </Link>
        </div>

        {/* Form - perfectly centered in the login column */}
        <div className="w-full max-w-[360px] my-auto">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-gray-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-xs sm:text-[13px] font-medium text-gray-700">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(true);
                          setResetEmail(email);
                          setResetError('');
                          setResetSuccess('');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-900 transition cursor-pointer"
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition cursor-pointer focus:outline-none"
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
                className="w-full h-10 mt-1.5 rounded-md bg-[#111111] hover:bg-neutral-800 text-white font-bold text-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-900/20 shadow-xs"
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
            <p className="mt-6 text-center text-xs sm:text-sm text-gray-600">
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

      {/* ================= RIGHT COLUMN: Testimonial ================= */}
      <aside className="relative hidden md:flex flex-col justify-center items-center bg-[#121212] min-h-screen text-white select-none px-8 lg:px-12 xl:px-16 overflow-hidden">
        {/* Subtle Ambient Dark Glow Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neutral-800/20 rounded-full blur-3xl" />
        </div>
        {/* Documentation Link - pinned top-right */}
        <div className="absolute top-8 right-8 lg:top-10 lg:right-12 z-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-[#181818] hover:bg-[#202020] text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition"
          >
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Documentation</span>
          </Link>
        </div>

        {/* Vertical Column Style Quote */}
        <figure className="relative max-w-[500px] xl:max-w-[540px] w-full my-auto">
          {/* Iconic double slanted quotation mark with generous spacing */}
          <svg
            className="absolute -left-16 sm:-left-20 -top-7 sm:-top-9 w-10 h-7 text-neutral-600 fill-current select-none pointer-events-none"
            viewBox="0 0 34 24"
            aria-hidden="true"
          >
            <path d="M12.923 0H6.262L0 23.111H6.661L12.923 0Z" />
            <path d="M33.923 0H27.262L21 23.111H27.661L33.923 0Z" />
          </svg>
          <blockquote className="text-[28px] sm:text-[32px] font-medium xl:text-[34px] leading-[1.65] font-normal text-neutral-100 tracking-tight font-sans">
            I&apos;m trying @dealflow360, sales operations alternative that uses automated approvals
            (and real-time deal health tracking too) in the cloud. It&apos;s incredible
          </blockquote>
        </figure>
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
                    className="px-4 py-2 rounded-md bg-black hover:bg-neutral-800 text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer"
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
                    className="px-4 py-2 rounded-md bg-black hover:bg-neutral-800 text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer"
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

