'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TopHeader({ onToggleSidebar, isCollapsed = false }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className="h-14 bg-white/95 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: Sidebar Toggle + Outlet Switcher */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button (Collapse to single-line app icon mode / Expand) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse to single-line app icons'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse to single-line app icons'}
          className="p-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-700 transition shadow-2xs cursor-pointer active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </button>

        {/* Tenant / Outlet Selector matching "Shadcn Outlet" */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200/60 transition select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs" />
          <span className="text-xs font-semibold text-slate-800">DealFlow Outlet</span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>

      {/* Right side: User Session & Avatar */}
      <div className="flex items-center gap-3">
        {/* User Session & Avatar */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-[#E0F7F6] text-teal-800 border border-teal-200 flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-slate-900 block leading-tight">{user?.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">{user?.role}</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/90 rounded-2xl shadow-lg p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FEF9C3] text-amber-900">
                    {user?.role}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 font-medium"
                >
                  My Profile
                </Link>
                <Link
                  href={user?.role === 'customer' ? '/portal' : '/dashboard'}
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Workspace
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
