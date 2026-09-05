'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (user?.role === 'customer') {
          router.replace('/portal');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/auth');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
          DF
        </div>
        <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400 font-medium">Redirecting to DealFlow360...</p>
      </div>
    </div>
  );
}
