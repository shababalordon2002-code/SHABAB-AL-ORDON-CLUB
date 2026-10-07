'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, Save, ZoomIn, ZoomOut } from 'lucide-react';
import { NormalizedEvent, Match, BotoneraProjectVideoType } from '@/types';
import { extractYouTubeVideoId, formatVideoTime, getEventClipWindow } from '@/lib/analytics/video-utils';

interface ClipTrimModalProps {
  event: NormalizedEvent;
  match?: Match | null;
  periodVideoOffsets?: Record<number, number>;
  periodAdjustments?: Record<number, { matchTimeSec: number; videoTimeSec: number }>;
  videoUrl?: string | null;
  videoType?: BotoneraProjectVideoType | null;
  localObjectUrl?: string | null;
  /** Saves the new cut window (metadata.leadTime / lagTime). Omit for read-only viewing. */
  onSave?: (updatedEvent: NormalizedEvent) => void;
  onClose: () => void;
}

/** Minimal common surface over the <video> element and the YouTube IFrame player. */
interface PlayerAdapter {
  getTime: () => number;
  getDuration: () => number | null;
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
}

const MIN_CLIP_SEC = 1;
const ZOOM_LEVELS = [15, 30, 60, 120, 300];
const round1 = (n: number) => Math.round(n * 10) / 10;

const formatPrecise = (sec: number) => {
  const safe = Math.max(0, sec);
  return `${formatVideoTime(safe)}.${Math.floor((safe % 1) * 10)}`;
};

/**
 * Ventana emergente para reproducir el corte de un evento y ajustar su inicio y final
 * arrastrando los tiradores sobre la barra de tiempo. Guarda el resultado como
 * leadTime / lagTime relativos al minuto del evento (misma convención que la botonera).
 */
