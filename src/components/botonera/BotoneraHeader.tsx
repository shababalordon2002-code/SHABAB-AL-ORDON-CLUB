'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Clock,
  Save,
  Flame,
  CheckCircle2,
  FileCode2,
  Layers,
  ExternalLink,
  Trophy,
  AlertCircle,
  X,
  Pencil,
  Check
} from 'lucide-react';
import { Match } from '@/types';

interface BotoneraHeaderProps {
  matches: Match[];
  selectedMatchId: string;
  onSelectMatch: (matchId: string) => void;
  period: number;
  onPeriodChange: (p: number) => void;
  timerSeconds: number;
  onTimerChange: (seconds: number) => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSaveToMatch: () => void;
  onExportXml: () => void;
  eventCount: number;
}

export const BotoneraHeader: React.FC<BotoneraHeaderProps> = ({
  matches,
  selectedMatchId,
  onSelectMatch,
  period,
  onPeriodChange,
  timerSeconds,
  onTimerChange,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  onSaveToMatch,
  onExportXml,
  eventCount,
}) => {
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [isPausePeriodModalOpen, setIsPausePeriodModalOpen] = useState<boolean>(false);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

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
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      // Plain seconds
      return parseInt(trimmed, 10);
    }
    const match = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      return mins * 60 + secs;
    }
    return null;
  };

  const handleConfirmEditTime = () => {
    const parsed = parseTimeInput(editTimeValue);
    if (parsed !== null) {
      onTimerChange(Math.max(0, parsed));
    }
    setIsEditingTime(false);
  };

  const handleCancelEditTime = () => {
    setIsEditingTime(false);
  };

  const handleSave = () => {
    onSaveToMatch();
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 4000);
  };

  const handlePlayPauseClick = () => {
    if (isTimerRunning) {
      // User is pausing timer: Open Period Finish Confirmation Modal
      setIsPausePeriodModalOpen(true);
    } else {
      // User is starting timer: start cleanly
      onToggleTimer();
    }
  };

  const handleConfirmNextPeriod = () => {
    // Pause timer
    onToggleTimer();
    setIsPausePeriodModalOpen(false);

    if (period === 1) {
      // Advance to 2nd half, set clock to 45:00 (2700s) and wait for PLAY
      onPeriodChange(2);
      onTimerChange(2700);
    } else if (period === 2) {
      // Advance to Extra Time 1
      onPeriodChange(3);
      onTimerChange(5400);
    } else if (period === 3) {
      // Advance to Extra Time 2
      onPeriodChange(4);
      onTimerChange(6300);
    }
  };

  const handleJustPause = () => {
    onToggleTimer();
    setIsPausePeriodModalOpen(false);
  };

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4 select-none">
      {/* Top Bar: Title & Target Match Linking */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center shadow-md">
            <Flame className="w-5 h-5 text-slate-950 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-100 text-sm tracking-wide">
                BOTONERA DE REGISTRO EN DIRECTO
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LongoMatch Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Registra eventos en tiempo real vinculados directamente a tu base de partidos.
            </p>
          </div>
        </div>

        {/* Target Match Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Partido Vinculado:</span>
            <select
              value={selectedMatchId}
              onChange={(e) => onSelectMatch(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer max-w-xs truncate"
            >
              <option value="free_session" className="bg-slate-900 text-slate-200">
                ⚡ Sesión Libre (Sin partido asignado)
              </option>
              {matches.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                  ⚽ {m.home_team} vs {m.away_team} ({m.date})
                </option>
              ))}
            </select>
          </div>

          {selectedMatch && selectedMatchId !== 'free_session' && (
            <Link
              href={`/partidos/${selectedMatchId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Ver partido en el visor de campo 2D"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Partido</span>
            </Link>
          )}

          <button
            onClick={onExportXml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow"
            title="Exportar a XML LongoMatch"
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar XML</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-950/40"
          >
            <Save className="w-3.5 h-3.5 fill-slate-950" />
            <span>Guardar en Partido ({eventCount})</span>
          </button>
        </div>
      </div>

      {/* Target Match Link Alert Badge (If selected) */}
      {selectedMatch && selectedMatchId !== 'free_session' && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Registrando eventos para: <strong>{selectedMatch.home_team} vs {selectedMatch.away_team}</strong> ({selectedMatch.competition} • {selectedMatch.date})
            </span>
          </div>

          <Link
            href={`/partidos/${selectedMatch.id}`}
            className="text-[11px] font-bold underline text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Ver en Visor de Campo 2D & Timeline</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {showSavedToast && (
        <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>¡Eventos guardados con éxito en la base de datos de partidos!</span>
          </div>
          {selectedMatchId !== 'free_session' && (
            <Link
              href={`/partidos/${selectedMatchId}`}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
            >
              <span>Ir al Visor del Partido</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Main Stopwatch Controls & Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/90 p-4 rounded-xl border border-slate-800/90 shadow-inner">
        {/* Stopwatch Main Display */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center bg-slate-900 border border-emerald-500/40 rounded-xl px-5 py-2 min-w-40 shadow-inner group">
            {isEditingTime ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEditTime();
                    if (e.key === 'Escape') handleCancelEditTime();
                  }}
                  placeholder="mm:ss"
                  className="w-24 bg-slate-950 border border-emerald-500/50 rounded-lg px-2 py-1 font-mono text-2xl font-black text-emerald-400 text-center focus:outline-none"
                />
                <button
                  onClick={handleConfirmEditTime}
                  title="Confirmar nuevo tiempo"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCancelEditTime}
                  title="Cancelar edición"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEditTime}
                title="Editar tiempo manualmente (mm:ss)"
                className="flex items-center gap-1.5 cursor-text"
              >
                <span className="font-mono text-3xl font-black tracking-widest text-emerald-400">
                  {formatTime(timerSeconds)}
                </span>
                <Pencil className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>
            )}
            {isTimerRunning && !isEditingTime && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>

          {/* Quick Play/Pause & Seek Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSeek(-10)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-xs font-bold flex items-center gap-1"
              title="-10 Segundos"
            >
              <Rewind className="w-3.5 h-3.5" /> -10s
            </button>

            <button
              onClick={handlePlayPauseClick}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-slate-950" /> PAUSAR
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" /> INICIAR [Espacio]
                </>
              )}
            </button>

            <button
              onClick={() => handleSeek(10)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-xs font-bold flex items-center gap-1"
              title="+10 Segundos"
            >
              +10s <FastForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetTimer}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Reiniciar Cronómetro"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Periodo:
          </span>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 1, label: '1ª Parte' },
              { id: 2, label: '2ª Parte' },
              { id: 3, label: 'ET 1' },
              { id: 4, label: 'ET 2' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onPeriodChange(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
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

      {/* PAUSE PERIOD CONFIRMATION MODAL */}
      {isPausePeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {period === 1
                    ? '¿HA FINALIZADO LA PRIMERA PARTE?'
                    : period === 2
                    ? '¿HA FINALIZADO LA SEGUNDA PARTE?'
                    : '¿DESEAS CAMBIAR DE PERIODO?'}
                </h3>
              </div>
              <button onClick={() => setIsPausePeriodModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {period === 1 ? (
                <>
                  Puedes dar por finalizada la <strong>1ª Parte</strong>. Al confirmar, el sistema avanzará automáticamente a la <strong>2ª Parte (45:00)</strong> y esperará en pausa a que pulses <strong>PLAY</strong> para comenzar el segundo tiempo.
                </>
              ) : (
                <>
                  ¿Deseas concluir este periodo de juego y avanzar al siguiente tiempo de partido?
                </>
              )}
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmNextPeriod}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {period === 1
                    ? '⚽ Sí, finalizar 1ª Parte ➔ Pasar a 2ª Parte (Esperar PLAY)'
                    : '⚽ Sí, avanzar al siguiente tiempo (Esperar PLAY)'}
                </span>
              </button>

              <button
                onClick={handleJustPause}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                ⏸️ Solo Pausar (Permanecer en el periodo actual)
              </button>

              <button
                onClick={() => setIsPausePeriodModalOpen(false)}
                className="w-full py-1.5 px-4 rounded-xl text-slate-500 hover:text-slate-300 text-[11px] font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
