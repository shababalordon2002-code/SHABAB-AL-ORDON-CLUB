import { Match, NormalizedEvent, BotoneraProjectVideoType } from '@/types';

/**
 * Resolves the match period (1 for 1st half, 2 for 2nd half) from event metadata, period field, or minute/timestamp.
 */
export function resolveEventPeriod(evt: NormalizedEvent): number {
  if (evt.period !== null && evt.period !== undefined && Number(evt.period) > 0) {
    return Number(evt.period);
  }
  if (evt.metadata?.period) {
    const p = Number(evt.metadata.period);
    if (!isNaN(p) && p > 0) return p;
  }
  const pName = (evt.metadata?.period_name || evt.metadata?.parte || '').toString();
  if (pName.includes('2')) return 2;
  if (pName.includes('1')) return 1;

  const min = evt.minute !== null && evt.minute !== undefined ? Number(evt.minute) : null;
  if (min !== null && min >= 45) return 2;

  const ts = evt.timestamp !== null && evt.timestamp !== undefined ? Number(evt.timestamp) : 0;
  if (ts >= 2700) return 2;

  return 1;
}

/**
 * Calculates the exact video timestamp (in seconds) for a given event,
 * handling both direct video file timestamps (e.g. LongoMatch XML) and match clock timestamps
 * with period offset compensation (p1_video_start_time / p2_video_start_time / periodVideoOffsets).
 */
export function calculateEventVideoTime(
  evt: NormalizedEvent,
  match?: Match | null,
  periodVideoOffsets?: Record<number, number>,
  leadInSeconds: number = 0
): number {
  const evtPeriod = resolveEventPeriod(evt);

  // 1. Resolve period video start offset from user metrics or match record
  let pOffset = 0;
  if (periodVideoOffsets && periodVideoOffsets[evtPeriod] !== undefined) {
    pOffset = periodVideoOffsets[evtPeriod];
  } else if (match) {
    if (evtPeriod === 1 && match.p1_video_start_time != null) {
      pOffset = match.p1_video_start_time;
    } else if (evtPeriod === 2 && match.p2_video_start_time != null) {
      pOffset = match.p2_video_start_time;
    } else if (periodVideoOffsets && periodVideoOffsets[evtPeriod] !== undefined) {
      pOffset = periodVideoOffsets[evtPeriod];
    }
  }

  // 2. Derive seconds elapsed within the specific period from timestamp (exact) or minute/second
  let rawSec = 0;
  if (evt.timestamp !== null && evt.timestamp !== undefined && !isNaN(Number(evt.timestamp))) {
    const ts = Number(evt.timestamp);
    let relTs = ts;

    if (evtPeriod === 2 && ts >= 2700) {
      relTs = ts - 2700;
    } else if (evtPeriod === 3 && ts >= 5400) {
      relTs = ts - 5400;
    } else if (evtPeriod === 4 && ts >= 6300) {
      relTs = ts - 6300;
    }

    rawSec = Math.max(0, relTs);
  } else if (evt.minute !== null && evt.minute !== undefined && !isNaN(Number(evt.minute))) {
    const min = Number(evt.minute);
    const sec = Number(evt.second) || 0;
    let relMin = min;

    // In 2nd half (period 2), match clock might be full-match minute (e.g. 53:20) or half-relative (e.g. 08:20)
    if (evtPeriod === 2 && min >= 45) {
      relMin = min - 45;
    } else if (evtPeriod === 3 && min >= 90) {
      relMin = min - 90;
    } else if (evtPeriod === 4 && min >= 105) {
      relMin = min - 105;
    }

    rawSec = Math.max(0, relMin * 60 + sec);
  }

  // 3. Target video position = period video start offset + seconds in period
  const targetTime = pOffset + rawSec;

  // If lead-in is requested, subtract it without going before period kickoff
  if (leadInSeconds > 0) {
    return Math.max(pOffset, targetTime - leadInSeconds);
  }

  return targetTime;
}

/**
 * Formats seconds into mm:ss or h:mm:ss for video timestamps.
 */
