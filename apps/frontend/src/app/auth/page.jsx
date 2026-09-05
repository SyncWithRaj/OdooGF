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

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = email, 2 = otp + new pass
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const { user, login, initiateSignup, verifySignup, initiatePasswordReset, verifyPasswordReset, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // Where to route each persona upon authenticating
  const goHome = (u) => router.push(u?.role === 'customer' ? '/portal' : '/dashboard');

  // Handle Quick Demo Login for interview & presentations
  const handleQuickLogin = async (personaEmail, personaName, personaRole) => {
    setError('');
    setInfoMessage('');
    setEmail(personaEmail);
    setPassword('123456');
    setSubmitting(true);
    try {
      let result = null;
      try {
        result = await login(personaEmail, '123456');
      } catch {
        result = await login(personaEmail, 'password123');
      }
      if (result && result.user) {
        goHome(result.user);
      }
    } catch (err) {
      setError(err?.message || `Failed to log in as ${personaName}`);
    } finally {
      setSubmitting(false);
    }
  };

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

  // Handle Forgot Password Initiate
  const handleForgotInitiate = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotMsg('');
    try {
      const res = await initiatePasswordReset(forgotEmail);
      setForgotStep(2);
      setForgotMsg(res?.message || 'Verification code sent to your email (dev code: 123456).');
    } catch (err) {
      setForgotError(err?.message || 'Failed to send reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Forgot Password Verify & Reset
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await verifyPasswordReset(forgotEmail, forgotOtp, forgotNewPassword, forgotConfirmPassword);
      setForgotMsg('Password updated successfully! You can now sign in.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setEmail(forgotEmail);
      }, 1500);
    } catch (err) {
      setForgotError(err?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Shared style tokens
  const inputCls =
    'w-full h-10 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm ' +
    'focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition disabled:opacity-50';

  const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider';
  const linkCls = 'text-slate-900 font-semibold underline underline-offset-2 hover:text-slate-600 transition cursor-pointer';

  // Active Session View
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center mx-auto mb-4 text-2xl font-black shadow-inner">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Session</p>
          <p className="text-xl font-black text-slate-900 tracking-tight">{user?.name}</p>
          <p className="text-xs text-slate-500 mb-3">{user?.email}</p>
          <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold mb-6 uppercase tracking-wider">
            {user?.role}
          </span>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => goHome(user)}
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <span>Go to {user?.role === 'customer' ? 'Customer Portal' : 'CPQ Dashboard'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="w-full h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              Sign out of this persona
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[48%_52%] bg-white text-slate-900">
      {/* ================= LEFT COLUMN: Auth Form & Interview Personas ================= */}
      <div className="relative flex flex-col min-h-screen border-r border-slate-200 overflow-y-auto">
        {/* Brand Header */}
        <div className="px-8 sm:px-12 lg:px-14 pt-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs font-black text-sm">
              DF
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">DealFlow360</span>
              <span className="text-[10px] text-slate-400 font-medium">Enterprise CPQ &amp; Sales Operations</span>
            </div>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            PostgreSQL Live
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-8">
          <div className="w-full max-w-[480px] mx-auto">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isLogin ? 'Sign in to DealFlow360' : 'Create an Account'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isLogin ? 'Authenticate with your role-governed organizational credentials.' : 'Step 1: Enter your details to receive email verification code.'}
              </p>
            </div>

            {/* QUICK PERSONA LOGIN CHIPS (FOR INTERVIEWS / EVALUATION) */}
            {isLogin && (
              <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Evaluation Quick Login:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Default PW: 123456</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin('admin@dealflow.com', 'System Admin', 'ADMIN')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs text-left transition"
                  >
                    <span className="text-[10px] font-bold block text-slate-900">🛡️ Admin</span>
                    <span className="text-[9px] text-slate-400 block truncate">admin@dealflow.com</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin('rep@dealflow.com', 'Alex Rep', 'SALES_REP')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs text-left transition"
                  >
                    <span className="text-[10px] font-bold block text-slate-900">💼 Sales Rep</span>
                    <span className="text-[9px] text-slate-400 block truncate">rep@dealflow.com</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin('manager@dealflow.com', 'Morgan Manager', 'SALES_MANAGER')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs text-left transition"
                  >
                    <span className="text-[10px] font-bold block text-slate-900">👔 Manager</span>
                    <span className="text-[9px] text-slate-400 block truncate">manager@dealflow.com</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin('finance@dealflow.com', 'Fiona Finance', 'FINANCE')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs text-left transition"
                  >
                    <span className="text-[10px] font-bold block text-slate-900">📊 Finance</span>
                    <span className="text-[9px] text-slate-400 block truncate">finance@dealflow.com</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin('aryansondharva25@gmail.com', 'Aryan Sondharva', 'CUSTOMER')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs text-left transition col-span-2 sm:col-span-2"
                  >
                    <span className="text-[10px] font-bold block text-slate-900">👤 Customer Partner (Bronze)</span>
                    <span className="text-[9px] text-slate-400 block truncate">aryansondharva25@gmail.com</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Info / OTP Message */}
            {infoMessage && (
              <div
                role="status"
                className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
              >
                {infoMessage}
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                <label htmlFor="email" className={labelCls}>Work Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rep@dealflow.com"
                  disabled={!isLogin && signupStep === 2}
                  className={inputCls}
                />
              </div>

              {!isLogin && signupStep === 2 ? (
                <div>
                  <label htmlFor="otp" className={labelCls}>6-Digit OTP Code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className={`${inputCls} text-center text-lg font-mono tracking-[0.4em] font-bold`}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    We sent a verification code to <span className="font-bold text-slate-900">{email}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className={`mt-2 text-xs ${linkCls}`}
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
                          setForgotEmail(email);
                          setShowForgotModal(true);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
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
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <label htmlFor="confirm" className={labelCls}>Confirm Password</label>
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
                className="w-full h-11 mt-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase transition cursor-pointer disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Authenticating...</span>
                ) : isLogin ? (
                  <span>Sign In</span>
                ) : signupStep === 1 ? (
                  <span>Continue</span>
                ) : (
                  <span>Verify OTP &amp; Register</span>
                )}
              </button>
            </form>

            {/* Toggle Sign in / Sign up */}
            <p className="mt-6 text-center text-xs text-slate-500">
              {isLogin ? "Don't have an account yet? " : 'Already registered? '}
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
                {isLogin ? 'Register account' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 sm:px-12 lg:px-14 pb-6 text-center">
          <p className="text-[11px] text-slate-400">
            Protected by argon2 cryptographic hashing, JWT rotation, and PostgreSQL multi-tier role governance.
          </p>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: INTERVIEW PRESENTATION SHOWCASE ================= */}
      <aside className="hidden lg:flex flex-col bg-slate-950 text-white min-h-screen p-12 justify-between relative overflow-hidden">
        {/* Abstract background gradient accent */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top bar */}
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
            DealFlow360 Platform Architecture
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
            Hackathon Edition
          </span>
        </div>

        {/* Middle Core Pillars */}
        <div className="max-w-xl space-y-6 relative z-10">
          <div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Self-Governing Sales Operations
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white mt-3 leading-tight">
              Enterprise CPQ &amp; Discount Governance with Live Margin Risk Analytics
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Automated multi-level approval chains that protect gross margin percentages while giving sales reps the flexibility to close complex multi-tier deals.
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-emerald-400 text-base font-bold mb-1">01. Dynamic CPQ Engine</div>
              <p className="text-[11px] text-slate-300">
                Customer tiers (Bronze, Silver, Gold) with strict category discount ceilings.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-amber-400 text-base font-bold mb-1">02. Blended Risk Scoring</div>
              <p className="text-[11px] text-slate-300">
                Real-time margin risk routing escalates discount breaches to Manager (L1) or Finance (L2).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-blue-400 text-base font-bold mb-1">03. Multi-Warehouse Split</div>
              <p className="text-[11px] text-slate-300">
                Live inventory tracking across Main Warehouse and East Depot with automated backorders.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-purple-400 text-base font-bold mb-1">04. Customer Portal</div>
              <p className="text-[11px] text-slate-300">
                Token-secured proposal links with counter-discount negotiation and verified e-signatures.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Persona Grid */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>5 Role Personas: Admin, Sales Rep, Manager, Finance, Customer</span>
          <span className="font-mono text-emerald-400 font-bold">● PostgreSQL 16 Online</span>
        </div>
      </aside>

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reset Account Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotError && (
              <div className="mt-4 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {forgotError}
              </div>
            )}

            {forgotMsg && (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                {forgotMsg}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotInitiate} className="mt-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Enter your registered work email. We will send a 6-digit verification code to reset your password.
                </p>
                <div>
                  <label className={labelCls}>Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="rep@dealflow.com"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  {forgotLoading ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotVerify} className="mt-4 space-y-3.5">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code sent to <span className="font-bold text-slate-900">{forgotEmail}</span> and choose a new password.
                </p>
                <div>
                  <label className={labelCls}>6-Digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    className={`${inputCls} text-center font-mono font-bold tracking-[0.3em]`}
                  />
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-2 h-10 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition"
                  >
                    {forgotLoading ? 'Updating...' : 'Update Password'}
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
