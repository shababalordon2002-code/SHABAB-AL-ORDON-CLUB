'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UploadCloud, Calendar, Radio, LogOut, ShieldCheck, Shield, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { dbStore } from '@/lib/store/db-store';
import { ActiveBotoneraSession } from '@/types';
import { isRecordingLocked, subscribeRecordingLock } from '@/lib/recording-lock';
import { useAuth } from '@/components/providers/AuthProvider';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveBotoneraSession | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [recordingLocked, setRecordingLockedState] = useState(false);

  useEffect(() => {
    setRecordingLockedState(isRecordingLocked());
    return subscribeRecordingLock(setRecordingLockedState);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const sess = dbStore.getActiveBotoneraSession();
      setActiveSession(sess);

      if (sess && sess.isTimerRunning && sess.startTimestamp) {
        const elapsed = Math.max(0, Math.floor((Date.now() - sess.startTimestamp) / 1000));
        setCurrentSeconds(elapsed);
      } else if (sess) {
        setCurrentSeconds(sess.timerSeconds || 0);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
            <ShieldCheck className="w-2.5 h-2.5" />
            Admin
          </span>
        );
      case 'analyst':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-500/30">
            <Shield className="w-2.5 h-2.5" />
            Analista
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
            <UserIcon className="w-2.5 h-2.5" />
            Usuario
          </span>
        );
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Analista';
  const initial = displayName[0]?.toUpperCase() || 'U';

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      {/* Left: Season & Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">Temporada 2026/2027</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Jordan Pro League</span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20">
          <img src="/logo.png" alt="Shabab Al Ordon Logo" className="w-4 h-4 object-contain" />
          <span>Shabab Al Ordon Club</span>
        </div>

        {/* Global Live Active Session Indicator */}
        {activeSession && activeSession.isTimerRunning && (
          <Link
            href="/botonera"
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-mono font-bold hover:bg-red-500/30 transition shadow animate-pulse"
          >
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>
              🔴 REGISTRO EN DIRECTO ({formatTime(currentSeconds)})
            </span>
            <span className="text-[10px] font-sans underline font-extrabold text-amber-300 ml-1">
              Volver a Botonera ⚡
            </span>
          </Link>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/importar-xml"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 hover:from-red-500 hover:to-amber-400 shadow-red-950/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
          <span>+ Importar XML</span>
        </Link>

        <div className="h-6 w-px bg-slate-800 mx-1"></div>

        {/* User Pill / Login Link */}
        <div className="flex items-center gap-3 pl-1">
          {user ? (
            <>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 p-0.5">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center font-bold text-xs text-amber-400">
                  {initial}
                </div>
              </div>
              
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">
                    {displayName}
                  </p>
                  {getRoleBadge(profile?.role)}
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={signOut}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/login';
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              <span>Iniciar Sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