export function formatVideoTime(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculates features string for window.open to ensure the pop-out window
 * is centered on the user's active monitor screen.
 */
export function getCenteredPopUpFeatures(w = 980, h = 620): string {
  if (typeof window === 'undefined') {
    return `width=${w},height=${h}`;
  }
  const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

  const screenWidth = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : window.screen.width;
  const screenHeight = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : window.screen.height;

  const left = Math.max(0, Math.round(screenLeft + (screenWidth - w) / 2));
  const top = Math.max(0, Math.round(screenTop + (screenHeight - h) / 2));

  return `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,resizable=yes`;
}

export interface OpenClipPopupOptions {
  event: NormalizedEvent;
  match?: Match | null;
  periodVideoOffsets?: Record<number, number>;
  videoUrl?: string | null;
  videoType?: BotoneraProjectVideoType | null;
  localObjectUrl?: string | null;
}

/**
 * Opens a centered pop-up window reproducing the given event cut with exact video time.
 * Reuses the window if already open, without interrupting or pausing the background match video.
 */
export function openClipPopupWindow(options: OpenClipPopupOptions): Window | null {
  if (typeof window === 'undefined') return null;

  const { event, match, periodVideoOffsets, videoUrl, videoType, localObjectUrl } = options;
  const targetVideoTime = calculateEventVideoTime(event, match, periodVideoOffsets, 0);

  const matchTimestamp = event.timestamp ?? (event.minute !== null ? event.minute * 60 + (event.second || 0) : 0);
  const mMin = Math.floor(matchTimestamp / 60);
  const mSec = Math.floor(matchTimestamp % 60);
  const matchTimeStr = `${mMin.toString().padStart(2, '0')}:${mSec.toString().padStart(2, '0')}`;
  const videoTimeStr = formatVideoTime(targetVideoTime);
  const periodStr = event.period === 1 ? '1ª Parte' : event.period === 2 ? '2ª Parte' : `T. Extra ${event.period || ''}`;
  const actionName = event.event_type || event.category || 'Acción';
  const playerName = event.player_name || 'Sin asignar';

  // 1. Resolve video source for playback
  const localSrc = localObjectUrl || (videoType === 'local' ? videoUrl : null);
  const isLocal = !!localSrc && (videoType === 'local' || !!localObjectUrl);
  const resolvedVideoUrl = isLocal ? localSrc : (videoUrl || match?.video_url || '');

  if (!resolvedVideoUrl) {
    alert('⚠️ No hay vídeo cargado para reproducir el corte. Por favor, selecciona un vídeo local o introduce un enlace de YouTube en la barra superior.');
    return null;
  }

  // 2. Open centered pop-up window
  const clipTitle = `Corte: ${actionName} - ${playerName} | Partido ${matchTimeStr} | Vídeo ${videoTimeStr}`;
  const win = window.open('', 'sao_clip_player', getCenteredPopUpFeatures(980, 620));

  if (!win) {
    alert('⚠️ El navegador ha bloqueado la ventana emergente. Por favor, permite las ventanas emergentes en tu navegador para ver la repetición del corte.');
    return null;
  }

  // 3. Build player HTML content
  const isYouTube = !isLocal && (resolvedVideoUrl.includes('youtube.com') || resolvedVideoUrl.includes('youtu.be'));
  let playerContent = '';

  if (isLocal) {
    playerContent = `
      <video id="clipVideo" src="${resolvedVideoUrl}" controls autoplay playsinline style="width:100%; height:100%; object-fit:contain; background:#000; outline:none;"></video>
      <script>
        const v = document.getElementById('clipVideo');
        const startAt = ${targetVideoTime};
        const jumpToStart = () => {
          try {
            v.currentTime = startAt;
            v.play().catch(() => {});
          } catch (e) {}
        };
        v.addEventListener('loadedmetadata', jumpToStart);
        v.addEventListener('canplay', () => {
          if (Math.abs(v.currentTime - startAt) > 1) jumpToStart();
        });
        if (v.readyState >= 1) jumpToStart();

        window.repeatClip = () => {
          try {
            v.currentTime = startAt;
            v.play().catch(() => {});
          } catch (e) {}
        };
        window.skipTime = (sec) => {
          try {
            v.currentTime = Math.max(0, v.currentTime + sec);
            v.play().catch(() => {});
          } catch (e) {}
        };
        window.togglePlay = () => {
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        };
        window.setRate = (rate) => {
          v.playbackRate = rate;
          document.querySelectorAll('.speed-btn').forEach(b => {
            b.classList.toggle('active', parseFloat(b.dataset.speed) === rate);
          });
        };

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space') {
            e.preventDefault();
            window.togglePlay();
          } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            window.skipTime(-5);
          } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            window.skipTime(5);
          } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            window.repeatClip();
          }
        });
      </script>
    `;
  } else if (isYouTube) {
    let embedSrc = resolvedVideoUrl;
    try {
      const url = new URL(resolvedVideoUrl);
      const host = url.hostname.replace('www.', '');
      if (host === 'youtu.be') {
        embedSrc = `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
      } else if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (url.pathname === '/watch') {
          const id = url.searchParams.get('v');
          embedSrc = id ? `https://www.youtube.com/embed/${id}` : resolvedVideoUrl;
        } else if (url.pathname.startsWith('/shorts/')) {
          embedSrc = `https://www.youtube.com/embed/${url.pathname.split('/')[2]}`;
        }
      }
      const u = new URL(embedSrc);
      u.searchParams.set('start', String(Math.floor(targetVideoTime)));
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('enablejsapi', '1');
      embedSrc = u.toString();
    } catch (e) {}

    playerContent = `
      <iframe id="clipIframe" src="${embedSrc}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:0; background:#000;"></iframe>
      <script>
        const embedBase = "${embedSrc}";
        window.repeatClip = () => {
          const ifr = document.getElementById('clipIframe');
          ifr.src = embedBase;
        };
        window.skipTime = (sec) => {
          const ifr = document.getElementById('clipIframe');
          if (ifr && ifr.contentWindow) {
            ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [${Math.floor(targetVideoTime)} + sec, true] }), '*');
          }
        };
      </script>
    `;
  } else {
    playerContent = `
      <video id="clipVideo" src="${resolvedVideoUrl}" controls autoplay playsinline style="width:100%; height:100%; object-fit:contain; background:#000;"></video>
      <script>
        const v = document.getElementById('clipVideo');
        const startAt = ${targetVideoTime};
        v.currentTime = startAt;
        v.addEventListener('loadedmetadata', () => { v.currentTime = startAt; v.play().catch(() => {}); });
        window.repeatClip = () => { v.currentTime = startAt; v.play().catch(() => {}); };
        window.skipTime = (sec) => { v.currentTime = Math.max(0, v.currentTime + sec); };
      </script>
    `;
  }

  win.document.open();
  win.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${clipTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%; height: 100%;
            background: #020617;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .header {
            height: 54px;
            background: #0f172a;
            border-bottom: 1px solid #1e293b;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            flex-shrink: 0;
            gap: 12px;
          }
          .left-info {
            display: flex;
            align-items: center;
            gap: 10px;
            overflow: hidden;
          }
          .action-badge {
            background: #059669;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 8px;
            white-space: nowrap;
            letter-spacing: 0.3px;
          }
          .player-badge {
            color: #e2e8f0;
            font-weight: 700;
            font-size: 13px;
            white-space: nowrap;
          }
          .time-badges {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .badge-match {
            background: #1e293b;
            color: #94a3b8;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid #334155;
            white-space: nowrap;
          }
          .badge-video {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid rgba(16, 185, 129, 0.4);
            white-space: nowrap;
          }
          .controls {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }
          .btn {
            background: #1e293b;
            color: #cbd5e1;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .btn:hover {
            background: #334155;
            color: #ffffff;
            border-color: #475569;
          }
          .btn-primary {
            background: #10b981;
            color: #022c22;
            border-color: #059669;
          }
          .btn-primary:hover {
            background: #34d399;
            color: #022c22;
          }
          .speed-group {
            display: flex;
            background: #020617;
            border: 1px solid #334155;
            border-radius: 6px;
            overflow: hidden;
          }
          .speed-btn {
            background: transparent;
            color: #94a3b8;
            border: 0;
            padding: 3px 7px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          }
          .speed-btn.active {
            background: #10b981;
            color: #022c22;
          }
          .player-container {
            flex: 1;
            width: 100%;
            height: calc(100% - 54px);
            position: relative;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="left-info">
            <span class="action-badge">${actionName}</span>
            <span class="player-badge">${playerName}</span>
            <div class="time-badges">
              <span class="badge-match">⏱️ Partido: ${matchTimeStr} (${periodStr})</span>
              <span class="badge-video">🎥 Vídeo: ${videoTimeStr}</span>
            </div>
          </div>
          <div class="controls">
            <button class="btn btn-primary" onclick="window.repeatClip?.()">🔄 Repetir corte</button>
            <button class="btn" onclick="window.skipTime?.(-5)">⏪ -5s</button>
            <button class="btn" onclick="window.skipTime?.(5)">⏩ +5s</button>
            <div class="speed-group">
              <button class="speed-btn" data-speed="0.5" onclick="window.setRate?.(0.5)">0.5x</button>
              <button class="speed-btn" data-speed="0.75" onclick="window.setRate?.(0.75)">0.75x</button>
              <button class="speed-btn active" data-speed="1" onclick="window.setRate?.(1)">1x</button>
              <button class="speed-btn" data-speed="1.25" onclick="window.setRate?.(1.25)">1.25x</button>
            </div>
          </div>
        </div>
        <div class="player-container">
          ${playerContent}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  return win;
}
