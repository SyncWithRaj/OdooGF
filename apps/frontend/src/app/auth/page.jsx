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
  const goHome = (u) => router.push(u.role === 'customer' ? '/portal' : '/dashboard');

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
    'w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition';

  // Already logged in → show a small card
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold border border-emerald-500/30">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Signed in as</h2>
          <p className="text-slate-300 font-medium">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <span className="inline-block mt-2 mb-6 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 capitalize">
            {user?.role}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => goHome(user)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700"
            >
              Continue
            </button>
            <button
              onClick={logout}
              className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium border border-rose-500/30"
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
      <Link href="/" className="mb-8 text-xs text-slate-400 hover:text-slate-200">
        ← Back
      </Link>

      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Sign In / Create Account tabs */}
        <div className="flex rounded-lg bg-slate-950/80 p-1 border border-slate-800/80 mb-6 relative z-10">
          <button
            id="tab-signin"
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer select-none ${
              isLogin
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
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
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer select-none ${
              !isLogin
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            Create Account
          </button>
        </div>

        <h1 className="text-xl font-bold text-white mb-1 text-center">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-xs text-slate-400 mb-6 text-center">
          {isLogin ? 'Sign in to DealFlow360' : 'Customer accounts open the quote portal'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abid Khan" className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required className={inputCls} />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Alternate toggle at bottom */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/60 pt-4">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
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