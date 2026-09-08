'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PictureInPicture2, ExternalLink, Minimize2, Maximize2, Video as VideoIcon, ArrowLeftRight, Clock, RotateCcw, CheckCircle2, Pencil, Check, X, Crosshair, SkipForward, CircleDashed } from 'lucide-react';
import { BotoneraProjectVideoType } from '@/types';

interface BotoneraVideoPlayerProps {
  videoType: BotoneraProjectVideoType;
  videoUrl: string | null;
  videoSourceName: string | null;
  isPoppedOut?: boolean;
  onTogglePopOut?: (poppedOut: boolean) => void;
  /** Callback to expose the HTML video element (null when not available) */
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  /** Callback to expose the YouTube iframe element (null when not available) */
  onIframeRef?: (el: HTMLIFrameElement | null) => void;
  /** Map of period → video start time (seconds). Shown above the video as sync markers. */
  periodVideoOffsets?: Record<number, number>;
  /** Called when the user wants to reset a period's sync offset so it can be re-recorded */
  onClearPeriodOffset?: (period: number) => void;
  /** Called when the user manually edits a period's video start offset (in seconds) */
  onUpdatePeriodOffset?: (period: number, newTimeSeconds: number) => void;
  /** Called when the user clicks the Edit Video / Link button */
  onEditVideoSettings?: () => void;
  /** Period currently being tagged — highlighted in the sync bar */
  currentPeriod?: number;
  /** Marks the period start using the live playhead of the video */
  onCapturePeriodOffset?: (period: number) => void;
  /** Moves the video to an absolute video time (seconds) */
  onSeekVideoToTime?: (seconds: number) => void;
  /** Live playhead of the video, used to prefill the manual editor */
  getCurrentVideoTime?: () => number;
  /** Blob URL del vídeo local. Lo crea la página, que también lo necesita para la ventana emergente. */
  objectUrl?: string | null;
  /** Minuto del vídeo (segundos) con el que debe arrancar el reproductor incrustado al volver de la ventana. */
  resumeAtSeconds?: number | null;
  /** True si el vídeo estaba reproduciéndose en la ventana emergente al acoplarlo. */
  resumeAutoPlay?: boolean;
}

// Converts common YouTube URL formats (watch, youtu.be, shorts, already-embed) into an embeddable URL.
export function toEmbedUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace('www.', '');

    let embedUrl = rawUrl;

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1);
      embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        embedUrl = id ? `https://www.youtube.com/embed/${id}` : rawUrl;
      } else if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      } else if (url.pathname.startsWith('/embed/')) {
        embedUrl = rawUrl;
      }
    }

    // Add enablejsapi=1 so postMessage commands (seekTo, playVideo) work
    const embedUrlObj = new URL(embedUrl);
    embedUrlObj.searchParams.set('enablejsapi', '1');
    return embedUrlObj.toString();
  } catch {
    return rawUrl;
  }
}

