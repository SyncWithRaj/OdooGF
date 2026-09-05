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
  const goHome = (u) => router.push(u.role === 'customer' ? '/portal' : '/dashboard');

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
    'w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition';

  // Already logged in → display active session card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-emerald-500/30">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Signed in as</h2>
          <p className="text-slate-300 font-medium">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <span className="inline-block mt-2 mb-6 text-xs px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold tracking-wider">
            {user?.role}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => goHome(user)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              Continue to {user?.role === 'customer' ? 'Portal' : 'Dashboard'} →
            </button>
            <button
              onClick={logout}
              className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium border border-rose-500/30 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-4 text-xs text-slate-400 hover:text-slate-200 transition">
        ← Back to Homepage
      </Link>

      {/* Quick Switch Demo Bar for Presentation */}
      <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center shadow-lg">
        <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Demo Persona 1-Click Login:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 font-medium border border-slate-700 transition"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('rep@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-medium border border-slate-700 transition"
          >
            Sales Rep
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('manager@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium border border-slate-700 transition"
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('finance@dealflow.com', '123456')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium border border-slate-700 transition"
          >
            Finance
          </button>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Sign In / Create Account tabs */}
        <div className="flex rounded-lg bg-slate-950/80 p-1 border border-slate-800/80 mb-6">
          <button
            id="tab-signin"
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setInfoMessage('');
              setSignupStep(1);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              isLogin
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
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
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              !isLogin
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Customer Account
          </button>
        </div>

        <h1 className="text-xl font-bold text-white mb-1 text-center">
          {isLogin ? 'Welcome back' : signupStep === 1 ? 'Customer Registration' : 'Verify Email OTP'}
        </h1>
        <p className="text-xs text-slate-400 mb-6 text-center">
          {isLogin
            ? 'Sign in with your verified credentials'
            : signupStep === 1
            ? 'Public signups strictly create customer accounts'
            : `Enter the 6-digit code sent to ${email}`}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 6 chars)</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">6-Digit Verification Code</label>
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
                className="mt-2 text-xs text-slate-400 hover:text-slate-200 underline"
              >
                ← Edit registration details
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
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
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/60 pt-4">
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
                className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer ml-1"
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
                className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer ml-1"
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