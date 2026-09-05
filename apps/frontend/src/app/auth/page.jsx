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

  const { user, login, initiateSignup, verifySignup, logout, isAuthenticated } = useAuth();
  const router = useRouter();

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

  // Quick Demo Persona 1-Click Login (Pre-seeded for instant preview)
  const handleQuickLogin = async (personaEmail, personaPass) => {
    setError('');
    setInfoMessage('');
    setEmail(personaEmail);
    setPassword(personaPass);
    setSubmitting(true);
    try {
      const result = await login(personaEmail, personaPass);
      goHome(result.user);
    } catch (err) {
      setError(err?.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition shadow-2xs';

  // Already logged in → display active session card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#E0F7F6] text-teal-800 flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-teal-200">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Signed in as</h2>
          <p className="text-xl font-bold text-slate-900 mb-0.5">{user?.name}</p>
          <p className="text-xs text-slate-500 mb-2">{user?.email}</p>
          <div className="inline-block px-3 py-1 rounded-md bg-[#FEF9C3] text-amber-900 border border-amber-200 font-bold text-xs uppercase tracking-wider mb-6">
            Role: {user?.role}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => goHome(user)}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Continue to {user?.role === 'customer' ? 'Portal' : 'Dashboard'} →
            </button>
            <button
              onClick={logout}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-xs transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white text-slate-900">
      {/* LEFT COLUMN: Clean Light Authentication Portal (Supabase Style) */}
      <div className="flex flex-col justify-between px-6 sm:px-12 lg:px-16 py-8 sm:py-12 max-w-xl w-full mx-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Supabase-style green bolt logo */}
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">DealFlow360</span>
          </Link>

          <Link href="/" className="text-xs font-medium text-slate-400 hover:text-slate-700 transition">
            ← Back to Home
          </Link>
        </div>

        {/* Center Auth Form Container */}
        <div className="my-auto py-8">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              {isLogin
                ? 'Sign in to access your operations dashboard'
                : 'Get started with DealFlow360 sales operations'}
            </p>
          </div>

          {/* Social / Quick Persona 1-Click Buttons */}
          <div className="space-y-2 mb-6">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@dealflow.com', '123456')}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition shadow-2xs cursor-pointer group"
            >
              <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Continue with GitHub</span>
              <span className="ml-auto text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">Admin Demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('rep@dealflow.com', '123456')}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition shadow-2xs cursor-pointer group"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Continue with AI Persona</span>
              <span className="ml-auto text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-bold">Sales Rep Demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager@dealflow.com', '123456')}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition shadow-2xs cursor-pointer group"
            >
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Continue with SSO</span>
              <span className="ml-auto text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">Manager Demo</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-medium">or</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Info / OTP Message */}
          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {infoMessage}
            </div>
          )}

          {/* Main Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && signupStep === 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aryan Sondharva"
                  required
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </div>

            {(!isLogin && signupStep === 2) ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className={`${inputCls} text-center text-lg font-mono tracking-widest`}
                />
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                >
                  ← Edit registration details
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset link has been dispatched to your email.')}
                      className="text-xs text-slate-400 hover:text-slate-700 transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && signupStep === 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls}
                />
              </div>
            )}

            {/* Primary Submit Button: Emerald Green Supabase Style */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer tracking-wide"
            >
              {submitting
                ? 'Processing…'
                : isLogin
                ? 'Sign in'
                : signupStep === 1
                ? 'Continue'
                : 'Verify & Sign up'}
            </button>
          </form>

          {/* Switcher */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                    setInfoMessage('');
                    setSignupStep(1);
                  }}
                  className="text-slate-900 underline font-semibold hover:text-emerald-700 cursor-pointer ml-1"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                    setInfoMessage('');
                    setSignupStep(1);
                  }}
                  className="text-slate-900 underline font-semibold hover:text-emerald-700 cursor-pointer ml-1"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Legal Footer */}
        <p className="text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
          By continuing, you agree to DealFlow360's{' '}
          <span className="underline cursor-pointer hover:text-slate-600">Terms of Service</span> and{' '}
          <span className="underline cursor-pointer hover:text-slate-600">Privacy Policy</span>, and to receive periodic product updates.
        </p>
      </div>

      {/* RIGHT COLUMN: Light Theme Testimonial & Social Proof Showcase (Matching Screenshot) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-50 via-slate-100/50 to-emerald-50/20 border-l border-slate-200/80 relative overflow-hidden">
        {/* Top Right Header: Documentation Button */}
        <div className="flex justify-end">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/80 shadow-2xs transition"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Documentation</span>
          </Link>
        </div>

        {/* Center: Giant Quote & Testimonial */}
        <div className="max-w-md mx-auto my-auto py-12">
          {/* Giant Aesthetic Quote Mark in Soft Slate/Teal */}
          <div className="text-6xl sm:text-7xl font-serif text-slate-300 select-none leading-none mb-3 -ml-2">
            “
          </div>

          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug mb-8">
            I'm trying @dealflow360, sales operations alternative that uses automated approvals and real-time deal health tracking. It's incredible 😍
          </p>

          {/* Author Card matching @JP_Gallegos in screenshot */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-sm shadow-2xs">
              JP
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">@JP_Gallegos</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">VP of Revenue Operations • Early Adopter</p>
            </div>
          </div>
        </div>

        {/* Subtle Bottom Feature Badges */}
        <div className="flex items-center gap-6 text-xs text-slate-400 border-t border-slate-200/60 pt-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-600">Enterprise SLA: 99.9%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium text-slate-600">Zero Margin Leakage</span>
          </div>
        </div>
      </div>
    </div>
  );
}