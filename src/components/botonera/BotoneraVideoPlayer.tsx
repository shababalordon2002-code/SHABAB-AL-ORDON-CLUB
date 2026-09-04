'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PictureInPicture2, ExternalLink, Minimize2, Maximize2, Video as VideoIcon, ArrowLeftRight, Clock, RotateCcw, CheckCircle2 } from 'lucide-react';
import { BotoneraProjectVideoType } from '@/types';

interface BotoneraVideoPlayerProps {
  videoType: BotoneraProjectVideoType;
  videoUrl: string | null;
  videoFile: File | null;
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
  videoFile,
  videoSourceName,
  isPoppedOut = false,
  onTogglePopOut,
  onVideoRef,
  onIframeRef,
  periodVideoOffsets = {},
  onClearPeriodOffset,
}) => {
  const fmtVideoTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const PERIOD_LABELS: Record<number, string> = {
    1: '1ª Parte',
    2: '2ª Parte',
    3: 'ET 1',
    4: 'ET 2',
  };

  const periodEntries = Object.entries(periodVideoOffsets)
    .map(([p, t]) => ({ period: Number(p), time: t }))
    .sort((a, b) => a.period - b.period);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const popoutRef = useRef<Window | null>(null);

  // Build/cleanup the blob URL for a local file
  useEffect(() => {
    if (videoType === 'local' && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setLocalObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLocalObjectUrl(null);
  }, [videoType, videoFile]);

  if (videoType === 'none') return null;

  const popupStateRef = useRef({ time: 0, playing: false, shouldRestore: false });

  const monitorPopOutWindow = (win: Window | null, isLocal: boolean) => {
    if (!win) return;
    const interval = setInterval(() => {
      // If local, continually sync the popup video state
      if (isLocal && !win.closed) {
        try {
          const popupVideo = win.document.querySelector('video');
          if (popupVideo) {
            popupStateRef.current.time = popupVideo.currentTime;
            popupStateRef.current.playing = !popupVideo.paused;
            popupStateRef.current.shouldRestore = true;
          }
        } catch {
          // ignore cross-origin or DOM errors
        }
      }

      if (win.closed) {
        clearInterval(interval);
        if (onTogglePopOut) onTogglePopOut(false);
      }
    }, 200);
  };

  const handlePopOutLocal = () => {
    if (onTogglePopOut) onTogglePopOut(true);
    if (!localObjectUrl) return;

    const currentTime = videoRef.current?.currentTime || 0;
    const isPlaying = !(videoRef.current?.paused ?? true);

    const win = window.open('', 'sao_botonera_video', 'width=960,height=560,menubar=no,toolbar=no,location=no');
    if (!win) return;
    popoutRef.current = win;
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${videoSourceName || 'Vídeo del Partido'}</title>
          <style>
            html, body { margin:0; padding:0; background:#000; height:100%; overflow:hidden; }
            video { width:100%; height:100%; object-fit:contain; background:#000; }
          </style>
        </head>
        <body>
          <video id="v" src="${localObjectUrl}" controls></video>
          <script>
            const v = document.getElementById('v');
            v.currentTime = ${currentTime};
            ${isPlaying ? 'v.play().catch(()=>{});' : ''}
            v.addEventListener('loadedmetadata', () => {
              v.currentTime = ${currentTime};
              ${isPlaying ? 'v.play().catch(()=>{});' : ''}
            });
          </script>
        </body>
      </html>
    `);
    win.document.close();
    monitorPopOutWindow(win, true);
  };

  const handlePopOutLink = () => {
    if (onTogglePopOut) onTogglePopOut(true);
    if (!videoUrl) return;
    const win = window.open(videoUrl, 'sao_botonera_video', 'width=960,height=560,menubar=no,toolbar=no,location=no');
    monitorPopOutWindow(win, false);
  };

  const handlePictureInPicture = async () => {
    try {
      if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // Browser/video may not support PiP; the pop-out window remains as fallback.
    }
  };

  if (isPoppedOut) {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-amber-200 text-xs">VÍDEO REPRODUCIÉNDOSE EN VENTANA EXTERNA</div>
            <div className="text-[11px] text-amber-400/80">
              La botonera ocupa el lado izquierdo a tamaño grande y la derecha contiene los registros y estadísticas.
            </div>
          </div>
        </div>

        <button
          onClick={() => onTogglePopOut && onTogglePopOut(false)}
          className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Acoplar Vídeo a la Página</span>
        </button>
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
            onClick={videoType === 'local' ? handlePopOutLocal : handlePopOutLink}
            title="Abrir en ventana aparte (para llevar a otro monitor)"
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

      {/* Period sync markers bar — shown only when at least one period has a recorded offset */}
      {periodEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-950/80 border-b border-slate-800/80">
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Clock className="w-3 h-3 text-emerald-500" />
            Sync vídeo:
          </span>
          {periodEntries.map(({ period, time }) => (
            <span
              key={period}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-black">{PERIOD_LABELS[period] ?? `Parte ${period}`}</span>
              <span className="text-[11px] font-mono text-emerald-200">empieza en</span>
              <span className="text-[11px] font-black font-mono text-emerald-100">{fmtVideoTime(time)}</span>
              {onClearPeriodOffset && (
                <button
                  onClick={() => onClearPeriodOffset(period)}
                  title={`Resetear sync de ${PERIOD_LABELS[period] ?? `Parte ${period}`}`}
                  className="ml-0.5 p-0.5 rounded hover:bg-red-900/50 text-emerald-500 hover:text-red-400 transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}

          {/* Pending periods not yet captured */}
          {[1, 2].filter(p => !(p in periodVideoOffsets)).map(p => (
            <span
              key={p}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-500"
            >
              <span className="text-[11px] font-semibold">{PERIOD_LABELS[p]}</span>
              <span className="text-[10px] italic">— pulsa PLAY para capturar</span>
            </span>
          ))}
        </div>
      )}


      {!isCollapsed && (
        <div className="aspect-video bg-black">
          {videoType === 'local' && localObjectUrl && (
            <video
              ref={(el) => {
                (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                onVideoRef?.(el);
              }}
              src={localObjectUrl}
              controls
              className="w-full h-full"
              onLoadedMetadata={(e) => {
                if (popupStateRef.current.shouldRestore) {
                  e.currentTarget.currentTime = popupStateRef.current.time;
                  if (popupStateRef.current.playing) {
                    e.currentTarget.play().catch(() => {});
                  }
                  popupStateRef.current.shouldRestore = false;
                }
              }}
            />
          )}

          {videoType === 'local' && !localObjectUrl && (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-6 text-center">
              El archivo de vídeo no está disponible en esta sesión (se perdió al recargar la página).
              <br />Selecciónalo de nuevo desde "Editar Botonera" o reinicia el registro.
            </div>
          )}

          {videoType === 'link' && videoUrl && (
            <iframe
              ref={(el) => { onIframeRef?.(el); }}
              src={toEmbedUrl(videoUrl)}
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
