'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  UploadCloud,
  Users,
  Shield,
  Award,
  BarChart3,
  FileText,
  Settings,
  Flame,
  ChevronRight,
  Gamepad2,
  Lock
} from 'lucide-react';
import { isRecordingLocked, subscribeRecordingLock } from '@/lib/recording-lock';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Botonera Live', href: '/botonera', icon: Gamepad2, badge: 'LongoMatch' },
  { name: 'Partidos', href: '/partidos', icon: Trophy },
  { name: 'Importar XML', href: '/importar-xml', icon: UploadCloud, badge: 'XML' },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Equipos', href: '/equipos', icon: Shield },
  { name: 'Competiciones', href: '/competiciones', icon: Award },
  { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
  { name: 'Informes', href: '/informes', icon: FileText },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
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

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none backdrop-blur-md">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 border border-slate-700/80 shadow-lg shadow-emerald-950/40 ring-1 ring-white/10 shrink-0">
            <img src="/logo.png" alt="Shabab Al Ordon" className="w-7 h-7 object-contain drop-shadow" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-sm tracking-tight leading-tight">
              SHABAB AL ORDON
            </h1>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
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
                    ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : recordingLocked
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : recordingLocked ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {recordingLocked && pathname !== item.href ? (
                  <Lock className="w-3 h-3 text-slate-600" />
                ) : item.badge ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
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
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            LongoMatch XML
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
          <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Normalized Engine Active
          </p>
          <p className="text-[10px] text-slate-500 mt-1">LongoMatch → Universal Schema</p>
        </div>
      </div>
    </aside>
  );
};