export const ClipTrimModal: React.FC<ClipTrimModalProps> = ({
  event,
  match,
  periodVideoOffsets,
  periodAdjustments,
  videoUrl,
  videoType,
  localObjectUrl,
  onSave,
  onClose,
}) => {
  const { eventTime, start: initialStart, end: initialEnd } = useMemo(
    () => getEventClipWindow(event, match, periodVideoOffsets, periodAdjustments),
    [event, match, periodVideoOffsets, periodAdjustments]
  );

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [currentTime, setCurrentTime] = useState(initialStart);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [zoomIdx, setZoomIdx] = useState(1);
  const [loop, setLoop] = useState(true);
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

  const startRef = useRef(start);
  const endRef = useRef(end);
  startRef.current = start;
  endRef.current = end;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;

  const playerRef = useRef<PlayerAdapter | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // ── Fuente de vídeo ──
  const localSrc = localObjectUrl || (videoType === 'local' ? videoUrl : null);
  const resolvedUrl = localSrc || videoUrl || match?.video_url || '';
  const youtubeId = !localSrc ? extractYouTubeVideoId(resolvedUrl) : null;

  // ── Reproductor YouTube ──
  useEffect(() => {
    if (!youtubeId || !ytHostRef.current) return;
    let cancelled = false;
    let player: any = null;
    const host = ytHostRef.current;
    const mount = document.createElement('div');
    host.appendChild(mount);

    const create = () => {
      const YT = (window as any).YT;
      if (cancelled || !YT?.Player) return;
      player = new YT.Player(mount, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { start: Math.floor(startRef.current), autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1 },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = {
              getTime: () => Number(player.getCurrentTime?.()) || 0,
              getDuration: () => {
                const d = Number(player.getDuration?.());
                return d > 0 ? d : null;
              },
              seek: (t) => player.seekTo?.(t, true),
              play: () => player.playVideo?.(),
              pause: () => player.pauseVideo?.(),
              isPlaying: () => player.getPlayerState?.() === 1,
            };
            player.seekTo?.(startRef.current, true);
            player.playVideo?.();
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      create();
    } else {
      const previousCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        create();
      };
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch {}
      host.innerHTML = '';
    };
  }, [youtubeId]);

  // ── Reproductor <video> (local o enlace directo) ──
  const handleVideoMetadata = () => {
    const v = videoElRef.current;
    if (!v) return;
    playerRef.current = {
      getTime: () => v.currentTime,
      getDuration: () => (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null),
      seek: (t) => {
        v.currentTime = Math.max(0, t);
      },
      play: () => {
        v.play().catch(() => {});
      },
      pause: () => v.pause(),
      isPlaying: () => !v.paused && !v.ended,
    };
    v.currentTime = startRef.current;
    v.play().catch(() => {});
  };

  // ── Bucle de lectura: tiempo actual + parada/bucle al final del corte ──
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getTime();
      const isPlaying = p.isPlaying();
      const d = p.getDuration();
      if (d) setDuration((prev) => (prev === d ? prev : d));
      if (draggingRef.current) return;
      setCurrentTime(t);
      setPlaying(isPlaying);
      if (isPlaying && t >= endRef.current) {
        if (loopRef.current) p.seek(startRef.current);
        else p.pause();
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ── Ventana visible de la barra de tiempo (centrada en el corte) ──
  const zoomSpan = ZOOM_LEVELS[zoomIdx];
  const [view, setView] = useState<{ min: number; max: number }>(() => ({ min: 0, max: 1 }));
  useEffect(() => {
    const center = (initialStart + initialEnd) / 2;
    const span = Math.max(ZOOM_LEVELS[zoomIdx], (initialEnd - initialStart) * 1.5);
    let min = Math.max(0, center - span / 2);
    let max = min + span;
    if (duration && max > duration) {
      max = duration;
      min = Math.max(0, max - span);
    }
    setView({ min, max });
    // Solo al abrir y al cambiar el zoom: arrastrar no debe mover la escala bajo el cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomIdx, duration]);

  const timeToPct = (t: number) => ((t - view.min) / (view.max - view.min)) * 100;
  const pctClamp = (p: number) => Math.min(100, Math.max(0, p));

  const clientXToTime = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return view.min;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return view.min + ratio * (view.max - view.min);
    },
    [view]
  );

  const seekTo = (t: number) => {
    setCurrentTime(t);
    playerRef.current?.seek(t);
  };

  const applyDrag = (kind: 'start' | 'end' | 'playhead', t: number) => {
    const maxT = duration ?? Number.POSITIVE_INFINITY;
    if (kind === 'start') {
      const next = round1(Math.min(Math.max(0, t), endRef.current - MIN_CLIP_SEC));
      setStart(next);
      seekTo(next);
    } else if (kind === 'end') {
      const next = round1(Math.max(Math.min(maxT, t), startRef.current + MIN_CLIP_SEC));
      setEnd(next);
      seekTo(next);
    } else {
      seekTo(Math.max(0, Math.min(maxT, t)));
    }
  };

  const beginDrag = (kind: 'start' | 'end' | 'playhead') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playerRef.current?.pause();
    setDragging(kind);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    applyDrag(kind, clientXToTime(e.clientX));
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    applyDrag(dragging, clientXToTime(e.clientX));
  };

  const endDrag = () => setDragging(null);

  // ── Acciones ──
  const playClip = () => {
    seekTo(startRef.current);
    playerRef.current?.play();
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) p.pause();
    else {
      if (p.getTime() >= endRef.current || p.getTime() < startRef.current - 0.5) p.seek(startRef.current);
      p.play();
    }
  };

  const setStartHere = () => {
    const t = playerRef.current?.getTime() ?? currentTime;
    setStart(round1(Math.min(Math.max(0, t), endRef.current - MIN_CLIP_SEC)));
  };
  const setEndHere = () => {
    const t = playerRef.current?.getTime() ?? currentTime;
    setEnd(round1(Math.max(t, startRef.current + MIN_CLIP_SEC)));
  };

  const nudge = (kind: 'start' | 'end', delta: number) => applyDrag(kind, (kind === 'start' ? start : end) + delta);

  const resetWindow = () => {
    setStart(initialStart);
    setEnd(initialEnd);
    seekTo(initialStart);
  };

  const handleSave = () => {
    if (!onSave) return;
    const leadTime = round1(eventTime - start);
    const lagTime = round1(end - eventTime);
    onSave({
      ...event,
      duration: round1(end - start),
      metadata: { ...(event.metadata || {}), leadTime, lagTime },
    });
    onClose();
  };

  // ── Teclado: espacio, I / O para fijar inicio/final, Esc para cerrar ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (!onSave) return;
      else if (e.key === 'i' || e.key === 'I') setStartHere();
      else if (e.key === 'o' || e.key === 'O') setEndHere();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lead = round1(eventTime - start);
  const lag = round1(end - eventTime);
  const changed = round1(start) !== round1(initialStart) || round1(end) !== round1(initialEnd);
  const actionName = event.event_type || event.category || 'Acción';
  const playerName = event.player_name || 'Sin asignar';

  // Marcas de la escala cada N segundos según el zoom
  const tickStep = zoomSpan <= 15 ? 1 : zoomSpan <= 30 ? 5 : zoomSpan <= 60 ? 10 : zoomSpan <= 120 ? 15 : 30;
  const ticks: number[] = [];
  for (let t = Math.ceil(view.min / tickStep) * tickStep; t <= view.max; t += tickStep) ticks.push(t);

  if (!resolvedUrl) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-200" onClick={(e) => e.stopPropagation()}>
          ⚠️ No hay vídeo cargado para reproducir el corte. Selecciona un vídeo local o introduce un enlace de YouTube.
          <div className="mt-4 text-right">
            <button onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={onClose}>
      <div
        className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white">{actionName}</span>
            <span className="truncate text-sm font-bold text-slate-200">{playerName}</span>
            <span className="whitespace-nowrap rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
              🎥 Evento: {formatVideoTime(eventTime)}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="Cerrar (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vídeo */}
        <div className="relative aspect-video w-full bg-black">
          {youtubeId ? (
            <div ref={ytHostRef} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
          ) : (
            <video
              ref={videoElRef}
              src={resolvedUrl}
              playsInline
              onLoadedMetadata={handleVideoMetadata}
              onClick={togglePlay}
              className="absolute inset-0 h-full w-full bg-black object-contain"
            />
          )}
        </div>

        {/* Barra de recorte */}
        <div className="space-y-3 border-t border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={togglePlay} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700" title="Reproducir / pausa (Espacio)">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button onClick={playClip} className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400">
              <RotateCcw className="h-3.5 w-3.5" /> Repetir corte
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="accent-emerald-500" />
              Bucle
            </label>
            <span className="ml-1 font-mono text-[11px] font-bold text-slate-300">{formatPrecise(currentTime)}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
                disabled={zoomIdx === 0}
                className="rounded-md border border-slate-700 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                title="Acercar"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center font-mono text-[10px] text-slate-400">{zoomSpan >= 60 ? `${zoomSpan / 60} min` : `${zoomSpan}s`}</span>
              <button
                onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
                disabled={zoomIdx === ZOOM_LEVELS.length - 1}
                className="rounded-md border border-slate-700 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                title="Alejar"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Pista */}
          <div className="select-none pt-1">
            <div
              ref={trackRef}
              onPointerDown={beginDrag('playhead')}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="relative h-12 cursor-pointer touch-none rounded-lg border border-slate-700 bg-slate-950"
            >
              {/* Región seleccionada */}
              <div
                className="absolute inset-y-0 border-y-2 border-amber-400 bg-amber-400/20"
                style={{ left: `${pctClamp(timeToPct(start))}%`, width: `${Math.max(0, pctClamp(timeToPct(end)) - pctClamp(timeToPct(start)))}%` }}
              />
              {/* Marca del evento (clic) */}
              {eventTime >= view.min && eventTime <= view.max && (
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400" style={{ left: `${timeToPct(eventTime)}%` }} title="Momento del clic" />
              )}
              {/* Cabezal */}
              {currentTime >= view.min && currentTime <= view.max && (
                <div className="pointer-events-none absolute -inset-y-1 w-0.5 bg-white shadow" style={{ left: `${timeToPct(currentTime)}%` }} />
              )}
              {/* Tirador inicio */}
              {start >= view.min && start <= view.max && (
                <div
                  onPointerDown={beginDrag('start')}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute -inset-y-1 z-10 flex w-4 -translate-x-full cursor-ew-resize items-center justify-center rounded-l-md bg-amber-400 hover:bg-amber-300"
                  style={{ left: `${timeToPct(start)}%` }}
                  title="Arrastra para mover el inicio"
                >
                  <span className="h-5 w-0.5 rounded bg-amber-900/60" />
                </div>
              )}
              {/* Tirador final */}
              {end >= view.min && end <= view.max && (
                <div
                  onPointerDown={beginDrag('end')}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute -inset-y-1 z-10 flex w-4 cursor-ew-resize items-center justify-center rounded-r-md bg-amber-400 hover:bg-amber-300"
                  style={{ left: `${timeToPct(end)}%` }}
                  title="Arrastra para mover el final"
                >
                  <span className="h-5 w-0.5 rounded bg-amber-900/60" />
                </div>
              )}
            </div>
            {/* Escala */}
            <div className="relative mt-1 h-4">
              {ticks.map((t) => (
                <span key={t} className="absolute -translate-x-1/2 font-mono text-[9px] text-slate-500" style={{ left: `${timeToPct(t)}%` }}>
                  {formatVideoTime(t)}
                </span>
              ))}
            </div>
          </div>

          {/* Valores y ajuste fino */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-3">
              <TrimField
                label="Inicio"
                value={formatPrecise(start)}
                offset={lead >= 0 ? `-${lead}s` : `+${Math.abs(lead)}s`}
                editable={!!onSave}
                onNudge={(d) => nudge('start', d)}
                onSetHere={setStartHere}
                hotkey="I"
              />
              <TrimField
                label="Final"
                value={formatPrecise(end)}
                offset={lag >= 0 ? `+${lag}s` : `-${Math.abs(lag)}s`}
                editable={!!onSave}
                onNudge={(d) => nudge('end', d)}
                onSetHere={setEndHere}
                hotkey="O"
              />
              <span className="font-mono font-bold text-slate-400">
                Duración: <span className="text-amber-300">{round1(end - start)}s</span>
              </span>
            </div>
            {onSave && (
              <div className="flex items-center gap-2">
                <button
                  onClick={resetWindow}
                  disabled={!changed}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  Restablecer
                </button>
                <button
                  onClick={handleSave}
                  disabled={!changed}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500 bg-amber-400 px-3 py-1.5 font-extrabold text-amber-950 hover:bg-amber-300 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" /> Guardar corte
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrimField: React.FC<{
  label: string;
  value: string;
  offset: string;
  editable: boolean;
  onNudge: (delta: number) => void;
  onSetHere: () => void;
  hotkey: string;
}> = ({ label, value, offset, editable, onNudge, onSetHere, hotkey }) => (
  <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
    <span className="font-bold uppercase tracking-wide text-slate-500">{label}</span>
    {editable && (
      <button onClick={() => onNudge(-0.5)} className="rounded px-1 font-mono font-bold text-slate-300 hover:bg-slate-800" title="-0,5s">
        −
      </button>
    )}
    <span className="font-mono font-bold text-amber-300">{value}</span>
    {editable && (
      <button onClick={() => onNudge(0.5)} className="rounded px-1 font-mono font-bold text-slate-300 hover:bg-slate-800" title="+0,5s">
        +
      </button>
    )}
    <span className="font-mono text-slate-500">({offset})</span>
    {editable && (
      <button onClick={onSetHere} className="rounded border border-slate-700 px-1.5 font-bold text-slate-300 hover:bg-slate-800" title={`Fijar en la posición actual (${hotkey})`}>
        Aquí
      </button>
    )}
  </div>
);
