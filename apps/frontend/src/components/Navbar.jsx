'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Every tab, and which roles can see it
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

  // Only the tabs this role may see
  const visibleTabs = user ? TABS.filter((t) => t.roles.includes(user.role)) : [];

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="font-bold text-emerald-400 whitespace-nowrap">
          DealFlow360
        </Link>

        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {isAuthenticated ? (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-xs text-slate-300">
              Hi, <strong className="text-emerald-400">{user.name}</strong>
              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                {user.role}
              </span>
            </span>
            <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline">
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}