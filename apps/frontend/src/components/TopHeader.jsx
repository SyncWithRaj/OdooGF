'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

const ROUTE_NAMES = {
  '/dashboard': 'Dashboard',
  '/quotations': 'Quotations',
  '/pipeline': 'Deal Pipeline',
  '/approvals': 'Approvals',
  '/portal': 'Customer Portal',
  '/fulfillment': 'Fulfillment',
  '/subscriptions': 'Subscriptions',
  '/invoices': 'Invoices',
  '/health': 'Deal Health',
  '/reports': 'Reports',
  '/products': 'Products',
  '/customers': 'Customers',
  '/warehouses': 'Warehouses',
  '/governance': 'Discount Rules',
  '/users': 'Users',
  '/profile': 'Profile',
};

export default function TopHeader({ onToggleSidebar, isCollapsed = false }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const currentPageTitle = ROUTE_NAMES[pathname] || 'Sales Operations';

  useEffect(() => {
    let isCancelled = false;
    async function loadNotifications() {
      try {
        const res = await apiClient.getDealHealth();
        if (!isCancelled && res) {
          const list = [
            ...(res.anomalies || []).map((a) => ({
              id: `anomaly-${a.quoteNumber}`,
              title: `${a.quoteNumber}: Discount Anomaly`,
              desc: a.description || 'Exceeds governance discount ceiling',
              href: '/approvals',
            })),
            ...(res.stalledDeals || []).map((s) => ({
              id: `stalled-${s.quoteNumber}`,
              title: `${s.quoteNumber}: Stalled Deal Follow-up`,
              desc: s.description || 'Quotation inactive for > 7 days',
              href: '/quotations',
            })),
          ];
          setNotifications(list);
        }
      } catch {
        // silent
      }
    }
    if (isAuthenticated) {
      loadNotifications();
    }
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, pathname]);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-8 h-8 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer border border-zinc-200 shrink-0"
        >
          <svg
            className="w-4 h-4 text-zinc-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="8.5" y1="3" x2="8.5" y2="21" />
            {isCollapsed ? (
              <path d="M12.5 8.5l3.5 3.5-3.5 3.5" />
            ) : (
              <path d="M16 8.5l-3.5 3.5 3.5 3.5" />
            )}
          </svg>
        </button>

        {/* Breadcrumb Path */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-400 truncate">
          <span className="font-semibold text-zinc-900 tracking-tight">DealFlow</span>
          <span>/</span>
          <span className="text-zinc-700 font-medium truncate">{currentPageTitle}</span>
        </div>
      </div>

      {/* Middle: Search Command Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-2">
        <div className="relative w-full">
          <svg
            className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            readOnly
            placeholder="Search quotations, deals, SKU catalog..."
            onClick={() => {
              if (pathname !== '/quotations') router.push('/quotations');
            }}
            className="w-full h-8 pl-8 pr-12 rounded-lg text-xs bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition-colors cursor-pointer"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-2xs">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications Icon with Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileMenuOpen(false);
            }}
            className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 absolute top-2 right-2 ring-2 ring-white"></span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                  <h4 className="text-xs font-bold text-zinc-900">Governance Activity</h4>
                  {notifications.length > 0 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                      {notifications.length} New
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      Up to date
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-zinc-400 font-medium">No pending governance alerts</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
                    {notifications.map((notif) => (
                      <Link
                        key={notif.id}
                        href={notif.href}
                        onClick={() => setNotificationsOpen(false)}
                        className="block p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-colors space-y-0.5"
                      >
                        <p className="font-semibold text-zinc-900 text-[11px] leading-tight">{notif.title}</p>
                        <p className="text-zinc-500 text-[10px] leading-tight">{notif.desc}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Session & Avatar Dropdown */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || 'User'}
                  className="w-7 h-7 rounded-lg object-cover border border-zinc-200 shadow-2xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <span className="text-xs font-bold text-zinc-900 block leading-tight">{user?.name}</span>
                <span className="text-[10px] text-zinc-400 capitalize block leading-tight">{user?.role}</span>
              </div>
            </button>

            {/* Profile Menu Popover */}
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                    <p className="text-xs font-bold text-zinc-900">{user?.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                      {user?.role}
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-1.5 rounded-lg text-xs text-zinc-700 hover:bg-zinc-100 font-medium"
                  >
                    User Profile &amp; Settings
                  </Link>
                  <Link
                    href={user?.role === 'customer' ? '/portal' : '/dashboard'}
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-1.5 rounded-lg text-xs text-zinc-700 hover:bg-zinc-100 font-medium"
                  >
                    Primary Workspace
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
