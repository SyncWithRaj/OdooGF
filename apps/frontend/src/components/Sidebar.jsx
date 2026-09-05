'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Grouped navigation menus matching DealFlow360 architecture
  const navSections = [
    {
      group: 'Dashboards',
      items: [
        {
          label: 'Classic Dashboard',
          href: '/dashboard',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: 'Customer Portal',
          href: '/portal',
          roles: ['customer'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Sales & Revenue',
      items: [
        {
          label: 'Quotations',
          href: '/quotations',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: 'Pipeline',
          href: '/pipeline',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: 'Invoices',
          href: '/invoices',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          label: 'Subscriptions',
          href: '/subscriptions',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Operations & Governance',
      items: [
        {
          label: 'Approvals',
          href: '/approvals',
          roles: ['manager', 'finance', 'admin'],
          badge: '3',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: 'Fulfillment',
          href: '/fulfillment',
          roles: ['rep', 'manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          label: 'Deal Health AI',
          href: '/health',
          roles: ['manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          label: 'Reports & BI',
          href: '/reports',
          roles: ['manager', 'finance', 'admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Management',
      items: [
        {
          label: 'Products',
          href: '/products',
          roles: ['admin'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Account',
      items: [
        {
          label: 'User Profile',
          href: '/profile',
          roles: ['rep', 'manager', 'finance', 'admin', 'customer'],
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const userRole = user?.role || 'guest';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container: Toggles between full w-64 and slim w-16 single-line icon rail */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Brand & Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin flex flex-col">
          {/* Brand Header */}
          <div className={`flex items-center mb-5 ${isCollapsed ? 'justify-center px-1' : 'justify-between px-2'}`}>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                DF
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-sm font-black text-slate-900 block leading-tight tracking-tight">DealFlow360</span>
                  <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Sales Operations</span>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Grouped Nav Items */}
          <div className="space-y-4 flex-1">
            {navSections.map((section, sIdx) => {
              const visibleItems = section.items.filter(
                (item) => !user || item.roles.includes(userRole)
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={section.group}>
                  {/* Group Label (expanded) or Divider (collapsed) */}
                  {isCollapsed ? (
                    sIdx > 0 && <div className="w-8 h-px bg-slate-200 mx-auto my-2" />
                  ) : (
                    <p className="text-[10px] font-bold text-slate-400 px-2.5 mb-1.5 uppercase tracking-wider">
                      {section.group}
                    </p>
                  )}

                  {/* Navigation Item Links */}
                  <nav className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => onClose && onClose()}
                          className={`relative group flex items-center transition-all ${
                            isCollapsed
                              ? 'w-10 h-10 mx-auto justify-center rounded-xl'
                              : 'px-3 py-2 rounded-xl text-xs font-medium justify-between'
                          } ${
                            isActive
                              ? isCollapsed
                                ? 'bg-slate-950 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                            <span className={isActive ? (isCollapsed ? 'text-white' : 'text-slate-900') : 'text-slate-400'}>
                              {item.icon}
                            </span>
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>

                          {/* Badge in expanded mode */}
                          {!isCollapsed && item.badge && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FCE7F3] text-pink-700 border border-pink-200">
                              {item.badge}
                            </span>
                          )}

                          {/* Hover Floating Tooltip in collapsed single-line app icon mode */}
                          {isCollapsed && (
                            <span className="absolute left-14 ml-1 px-2.5 py-1 rounded-xl bg-slate-950 text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Toggle Bar (Click to collapse/expand sidebar into single-line app icon rail) */}
        <div className="p-2 border-t border-slate-100 hidden lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between px-3'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse to single-line app icons'}
          >
            {!isCollapsed && <span className="text-[11px] font-semibold text-slate-400">Collapse sidebar</span>}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
