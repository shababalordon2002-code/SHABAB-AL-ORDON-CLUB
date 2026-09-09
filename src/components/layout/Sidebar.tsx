'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  Gamepad2,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { isRecordingLocked, subscribeRecordingLock } from '@/lib/recording-lock';
import { useAuth } from '@/components/providers/AuthProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  adminOnly?: boolean;
  requiresRecording?: boolean; // oculto para el rol "visor" (solo lectura)
}

const baseNavItems: NavItem[] = [
  { name: 'Partidos', href: '/', icon: Trophy },
  { name: 'Botonera Live', href: '/botonera', icon: Gamepad2, badge: 'Live', requiresRecording: true },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
  { name: 'Configuración', href: '/configuracion', icon: Settings, requiresRecording: true },
  { name: 'Gestión Usuarios', href: '/admin/usuarios', icon: ShieldCheck, badge: 'Admin', adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { isAdmin, profile } = useAuth();
  // "Visor" (role === 'user') solo puede ver Partidos, Jugadores y Dashboards.
  const canRecord = isAdmin || profile?.role === 'analyst';
  const [recordingLocked, setRecordingLockedState] = useState(false);

  useEffect(() => {
    setRecordingLockedState(isRecordingLocked());
    return subscribeRecordingLock(setRecordingLockedState);
  }, []);

  const navItems = baseNavItems.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.requiresRecording || canRecord)
  );

  return (
    <>
      {/* Mobile/tablet backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between h-screen fixed md:sticky top-0 left-0 z-50 md:z-30 select-none backdrop-blur-md transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 border border-slate-700/80 shadow-lg shadow-red-950/40 ring-1 ring-white/10 shrink-0">
              <img src="/logo.png" alt="Shabab Al Ordon" className="w-7 h-7 object-contain drop-shadow" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-100 text-sm tracking-tight leading-tight">
                SHABAB AL ORDON
              </h1>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <span>JOR</span> • Analytics Platform
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Plataforma Analytics
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-red-950/60 to-amber-950/40 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      item.adminOnly
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  ) : (
                    isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info / Data Source Indicator */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">Fuente Eventos:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              XML Analytics
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
            <p className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Motor de Análisis Activo
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Shabab Al Ordon Analytics</p>
          </div>
        </div>
      </aside>
    </>
  );
};
