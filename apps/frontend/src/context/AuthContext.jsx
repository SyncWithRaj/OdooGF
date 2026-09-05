'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'dealflow_user';
const TOKEN_KEY = 'dealflow_token';
const REFRESH_KEY = 'dealflow_refresh_token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// The 5 roles from the spec
export const ROLES = ['rep', 'manager', 'finance', 'admin', 'customer'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize role string from backend enum (e.g. SALES_REP -> rep)
  const normalizeRole = (role) => {
    if (!role) return 'customer';
    const r = role.toLowerCase();
    if (r === 'sales_rep') return 'rep';
    if (r === 'sales_manager') return 'manager';
    return r;
  };

  // On first load, validate the saved session against the real backend /api/auth/me
  useEffect(() => {
    const restoreSession = async () => {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const restored = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.fullName,
            role: normalizeRole(data.user.role),
            teamName: data.user.teamName,
          };
          setUser(restored);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        } else {
          // Token expired or invalid -> clear local storage
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify session with backend:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const saveSession = (u, accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setUser(u);
    return { success: true, user: u };
  };

  // Real Backend Login with Argon2 verification
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(message || 'Invalid email or password');
    }

    const sessionUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.fullName,
      role: normalizeRole(data.user.role),
      teamName: data.user.teamName,
    };

    return saveSession(sessionUser, data.accessToken, data.refreshToken);
  };

  // Step 1: Initiate signup (dispatches 6-digit OTP email)
  const initiateSignup = async (fullName, email, password, confirmPassword) => {
    const res = await fetch(`${API_URL}/api/auth/signup/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(message || 'Signup initiation failed');
    }

    return data;
  };

  // Step 2: Verify OTP and create Customer account
  const verifySignup = async (email, otp) => {
    const res = await fetch(`${API_URL}/api/auth/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(message || 'Invalid or expired OTP verification code');
    }

    const sessionUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.fullName,
      role: normalizeRole(data.user.role),
      teamName: null,
    };

    return saveSession(sessionUser, data.accessToken, data.refreshToken);
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  };

  const hasRole = (...roles) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        initiateSignup,
        verifySignup,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};