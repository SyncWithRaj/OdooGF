'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'dealflow_user';

// The 5 roles from the spec
export const ROLES = ['rep', 'manager', 'finance', 'admin', 'customer'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore the saved user (if any) from the browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== 'undefined') {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user session:', e);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  // Save user to browser + state (used by both login and register)
  const save = (u) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return { success: true, user: u };
  };

  // Login — saves user session
  // Later: replace body with fetch(`${apiUrl}/api/auth/login`)
  const login = async (email, password) => {
    let existingRole = 'rep';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email === email.trim() && parsed.role) {
          existingRole = parsed.role;
        }
      }
    } catch {}

    return save({
      id: 'usr_' + Date.now(),
      email: email.trim(),
      name: email.split('@')[0],
      role: existingRole,
    });
  };

  // Register — public sign-up always creates a customer
  const register = async (name, email, password) => {
    return save({
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      role: 'customer',
    });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  // Small helper: can this user do X?
  const hasRole = (...roles) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
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