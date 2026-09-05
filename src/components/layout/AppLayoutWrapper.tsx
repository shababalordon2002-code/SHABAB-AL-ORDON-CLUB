'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/components/providers/AuthProvider';

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <AuthProvider>
        <main className="min-h-screen w-full bg-slate-950 text-slate-100">
          {children}
        </main>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 antialiased w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header />
          <main className="flex-1 overflow-y-auto w-full p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
