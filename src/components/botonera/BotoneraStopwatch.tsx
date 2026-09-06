'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Layers,
  AlertCircle,
  X,
  Check,
  Pencil,
  Crosshair,
  Link2,
} from 'lucide-react';

/**
 * Match time (in seconds) at which each period starts.
 * The chrono shows 45:00 when the 2ª Parte kicks off, 90:00 for ET1, etc.
 * Used to convert between video time and match time:
 *   matchTime = (videoTime - periodVideoOffset) + PERIOD_BASE_SECONDS[period]
 */
export const PERIOD_BASE_SECONDS: Record<number, number> = {
  1: 0,
  2: 2700,
  3: 5400,
  4: 6300,
};

interface BotoneraStopwatchProps {
  period: number;
  onPeriodChange: (p: number) => void;
  timerSeconds: number;
  /** `seekVideo` (default true) moves the video to the new match time when the chrono is video-driven. */
  onTimerChange: (seconds: number, seekVideo?: boolean) => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  /** Called when the timer transitions from stopped → running (not on pause) */
  onTimerStarted?: () => void;
  /** Seeks the video to the current match time (periodOffset + timerSeconds). */
  onSeekVideoToNow?: () => void;
  /** True when the current period has a video sync offset captured. */
  hasVideoSync?: boolean;
  /** True when the chrono is slaved to the video playback (play/pause/seek stay in sync). */
  isVideoDriven?: boolean;
}

