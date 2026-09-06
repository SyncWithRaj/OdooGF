'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';

const AuthContext = createContext(null);
const STORAGE_KEY = 'dealflow_user';
const TOKEN_KEY = 'dealflow_token';
const REFRESH_KEY = 'dealflow_refresh_token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// The 5 roles from the spec
export const ROLES = ['rep', 'manager', 'finance', 'admin', 'customer'];

// Built-in demo accounts for instant offline/standalone preview
const FALLBACK_DEMO_USERS = {
  'admin@dealflow.com': { id: 'usr_admin', name: 'System Admin', email: 'admin@dealflow.com', role: 'admin', teamName: 'Executive' },
  'admin@company.com': { id: 'usr_admin', name: 'System Admin', email: 'admin@company.com', role: 'admin', teamName: 'Executive' },
  'rep@dealflow.com': { id: 'usr_rep', name: 'Alex Rep', email: 'rep@dealflow.com', role: 'rep', teamName: 'Enterprise Sales' },
  'rep@company.com': { id: 'usr_rep', name: 'Alex Rep', email: 'rep@company.com', role: 'rep', teamName: 'Enterprise Sales' },
  'manager@dealflow.com': { id: 'usr_mgr', name: 'Morgan Manager', email: 'manager@dealflow.com', role: 'manager', teamName: 'Sales Ops' },
  'finance@dealflow.com': { id: 'usr_fin', name: 'Fiona Finance', email: 'finance@dealflow.com', role: 'finance', teamName: 'Billing & Rev' },
  'customer@dealflow.com': { id: 'usr_cust', name: 'Valued Customer', email: 'customer@dealflow.com', role: 'customer', teamName: 'Client' },
};

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

  // On first load, validate the saved session against backend or local storage
  useEffect(() => {
    const restoreSession = async () => {
      const savedUserStr = localStorage.getItem(STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_KEY);

      if (!savedUserStr || !token || token.startsWith('demo_')) {
        if (token?.startsWith('demo_')) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
        }
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
            phone: data.user.phone,
            location: data.user.location,
            avatarUrl: data.user.avatarUrl,
            bannerUrl: data.user.bannerUrl,
          };
          setUser(restored);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        } else {
          // Token expired -> attempt refresh
          const refreshToken = localStorage.getItem(REFRESH_KEY);
          if (refreshToken && !refreshToken.startsWith('demo_')) {
            const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.accessToken) {
                localStorage.setItem(TOKEN_KEY, refreshData.accessToken);
                if (refreshData.refreshToken) {
                  localStorage.setItem(REFRESH_KEY, refreshData.refreshToken);
                }
                const savedUser = JSON.parse(savedUserStr);
                setUser(savedUser);
                setLoading(false);
                return;
              }
            }
          }
          // Expired and cannot refresh -> clear invalid session
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setUser(null);
        }
      } catch (err) {
        console.warn('Failed to verify saved session with backend:', err);
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

  // Login: authenticates against real NestJS backend
  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.user) {
      const message = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Invalid email or password';
      throw new Error(message);
    }

    const sessionUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.fullName,
      role: normalizeRole(data.user.role),
      teamName: data.user.teamName,
      phone: data.user.phone,
      location: data.user.location,
      avatarUrl: data.user.avatarUrl,
      bannerUrl: data.user.bannerUrl,
    };
    return saveSession(sessionUser, data.accessToken, data.refreshToken);
  };

  // Step 1: Initiate signup (dispatches 6-digit OTP email via nodemailer)
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
    if (res.ok) return data;
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Failed to initiate signup';
    throw new Error(msg);
  };

  // Step 2: Verify OTP and create Customer account
  const verifySignup = async (email, otp) => {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch(`${API_URL}/api/auth/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: otp.trim(),
      }),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      const sessionUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.fullName,
        role: normalizeRole(data.user.role),
        teamName: null,
      };
      return saveSession(sessionUser, data.accessToken, data.refreshToken);
    }

    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Invalid or expired verification code';
    throw new Error(msg);
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

  const initiatePasswordReset = async (email) => {
    return await apiClient.initiatePasswordReset(email);
  };

  const validatePasswordResetToken = async (token, email) => {
    return await apiClient.validatePasswordResetToken(token, email);
  };

  const verifyPasswordReset = async (param1, param2, param3, param4) => {
    let payload = {};
    if (typeof param1 === 'object' && param1 !== null) {
      payload = {
        email: param1.email?.trim()?.toLowerCase(),
        token: param1.token || param1.otp,
        otp: param1.otp || param1.token,
        newPassword: param1.newPassword,
        confirmNewPassword: param1.confirmNewPassword,
      };
    } else {
      payload = {
        email: param1 ? param1.trim().toLowerCase() : undefined,
        token: param2,
        otp: param2,
        newPassword: param3,
        confirmNewPassword: param4,
      };
    }

    return await apiClient.verifyPasswordReset(payload);
  };


  const updateProfile = async (data) => {
    const updated = user ? { ...user, ...data } : data;
    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${API_URL}/api/users/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: data.name || data.fullName,
            phone: data.phone,
            teamName: data.teamName || data.department,
            location: data.location,
          }),
        });
      } catch (err) {
        console.warn('Backend sync failed:', err);
      }
    }

    return updated;
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
        initiatePasswordReset,
        validatePasswordResetToken,
        verifyPasswordReset,
        logout,
        updateProfile,
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