'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UploadCloud, Calendar, Radio, LogOut, ShieldCheck, Shield, User as UserIcon, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { dbStore } from '@/lib/store/db-store';
import { ActiveBotoneraSession } from '@/types';
import { isRecordingLocked, subscribeRecordingLock } from '@/lib/recording-lock';
import { useAuth } from '@/components/providers/AuthProvider';
import { getAnalysisSessionFromSupabase } from '@/lib/services/botonera-service';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
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
    let isMounted = true;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const checkSession = async () => {
      let sess = dbStore.getActiveBotoneraSession();

      // Comprobar si la sesión local está verdaderamente activa ahora mismo
      const isLocalRunning = sess && sess.isTimerRunning;
      const isLocalRecent = sess && sess.isConfigured && sess.lastUpdatedTimestamp && Date.now() - sess.lastUpdatedTimestamp < 90 * 1000 && (sess.timerSeconds || 0) > 0;
      const isLocalActive = !!sess && (isLocalRunning || isLocalRecent);

      if (!isLocalActive) {
        try {
          const remoteSess = await getAnalysisSessionFromSupabase();
          const isRemoteRunning = remoteSess && remoteSess.isTimerRunning;
          const isRemoteRecent = remoteSess && remoteSess.lastUpdatedTimestamp && Date.now() - remoteSess.lastUpdatedTimestamp < 90 * 1000 && (remoteSess.timerSeconds || 0) > 0;
          if (remoteSess && (isRemoteRunning || isRemoteRecent)) {
            sess = remoteSess;
          } else {
            sess = null;
          }
        } catch {
          sess = null;
        }
      }

      if (!isMounted) return;
      setActiveSession(sess);

      if (sess && sess.isTimerRunning && sess.startTimestamp) {
        const elapsed = Math.max(0, Math.floor((Date.now() - sess.startTimestamp) / 1000));
        setCurrentSeconds(elapsed);
      } else if (sess) {
        setCurrentSeconds(sess.timerSeconds || 0);
      } else {
        setCurrentSeconds(0);
      }
    };

    // Comprobación inicial de sesión
    checkSession();

    // Actualización local del cronómetro en la UI (0 llamadas de red / 0 bytes de consumo)
    const localTickInterval = setInterval(() => {
      setActiveSession((currentSess) => {
        if (currentSess && currentSess.isTimerRunning && currentSess.startTimestamp) {
          const elapsed = Math.max(0, Math.floor((Date.now() - currentSess.startTimestamp) / 1000));
          setCurrentSeconds(elapsed);
        } else if (currentSess) {
          setCurrentSeconds(currentSess.timerSeconds || 0);
        }
        return currentSess;
      });
    }, 1000);

    // Suscripción Realtime a cambios de sesión (debounced para evitar peticiones repetitivas)
    const supabase = createClient();
    const channel = supabase
      .channel('header_realtime_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_sessions' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkSession, 1500);
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(localTickInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPeriodLabel = (p?: number) => {
    switch (p) {
      case 1:
        return '1ª Parte';
      case 2:
        return '2ª Parte';
      case 3:
        return 'Prórroga 1';
      case 4:
        return 'Prórroga 2';
      default:
        return '1ª Parte';
    }
  };

  const gameMinute = Math.floor(currentSeconds / 60) + 1;

  // Resolución del nombre del analista que está en directo
  const activeAnalystName =
    activeSession?.analystName ||
    (activeSession?.selectedMatchId ? dbStore.getAnalyses(activeSession.selectedMatchId)[0]?.analyst_name : null) ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Analista Principal';

  // Resolución del partido en curso
  const matchObj =
    activeSession?.selectedMatchId && activeSession.selectedMatchId !== 'free_session'
      ? dbStore.getMatchById(activeSession.selectedMatchId)
      : null;
  const matchLabel =
    activeSession?.matchTitle || (matchObj ? `${matchObj.home_team} vs ${matchObj.away_team}` : null);

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
    <header className="h-16 bg-slate-900/80 border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md gap-2">
      {/* Left: Season, Context & Live Active Analysis Pill */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-x-auto">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden shrink-0 p-2 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">Temporada 2026/2027</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Jordan Pro League</span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20 shrink-0">
          <img src="/logo.png" alt="Shabab Al Ordon Logo" className="w-4 h-4 object-contain" />
          <span>Shabab Al Ordon Club</span>
        </div>

        {/* Global Live Active Session Indicator: Analista, Parte de juego y Minuto de juego */}
        {activeSession && (activeSession.isTimerRunning || (currentSeconds > 0 && activeSession.lastUpdatedTimestamp && Date.now() - activeSession.lastUpdatedTimestamp < 90000)) && (
          <Link
            href="/botonera"
            className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/50 border border-red-500/50 hover:border-red-400 text-slate-200 text-xs font-bold transition-all shadow-lg shadow-red-950/40 shrink-0 group"
            title="Sesión de análisis en vivo activa. Haz clic para ir a la Botonera."
          >
            {/* Live pulsing dot */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-400 font-mono font-black text-[10px] tracking-wider uppercase">
                EN VIVO
              </span>
            </div>

            <div className="h-3.5 w-px bg-slate-700/80" />

            {/* Nombre del analista */}
            <div className="flex items-center gap-1 text-slate-300">
              <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-extrabold text-white text-xs max-w-[120px] sm:max-w-[160px] truncate">
                {activeAnalystName}
              </span>
            </div>

            <div className="h-3.5 w-px bg-slate-700/80" />

            {/* Parte de juego y Minuto del crono */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {getPeriodLabel(activeSession.period)}
              </span>
              <span className="text-emerald-400 font-extrabold font-mono text-xs">
                {formatTime(currentSeconds)} ({gameMinute}&apos;)
              </span>
            </div>

            {/* Partido (en pantallas grandes) */}
            {matchLabel && (
              <span className="hidden xl:inline text-[11px] text-slate-400 font-semibold truncate max-w-[160px]">
                • {matchLabel}
              </span>
            )}

            <span className="hidden sm:inline text-[10px] font-sans font-black text-amber-400 group-hover:text-amber-300 ml-0.5">
              ⚡
            </span>
          </Link>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link
          href="/importar-xml"
          className="flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 hover:from-red-500 hover:to-amber-400 shadow-red-950/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">+ Importar XML</span>
        </Link>

        <div className="hidden sm:block h-6 w-px bg-slate-800 mx-1"></div>

        {/* User Pill / Login Link */}
        <div className="flex items-center gap-2 sm:gap-3 pl-1">
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
