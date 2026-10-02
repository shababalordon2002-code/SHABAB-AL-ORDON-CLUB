'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { BotoneraButton, Match, NormalizedEvent } from '@/types';
import { getButtonColorHex } from './BotoneraPanelEditor';
import { calculateEventVideoTime, formatVideoTime } from '@/lib/analytics/video-utils';

/** Colour of the button that created the event (same rule as the events feed). */
export function getEventColorHex(evt: NormalizedEvent, buttons: BotoneraButton[] = []): string {
  const stored = evt.metadata?.buttonColor;
  if (typeof stored === 'string' && stored) return getButtonColorHex(stored);
  const match = buttons.find(
    (b) => b.name === evt.event_type || b.name === evt.category || b.category === evt.category
  );
  return getButtonColorHex(match?.color || 'emerald');
}

const PERIOD_SHORT_LABELS: Record<number, string> = { 1: '1ª', 2: '2ª', 3: 'ET1', 4: 'ET2' };

interface BotoneraVideoTimelineProps {
  events: NormalizedEvent[];
  buttons?: BotoneraButton[];
  match?: Match | null;
  periodVideoOffsets: Record<number, number>;
  periodAdjustments?: Record<number, { matchTimeSec: number; videoTimeSec: number }>;
  homeTeamName?: string | null;
  /** Live playhead of the attached player, in seconds of video */
  getCurrentVideoTime: () => number;
  /** Video length in seconds, or null while the player hasn't reported it yet */
  getVideoDuration: () => number | null;
  onSeek: (videoTime: number) => void;
  onPlayEvent: (evt: NormalizedEvent) => void;
  /** Event currently being reproduced (highlighted on the bar) */
  playingEventId?: string | null;
}

/**
 * Barra de tiempo bajo el vídeo: avanza con el playhead, marca el inicio de cada parte
 * y pinta cada evento con el color de su botón (local arriba, visitante abajo).
 * Clic en la barra = saltar a ese punto; clic en un evento = reproducir su corte.
 */
export const BotoneraVideoTimeline: React.FC<BotoneraVideoTimelineProps> = ({
  events,
  buttons = [],
  match = null,
  periodVideoOffsets,
  periodAdjustments,
  homeTeamName,
  getCurrentVideoTime,
  getVideoDuration,
  onSeek,
  onPlayEvent,
  playingEventId = null,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [hovered, setHovered] = useState<{ evt: NormalizedEvent; left: number } | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // The getters read refs of the parent, so polling them is cheap and needs no re-subscription.
  const gettersRef = useRef({ getCurrentVideoTime, getVideoDuration });
  gettersRef.current = { getCurrentVideoTime, getVideoDuration };
  useEffect(() => {
    const tick = () => {
      const t = gettersRef.current.getCurrentVideoTime();
      if (Number.isFinite(t)) setCurrentTime((prev) => (Math.abs(prev - t) < 0.2 ? prev : t));
      const d = gettersRef.current.getVideoDuration();
      if (d && Number.isFinite(d) && d > 0) setDuration((prev) => (prev === d ? prev : d));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  const hasSync = Object.keys(periodVideoOffsets).length > 0;

  const markers = useMemo(
    () =>
      events
        .map((evt) => ({ evt, time: calculateEventVideoTime(evt, match, periodVideoOffsets, 0, periodAdjustments) }))
        .filter((m) => Number.isFinite(m.time) && m.time >= 0),
    [events, match, periodVideoOffsets, periodAdjustments]
  );

  const periodStarts = useMemo(
    () =>
      Object.entries(periodVideoOffsets)
        .map(([p, t]) => ({ period: Number(p), time: t }))
        .filter((s) => s.time != null && Number.isFinite(s.time)),
    [periodVideoOffsets]
  );

  // Until the player reports its length, estimate a range that fits every marker.
  const total = useMemo(() => {
    if (duration) return duration;
    const furthest = Math.max(
      currentTime,
      ...markers.map((m) => m.time),
      ...periodStarts.map((s) => s.time)
    );
    return Math.max(furthest + 120, 60);
  }, [duration, currentTime, markers, periodStarts]);

  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / total) * 100))}%`;

  const isHome = (evt: NormalizedEvent) =>
    !!homeTeamName && !!evt.team_name && evt.team_name.trim().toLowerCase() === homeTeamName.trim().toLowerCase();

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(fraction * total);
  };

  if (!hasSync && markers.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 pt-3 pb-2.5 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wide">
          <Clapperboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Línea de tiempo</span>
          {homeTeamName && (
            <span className="normal-case font-medium text-slate-500 tracking-normal">
              — arriba {homeTeamName}, abajo rival · clic en un evento para verlo
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-slate-400 shrink-0">
          <span className="text-emerald-400 font-bold">{formatVideoTime(currentTime)}</span>
          {' / '}
          {duration ? formatVideoTime(duration) : '--:--'}
        </span>
      </div>

      <div className="relative">
        {hovered && (
          <div
            className="absolute -top-9 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-100 shadow-lg pointer-events-none"
            style={{ left: hovered.left }}
          >
            {hovered.evt.event_type || hovered.evt.category}
            {hovered.evt.team_name ? ` · ${hovered.evt.team_name}` : ''}
            {hovered.evt.player_name ? ` · ${hovered.evt.player_name}` : ''}
            <span className="text-slate-400 font-mono">
              {' '}
              ({PERIOD_SHORT_LABELS[hovered.evt.period ?? 1] ?? ''}{' '}
              {formatVideoTime(hovered.evt.timestamp ?? 0)})
            </span>
          </div>
        )}

        <div
          ref={barRef}
          onClick={handleBarClick}
          className="relative h-12 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer overflow-hidden"
          title="Clic para saltar a ese momento del vídeo"
        >
          {/* Separador de carriles local / visitante */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800" />

          {/* Progreso del vídeo */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
            style={{ width: pct(currentTime) }}
          />

          {/* Inicio de cada parte */}
          {periodStarts.map((s) => (
            <div
              key={`ps_${s.period}`}
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none"
              style={{ left: pct(s.time) }}
            >
              <span className="absolute top-0 left-1 text-[9px] font-black text-amber-300 leading-none">
                {PERIOD_SHORT_LABELS[s.period] ?? `P${s.period}`}
              </span>
            </div>
          ))}

          {/* Eventos */}
          {markers.map(({ evt, time }) => {
            const color = getEventColorHex(evt, buttons);
            const home = isHome(evt);
            const isPlaying = evt.event_id === playingEventId;
            return (
              <button
                key={evt.event_id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayEvent(evt);
                }}
                onMouseEnter={(e) => {
                  const rect = barRef.current?.getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  if (rect) setHovered({ evt, left: r.left - rect.left + r.width / 2 });
                }}
                onMouseLeave={() => setHovered(null)}
                className={`absolute w-1.5 -ml-[3px] rounded-sm transition-transform hover:scale-y-110 hover:z-10 ${
                  home ? 'top-1 bottom-1/2 mb-0.5' : 'top-1/2 bottom-1 mt-0.5'
                } ${isPlaying ? 'ring-2 ring-white z-10' : ''}`}
                style={{ left: pct(time), backgroundColor: color }}
                aria-label={`${evt.event_type || evt.category} ${evt.team_name || ''}`}
              />
            );
          })}

          {/* Cabezal de reproducción */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] pointer-events-none z-10"
            style={{ left: pct(currentTime) }}
          />
        </div>
      </div>
    </div>
  );
};
