'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          !
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-xs text-gray-500 mb-6">
          {error?.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
