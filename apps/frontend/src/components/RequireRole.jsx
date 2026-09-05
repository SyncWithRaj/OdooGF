'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Wrap any page with this.
 *   <RequireRole>                              → any logged-in user
 *   <RequireRole roles={['manager','finance']}> → only those roles
 *
 * Not logged in  → sent to /auth
 * Wrong role     → sent to their own home (customer → /portal, staff → /dashboard)
 */
export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // still checking the browser for a saved user

    if (!user) {
      router.replace('/auth');
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace(user.role === 'customer' ? '/portal' : '/dashboard');
    }
  }, [user, loading, roles, router]);

  // Don't flash the protected page while deciding
  if (loading || !user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return children;
}