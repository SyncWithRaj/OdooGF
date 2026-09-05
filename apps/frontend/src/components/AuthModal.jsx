'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to authenticate');
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-xs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      {/* Modal Container with crisp white surface */}
      <div className="relative w-full max-w-sm bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xl overflow-hidden">
        {/* Top Accent Strip with Pastel Aqua */}
        <div className="h-1.5 bg-[#E0F7F6] absolute top-0 left-0 right-0" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-sm font-bold cursor-pointer"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          {isLogin ? 'Access your DealFlow360 operations' : 'Get started with DealFlow360'}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            required
          />
          {/* Solid Dark Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Bottom Switcher */}
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="mt-4 text-xs text-slate-500 hover:text-slate-900 block w-full text-center transition cursor-pointer font-medium"
        >
          {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}
