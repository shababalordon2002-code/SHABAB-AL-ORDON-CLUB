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
}

const baseNavItems: NavItem[] = [
  { name: 'Partidos', href: '/', icon: Trophy },
  { name: 'Botonera Live', href: '/botonera', icon: Gamepad2, badge: 'Live' },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
  { name: 'Gestión Usuarios', href: '/admin/usuarios', icon: ShieldCheck, badge: 'Admin', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [recordingLocked, setRecordingLockedState] = useState(false);

  useEffect(() => {
    setRecordingLockedState(isRecordingLocked());
    return subscribeRecordingLock(setRecordingLockedState);
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (recordingLocked && pathname !== href) {
      e.preventDefault();
      window.alert(
        'Tienes un registro en directo activo en la Botonera.\n\nNo puedes salir de esta pantalla mientras el cronómetro esté en marcha o la sesión siga configurada. Pausa y guarda o finaliza el registro desde la Botonera para poder navegar.'
      );
    }
  };

  const navItems = baseNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none backdrop-blur-md">
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
                onClick={(e) => handleNavClick(e, item.href)}
                aria-disabled={recordingLocked && pathname !== item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-red-950/60 to-amber-950/40 text-amber-300 border border-amber-500/30 shadow-sm'
                    : recordingLocked
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-amber-400' : recordingLocked ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {recordingLocked && pathname !== item.href ? (
                  <Lock className="w-3 h-3 text-slate-600" />
                ) : item.badge ? (
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
  );
};
