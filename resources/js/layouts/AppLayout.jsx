import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import NotificationBell from '@/components/NotificationBell';
import NotificationRealtimeBridge from '@/components/NotificationRealtimeBridge';

export default function AppLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-sys-bg)]">
      <NotificationRealtimeBridge />

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        user={user} 
      />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="hidden lg:flex items-center justify-end px-6 pt-6">
          <NotificationBell />
        </div>

        <main className="flex-1 p-5 lg:px-6 lg:pb-6 lg:pt-5">
          <div className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