export const BotoneraStopwatch: React.FC<BotoneraStopwatchProps> = ({
  period,
  onPeriodChange,
  timerSeconds,
  onTimerChange,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  onTimerStarted,
  onSeekVideoToNow,
  hasVideoSync = false,
  isVideoDriven = false,
}) => {
  const [isPausePeriodModalOpen, setIsPausePeriodModalOpen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (offsetSec: number) => {
    onTimerChange(Math.max(0, timerSeconds + offsetSec));
  };

  const handleStartEditTime = () => {
    setEditTimeValue(formatTime(timerSeconds));
    setIsEditingTime(true);
  };

  const parseTimeInput = (value: string): number | null => {
    const trimmed = value.trim().replace(',', '.');
    if (!trimmed) return null;

    const hms = trimmed.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
    if (hms) return parseInt(hms[1], 10) * 3600 + parseInt(hms[2], 10) * 60 + parseInt(hms[3], 10);

    const ms = trimmed.match(/^(\d{1,4})[:.]([0-5]?\d)$/);
    if (ms) return parseInt(ms[1], 10) * 60 + parseInt(ms[2], 10);

    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return num <= 180 ? num * 60 : num;
    }
    return null;
  };

  const handleConfirmEditTime = () => {
    const parsed = parseTimeInput(editTimeValue);
    if (parsed !== null) onTimerChange(Math.max(0, parsed));
    setIsEditingTime(false);
  };

  const handlePlayPauseClick = () => {
    if (isTimerRunning) {
      setIsPausePeriodModalOpen(true);
    } else {
      onToggleTimer();
      onTimerStarted?.();
    }
  };

  const handleConfirmNextPeriod = () => {
    onToggleTimer(); // pause first
    setIsPausePeriodModalOpen(false);
    // Do NOT seek the video here: the new period has no sync offset yet, it is
    // captured when the analyst presses PLAY again at the restart.
    if (period === 1) { onPeriodChange(2); onTimerChange(PERIOD_BASE_SECONDS[2], false); }
    else if (period === 2) { onPeriodChange(3); onTimerChange(PERIOD_BASE_SECONDS[3], false); }
    else if (period === 3) { onPeriodChange(4); onTimerChange(PERIOD_BASE_SECONDS[4], false); }
    // Note: onTimerStarted will fire on next PLAY press for the new period
  };

  const handleJustPause = () => {
    onToggleTimer();
    setIsPausePeriodModalOpen(false);
  };

  return (
    <>
      {/* Compact Stopwatch Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 shadow-xl select-none">
        {/* Timer Display */}
        <div className="relative flex items-center justify-center bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-1.5 shadow-inner group min-w-[90px]">
          {isEditingTime ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={editTimeValue}
                onChange={(e) => setEditTimeValue(e.target.value)}
                onBlur={handleConfirmEditTime}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmEditTime();
                  if (e.key === 'Escape') setIsEditingTime(false);
                }}
                placeholder="mm:ss"
                className="w-16 bg-transparent border-none font-mono text-xl font-black text-emerald-400 text-center focus:outline-none"
              />
              <button onMouseDown={(e) => e.preventDefault()} onClick={handleConfirmEditTime} className="p-1 rounded bg-emerald-600 text-slate-950">
                <Check className="w-3 h-3" />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsEditingTime(false)} className="p-1 rounded bg-slate-800 text-slate-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={handleStartEditTime} title="Editar tiempo (mm:ss)" className="flex items-center gap-1 cursor-text">
              <span className="font-mono text-2xl font-black tracking-widest text-emerald-400">
                {formatTime(timerSeconds)}
              </span>
              <Pencil className="w-2.5 h-2.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </button>
          )}
          {isTimerRunning && !isEditingTime && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>

        {/* -10s */}
        <button
          onClick={() => handleSeek(-10)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-[11px] font-bold flex items-center gap-1"
          title={isVideoDriven ? 'Retroceder 10s (crono y vídeo)' : '-10 Segundos'}
        >
          <Rewind className="w-3 h-3" /> -10s
        </button>

        {/* Play / Pause */}
        <button
          onClick={handlePlayPauseClick}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-black text-xs transition-all shadow-lg cursor-pointer ${
            isTimerRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
          }`}
        >
          {isTimerRunning ? (
            <><Pause className="w-3.5 h-3.5 fill-slate-950" /> {isVideoDriven ? 'PAUSAR VÍDEO' : 'PAUSAR'}</>
          ) : (
            <><Play className="w-3.5 h-3.5 fill-slate-950" /> {isVideoDriven ? 'REPRODUCIR [Espacio]' : 'INICIAR [Espacio]'}</>
          )}
        </button>

        {/* +10s */}
        <button
          onClick={() => handleSeek(10)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-[11px] font-bold flex items-center gap-1"
          title={isVideoDriven ? 'Avanzar 10s (crono y vídeo)' : '+10 Segundos'}
        >
          +10s <FastForward className="w-3 h-3" />
        </button>

        {/* Reset */}
        <button
          onClick={onResetTimer}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Reiniciar Cronómetro"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Seek video to current match time */}
        {onSeekVideoToNow && (
          <button
            onClick={onSeekVideoToNow}
            disabled={!hasVideoSync}
            title={
              hasVideoSync
                ? `Llevar el vídeo al minuto ${formatTime(timerSeconds)} de partido`
                : 'Primero pulsa PLAY para capturar el inicio del periodo'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition ${
              hasVideoSync
                ? 'bg-sky-900/60 hover:bg-sky-800/70 border-sky-600/60 text-sky-300 hover:text-sky-100 shadow-sm shadow-sky-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Ir al vídeo</span>
          </button>
        )}

        {/* Video-driven indicator */}
        {isVideoDriven && (
          <span
            title="El cronómetro sigue la reproducción del vídeo: si pausas, retrocedes o avanzas el vídeo, el crono se ajusta solo."
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-950/70 border border-sky-700/50 text-sky-300 text-[10px] font-bold uppercase tracking-wide"
          >
            <Link2 className="w-3 h-3" />
            Crono ligado al vídeo
          </span>
        )}

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" /> Por.
          </span>
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            {[
              { id: 1, label: '1ª Parte' },
              { id: 2, label: '2ª Parte' },
              { id: 3, label: 'ET 1' },
              { id: 4, label: 'ET 2' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onPeriodChange(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  period === p.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pause Period Confirmation Modal */}
      {isPausePeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {period === 1 ? '¿HA FINALIZADO LA PRIMERA PARTE?' : period === 2 ? '¿HA FINALIZADO LA SEGUNDA PARTE?' : '¿DESEAS CAMBIAR DE PERIODO?'}
                </h3>
              </div>
              <button onClick={() => setIsPausePeriodModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {period === 1
                ? <>Puedes dar por finalizada la <strong>1ª Parte</strong>. Al confirmar, el sistema avanzará a la <strong>2ª Parte (45:00)</strong> y esperará a que pulses <strong>PLAY</strong>.</>
                : <>¿Deseas concluir este periodo y avanzar al siguiente tiempo de partido?</>}
            </p>

            <div className="space-y-2 pt-2">
              <button onClick={handleConfirmNextPeriod} className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition">
                ⚽ {period === 1 ? 'Sí, finalizar 1ª Parte ➔ Pasar a 2ª Parte' : 'Sí, avanzar al siguiente tiempo'}
              </button>
              <button onClick={handleJustPause} className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition">
                ⏸️ Solo Pausar (Permanecer en el periodo actual)
              </button>
              <button onClick={() => setIsPausePeriodModalOpen(false)} className="w-full py-1.5 px-4 rounded-xl text-slate-500 hover:text-slate-300 text-[11px] font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