export const BotoneraVideoPlayer: React.FC<BotoneraVideoPlayerProps> = ({
  videoType,
  videoUrl,
  videoSourceName,
  isPoppedOut = false,
  onTogglePopOut,
  onVideoRef,
  onIframeRef,
  periodVideoOffsets = {},
  onClearPeriodOffset,
  onUpdatePeriodOffset,
  onEditVideoSettings,
  currentPeriod,
  onCapturePeriodOffset,
  onSeekVideoToTime,
  getCurrentVideoTime,
  objectUrl = null,
  resumeAtSeconds = null,
  resumeAutoPlay = false,
}) => {
  const fmtVideoTime = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  const PERIOD_LABELS: Record<number, string> = {
    1: '1ª Parte',
    2: '2ª Parte',
    3: 'Prórroga 1ª Parte',
    4: 'Prórroga 2ª Parte',
  };

  // 1ª y 2ª parte siempre visibles; prórrogas (3 y 4) solo se muestran si están marcadas o en uso
  const visiblePeriods = Array.from(
    new Set<number>([
      1,
      2,
      ...Object.keys(periodVideoOffsets).map(Number),
      ...(currentPeriod && currentPeriod >= 3 ? [currentPeriod] : []),
    ])
  ).sort((a, b) => a - b);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [editingPeriodValue, setEditingPeriodValue] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Punto de reanudación: se fija al volver de la ventana emergente y NO se
  // recalcula en renders normales (cambiarlo recargaría el iframe a media
  // reproducción). Ojo: los dos layouts de la página colocan este componente en
  // la misma posición del árbol, así que React reutiliza la instancia en vez de
  // remontarla — por eso el valor se ajusta en el paso de "fuera" a "dentro" y no
  // en el montaje, que solo ocurre una vez por sesión.
  const [wasPoppedOut, setWasPoppedOut] = useState(isPoppedOut);
  const [initialResume, setInitialResume] = useState({ at: 0, play: false });
  if (wasPoppedOut !== isPoppedOut) {
    setWasPoppedOut(isPoppedOut);
    if (!isPoppedOut) {
      setInitialResume({
        at: resumeAtSeconds && resumeAtSeconds > 0 ? resumeAtSeconds : 0,
        play: !!resumeAutoPlay,
      });
    }
  }

  // Ref callbacks must be stable: an inline arrow changes identity on every render,
  // so React would detach (null) and re-attach the element each time, making the
  // chrono ↔ video coupling in the parent flicker off/on several times per second.
  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    onVideoRef?.(el);
  }, [onVideoRef]);

  const attachIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    onIframeRef?.(el);
  }, [onIframeRef]);

  // Accepts "15:30", "15.30", "15,30", "1:15:30", or numbers ("15" => 15 min, "900" => 900s)
  const parseMinSec = (val: string): number | null => {
    const trimmed = val.trim().replace(',', '.');
    if (!trimmed) return null;

    const hms = trimmed.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
    if (hms) return parseInt(hms[1], 10) * 3600 + parseInt(hms[2], 10) * 60 + parseInt(hms[3], 10);

    const ms = trimmed.match(/^(\d{1,4})[:.]([0-5]?\d)$/);
    if (ms) return parseInt(ms[1], 10) * 60 + parseInt(ms[2], 10);

    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      // If <= 180 (e.g. 15 or 45), interpret as minutes (15 min = 900s), else as total seconds
      return num <= 180 ? num * 60 : num;
    }
    return null;
  };

  const handleStartPeriodEdit = (p: number) => {
    const existing = periodVideoOffsets[p];
    const prefill = existing !== undefined ? existing : (getCurrentVideoTime?.() ?? 0);
    setEditingPeriodValue(fmtVideoTime(prefill));
    setEditingPeriod(p);
  };

  const handleConfirmPeriodEdit = (p: number) => {
    const parsed = parseMinSec(editingPeriodValue);
    if (parsed !== null && onUpdatePeriodOffset) {
      onUpdatePeriodOffset(p, Math.max(0, parsed));
    }
    setEditingPeriod(null);
  };

  // Embed de YouTube calculado una sola vez por URL: al volver de la ventana
  // emergente arranca ya en el minuto en el que se quedó (`start`), sin recargas
  // posteriores que reiniciarían el vídeo.
  const embedSrc = useMemo(() => {
    if (!videoUrl) return '';
    try {
      const url = new URL(toEmbedUrl(videoUrl));
      if (initialResume.at > 0) url.searchParams.set('start', String(Math.floor(initialResume.at)));
      if (initialResume.play) url.searchParams.set('autoplay', '1');
      return url.toString();
    } catch {
      return toEmbedUrl(videoUrl);
    }
  }, [videoUrl, initialResume]);

  // Después de los hooks: un return antes rompería el orden de llamada de React.
  if (videoType === 'none') return null;

  const handlePictureInPicture = async () => {
    try {
      if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // Browser/video may not support PiP; the pop-out window remains as fallback.
    }
  };

  /* ── Sincronización vídeo ↔ partido ──────────────────────────────────
     Muestra el minutaje del vídeo registrado para cada parte (editable a mano) */
  const syncBar = (
    <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
          Inicio de cada parte en el vídeo
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          — consulta o edita a mano el minuto del vídeo en el que arranca cada parte
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {visiblePeriods.map((p) => {
          const time = periodVideoOffsets[p];
          const isSet = time !== undefined;
          const isEditing = editingPeriod === p;
          const isCurrent = currentPeriod === p;

          return (
            <div
              key={p}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
                isCurrent
                  ? 'bg-emerald-950/80 border-emerald-500/70 ring-1 ring-emerald-400/50 shadow-md shadow-emerald-950/30'
                  : isSet
                  ? 'bg-slate-900/90 border-emerald-800/40 text-slate-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isSet ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <CircleDashed className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="text-xs font-black text-slate-200">{PERIOD_LABELS[p] ?? `Parte ${p}`}</span>
                <span className="text-[11px] text-slate-400 font-medium">empieza en</span>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={editingPeriodValue}
                    onChange={(e) => setEditingPeriodValue(e.target.value)}
                    onBlur={() => handleConfirmPeriodEdit(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmPeriodEdit(p);
                      if (e.key === 'Escape') setEditingPeriod(null);
                    }}
                    placeholder="hh:mm:ss"
                    title="Formato hh:mm:ss, mm:ss o minutos (ej: 05:59:19 o 15:30)"
                    className="w-20 px-1.5 py-0.5 rounded bg-slate-950 border border-amber-400 text-amber-300 font-mono text-[11px] font-bold text-center focus:outline-none"
                  />
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleConfirmPeriodEdit(p)}
                    className="p-1 rounded bg-emerald-600 text-slate-950 hover:bg-emerald-500"
                    title="Guardar minutaje"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEditingPeriod(null)}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartPeriodEdit(p)}
                    title="Editar a mano el minuto del vídeo en el que arranca esta parte (haz clic para modificar)"
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-black font-mono text-[11px] border cursor-pointer transition ${
                      isSet
                        ? 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-700 italic'
                    }`}
                  >
                    <span>{isSet ? fmtVideoTime(time) : '--:--'}</span>
                    <Pencil className={`w-2.5 h-2.5 ${isSet ? 'text-emerald-400' : 'text-amber-400'}`} />
                  </button>

                  {isSet && onClearPeriodOffset && (
                    <button
                      onClick={() => onClearPeriodOffset(p)}
                      title={`Borrar la marca de ${PERIOD_LABELS[p] ?? `Parte ${p}`}`}
                      className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isPoppedOut) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-amber-200 text-xs">VÍDEO EN VENTANA EXTERNA</div>
              <div className="text-[11px] text-amber-400/80">
                La página aprovecha todo el ancho para la botonera. El crono sigue atado a esa ventana.
              </div>
            </div>
          </div>

          <button
            onClick={() => onTogglePopOut && onTogglePopOut(false)}
            title="Devolver el vídeo a la página, en el mismo minuto que va en la ventana"
            className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Acoplar Vídeo a la Página</span>
          </button>
        </div>

        {syncBar}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <VideoIcon className="w-4 h-4 text-emerald-400" />
          <span>{videoType === 'local' ? (videoSourceName || 'Vídeo Local') : 'Vídeo Enlace (YouTube)'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditVideoSettings && (
            <button
              onClick={onEditVideoSettings}
              title="Editar o cambiar el archivo/enlace de vídeo para este partido"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Vídeo</span>
            </button>
          )}

          {videoType === 'local' && (
            <button
              onClick={handlePictureInPicture}
              title="Picture-in-Picture (superpuesto sobre otras ventanas)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onTogglePopOut?.(true)}
            title="Abrir en ventana aparte, en el mismo minuto que va aquí (para llevarlo a otro monitor)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Sacar Ventana</span>
          </button>

          <button
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? 'Expandir vídeo' : 'Minimizar vídeo'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {syncBar}

      {!isCollapsed && (
        <div className="aspect-video bg-black">
          {videoType === 'local' && objectUrl && (
            <video
              ref={attachVideoRef}
              src={objectUrl}
              controls
              className="w-full h-full"
              onLoadedMetadata={(e) => {
                // Reanuda donde se quedó la ventana emergente
                if (initialResume.at > 0) {
                  e.currentTarget.currentTime = initialResume.at;
                  if (initialResume.play) e.currentTarget.play().catch(() => {});
                }
              }}
            />
          )}

          {videoType === 'local' && !objectUrl && (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-6 text-center">
              El archivo de vídeo no está disponible en esta sesión (se perdió al recargar la página).
              <br />Selecciónalo de nuevo desde "Editar Botonera" o reinicia el registro.
            </div>
          )}

          {videoType === 'link' && videoUrl && (
            <iframe
              ref={attachIframeRef}
              src={embedSrc}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      )}
    </div>
  );
};
