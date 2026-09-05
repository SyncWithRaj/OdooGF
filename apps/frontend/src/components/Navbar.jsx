'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { label: 'Dashboard',       href: '/dashboard',     roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Customer Portal', href: '/portal',        roles: ['customer'] },
  { label: 'Quotations',      href: '/quotations',    roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Pipeline',        href: '/pipeline',      roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Approvals',       href: '/approvals',     roles: ['manager', 'finance', 'admin'] },
  { label: 'Fulfillment',     href: '/fulfillment',   roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Subscriptions',   href: '/subscriptions', roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Invoices',        href: '/invoices',      roles: ['rep', 'manager', 'finance', 'admin'] },
  { label: 'Deal Health',     href: '/health',        roles: ['manager', 'finance', 'admin'] },
  { label: 'Reports',         href: '/reports',       roles: ['manager', 'finance', 'admin'] },
  { label: 'Products',        href: '/products',      roles: ['admin'] },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const visibleTabs = user ? TABS.filter((t) => t.roles.includes(user.role)) : [];

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="font-bold text-sm sm:text-base tracking-tight text-zinc-900 flex items-center gap-2 whitespace-nowrap group">
          <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105">
            DF
          </span>
          <span>DealFlow360</span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-xs">
          {visibleTabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* User Session */}
        {isAuthenticated ? (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="hidden sm:inline">Hi, <strong className="text-zinc-900 font-semibold">{user?.name}</strong></span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                {user?.role}
              </span>
            </div>
            {/* Clean Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition shadow-xs"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}