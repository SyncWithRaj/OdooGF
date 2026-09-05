'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, login, register, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // Where to send each role after login
  const goHome = (u) => router.push(u?.role === 'customer' ? '/portal' : '/dashboard');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) return setError('Please fill in all required fields.');
    if (!isLogin && !name) return setError('Please enter your name.');
    if (!isLogin && password !== confirm) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setSubmitting(true);
    try {
      const result = isLogin
        ? await login(email, password)
        : await register(name, email, password);
      goHome(result.user);
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-xs';

  // Already logged in → show user session card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
          {/* Avatar with pastel aqua highlight */}
          <div className="w-16 h-16 rounded-full bg-[#E0F7F6] text-teal-800 flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-teal-200">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Active Session</h2>
          <p className="text-xl font-bold text-slate-900 mb-0.5">{user?.name}</p>
          <p className="text-xs text-slate-500 mb-4">{user?.email}</p>

          {/* Role badge with pastel buttercream background */}
          <div className="inline-block px-3 py-1 rounded-md bg-[#FEF9C3] text-amber-900 border border-amber-200 font-bold text-xs uppercase tracking-wider mb-6">
            Role: {user?.role}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => goHome(user)}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Continue to {user?.role === 'customer' ? 'Portal' : 'Dashboard'}
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
      <Link
        href="/"
        className="mb-8 text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition font-semibold"
      >
        ← Back to Home
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm relative overflow-hidden">
        {/* Top Accent Strip with Pastel Aqua */}
        <div className="h-1 bg-[#E0F7F6] absolute top-0 left-0 right-0" />

        {/* Tab Toggle with subtle slate background */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6 relative z-10">
          <button
            id="tab-signin"
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none ${
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
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none ${
              !isLogin
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center tracking-tight">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h1>
        <p className="text-xs text-slate-500 mb-6 text-center">
          {isLogin
            ? 'Sign in to access your sales operations dashboard'
            : 'Register to manage quotes and customer contracts'}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aryan Sondharva"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={inputCls}
            />
          </div>

          {!isLogin && (
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

          {/* Primary Action Button - Solid Slate 950 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer tracking-wide"
          >
            {submitting ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Bottom Switcher */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
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