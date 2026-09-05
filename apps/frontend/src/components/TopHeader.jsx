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
      {/* Left side: Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button (Sidebar Panel Toggle matching user design) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse to single-line app icons'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse to single-line app icons'}
          className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 group border border-slate-200/80"
        >
          <svg
            className="w-5 h-5 text-slate-800 group-hover:text-slate-950 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3.5" />
            <line x1="8.5" y1="3" x2="8.5" y2="21" />
            {isCollapsed ? (
              <path d="M12.5 8.5l3.5 3.5-3.5 3.5" />
            ) : (
              <path d="M16 8.5l-3.5 3.5 3.5 3.5" />
            )}
          </svg>
        </button>
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
