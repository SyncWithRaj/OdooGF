'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1 = form, 2 = OTP verification

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
          setInfoMessage(res.message || 'Verification OTP sent to your email.');
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

  // Quick Demo Persona 1-Click Login (Pre-seeded in PostgreSQL)
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
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-xs';

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
              className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-4 text-xs text-slate-500 hover:text-slate-900 transition font-medium">
        ← Back to Homepage
      </Link>

      {/* Quick Switch Demo Bar for Presentation */}
      <div className="w-full max-w-md mb-4 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center">
        <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Demo Persona 1-Click Login:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold border border-purple-200/70 transition"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('rep@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200/70 transition"
          >
            Sales Rep
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('manager@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200/70 transition"
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('finance@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200/70 transition"
          >
            Finance
          </button>
        </div>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm relative overflow-hidden">
        {/* Top Accent Strip with Pastel Aqua */}
        <div className="h-1 bg-[#E0F7F6] absolute top-0 left-0 right-0" />

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6 relative z-10">
          <button
            id="tab-signin"
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setInfoMessage('');
              setSignupStep(1);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isLogin
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            id="tab-create-account"
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setInfoMessage('');
              setSignupStep(1);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isLogin
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Customer Account
          </button>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1 text-center">
          {isLogin ? 'Welcome back' : signupStep === 1 ? 'Customer Registration' : 'Verify Email OTP'}
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center">
          {isLogin
            ? 'Sign in with your verified credentials'
            : signupStep === 1
            ? 'Public signups strictly create customer accounts'
            : `Enter the 6-digit code sent to ${email}`}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rep@dealflow.com"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls}
                />
              </div>
            </>
          ) : signupStep === 1 ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Procurement Lead"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 6 chars)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Verification Code</label>
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
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer tracking-wide"
          >
            {submitting
              ? 'Verifying…'
              : isLogin
              ? 'Sign In'
              : signupStep === 1
              ? 'Send Verification OTP →'
              : 'Verify & Complete Registration'}
          </button>
        </form>

        {/* Toggle switch at bottom */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
          {isLogin ? (
            <p>
              New customer?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setInfoMessage('');
                  setSignupStep(1);
                }}
                className="text-slate-900 hover:underline font-semibold cursor-pointer ml-1"
              >
                Create Account
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
                className="text-slate-900 hover:underline font-semibold cursor-pointer ml-1"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}