'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY_SESSION = 'dealflow_user';
const STORAGE_KEY_ACCOUNTS = 'dealflow_accounts';

// The 5 roles from the spec
export const ROLES = ['rep', 'manager', 'finance', 'admin', 'customer'];

// Starter accounts for demo testing
const DEFAULT_ACCOUNTS = [
  {
    id: 'usr_rep_1',
    name: 'Sales Rep',
    email: 'rep@company.com',
    password: 'password123',
    role: 'rep',
  },
  {
    id: 'usr_admin_1',
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'password123',
    role: 'admin',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to load accounts from localStorage
  const getAccounts = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    } catch (e) {
      console.error('Failed to load accounts:', e);
      return DEFAULT_ACCOUNTS;
    }
  };

  // Restore active user session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      if (savedSession && savedSession !== 'undefined') {
        setUser(JSON.parse(savedSession));
      }
    } catch (e) {
      console.error('Failed to load user session:', e);
      try { localStorage.removeItem(STORAGE_KEY_SESSION); } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  // Save active user session
  const saveSession = (u) => {
    const sessionData = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'customer',
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionData));
    setUser(sessionData);
    return { success: true, user: sessionData };
  };

  // Login — MUST MATCH EMAIL AND PASSWORD
  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = getAccounts();

    const account = accounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );

    if (!account) {
      throw new Error('Account does not exist. Please sign up.');
    }

    if (account.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    return saveSession(account);
  };

  // Register — checks uniqueness and saves { name, email, password, role }
  const register = async (name, email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = getAccounts();

    const existing = accounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );

    if (existing) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const newAccount = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    const updatedAccounts = [...accounts, newAccount];
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch (e) {
      console.error('Failed to save account:', e);
    }

    return saveSession(newAccount);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
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