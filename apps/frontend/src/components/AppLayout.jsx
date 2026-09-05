'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex">
      {/* Left-Side Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-200">
        {/* Slim Top Bar (Adjacent to Sidebar) */}
        <TopHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
