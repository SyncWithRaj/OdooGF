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
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Logo with Orange Dot Indicator like Shadcn screenshot */}
        <Link href="/" className="font-bold text-sm sm:text-base tracking-tight text-slate-900 flex items-center gap-2 whitespace-nowrap group">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-orange-100 group-hover:scale-110 transition-transform" />
          <span>DealFlow360</span>
        </Link>

        {/* Navigation Tabs with subtle hover and active grey pill */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-xs">
          {visibleTabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="hidden sm:inline">Hi, <strong className="text-slate-900 font-semibold">{user?.name}</strong></span>
              {/* Pastel Buttercream Role Badge */}
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FEF9C3] text-amber-900 border border-amber-200/70 shadow-xs">
                {user?.role}
              </span>
            </div>
            {/* Clean Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* Pitch-Dark Primary Button like "+ Add New" / "Download Template" in screenshot */
          <Link
            href="/auth"
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}