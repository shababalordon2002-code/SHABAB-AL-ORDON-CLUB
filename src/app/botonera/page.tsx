'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dbStore, SEED_BOTONERA_TEMPLATES } from '@/lib/store/db-store';
import {
  getBotoneraTemplatesFromSupabase,
  getAnalysisEventsFromSupabase,
  insertAnalysisEventToSupabase,
  updateAnalysisEventInSupabase,
  deleteAnalysisEventFromSupabase,
  clearAnalysisEventsFromSupabase,
  subscribeToAnalysisEvents,
  subscribeToAnalysisPresence,
} from '@/lib/services/botonera-service';
import { useAuth } from '@/components/providers/AuthProvider';
import { Match, Player, NormalizedEvent, BotoneraTemplate, BotoneraButton, BotoneraProjectVideoType, MatchAnalysis } from '@/types';
import { setRecordingLocked } from '@/lib/recording-lock';
import { calculateEventVideoTime } from '@/lib/analytics/video-utils';

import { BotoneraHeader } from '@/components/botonera/BotoneraHeader';
import { BotoneraPitchCanvas } from '@/components/botonera/BotoneraPitchCanvas';
import { BotoneraPlayerSelector } from '@/components/botonera/BotoneraPlayerSelector';
import { BotoneraPanelEditor } from '@/components/botonera/BotoneraPanelEditor';
import { BotoneraEventLog } from '@/components/botonera/BotoneraEventLog';
import { BotoneraSetupWizard } from '@/components/botonera/BotoneraSetupWizard';
import { BotoneraVideoPlayer, toEmbedUrl } from '@/components/botonera/BotoneraVideoPlayer';
import { BotoneraLiveStats } from '@/components/botonera/BotoneraLiveStats';
import { BotoneraStopwatch, PERIOD_BASE_SECONDS } from '@/components/botonera/BotoneraStopwatch';
import { BotoneraEventModal } from '@/components/botonera/BotoneraEventModal';
import { BotoneraLiveScoreboard } from '@/components/botonera/BotoneraLiveScoreboard';
import { AnalysisVisor } from '@/components/analysis/AnalysisVisor';
import { Compass, Flame, Sliders, PlayCircle, Trophy, CheckCircle2, FileCode2, Save, Radio, Pencil, Ban, X, Home, FolderOpen, Eye, Edit3, Trash2, AlertTriangle, User, Video } from 'lucide-react';

/**
 * Calculates features string for window.open to ensure the pop-out window
 * is centered on the user's active monitor screen.
 */
function getCenteredPopUpFeatures(w = 1024, h = 600) {
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

export default function BotoneraPage() {
  // Page Main Operating Mode: null (landing / sin elegir) | 'analysis' (etiquetado en vivo) | 'edit' (configurar pizarras)
  const [pageMode, setPageMode] = useState<'analysis' | 'edit' | null>(null);

  // Database Data
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('free_session');

  // Saved Analyses & Visor modal state
  const [savedAnalyses, setSavedAnalyses] = useState<MatchAnalysis[]>([]);
  const [activeVisorAnalysis, setActiveVisorAnalysis] = useState<MatchAnalysis | null>(null);
  const [deleteConfirmAnalysis, setDeleteConfirmAnalysis] = useState<MatchAnalysis | null>(null);
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);

  // Botonera Template State (Static initial state for SSR / Hydration safety)
  const [template, setTemplate] = useState<BotoneraTemplate>(SEED_BOTONERA_TEMPLATES[0]);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [period, setPeriod] = useState<number>(1);

  // Event Tagging Modal State
  const [eventModalData, setEventModalData] = useState<{
    button: BotoneraButton;
    activeDescriptors: string[];
    clickTimestamp: number;
    clickPeriod: number;
  } | null>(null);

  // Active Player State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Live Tagged Events List
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  // Registro colaborativo: analista autenticado + otros analistas conectados al mismo partido
  const { user, profile } = useAuth();
  const [connectedAnalysts, setConnectedAnalysts] = useState<{ userId: string; userName: string }[]>([]);
  // IDs de eventos que este mismo cliente acaba de escribir, para no re-aplicarlos cuando
  // los recibimos de vuelta por el canal realtime (eco de nuestra propia escritura)
  const ownWritesRef = useRef<Set<string>>(new Set());

  // Registration Setup Wizard State & Pop-out Video mode
  const [isSessionConfigured, setIsSessionConfigured] = useState<boolean>(false);
  const [videoType, setVideoType] = useState<BotoneraProjectVideoType | null>(null);
  const [videoSourceName, setVideoSourceName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isVideoPoppedOut, setIsVideoPoppedOut] = useState<boolean>(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState<boolean>(false);

  // --- Video-to-Match Sync ---
  // Stores the video currentTime (seconds) at the moment PLAY is first pressed for each period.
  // Key = period number (1, 2, 3, 4), Value = video time in seconds when that period started.
  const [periodVideoOffsets, setPeriodVideoOffsets] = useState<Record<number, number>>({});
  // Ref to the HTML <video> element exposed by BotoneraVideoPlayer (null for YouTube iframes)
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  // Ref to the YouTube <iframe> element (null for local video)
  const iframeElementRef = useRef<HTMLIFrameElement | null>(null);
  // Last known currentTime (seconds) of the YouTube player, updated via postMessage listener.
  // Used to capture the video position when PLAY is pressed on the stopwatch.
  const youtubeCurrentTimeRef = useRef<number>(0);
  // Play/pausa conocido del reproductor de enlace, por si la API no lo da fiable
  const youtubeIsPlayingRef = useRef<boolean>(false);
  // Same elements kept in state so the sync effects re-run when the player mounts/unmounts
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);

  // Blob URL del vídeo local: lo crea la página, no el reproductor, porque la
  // ventana emergente también lo usa y debe sobrevivir al desmontaje del <video>
  // incrustado al cambiar de layout.
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (videoType === 'local' && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setLocalObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLocalObjectUrl(null);
  }, [videoType, videoFile]);

  // --- Vídeo en ventana externa ("Sacar Ventana") ---------------------------
  // La ventana la abre y la vigila la página: el reproductor incrustado se
  // desmonta al reordenarse el layout, así que no puede ser él quien recuerde
  // por dónde iba el vídeo ni quien mantenga el crono atado a la reproducción.
  const popoutWinRef = useRef<Window | null>(null);
  const popoutMonitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoutIframeWinRef = useRef<Window | null>(null);
  const popoutStateRef = useRef<{ time: number; playing: boolean }>({ time: 0, playing: false });
  const popoutHasSignalRef = useRef(false);
  const [popoutHasSignal, setPopoutHasSignal] = useState(false);
  // Minuto (y estado) con el que el reproductor incrustado debe re-arrancar al volver
  const [embeddedResume, setEmbeddedResume] = useState<{ at: number; play: boolean } | null>(null);
  // True once the YouTube player has answered the 'listening' handshake with real
  // playback telemetry. Until then the chrono keeps its own clock as a fallback.
  const [hasYouTubeSignal, setHasYouTubeSignal] = useState(false);
  const hasYouTubeSignalRef = useRef(false);

  // --- Chrono ↔ Video coupling ---------------------------------------------
  // Once the current period has its start captured, the chrono stops running on its
  // own clock and becomes a projection of the video playhead:
  //   matchTime = (videoTime - periodVideoOffsets[period]) + PERIOD_BASE_SECONDS[period]
  // so pausing, rewinding or forwarding the video moves the chrono with it.
  const periodBase = PERIOD_BASE_SECONDS[period] ?? 0;
  const hasVideoSync = Object.keys(periodVideoOffsets).length > 0;
  // videoEl also points at the pop-out window's <video> while the video is on a
  // second monitor, so the coupling survives "Sacar Ventana".
  // La ventana externa cuenta como reproductor: con el vídeo en otro monitor el
  // crono sigue proyectando su playhead.
  const isVideoDriven = hasVideoSync && (!!videoEl || (!!iframeEl && hasYouTubeSignal) || popoutHasSignal);

  // YouTube IFrame Player API instance (null for local video / until it is ready)
  const ytPlayerRef = useRef<any>(null);

  const determinePeriodFromVideoTime = (videoTime: number): number | null => {
    const p4 = periodVideoOffsets[4];
    const p3 = periodVideoOffsets[3];
    const p2 = periodVideoOffsets[2];
    const p1 = periodVideoOffsets[1];

    if (p4 != null && videoTime >= p4) return 4;
    if (p3 != null && videoTime >= p3) return 3;
    if (p2 != null && videoTime >= p2) return 2;
    if (p1 != null && videoTime >= p1) return 1;
    if (p1 != null) return 1;
    return null;
  };

  const matchTimeFromVideoTime = (videoTime: number, activeP: number = period): number | null => {
    const offset = periodVideoOffsets[activeP];
    if (offset === undefined) return null;
    const base = PERIOD_BASE_SECONDS[activeP] ?? 0;
    return Math.max(0, Math.floor(videoTime - offset + base));
  };

  const videoTimeFromMatchTime = (matchSeconds: number): number | null => {
    const offset = periodVideoOffsets[period];
    if (offset === undefined) return null;
    return Math.max(0, offset + (matchSeconds - periodBase));
  };

  /** Live playhead of the attached player (local exact, YouTube via postMessage telemetry). */
  const getCurrentVideoTime = (): number => {
    if (videoElementRef.current) return videoElementRef.current.currentTime;
    // Enlace sacado a otra ventana: el playhead lo reporta esa ventana.
    if (popoutIframeWinRef.current) return popoutStateRef.current.time;
    const apiTime = ytPlayerRef.current?.getCurrentTime?.();
    const streamTime = youtubeCurrentTimeRef.current;
    // Un 0 de la API mientras el flujo de mensajes reporta otro minuto significa
    // que la API no está enganchada del todo: ese 0 abría la ventana emergente
    // al principio del vídeo en vez de por donde iba.
    if (typeof apiTime === 'number' && Number.isFinite(apiTime) && (apiTime > 0 || streamTime <= 0)) {
      return apiTime;
    }
    // Último recurso: con el crono ligado al vídeo, el minutaje que se ve en pantalla
    // ya es una proyección fiel del playhead, así que sirve para volver a él.
    if (streamTime <= 0 && isVideoDriven) {
      const fromChrono = videoTimeFromMatchTime(timerSeconds);
      if (fromChrono !== null) return fromChrono;
    }
    return streamTime;
  };

  /** True/false if we can read the player, null when there is no player attached. */
  const getVideoIsPlaying = (): boolean | null => {
    if (videoElementRef.current) return !videoElementRef.current.paused;
    if (popoutIframeWinRef.current) return popoutStateRef.current.playing;
    const state = ytPlayerRef.current?.getPlayerState?.();
    // -1 (sin empezar) tras haber recibido telemetría real = API sin enganchar
    if (typeof state === 'number' && state !== -1) return state === 1; // 1 = PLAYING
    if (hasYouTubeSignalRef.current) return youtubeIsPlayingRef.current;
    return null;
  };

  /** Moves the attached player (local <video> or YouTube iframe) to a video time. */
  const seekVideoTo = (videoTime: number, alsoPlay = false) => {
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = videoTime;
      if (alsoPlay && videoElementRef.current.paused) videoElementRef.current.play().catch(() => {});
    } else if (popoutIframeWinRef.current) {
      const win = popoutIframeWinRef.current;
      win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [videoTime, true] }), '*');
      if (alsoPlay) win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } else if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(videoTime, true);
      if (alsoPlay) ytPlayerRef.current.playVideo?.();
    } else if (iframeElementRef.current?.contentWindow) {
      const win = iframeElementRef.current.contentWindow;
      win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [videoTime, true] }), '*');
      if (alsoPlay) win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }
  };

  /** Starts/stops the attached player without touching the chrono state. */
  const setVideoPlaying = (playing: boolean) => {
    if (videoElementRef.current) {
      if (playing) videoElementRef.current.play().catch(() => {});
      else videoElementRef.current.pause();
    } else if (popoutIframeWinRef.current) {
      popoutIframeWinRef.current.postMessage(
        JSON.stringify({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo', args: [] }),
        '*'
      );
    } else if (ytPlayerRef.current?.playVideo) {
      if (playing) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo?.();
    } else if (iframeElementRef.current?.contentWindow) {
      iframeElementRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo', args: [] }),
        '*'
      );
    }
  };

  // Mirrors of the coupling state, read by the (globally registered) YouTube message listener
  const videoDrivenRef = useRef(false);
  const periodRef = useRef(period);
  const periodVideoOffsetsRef = useRef(periodVideoOffsets);
  const isTimerRunningRef = useRef(isTimerRunning);
  useEffect(() => {
    videoDrivenRef.current = isVideoDriven;
    periodRef.current = period;
    periodVideoOffsetsRef.current = periodVideoOffsets;
    isTimerRunningRef.current = isTimerRunning;
  }, [isVideoDriven, period, periodVideoOffsets, isTimerRunning]);

  // Última lectura del playhead aceptada como buena, usada para detectar ruido.
  const lastGoodVideoTimeRef = useRef(0);
  const zeroSampleStreakRef = useRef(0);
  // La API del iframe manda mientras dé lecturas creíbles; si se queda clavada
  // en 0 (aún no está lista) conduce el stream de infoDelivery.
  const isYouTubeApiHealthyRef = useRef(false);

  /**
   * Único punto que proyecta el playhead del vídeo sobre el crono de partido.
   * Calcula el tiempo transcurrido en la parte activa: (videoTime - periodVideoOffset).
   *
   * `trusted` salta el filtro de ruido (playhead de un <video> local, exacto).
   */
  const applyVideoTime = useCallback((videoTime: number, trusted = false) => {
    if (typeof videoTime !== 'number' || !Number.isFinite(videoTime) || videoTime < 0) return;

    // Un 0 suelto con el vídeo ya avanzado es ruido del reproductor, no un salto
    // al principio: solo se acepta si se repite en varias lecturas seguidas.
    if (!trusted && videoTime < 0.05 && lastGoodVideoTimeRef.current > 1) {
      zeroSampleStreakRef.current += 1;
      if (zeroSampleStreakRef.current < 3) return;
    } else {
      zeroSampleStreakRef.current = 0;
    }
    lastGoodVideoTimeRef.current = videoTime;

    const offsets = periodVideoOffsetsRef.current;
    const currentP = periodRef.current;
    let detectedP: number | null = null;

    if (offsets[4] != null && videoTime >= offsets[4]) detectedP = 4;
    else if (offsets[3] != null && videoTime >= offsets[3]) detectedP = 3;
    else if (offsets[2] != null && videoTime >= offsets[2]) detectedP = 2;
    else if (offsets[1] != null && videoTime >= offsets[1]) detectedP = 1;
    else if (offsets[1] != null) detectedP = 1;

    const activeP = detectedP ?? currentP;
    if (detectedP !== null && detectedP !== currentP) {
      periodRef.current = detectedP;
      setPeriod(detectedP);
    }

    const offset = offsets[activeP];
    if (offset === undefined) return;

    const matchTime = Math.max(0, Math.floor(videoTime - offset));
    setTimerSeconds((prev) => (prev === matchTime ? prev : matchTime));
  }, []);

  // Load Initial Data & Restore Active Tagging Session from Supabase / dbStore
  useEffect(() => {
    const init = async () => {
      const loadedMatches = dbStore.getMatches();
      const loadedPlayers = dbStore.getPlayers();
      setMatches(loadedMatches);
      setPlayers(loadedPlayers);

      // 1. Sync templates from Supabase
      const templates = await dbStore.syncBotoneraTemplatesFromSupabase();
      if (templates && templates.length > 0) {
        setTemplate(templates[0]);
      }

      // Sync saved analyses from Supabase
      const loadedAnalyses = await dbStore.syncAnalysesFromSupabase();
      if (loadedAnalyses && loadedAnalyses.length > 0) {
        setSavedAnalyses(loadedAnalyses);
      } else {
        setSavedAnalyses(dbStore.getAnalyses());
      }

      // Check URL query parameters for match_id & analysis_id & mode
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const urlMatchId = urlParams?.get('match_id') || undefined;
      const urlAnalysisId = urlParams?.get('analysis_id') || undefined;
      const urlMode = urlParams?.get('mode') || undefined;

      if (urlAnalysisId) {
        const targetAnalysis = dbStore.getAnalysisById(urlAnalysisId);
        if (targetAnalysis) {
          if (urlMode === 'tag') {
            handleEditAnalysisInBotonera(targetAnalysis);
          } else {
            setActiveVisorAnalysis(targetAnalysis);
          }
          return;
        }
      }

      if (urlMatchId && urlMode !== 'tag') {
        const existingAns = dbStore.getAnalyses(urlMatchId);
        const matchObj = dbStore.getMatchById(urlMatchId);
        const matchEvs = dbStore.getNormalizedEvents(urlMatchId);

        if (existingAns && existingAns.length > 0) {
          setActiveVisorAnalysis(existingAns[0]);
          return;
        } else if (matchObj) {
          const fallbackAnalysis: MatchAnalysis = {
            id: `analysis_${matchObj.id}`,
            match_id: matchObj.id,
            title: `Análisis ${matchObj.home_team} vs ${matchObj.away_team}`,
            analyst_name: 'Analista Principal (SAO)',
            status: 'completed' as const,
            video_type: matchObj.video_type || (matchObj.video_url ? (matchObj.video_url.includes('http') ? 'link' : 'local') : undefined),
            video_url: matchObj.video_url,
            video_source_name: matchObj.video_source_name,
            p1_video_start_time: matchObj.p1_video_start_time,
            p2_video_start_time: matchObj.p2_video_start_time,
            events: matchEvs,
            created_at: matchObj.date || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setActiveVisorAnalysis(fallbackAnalysis);
          return;
        }
      }

      // 2. Sync active session from Supabase (specifically for urlMatchId if provided)
      const activeSession = await dbStore.syncActiveSessionFromSupabase(urlMatchId);

      if (activeSession) {
        if (activeSession.selectedMatchId) {
          setSelectedMatchId(activeSession.selectedMatchId);
        }
        if (activeSession.period) {
          setPeriod(activeSession.period);
        }
        if (activeSession.events && activeSession.events.length > 0) {
          setEvents(activeSession.events);
        }

        // Restore video start offsets for 1st and 2nd halves from Supabase / active session
        const offsets: Record<number, number> = {};
        if (activeSession.p1VideoStartSeconds != null) offsets[1] = activeSession.p1VideoStartSeconds;
        if (activeSession.p2VideoStartSeconds != null) offsets[2] = activeSession.p2VideoStartSeconds;
        setPeriodVideoOffsets(offsets);

        if (activeSession.isTimerRunning && activeSession.startTimestamp) {
          const elapsed = Math.max(0, Math.floor((Date.now() - activeSession.startTimestamp) / 1000));
          setTimerSeconds(elapsed);
          setIsTimerRunning(true);
        } else {
          setTimerSeconds(activeSession.timerSeconds || 0);
          setIsTimerRunning(false);
        }

        if (activeSession.isConfigured) {
          setIsSessionConfigured(true);
          setVideoType(activeSession.videoType || 'link');
          setVideoSourceName(activeSession.videoSourceName || null);
          setVideoUrl(activeSession.videoUrl || null);
          if (activeSession.botoneraTemplateId && templates && templates.length > 0) {
            const savedTemplate = templates.find((t) => t.id === activeSession.botoneraTemplateId);
            if (savedTemplate) setTemplate(savedTemplate);
          }
          setPageMode('analysis');
        }
      } else if (urlMatchId) {
        // If no existing session found for urlMatchId, select it in the wizard
        handleSelectMatch(urlMatchId);
      }
    };

    init();
  }, []);

  // Registro colaborativo en vivo: cargar eventos ya registrados por cualquier analista para
  // este partido y suscribirse a los cambios en directo (inserciones/ediciones/borrados de
  // otros analistas) + presencia (quién más está conectado ahora mismo).
  useEffect(() => {
    if (!selectedMatchId || selectedMatchId === 'free_session') {
      setConnectedAnalysts([]);
      return;
    }

    let cancelled = false;

    getAnalysisEventsFromSupabase(selectedMatchId).then((remoteEvents) => {
      if (cancelled || remoteEvents.length === 0) return;
      setEvents((prev) => {
        const prevIds = new Set(prev.map((e) => e.event_id));
        const newOnes = remoteEvents.filter((e) => !prevIds.has(e.event_id));
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev];
      });
    });

    const unsubscribeEvents = subscribeToAnalysisEvents(selectedMatchId, {
      onInsert: (evt) => {
        if (ownWritesRef.current.has(evt.event_id)) {
          ownWritesRef.current.delete(evt.event_id);
          return;
        }
        setEvents((prev) => (prev.some((e) => e.event_id === evt.event_id) ? prev : [evt, ...prev]));
      },
      onUpdate: (evt) => {
        if (ownWritesRef.current.has(evt.event_id)) {
          ownWritesRef.current.delete(evt.event_id);
          return;
        }
        setEvents((prev) => prev.map((e) => (e.event_id === evt.event_id ? evt : e)));
      },
      onDelete: (eventId) => {
        if (!eventId) return;
        if (ownWritesRef.current.has(eventId)) {
          ownWritesRef.current.delete(eventId);
          return;
        }
        setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
      },
    });

    const unsubscribePresence = user
      ? subscribeToAnalysisPresence(
          selectedMatchId,
          { userId: user.id, userName: profile?.full_name || user.email || 'Analista' },
          (analysts) => setConnectedAnalysts(analysts)
        )
      : () => {};

    return () => {
      cancelled = true;
      unsubscribeEvents();
      unsubscribePresence();
    };
  }, [selectedMatchId, user, profile]);

  // Keep app-wide navigation lock in sync with the recording session state
  useEffect(() => {
    setRecordingLocked(pageMode === 'analysis' && isSessionConfigured);
    return () => setRecordingLocked(false);
  }, [pageMode, isSessionConfigured]);

  // Background Timer Tick Interval Engine.
  // Only used while the chrono is NOT slaved to the video (no sync captured yet,
  // video popped out, or no video at all) — otherwise the video playhead drives it.
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isVideoDriven) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isVideoDriven]);

  // Local <video>: the chrono follows play / pause / seek / rate of the player cleanly.
  useEffect(() => {
    if (!isVideoDriven || !videoEl) return;

    // El <video> local es fuente exacta: se aplica sin filtro de ruido.
    const syncFromVideo = () => applyVideoTime(videoEl.currentTime, true);
    const handlePlay = () => { syncFromVideo(); setIsTimerRunning(true); };
    const handlePause = () => { syncFromVideo(); setIsTimerRunning(false); };

    videoEl.addEventListener('timeupdate', syncFromVideo);
    videoEl.addEventListener('seeking', syncFromVideo);
    videoEl.addEventListener('seeked', syncFromVideo);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('playing', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handlePause);

    // Align immediately with whatever the player is doing right now
    syncFromVideo();
    setIsTimerRunning(!videoEl.paused);

    return () => {
      videoEl.removeEventListener('timeupdate', syncFromVideo);
      videoEl.removeEventListener('seeking', syncFromVideo);
      videoEl.removeEventListener('seeked', syncFromVideo);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('playing', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handlePause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoDriven, videoEl, applyVideoTime]);

  // YouTube: el crono sigue al reproductor vía IFrame Player API.
  // El handshake por postMessage a pelo se pierde si el iframe aún no está listo
  // (y entonces el crono deja de seguir al vídeo sin avisar); la API oficial da
  // eventos fiables de play/pause/seek y getCurrentTime().
  useEffect(() => {
    if (videoType !== 'link' || !iframeEl) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const readTime = () => {
      const time = ytPlayerRef.current?.getCurrentTime?.();
      if (typeof time !== 'number' || Number.isNaN(time)) return;
      // Mientras el player no está del todo listo getCurrentTime() puede devolver
      // 0 de forma persistente: ahí la fuente buena es el stream de infoDelivery.
      const looksStuckAtZero =
        time < 0.05 && (lastGoodVideoTimeRef.current > 1 || youtubeCurrentTimeRef.current > 1);
      isYouTubeApiHealthyRef.current = !looksStuckAtZero;
      // Sin esto el poll machacaba cuatro veces por segundo el último minuto bueno,
      // y con él se iban "Marcar aquí", el saque inicial y la ventana emergente.
      if (looksStuckAtZero) return;
      youtubeCurrentTimeRef.current = time;
      const state = ytPlayerRef.current?.getPlayerState?.();
      if (typeof state === 'number' && state !== -1) youtubeIsPlayingRef.current = state === 1;
      if (videoDrivenRef.current) applyVideoTime(time);
    };

    const attachPlayer = () => {
      const YT = (window as any).YT;
      if (cancelled || !YT?.Player || ytPlayerRef.current) return;

      ytPlayerRef.current = new YT.Player(iframeEl, {
        events: {
          onReady: () => {
            if (cancelled) return;
            hasYouTubeSignalRef.current = true;
            setHasYouTubeSignal(true);
            readTime();
          },
          onStateChange: (event: any) => {
            if (cancelled) return;
            readTime();
            // Sin el inicio de la parte marcado el crono es manual: buscar el
            // saque inicial moviendo el vídeo no debe arrancarlo.
            if (!videoDrivenRef.current) return;
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (event.data === 1) setIsTimerRunning(true);
            else if (event.data === 2 || event.data === 0) setIsTimerRunning(false);
          },
        },
      });

      poll = setInterval(readTime, 250);
    };

    if ((window as any).YT?.Player) {
      attachPlayer();
    } else {
      const previousCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        attachPlayer();
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
      if (poll) clearInterval(poll);
      // No llamamos a player.destroy(): eliminaría el <iframe> que React controla.
      ytPlayerRef.current = null;
      isYouTubeApiHealthyRef.current = false;
    };
  }, [videoType, iframeEl, applyVideoTime]);

  // Sync Active Tagging Session State to LocalStorage / dbStore / Supabase
  useEffect(() => {
    const startTimestamp = isTimerRunning
      ? (dbStore.getActiveBotoneraSession()?.startTimestamp || Date.now() - timerSeconds * 1000)
      : null;

    dbStore.saveActiveBotoneraSession({
      selectedMatchId,
      period,
      timerSeconds,
      isTimerRunning,
      startTimestamp,
      lastUpdatedTimestamp: Date.now(),
      events,
      isConfigured: isSessionConfigured,
      videoType,
      videoSourceName,
      videoUrl,
      p1VideoStartSeconds: periodVideoOffsets[1] ?? null,
      p2VideoStartSeconds: periodVideoOffsets[2] ?? null,
      botoneraTemplateId: template?.id || null,
    });
  }, [
    timerSeconds,
    isTimerRunning,
    period,
    selectedMatchId,
    events.length,
    isSessionConfigured,
    videoType,
    videoSourceName,
    videoUrl,
    periodVideoOffsets,
    template,
  ]);

  const handleStartNewRegistration = () => {
    if (isSessionConfigured || events.length > 0) {
      const ok = confirm(
        '¿Deseas iniciar una NUEVA sesión de registro desde cero? Se configurará una nueva sesión limpia.'
      );
      if (!ok) return;
    }

    dbStore.clearActiveBotoneraSession();
    setIsSessionConfigured(false);
    setEditingAnalysisId(null);
    setEvents([]);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setPeriod(1);
    setPeriodVideoOffsets({});
    setSelectedPlayerId(null);
    setVideoType(null);
    setVideoSourceName(null);
    setVideoUrl(null);
    setVideoFile(null);

    setPageMode('analysis');
  };

  const handleSetupComplete = (config: {
    videoType: BotoneraProjectVideoType;
    videoSourceName: string | null;
    videoUrl: string | null;
    videoFile: File | null;
    matchId: string;
    templateId: string;
  }) => {
    // Reset all old session/analysis states so this NEW project starts 100% clean
    dbStore.clearActiveBotoneraSession(config.matchId);
    setEditingAnalysisId(null);
    setEvents([]);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setPeriod(1);
    setPeriodVideoOffsets({});
    setSelectedPlayerId(null);

    setSelectedMatchId(config.matchId);
    setVideoType(config.videoType);
    setVideoSourceName(config.videoSourceName);
    setVideoUrl(config.videoUrl);
    setVideoFile(config.videoFile);

    const chosenTemplate = dbStore.getBotoneraTemplates().find((t) => t.id === config.templateId);
    if (chosenTemplate) setTemplate(chosenTemplate);

    setIsSessionConfigured(true);
  };

  const handleEndSession = () => {
    if (events.length > 0) {
      const ok = confirm(
        '¿Deseas finalizar y guardar este registro en directo? Se creará una tarjeta de análisis permanente en Supabase con todos tus eventos.'
      );
      if (!ok) return;

      // Save events, match status and permanent Match Analysis card
      handleSaveToMatch();

      // Refresh list of saved analyses from DB
      setSavedAnalyses(dbStore.getAnalyses());
    } else {
      const ok = confirm('¿Finalizar la sesión de etiquetado?');
      if (!ok) return;
    }

    // Reset session states & transition back to Botonera Landing Dashboard
    setIsTimerRunning(false);
    setIsSessionConfigured(false);
    setPageMode(null);
    setEvents([]);
    setVideoType(null);
    setVideoSourceName(null);
    setVideoUrl(null);
    setVideoFile(null);
    if (popoutWinRef.current) closeVideoPopOut();
    setIsVideoPoppedOut(false);
    setEditingAnalysisId(null);
  };

  // Prevent accidental tab closing when match recording is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTimerRunning || events.length > 0) {
        e.preventDefault();
        e.returnValue = 'Tienes una sesión de etiquetado en directo activa. ¿Seguro que deseas salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTimerRunning, events.length]);

  // Listen to YouTube iframe postMessage events to keep youtubeCurrentTimeRef updated.
  // YouTube sends 'infoDelivery' messages with currentTime when the player is playing or seeked.
  // We also send a 'listening' command to the iframe to trigger these updates.
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
        if (!data) return;
        // YouTube infoDelivery: carries currentTime and playerState
        if (data.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          youtubeCurrentTimeRef.current = data.info.currentTime;
          if (!hasYouTubeSignalRef.current) {
            hasYouTubeSignalRef.current = true;
            setHasYouTubeSignal(true);
          }

          // La API del iframe es la fuente principal del crono: aquí solo se
          // conduce cuando esa API no está dando lecturas válidas, para que no
          // haya dos escritores del minutaje a la vez (era la causa del parpadeo).
          if (videoDrivenRef.current && !isYouTubeApiHealthyRef.current) {
            applyVideoTime(data.info.currentTime);
          }
        }
        // Player state: 1 = playing, 2 = paused, 0 = ended
        if (data.event === 'infoDelivery' && typeof data.info?.playerState === 'number') {
          youtubeIsPlayingRef.current = data.info.playerState === 1;
        }
        if (data.event === 'infoDelivery' && typeof data.info?.playerState === 'number' && videoDrivenRef.current) {
          const state = data.info.playerState;
          if (state === 1) setIsTimerRunning(true);
          else if (state === 2 || state === 0) setIsTimerRunning(false);
        }
        // Re-suscribirse solo cuando el player (re)inicializa. Antes también se
        // reenviaba en cada onStateChange (info === 1), y cada handshake nuevo
        // provocaba un volcado de estado inicial con currentTime 0.
        if (data.event === 'onReady') {
          // Re-subscribe when player re-initializes
          iframeElementRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening' }), '*'
          );
        }
      } catch {
        // Non-JSON messages from other sources — ignore
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [applyVideoTime]);

  // When the iframe ref is first set, tell YouTube to start broadcasting infoDelivery messages
  const handleIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeElementRef.current = el;
    setIframeEl(el);
    if (!el) {
      hasYouTubeSignalRef.current = false;
      setHasYouTubeSignal(false);
    }
    if (el?.contentWindow) {
      // Small delay to let the iframe finish its initial handshake
      setTimeout(() => {
        el.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }, 500);
    }
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [isEditVideoModalOpen, setIsEditVideoModalOpen] = useState(false);
  const [editVideoType, setEditVideoType] = useState<BotoneraProjectVideoType>('link');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    const existingAnalyses = dbStore.getAnalyses(matchId);
    if (existingAnalyses.length > 0) {
      setEditingAnalysisId(existingAnalyses[0].id);
    }
    if (matchId !== 'free_session') {
      const matchEvents = dbStore.getNormalizedEvents(matchId);
      setEvents(matchEvents);

      const targetMatch = dbStore.getMatchById(matchId);
      if (targetMatch) {
        if (targetMatch.video_type) setVideoType(targetMatch.video_type);
        if (targetMatch.video_url) setVideoUrl(targetMatch.video_url);
        if (targetMatch.video_source_name) setVideoSourceName(targetMatch.video_source_name);

        const offsets: Record<number, number> = {};
        if (targetMatch.p1_video_start_time != null) offsets[1] = targetMatch.p1_video_start_time;
        if (targetMatch.p2_video_start_time != null) offsets[2] = targetMatch.p2_video_start_time;
        setPeriodVideoOffsets(offsets);

        if (targetMatch.botonera_template_id) {
          const t = dbStore.getBotoneraTemplates().find((x) => x.id === targetMatch.botonera_template_id);
          if (t) setTemplate(t);
        }

        if (targetMatch.video_type || targetMatch.p1_video_start_time != null || matchEvents.length > 0) {
          setIsSessionConfigured(true);
        }
      }
    } else {
      setEvents([]);
    }
  };

  const handleEditAnalysisInBotonera = (an: MatchAnalysis) => {
    setEditingAnalysisId(an.id);
    setSelectedMatchId(an.match_id);
    setEvents(an.events || []);

    const targetMatch = dbStore.getMatchById(an.match_id) || matches.find((m) => m.id === an.match_id);

    // Resolve Video Settings (analysis video -> match video fallback -> 'link')
    const resolvedVideoUrl = an.video_url || targetMatch?.video_url || null;
    const resolvedVideoType =
      an.video_type ||
      targetMatch?.video_type ||
      (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : 'link');
    const resolvedVideoSourceName =
      an.video_source_name || targetMatch?.video_source_name || (resolvedVideoUrl ? 'Vídeo Vincular' : 'Vídeo del Partido');

    setVideoType(resolvedVideoType);
    setVideoSourceName(resolvedVideoSourceName);
    setVideoUrl(resolvedVideoUrl);

    // Resolve Video Offsets (1ª parte / 2ª parte)
    const offsets: Record<number, number> = {};
    const p1 = an.p1_video_start_time ?? targetMatch?.p1_video_start_time;
    const p2 = an.p2_video_start_time ?? targetMatch?.p2_video_start_time;
    if (p1 != null) offsets[1] = p1;
    if (p2 != null) offsets[2] = p2;
    setPeriodVideoOffsets(offsets);

    // Resolve Botonera Template (analysis template -> match template -> first template in DB -> SEED_BOTONERA_TEMPLATES[0])
    const allTemplates = dbStore.getBotoneraTemplates();
    let matchedTemplate: BotoneraTemplate | undefined;

    if (an.botonera_template_id) {
      matchedTemplate = allTemplates.find((t) => t.id === an.botonera_template_id);
    }
    if (!matchedTemplate && targetMatch?.botonera_template_id) {
      matchedTemplate = allTemplates.find((t) => t.id === targetMatch.botonera_template_id);
    }
    if (!matchedTemplate && allTemplates.length > 0) {
      matchedTemplate = allTemplates[0];
    }
    if (!matchedTemplate && SEED_BOTONERA_TEMPLATES.length > 0) {
      matchedTemplate = SEED_BOTONERA_TEMPLATES[0];
    }
    if (matchedTemplate) {
      setTemplate(matchedTemplate);
    }

    setIsSessionConfigured(true);
    setPageMode('analysis');
  };

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoElementRef.current = el;
    setVideoEl(el);
  }, []);

  const stopPopoutMonitor = () => {
    if (popoutMonitorRef.current) {
      clearInterval(popoutMonitorRef.current);
      popoutMonitorRef.current = null;
    }
  };

  /**
   * Devuelve el control a la página: el reproductor incrustado volverá a montarse
   * en el minuto en el que se quedó la ventana externa (y reproduciendo si lo estaba).
   */
  const finishVideoPopOut = () => {
    stopPopoutMonitor();
    popoutWinRef.current = null;
    popoutIframeWinRef.current = null;
    popoutHasSignalRef.current = false;
    setPopoutHasSignal(false);
    // Suelta el <video> de la ventana externa; el crono se reatará al incrustado.
    if (videoElementRef.current) handleVideoRef(null);
    setEmbeddedResume({ at: popoutStateRef.current.time, play: popoutStateRef.current.playing });
    setIsVideoPoppedOut(false);
  };

  /** Vigila la ventana externa: playhead, play/pausa y cierre manual. */
  const startPopoutMonitor = () => {
    stopPopoutMonitor();
    popoutMonitorRef.current = setInterval(() => {
      const win = popoutWinRef.current;
      if (!win || win.closed) {
        finishVideoPopOut();
        return;
      }
      try {
        const popupVideo = win.document.querySelector('video');
        if (popupVideo) {
          popoutStateRef.current = { time: popupVideo.currentTime, playing: !popupVideo.paused };
          // La ventana es del mismo origen (la escribimos nosotros), así que el
          // crono puede atarse a su <video> igual que al reproductor incrustado.
          if (videoElementRef.current !== popupVideo) handleVideoRef(popupVideo);
          return;
        }

        const popupIframe = win.document.querySelector('iframe');
        if (!popupIframe) return;
        popoutIframeWinRef.current = popupIframe.contentWindow;

        const time = (win as any).__saoVideoTime;
        const playing = !!(win as any).__saoVideoPlaying;
        if (typeof time !== 'number' || !Number.isFinite(time)) return;

        popoutStateRef.current = { time, playing };
        youtubeCurrentTimeRef.current = time;
        if (!popoutHasSignalRef.current) {
          popoutHasSignalRef.current = true;
          setPopoutHasSignal(true);
        }
        if (videoDrivenRef.current) {
          applyVideoTime(time);
          setIsTimerRunning((prev) => (prev === playing ? prev : playing));
        }
      } catch {
        // La ventana se está cerrando o todavía no ha escrito su documento.
      }
    }, 200);
  };

  /** "Sacar Ventana": saca el vídeo a una ventana aparte en el minuto exacto que llevaba en la página. */
  const openVideoPopOut = () => {
    if (!videoType || videoType === 'none') return;

    const startAt = Math.max(0, getCurrentVideoTime());
    const wasPlaying = getVideoIsPlaying() ?? false;
    const title = (videoSourceName || 'Vídeo del Partido').replace(/[<>&"]/g, '');

    let body: string | null = null;
    if (videoType === 'local' && localObjectUrl) {
      body = `
        <video id="v" src="${localObjectUrl}" controls></video>
        <script>
          const v = document.getElementById('v');
          const startAt = ${startAt};
          const seek = () => { if (Math.abs(v.currentTime - startAt) > 0.5) v.currentTime = startAt; };
          v.addEventListener('loadedmetadata', () => {
            seek();
            ${wasPlaying ? 'v.play().catch(() => {});' : ''}
          });
          seek();
        </script>`;
    } else if (videoType === 'link' && videoUrl) {
      let embedUrl = toEmbedUrl(videoUrl);
      try {
        const url = new URL(embedUrl);
        url.searchParams.set('start', String(Math.floor(startAt)));
        if (wasPlaying) url.searchParams.set('autoplay', '1');
        embedUrl = url.toString();
      } catch {
        // URL rara: se abre igualmente desde el principio
      }
      // La ventana publica su playhead en window.__saoVideoTime; la página lo lee
      // cada 200 ms para mantener el crono sincronizado y para saber por dónde
      // reanudar cuando el vídeo vuelva a acoplarse. Igual que en la página, la
      // fuente principal es la API IFrame y el handshake 'listening' es el
      // respaldo por si esa API no llega a cargar.
      body = `
        <iframe id="yt" src="${embedUrl}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        <script>
          const f = document.getElementById('yt');
          window.__saoVideoTime = ${startAt};
          window.__saoVideoPlaying = ${wasPlaying};
          const setTime = (t) => {
            if (typeof t === 'number' && isFinite(t) && t > 0) window.__saoVideoTime = t;
          };

          let player = null;
          window.onYouTubeIframeAPIReady = () => {
            player = new YT.Player(f, {
              events: {
                onReady: () => {
                  setInterval(() => {
                    setTime(player.getCurrentTime && player.getCurrentTime());
                    const st = player.getPlayerState && player.getPlayerState();
                    if (typeof st === 'number') window.__saoVideoPlaying = st === 1;
                  }, 250);
                },
              },
            });
          };
          const api = document.createElement('script');
          api.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(api);

          const listen = () => {
            if (f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
          };
          [400, 1200, 2500].forEach((ms) => setTimeout(listen, ms));
          window.addEventListener('message', (e) => {
            try {
              const d = JSON.parse(e.data);
              if (d.event !== 'infoDelivery' || !d.info) return;
              setTime(d.info.currentTime);
              if (typeof d.info.playerState === 'number') {
                window.__saoVideoPlaying = d.info.playerState === 1;
              }
            } catch (err) {
              // mensajes ajenos al reproductor
            }
          });
        </script>`;
    }

    if (!body) return;

    const win = window.open('', 'sao_botonera_video', getCenteredPopUpFeatures(1024, 600));
    if (!win) {
      alert('El navegador ha bloqueado la ventana emergente. Permite las ventanas emergentes de esta página para sacar el vídeo.');
      return;
    }

    // A partir de aquí manda la ventana: el reproductor de la página se para.
    setVideoPlaying(false);

    popoutWinRef.current = win;
    popoutStateRef.current = { time: startAt, playing: wasPlaying };
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            html, body { margin:0; padding:0; background:#000; height:100%; overflow:hidden; }
            video, iframe { width:100%; height:100%; border:0; object-fit:contain; background:#000; }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `);
    win.document.close();

    setIsVideoPoppedOut(true);
    startPopoutMonitor();
  };

  /** "Acoplar Vídeo a la Página": cierra la ventana y devuelve el vídeo al hueco pequeño, donde iba. */
  const closeVideoPopOut = () => {
    const win = popoutWinRef.current;
    if (win && !win.closed) {
      try {
        const popupVideo = win.document.querySelector('video');
        if (popupVideo) {
          popoutStateRef.current = { time: popupVideo.currentTime, playing: !popupVideo.paused };
        } else if (typeof (win as any).__saoVideoTime === 'number') {
          popoutStateRef.current = {
            time: (win as any).__saoVideoTime,
            playing: !!(win as any).__saoVideoPlaying,
          };
        }
      } catch {
        // sin acceso: se usa el último estado conocido
      }
      win.close();
    }
    finishVideoPopOut();
  };

  // El reproductor incrustado congela el punto de reanudación al montarse, así que
  // se limpia acto seguido: si no, un cambio posterior de vídeo volvería a saltar
  // al minuto en el que se cerró aquella ventana.
  useEffect(() => {
    if (embeddedResume && !isVideoPoppedOut) setEmbeddedResume(null);
  }, [embeddedResume, isVideoPoppedOut]);

  // Sin esto la ventana quedaría huérfana (y su intervalo vivo) al salir de la página
  useEffect(() => () => {
    if (popoutMonitorRef.current) clearInterval(popoutMonitorRef.current);
    popoutWinRef.current?.close();
  }, []);

  /**
   * PLAY / PAUSE of the chrono also drives the video transport, so both always
   * move together. When the chrono is video-driven the player's own play/pause
   * events are the source of truth and will confirm (or correct) this state.
   */
  /** Pausa o reproduce tanto el vídeo como el cronómetro de partido desde el botón del crono. */
  const handleToggleTimer = () => {
    const isPlaying = getVideoIsPlaying();
    const willPlay = isPlaying !== null ? !isPlaying : !isTimerRunning;
    setVideoPlaying(willPlay);
    setIsTimerRunning(willPlay);
  };

  /**
   * Los botones (-10s / +10s / edición de tiempo) mueven directamente el vídeo
   * retrocediéndolo o avanzándolo, y el crono se ajusta automáticamente.
   */
  const handleTimerChange = (seconds: number, seekVideo = true) => {
    const target = Math.max(0, seconds);
    const offset = periodVideoOffsets[period];
    if (offset !== undefined) {
      seekVideoTo(offset + target, isTimerRunning);
    } else {
      seekVideoTo(Math.max(0, getCurrentVideoTime() + (seconds - timerSeconds)), isTimerRunning);
    }
    setTimerSeconds(target);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    lastGoodVideoTimeRef.current = 0;
    zeroSampleStreakRef.current = 0;
    setPeriodVideoOffsets({}); // also clear video offsets on reset
    dbStore.clearActiveBotoneraSession();
  };

  const handleUpdatePeriodOffset = (p: number, newTimeSec: number) => {
    setPeriodVideoOffsets((prev) => {
      const updatedOffsets = { ...prev, [p]: newTimeSec };

      if (selectedMatchId && selectedMatchId !== 'free_session') {
        const m = dbStore.getMatchById(selectedMatchId);
        if (m) {
          dbStore.saveMatch({
            ...m,
            p1_video_start_time: updatedOffsets[1] ?? m.p1_video_start_time ?? null,
            p2_video_start_time: updatedOffsets[2] ?? m.p2_video_start_time ?? null,
            video_type: videoType || m.video_type,
            video_url: videoUrl || m.video_url,
            video_source_name: videoSourceName || m.video_source_name,
            botonera_template_id: template?.id || m.botonera_template_id,
          });
        }
      }
      return updatedOffsets;
    });

    // Editing the start of the period being tagged re-bases the chrono right away
    if (p === period && (videoEl || iframeEl || popoutWinRef.current)) {
      const base = PERIOD_BASE_SECONDS[p] ?? 0;
      setTimerSeconds(Math.max(0, Math.floor(getCurrentVideoTime() - newTimeSec + base)));
    }
  };

  /** Removes a period start marker (chrono falls back to its own clock for that period). */
  const handleClearPeriodOffset = (p: number) => {
    setPeriodVideoOffsets((prev) => {
      const updatedOffsets = { ...prev };
      delete updatedOffsets[p];

      if (selectedMatchId && selectedMatchId !== 'free_session') {
        const m = dbStore.getMatchById(selectedMatchId);
        if (m) {
          dbStore.saveMatch({
            ...m,
            p1_video_start_time: updatedOffsets[1] ?? null,
            p2_video_start_time: updatedOffsets[2] ?? null,
          });
        }
      }
      return updatedOffsets;
    });
  };

  /** Al pulsar uno de los 4 botones de parte en el crono:
   * 1. Registra el segundo del vídeo como inicio de esa parte.
   * 2. Activa el periodo (poniendo el botón verde).
   * 3. Inicia el cronómetro desde 0 (00:00).
   * 4. Enciende el cronómetro (isTimerRunning = true).
   */
  const handlePeriodSelect = (p: number) => {
    setPeriod(p);
    const videoTime = getCurrentVideoTime();
    handleUpdatePeriodOffset(p, videoTime);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  /** "Iniciar [Periodo]": graba el minuto del vídeo como saque inicial y activa ese periodo de partido. */
  const handleCapturePeriodOffset = (p: number) => {
    setPeriod(p);
    const videoTime = getCurrentVideoTime();
    handleUpdatePeriodOffset(p, videoTime);
    const base = PERIOD_BASE_SECONDS[p] ?? 0;
    setTimerSeconds(base);
  };

  /**
   * Called by BotoneraStopwatch when the user presses PLAY (not pause).
   * Records the video's currentTime as the start offset for the current period.
   * Only records ONCE per period — pausing and resuming does NOT overwrite the offset.
   */
  const handleTimerStarted = () => {
    setPeriodVideoOffsets((prev) => {
      if (period in prev) return prev;

      const videoTime =
        videoElementRef.current?.currentTime   // local video: exact
        ?? youtubeCurrentTimeRef.current;      // YouTube: last postMessage update

      const updatedOffsets = { ...prev, [period]: videoTime };

      if (selectedMatchId && selectedMatchId !== 'free_session') {
        const m = dbStore.getMatchById(selectedMatchId);
        if (m) {
          dbStore.saveMatch({
            ...m,
            p1_video_start_time: updatedOffsets[1] ?? m.p1_video_start_time ?? null,
            p2_video_start_time: updatedOffsets[2] ?? m.p2_video_start_time ?? null,
            video_type: videoType || m.video_type,
            video_url: videoUrl || m.video_url,
            video_source_name: videoSourceName || m.video_source_name,
            botonera_template_id: template?.id || m.botonera_template_id,
          });
        }
      }
      return updatedOffsets;
    });
  };

  const handleOpenEditVideoModal = () => {
    setEditVideoType(videoType || 'link');
    setEditVideoUrl(videoUrl || '');
    setEditVideoFile(null);
    setIsEditVideoModalOpen(true);
  };

  const handleSaveVideoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setVideoType(editVideoType);
    if (editVideoType === 'link') {
      setVideoUrl(editVideoUrl);
      setVideoSourceName(null);
      setVideoFile(null);
    } else if (editVideoType === 'local' && editVideoFile) {
      setVideoFile(editVideoFile);
      setVideoSourceName(editVideoFile.name);
      setVideoUrl(URL.createObjectURL(editVideoFile));
    }

    if (selectedMatchId && selectedMatchId !== 'free_session') {
      const m = dbStore.getMatchById(selectedMatchId);
      if (m) {
        dbStore.saveMatch({
          ...m,
          video_type: editVideoType,
          video_url: editVideoType === 'link' ? editVideoUrl : m.video_url,
          video_source_name: editVideoType === 'local' && editVideoFile ? editVideoFile.name : m.video_source_name,
          p1_video_start_time: periodVideoOffsets[1] ?? m.p1_video_start_time,
          p2_video_start_time: periodVideoOffsets[2] ?? m.p2_video_start_time,
          botonera_template_id: template?.id || m.botonera_template_id,
        });
      }
    }

    setIsEditVideoModalOpen(false);
  };

  /**
   * Seeks the video to (periodOffset + eventSecondsInPeriod - 12s) and opens a centered pop-up window.
   * Called when the analyst clicks an event row in the Feed/Stats or an element in the Campograma.
   */
  const handleSeekToEvent = (evt: NormalizedEvent) => {
    const targetVideoTime = calculateEventVideoTime(evt, selectedMatch || undefined, periodVideoOffsets, 12);
    const matchTimestamp = evt.timestamp ?? (evt.minute !== null ? evt.minute * 60 + (evt.second || 0) : 0);

    // 1. Move embedded/slaved player to the target clip time
    seekVideoTo(targetVideoTime, true);

    // 2. Open centered pop-up window so the analyst can view the clip in the center of the screen
    const clipTitle = `Revisión: ${evt.category} - ${evt.player_name || 'Jugador'} (${formatTime(matchTimestamp)})`;

    if (videoType === 'local' && (localObjectUrl || videoElementRef.current?.src)) {
      const src = localObjectUrl || videoElementRef.current?.src;
      const win = window.open('', 'sao_clip_player', getCenteredPopUpFeatures(960, 560));
      if (win) {
        win.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>${clipTitle}</title>
              <style>
                html, body { margin:0; padding:0; background:#000; height:100%; overflow:hidden; }
                video { width:100%; height:100%; object-fit:contain; background:#000; }
              </style>
            </head>
            <body>
              <video id="v" src="${src}" controls autoplay></video>
              <script>
                const v = document.getElementById('v');
                const startAt = ${targetVideoTime};
                v.currentTime = startAt;
                v.addEventListener('loadedmetadata', () => { v.currentTime = startAt; });
              </script>
            </body>
          </html>
        `);
        win.document.close();
      }
    } else if (videoType === 'link' && videoUrl) {
      try {
        const embedUrl = new URL(toEmbedUrl(videoUrl));
        embedUrl.searchParams.set('start', Math.floor(targetVideoTime).toString());
        embedUrl.searchParams.set('autoplay', '1');
        window.open(embedUrl.toString(), 'sao_clip_player', getCenteredPopUpFeatures(960, 560));
      } catch {
        // Fallback for non-standard video URLs
        window.open(videoUrl, 'sao_clip_player', getCenteredPopUpFeatures(960, 560));
      }
    }
  };

  /**
   * Seeks the MAIN live video to the current match time (periodOffset + timerSeconds).
   * Used by the "Ir al vídeo" button in the stopwatch.
   */
  const handleSeekVideoToNow = () => {
    const targetVideoTime = videoTimeFromMatchTime(timerSeconds);
    if (targetVideoTime === null) return;
    seekVideoTo(targetVideoTime, true);
  };

  const handleAddPlayer = (newPlayer: Player) => {
    dbStore.savePlayer(newPlayer);
    setPlayers(dbStore.getPlayers());
  };

  // Event Trigger Callback when analyst clicks a category button
  const handleTriggerEvent = (btn: BotoneraButton, activeDescriptors: string[]) => {
    const hasFlatDescriptors = btn.descriptors && btn.descriptors.length > 0;
    const hasGroupDescriptors = btn.descriptorGroups && btn.descriptorGroups.length > 0;
    const hasDescriptors = hasFlatDescriptors || hasGroupDescriptors;
    const hasPitch = btn.pitchRequired && btn.pitchRequired !== 'none';
    const hasPlayerRequirement = btn.playerRequiredMode && btn.playerRequiredMode !== 'none';

    // Freeze exact click timestamp and period at the precise moment the button is pressed
    const clickTimestamp = timerSeconds;
    const clickPeriod = period;

    if (hasDescriptors || hasPitch || hasPlayerRequirement) {
      setEventModalData({ button: btn, activeDescriptors, clickTimestamp, clickPeriod });
    } else {
      commitEvent(btn, activeDescriptors, undefined, undefined, undefined, clickTimestamp, clickPeriod);
    }
  };

  const commitEvent = (
    btn: BotoneraButton,
    descriptorsToSave: string[],
    pitchData?: any,
    overridePlayerId?: string | null,
    overrideTeamName?: string | null,
    eventTimestamp?: number,
    eventPeriod?: number
  ) => {
    const targetPlayerId = overridePlayerId !== undefined ? overridePlayerId : selectedPlayerId;
    const activePlayer = players.find((p) => p.id === targetPlayerId);
    let outcomeVal = descriptorsToSave.find((d) => ['Éxito', 'Fallido', 'Gol', 'A puerta', 'Fuera'].includes(d)) || null;

    const chosenTeamName = overrideTeamName || (activePlayer ? activePlayer.team_name : 'Shabab Al Ordon Club');

    // Use frozen click timestamp or current timer if absent
    const exactTimestamp = eventTimestamp !== undefined ? eventTimestamp : timerSeconds;
    const exactPeriod = eventPeriod !== undefined ? eventPeriod : period;

    const newEvt: NormalizedEvent = {
      event_id: `evt_tag_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      source_event_id: `src_${Date.now()}`,
      match_id: selectedMatchId === 'free_session' ? 'free_session' : selectedMatchId,
      team_id: activePlayer ? activePlayer.team_id : 'team_shabab_al_ordon',
      team_name: chosenTeamName,
      player_id: activePlayer ? activePlayer.id : null,
      player_name: activePlayer ? activePlayer.name : 'Jugador Sin Asignar',
      event_type: btn.name,
      category: btn.category || btn.name,
      subcategory: descriptorsToSave.join(', ') || null,
      timestamp: exactTimestamp,
      minute: Math.floor(exactTimestamp / 60),
      second: Math.floor(exactTimestamp % 60),
      duration: btn.leadTime + btn.lagTime,
      period: exactPeriod,
      x: pitchData?.startX ?? null,
      y: pitchData?.startY ?? null,
      end_x: pitchData?.endX ?? null,
      end_y: pitchData?.endY ?? null,
      outcome: outcomeVal,
      metadata: {
        leadTime: btn.leadTime,
        lagTime: btn.lagTime,
        descriptors: descriptorsToSave,
        zone: pitchData?.selectedZone ?? null,
        buttonId: btn.id,
        buttonName: btn.name,
        buttonColor: btn.color,
      },
      source: 'longomatch',
      created_by: user?.id || null,
      created_by_name: profile?.full_name || user?.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEvents((prev) => [newEvt, ...prev]);
    setEventModalData(null);

    if (selectedMatchId && selectedMatchId !== 'free_session') {
      ownWritesRef.current.add(newEvt.event_id);
      insertAnalysisEventToSupabase(selectedMatchId, newEvt).catch((err) =>
        console.warn('Could not sync new event to Supabase:', err)
      );
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => {
      const target = prev.find((e) => e.event_id === eventId);
      if (target) {
        dbStore.backupDeletedEvents([target]);
      }
      const next = prev.filter((e) => e.event_id !== eventId);
      if (selectedMatchId && selectedMatchId !== 'free_session') {
        dbStore.saveNormalizedEvents(next, true);
        ownWritesRef.current.add(eventId);
        deleteAnalysisEventFromSupabase(eventId).catch((err) =>
          console.warn('Could not sync event deletion to Supabase:', err)
        );
      }
      return next;
    });
  };

  const handleUpdateEvent = (updatedEvt: NormalizedEvent) => {
    setEvents((prev) => {
      const nextEvents = prev.map((e) => (e.event_id === updatedEvt.event_id ? updatedEvt : e));
      if (selectedMatchId && selectedMatchId !== 'free_session') {
        dbStore.saveNormalizedEvents(nextEvents, true);
        ownWritesRef.current.add(updatedEvt.event_id);
        updateAnalysisEventInSupabase(selectedMatchId, updatedEvt).catch((err) =>
          console.warn('Could not sync event update to Supabase:', err)
        );
      }
      return nextEvents;
    });
  };

  const handleClearAllEvents = () => {
    setEvents((prev) => {
      if (prev.length > 0) {
        dbStore.backupDeletedEvents(prev);
      }
      if (selectedMatchId && selectedMatchId !== 'free_session') {
        dbStore.saveNormalizedEvents([], true);
        clearAnalysisEventsFromSupabase(selectedMatchId).catch((err) =>
          console.warn('Could not clear live analysis events in Supabase:', err)
        );
      }
      dbStore.clearActiveBotoneraSession();
      return [];
    });
  };

  const handleRestoreDeletedEvents = () => {
    const targetMatchId = selectedMatchId === 'free_session' ? undefined : selectedMatchId;
    const restored = dbStore.restoreTrashEvents(targetMatchId);
    if (restored.length > 0) {
      setEvents((prev) => {
        const prevIds = new Set(prev.map((e) => e.event_id));
        const newOnes = restored.filter((r) => !prevIds.has(r.event_id));
        return [...newOnes, ...prev];
      });
    }
  };

  const handleSaveToMatch = () => {
    if (events.length === 0) return;

    const targetId = selectedMatchId === 'free_session' ? 'match_demo_1' : selectedMatchId;
    const normalizedEvts = events.map((e) => ({ ...e, match_id: targetId }));
    dbStore.saveNormalizedEvents(normalizedEvts, true);

    const targetMatch = dbStore.getMatchById(targetId);
    if (targetMatch) {
      dbStore.saveMatch({
        ...targetMatch,
        event_count: events.length,
        status: 'Finalizado',
        import_status: 'XML Importado',
      });
      setMatches(dbStore.getMatches());
    }

    // Save or update the permanent Match Analysis card
    const existingAnalyses = dbStore.getAnalyses(targetId);
    const existingObj = existingAnalyses.find((a) => a.id === editingAnalysisId) || existingAnalyses[0];
    const resolvedAnalysisId = editingAnalysisId || existingObj?.id || `analysis_${targetId}`;

    const newAnalysis: MatchAnalysis = {
      id: resolvedAnalysisId,
      match_id: targetId,
      title: `Análisis ${targetMatch ? targetMatch.home_team + ' vs ' + targetMatch.away_team : 'Etiquetado en Vivo'}`,
      analyst_name: 'Analista Principal (SAO)',
      status: 'completed' as const,
      video_type: videoType,
      video_url: videoUrl,
      video_source_name: videoSourceName,
      p1_video_start_time: periodVideoOffsets[1] || null,
      p2_video_start_time: periodVideoOffsets[2] || null,
      botonera_template_id: template?.id || null,
      home_lineup: targetMatch?.home_lineup || selectedMatch?.home_lineup || null,
      away_lineup: targetMatch?.away_lineup || selectedMatch?.away_lineup || null,
      events: normalizedEvts,
      created_at: existingObj?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbStore.saveAnalysis(newAnalysis);
    dbStore.clearActiveBotoneraSession(targetId);
    clearAnalysisEventsFromSupabase(targetId).catch((err) =>
      console.warn('Could not clear live analysis events in Supabase after save:', err)
    );
    setSavedAnalyses(dbStore.getAnalyses());
  };

  const handleExportXml = () => {
    const targetMatch = matches.find((m) => m.id === selectedMatchId);
    const homeName = targetMatch ? targetMatch.home_team : 'Shabab Al Ordon Club';
    const awayName = targetMatch ? targetMatch.away_team : 'Rival SC';

    let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n<longomatch_project version="1.0">\n`;
    xmlString += `  <project_info>\n`;
    xmlString += `    <local_team>${homeName}</local_team>\n`;
    xmlString += `    <visitor_team>${awayName}</visitor_team>\n`;
    xmlString += `    <date>${new Date().toISOString()}</date>\n`;
    xmlString += `    <total_events>${events.length}</total_events>\n`;
    xmlString += `  </project_info>\n`;
    xmlString += `  <events>\n`;

    events.forEach((e) => {
      const lead = e.metadata?.leadTime ?? 5;
      const lag = e.metadata?.lagTime ?? 5;
      const startTime = Math.max(0, (e.timestamp || 0) - lead);
      const stopTime = Math.max(startTime + 1, (e.timestamp || 0) + lag);

      xmlString += `    <event>\n`;
      xmlString += `      <id>${e.event_id}</id>\n`;
      xmlString += `      <category>${e.category}</category>\n`;
      xmlString += `      <player>${e.player_name}</player>\n`;
      xmlString += `      <start_time>${startTime}</start_time>\n`;
      xmlString += `      <stop_time>${stopTime}</stop_time>\n`;
      xmlString += `      <period>${e.period}</period>\n`;
      if (e.x !== null && e.y !== null) {
        xmlString += `      <coordinates start_x="${e.x}" start_y="${e.y}" end_x="${e.end_x || ''}" end_y="${e.end_y || ''}" />\n`;
      }
      if (e.outcome) {
        xmlString += `      <outcome>${e.outcome}</outcome>\n`;
      }
      xmlString += `    </event>\n`;
    });
    xmlString += `  </events>\n</longomatch_project>`;

    const blob = new Blob([xmlString], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `longomatch_session_${selectedMatchId}_${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events_tagging_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  return (
    <div className="-m-6 px-2 sm:px-4 py-4 space-y-4 w-[calc(100%+3rem)] min-h-screen overflow-x-hidden">
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Flame className="w-5 h-5 text-slate-950 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-slate-100 text-base md:text-lg tracking-wide">
                ANALIZADOR Y REGISTRO EN DIRECTO (BOTONERA)
              </h1>
              {isTimerRunning && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono text-[10px] font-bold border border-red-500/30 animate-pulse flex items-center gap-1">
                  <Radio className="w-3 h-3" /> REC
                </span>
              )}
              {connectedAnalysts.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold border border-sky-500/30 flex items-center gap-1"
                  title={connectedAnalysts.map((a) => a.userName).join(', ')}
                >
                  <User className="w-3 h-3" />
                  {connectedAnalysts.length === 1
                    ? connectedAnalysts[0].userName
                    : `${connectedAnalysts.length} analistas conectados`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Captura de acciones con cronómetro sincronizado, campograma, estadísticas en vivo y exportación LongoMatch XML.
            </p>
          </div>
        </div>

        {/* DUAL MODE TOGGLE BUTTONS (only shown once an operating mode has been chosen) */}
        {pageMode !== null && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            {pageMode === 'analysis' && isSessionConfigured && (
              <>
                <button
                  onClick={() => setIsEditPanelOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">✏️ EDITAR BOTONERA</span>
                  <span className="sm:hidden">✏️</span>
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">FINALIZAR Y GUARDAR REGISTRO</span>
                  <span className="sm:hidden">FINALIZAR</span>
                </button>
              </>
            )}

            {!isSessionConfigured && (
              <button
                onClick={() => setPageMode(null)}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Volver a Elegir</span>
              </button>
            )}

            <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button
                onClick={handleStartNewRegistration}
                className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2 rounded-xl text-xs font-black transition-all ${
                  pageMode === 'analysis'
                    ? 'bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlayCircle className="w-4 h-4 fill-slate-950" />
                <span className="hidden md:inline">⚡ MODO ANÁLISIS (REGISTRAR PARTIDO)</span>
                <span className="md:hidden">⚡ ANÁLISIS</span>
              </button>

              <button
                onClick={() => setPageMode('edit')}
                disabled={isSessionConfigured}
                title={isSessionConfigured ? 'Finaliza el registro en curso para acceder al diseño de pizarras' : undefined}
                className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2 rounded-xl text-xs font-black transition-all ${
                  pageMode === 'edit'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40'
                    : isSessionConfigured
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4 text-slate-950" />
                <span className="hidden md:inline">🎨 MODO CONFIGURACIÓN (DISEÑAR PIZARRAS)</span>
                <span className="md:hidden">🎨 PIZARRAS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- LANDING: ELEGIR ENTRE REGISTRO O EDITAR + LISTADO DE REGISTROS ----------------- */}
      {pageMode === null && (
        <div className="space-y-8 max-w-5xl mx-auto py-8 animate-fade-in">
          {/* Main Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={handleStartNewRegistration}
              className="group p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition-all shadow-xl cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <PlayCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-sm font-extrabold text-white tracking-wide mb-1.5">⚡ REGISTRAR NUEVO PARTIDO</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configura un nuevo registro en directo: elige vídeo, partido y botonera, y empieza a etiquetar eventos con el cronómetro activo.
              </p>
            </button>

            <button
              onClick={() => setPageMode('edit')}
              className="group p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 text-left transition-all shadow-xl cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Sliders className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-sm font-extrabold text-white tracking-wide mb-1.5">🎨 DISEÑAR PIZARRAS</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crea o edita botoneras desde cero: arrastra y redimensiona botones, asigna colores y configura el campograma.
              </p>
            </button>
          </div>

          {/* Section: Registros y Análisis Realizados */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <FolderOpen className="w-4.5 h-4.5 text-amber-400" />
                  <span>REGISTROS Y ANÁLISIS REALIZADOS ({savedAnalyses.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Historial de análisis guardados en Supabase. Ábrelos en formato Visor (vídeo + campograma), reábrelos en la botonera o elimínalos.
                </p>
              </div>
            </div>

            {savedAnalyses.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
                <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Aún no hay registros de análisis guardados.</p>
                <p className="text-[11px] text-slate-500">Haz clic arriba en &quot;Registrar Partido&quot; para iniciar tu primer etiquetado en directo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedAnalyses.map((an) => {
                  const m = matches.find((match) => match.id === an.match_id);
                  const rawUrl = an.video_url || m?.video_url;
                  let ytThumb: string | null = null;
                  if (rawUrl) {
                    const matchId = rawUrl.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                    if (matchId && matchId[1]) {
                      ytThumb = `https://img.youtube.com/vi/${matchId[1]}/hqdefault.jpg`;
                    }
                  }

                  return (
                    <div
                      key={an.id}
                      className="rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 space-y-3 transition-all flex flex-col justify-between shadow-xl overflow-hidden group hover:shadow-2xl hover:shadow-amber-500/10"
                    >
                      {/* Miniatura de Vídeo de YouTube / Enlace */}
                      {ytThumb ? (
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shrink-0">
                          <img
                            src={ytThumb}
                            alt={an.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                            {m?.round ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 shadow-md">
                                {m.round}
                              </span>
                            ) : <div />}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md ${
                                an.status === 'completed'
                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-sm'
                                  : 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-sm'
                              }`}
                            >
                              {an.status === 'completed' ? 'Finalizado' : 'En progreso'}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-200 z-10">
                            <span className="bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-amber-300 border border-amber-500/30 backdrop-blur-md">
                              {new Date(an.updated_at || an.created_at).toLocaleDateString()}
                            </span>
                            {an.video_type && (
                              <span className="bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-sky-300 border border-sky-500/30 backdrop-blur-md flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                <span>{an.video_type === 'link' ? 'Vídeo Enlace' : 'Vídeo Local'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          {!ytThumb && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
                              <span className="font-mono text-slate-300">
                                {new Date(an.updated_at || an.created_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  an.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {an.status === 'completed' ? 'Finalizado' : 'En progreso'}
                              </span>
                            </div>
                          )}

                          <h4 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                            {an.title}
                          </h4>
                          {m && (
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-amber-400 font-semibold truncate">
                                {m.home_team} vs {m.away_team}
                              </p>
                              {m.round && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  {m.round}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>{an.analyst_name || 'Analista Principal'}</span>
                          </p>

                          <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-300 font-mono">
                            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-bold text-emerald-400">
                              {an.events?.length || 0} eventos
                            </span>
                            {!ytThumb && an.video_type && (
                              <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-sky-400 flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                <span>{an.video_type === 'link' ? 'Vídeo URL' : an.video_type === 'local' ? 'Vídeo Local' : 'Sin vídeo'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                          <button
                            onClick={() => setActiveVisorAnalysis(an)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Abrir Visor</span>
                          </button>

                          <button
                            onClick={() => handleEditAnalysisInBotonera(an)}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-colors cursor-pointer"
                            title="Editar en Botonera"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmAnalysis(an)}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SETUP WIZARD (Antes de comenzar un nuevo registro) ----------------- */}
      {pageMode === 'analysis' && !isSessionConfigured && (
        <BotoneraSetupWizard
          matches={matches}
          templates={dbStore.getBotoneraTemplates()}
          onDeleteTemplate={(tmplId) => {
            dbStore.deleteBotoneraTemplate(tmplId);
            const remaining = dbStore.getBotoneraTemplates();
            if (remaining.length > 0) {
              setTemplate(remaining[0]);
            }
          }}
          onCancel={() => setPageMode(null)}
          onComplete={handleSetupComplete}
        />
      )}

      {/* ----------------- MODO 1: MODO ANÁLISIS / ETIQUETADO EN DIRECTO ----------------- */}
      {pageMode === 'analysis' && isSessionConfigured && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Live Broadcast Scoreboard Banner */}
          <BotoneraLiveScoreboard
            match={selectedMatch || null}
            events={events}
            timerSeconds={timerSeconds}
            period={period}
            onAddEvent={(newEvt) => {
              setEvents((prev) => [...prev, newEvt]);
            }}
            onUpdateLineup={(team, config, updatedPlayers) => {
              const teamName = team === 'home' ? (selectedMatch?.home_team || 'Equipo Local') : (selectedMatch?.away_team || 'Equipo Visitante');
              setPlayers((prev) => [
                ...prev.filter((p) => p.team_name !== teamName),
                ...updatedPlayers,
              ]);
              const targetMatch = matches.find((m) => m.id === selectedMatchId) || selectedMatch;
              if (targetMatch) {
                const updatedMatch = {
                  ...targetMatch,
                  [team === 'home' ? 'home_lineup' : 'away_lineup']: config,
                };
                dbStore.saveMatch(updatedMatch);
                setMatches(dbStore.getMatches());
              }
              updatedPlayers.forEach((p) => dbStore.savePlayer(p));
            }}
          />

          {videoType && videoType !== 'none' && !isVideoPoppedOut ? (
            /*
             * LAYOUT 1 — CON VÍDEO EN PÁGINA
             * ┌─────────────────────────┬──────────────────────────┐
             * │  Vídeo (arriba)         │  Crono (barra compacta)  │
             * │                         │  Botonera completa       │
             * │  Feed Eventos (abajo)   │  Estadísticas            │
             * └─────────────────────────┴──────────────────────────┘
             */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">

              {/* ── COLUMNA IZQUIERDA (7/12): Vídeo + Feed de Eventos ── */}
              <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5 h-full">
                <BotoneraVideoPlayer
                  videoType={videoType}
                  videoUrl={videoUrl}
                  videoSourceName={videoSourceName}
                  isPoppedOut={false}
                  onTogglePopOut={(popped) => (popped ? openVideoPopOut() : closeVideoPopOut())}
                  objectUrl={localObjectUrl}
                  resumeAtSeconds={embeddedResume?.at ?? null}
                  resumeAutoPlay={embeddedResume?.play ?? false}
                  onVideoRef={handleVideoRef}
                  onIframeRef={handleIframeRef}
                  periodVideoOffsets={periodVideoOffsets}
                  onClearPeriodOffset={handleClearPeriodOffset}
                  onUpdatePeriodOffset={handleUpdatePeriodOffset}
                  onEditVideoSettings={handleOpenEditVideoModal}
                  currentPeriod={period}
                  onCapturePeriodOffset={handleCapturePeriodOffset}
                  onSeekVideoToTime={(t) => seekVideoTo(t)}
                  getCurrentVideoTime={getCurrentVideoTime}
                />

                {/* Feed de Eventos — directamente debajo del vídeo */}
                <BotoneraEventLog
                  events={events}
                  onDeleteEvent={handleDeleteEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onClearAllEvents={handleClearAllEvents}
                  onRestoreDeletedEvents={handleRestoreDeletedEvents}
                  onExportXml={handleExportXml}
                  onExportJson={handleExportJson}
                  onSeekToEvent={handleSeekToEvent}
                  buttons={template?.buttons || []}
                  players={players}
                />
              </div>

              {/* ── COLUMNA DERECHA (5/12): Cronómetro → Botonera → Stats ── */}
              <div className="lg:col-span-5 flex flex-col gap-4 h-full">

                {/* 1. Cronómetro compacto — DIRECTAMENTE encima de la botonera */}
                <BotoneraStopwatch
                  period={period}
                  onPeriodChange={handlePeriodSelect}
                  timerSeconds={timerSeconds}
                  onTimerChange={handleTimerChange}
                  isTimerRunning={isTimerRunning}
                  onToggleTimer={handleToggleTimer}
                  onResetTimer={handleResetTimer}
                  onTimerStarted={handleTimerStarted}
                  onSeekVideoToNow={handleSeekVideoToNow}
                  hasVideoSync={hasVideoSync}
                  isVideoDriven={isVideoDriven}
                />

                {/* 2. Botonera — ocupa todo el ancho de la columna derecha */}
                {template && (
                  <BotoneraPanelEditor
                    template={template}
                    onUpdateTemplate={(tmpl) => {
                      setTemplate(tmpl);
                      dbStore.saveBotoneraTemplate(tmpl);
                    }}
                    onTriggerEvent={handleTriggerEvent}
                    isTimerRunning={isTimerRunning}
                    onToggleTimer={handleToggleTimer}
                  />
                )}

                {/* 3. Estadísticas provisionales — debajo de la botonera */}
                <BotoneraLiveStats
                  events={events}
                  videoUrl={videoUrl}
                  onSeekVideoToTime={(t) => seekVideoTo(t, true)}
                  onSeekToEvent={handleSeekToEvent}
                  buttons={template?.buttons || []}
                />
              </div>
            </div>
          ) : (
            /*
             * LAYOUT 2 — VÍDEO EN VENTANA EXTERNA O SIN VÍDEO
             * El hueco del vídeo se reparte: la botonera pasa a 8/12 y el feed a 4/12.
             * ┌───────────────────────────────────────────────────────────┐
             * │  [Barra vídeo fuera + marcas de parte] (si aplica)        │
             * ├────────────────────────────────────────┬──────────────────┤
             * │  Cronómetro compacto                   │  Feed de Eventos │
             * │  Selector Jugadores + Botonera grande  │  Estadísticas    │
             * └────────────────────────────────────────┴──────────────────┘
             */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

              {/* ── FILA SUPERIOR (12/12): el vídeo está fuera, así que su hueco
                     se devuelve a la página como una barra fina con el botón de
                     acoplar y las marcas de inicio de cada parte ── */}
              {videoType && videoType !== 'none' && (
                <div className="lg:col-span-12">
                  <BotoneraVideoPlayer
                    videoType={videoType}
                    videoUrl={videoUrl}
                    videoSourceName={videoSourceName}
                    isPoppedOut={true}
                    onTogglePopOut={(popped) => (popped ? openVideoPopOut() : closeVideoPopOut())}
                    periodVideoOffsets={periodVideoOffsets}
                    onClearPeriodOffset={handleClearPeriodOffset}
                    onUpdatePeriodOffset={handleUpdatePeriodOffset}
                    currentPeriod={period}
                    onCapturePeriodOffset={handleCapturePeriodOffset}
                    onSeekVideoToTime={(t) => seekVideoTo(t)}
                    getCurrentVideoTime={getCurrentVideoTime}
                  />
                </div>
              )}

              {/* ── COLUMNA IZQUIERDA GRANDE (8/12): Crono + Botonera ── */}
              <div className="lg:col-span-8 flex flex-col gap-4">

                {/* 1. Cronómetro compacto — encima de la botonera */}
                <BotoneraStopwatch
                  period={period}
                  onPeriodChange={handlePeriodSelect}
                  timerSeconds={timerSeconds}
                  onTimerChange={handleTimerChange}
                  isTimerRunning={isTimerRunning}
                  onToggleTimer={handleToggleTimer}
                  onResetTimer={handleResetTimer}
                  onTimerStarted={handleTimerStarted}
                  onSeekVideoToNow={handleSeekVideoToNow}
                  hasVideoSync={hasVideoSync}
                  isVideoDriven={isVideoDriven}
                />

                {/* Selector de Jugadores + Botonera en grande */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-3">
                    <BotoneraPlayerSelector
                      players={players}
                      selectedPlayerId={selectedPlayerId}
                      onSelectPlayer={(p) => setSelectedPlayerId(p ? p.id : null)}
                      onAddPlayer={handleAddPlayer}
                      homeTeamName={selectedMatch ? selectedMatch.home_team : 'Shabab Al Ordon Club'}
                      awayTeamName={selectedMatch ? selectedMatch.away_team : 'Rival SC'}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-9">
                    {template && (
                      <BotoneraPanelEditor
                        template={template}
                        onUpdateTemplate={(tmpl) => {
                          setTemplate(tmpl);
                          dbStore.saveBotoneraTemplate(tmpl);
                        }}
                        onTriggerEvent={handleTriggerEvent}
                        isTimerRunning={isTimerRunning}
                        onToggleTimer={handleToggleTimer}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ── COLUMNA DERECHA (4/12): Feed + Stats ── */}
              <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                <BotoneraEventLog
                  events={events}
                  onDeleteEvent={handleDeleteEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onClearAllEvents={handleClearAllEvents}
                  onRestoreDeletedEvents={handleRestoreDeletedEvents}
                  onExportXml={handleExportXml}
                  onExportJson={handleExportJson}
                  onSeekToEvent={handleSeekToEvent}
                  buttons={template?.buttons || []}
                  players={players}
                />

                <BotoneraLiveStats
                  events={events}
                  videoUrl={videoUrl}
                  onSeekVideoToTime={(t) => seekVideoTo(t, true)}
                  onSeekToEvent={handleSeekToEvent}
                  buttons={template?.buttons || []}
                />
              </div>
            </div>
          )}
        </div>
      )}



      {/* ── BotoneraHeader completo oculto — solo como fuente de match-linking y guardado ── */}
      {pageMode === 'analysis' && isSessionConfigured && (
        <div className="hidden">
          <BotoneraHeader
            matches={matches}
            selectedMatchId={selectedMatchId}
            onSelectMatch={handleSelectMatch}
            period={period}
            onPeriodChange={setPeriod}
            timerSeconds={timerSeconds}
            onTimerChange={handleTimerChange}
            isTimerRunning={isTimerRunning}
            onToggleTimer={handleToggleTimer}
            onResetTimer={handleResetTimer}
            onSaveToMatch={handleSaveToMatch}
            onExportXml={handleExportXml}
            eventCount={events.length}
          />
        </div>
      )}

      {/* ── Match Info + Save bar (visible bajo el layout) ── */}
      {pageMode === 'analysis' && isSessionConfigured && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold">Partido vinculado:</span>
            <select
              value={selectedMatchId}
              onChange={(e) => handleSelectMatch(e.target.value)}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="free_session" className="bg-slate-900 text-slate-200">⚡ Sesión Libre</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                  ⚽ {m.home_team} vs {m.away_team} ({m.date})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportXml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold border border-slate-700 transition"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Exportar XML
            </button>
            <button
              onClick={handleSaveToMatch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-950/40"
            >
              <Save className="w-3.5 h-3.5 fill-slate-950" />
              Guardar en Partido ({events.length})
            </button>
          </div>
        </div>
      )}




      {/* ----------------- MODO 2: MODO CONFIGURACIÓN & DISEÑO DE PIZARRAS ----------------- */}
      {pageMode === 'edit' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <p>
                  <strong>ESTÁS EN MODO CONFIGURACIÓN Y DISEÑO DE PIZARRAS:</strong> Configura botoneras, colores, categorías y atajos de teclado.
                </p>
                {isTimerRunning && (
                  <p className="text-red-400 font-mono font-bold text-[11px] mt-1 flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>Cronómetro de partido en marcha en segundo plano: {formatTime(timerSeconds)}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setPageMode('analysis')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shrink-0 cursor-pointer"
            >
              Volver a Modo Análisis ⚡
            </button>
          </div>

          {template && (
            <BotoneraPanelEditor
              template={template}
              onUpdateTemplate={(tmpl) => {
                setTemplate(tmpl);
                dbStore.saveBotoneraTemplate(tmpl);
              }}
              onTriggerEvent={handleTriggerEvent}
              isTimerRunning={isTimerRunning}
              onToggleTimer={handleToggleTimer}
            />
          )}
        </div>
      )}

      {/* ----------------- IN-PLACE BOTONERA WHITEBOARD EDIT MODAL ----------------- */}
      {isEditPanelOpen && template && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 md:p-8 animate-fade-in flex flex-col items-center">
          <div className="w-full max-w-7xl bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">
                    DISEÑADOR DE PIZARRA Y BOTONERA ({template.name})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Añade botones, edita textos, colores, categorías y atajos de teclado. Los cambios se aplicarán de inmediato a tu sesión.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditPanelOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>GUARDAR Y CERRAR</span>
              </button>
            </div>

            <BotoneraPanelEditor
              template={template}
              onUpdateTemplate={(tmpl) => {
                setTemplate(tmpl);
                dbStore.saveBotoneraTemplate(tmpl);
              }}
              onTriggerEvent={handleTriggerEvent}
              isTimerRunning={isTimerRunning}
              onToggleTimer={handleToggleTimer}
            />
          </div>
        </div>
      )}

      {/* ----------------- EVENT TAGGING MODAL (DESCRIPTORS + JUGADOR + PITCH) ----------------- */}
      {eventModalData && (
        <BotoneraEventModal
          button={eventModalData.button}
          initialGlobalDescriptors={eventModalData.activeDescriptors}
          players={players}
          selectedPlayerId={selectedPlayerId}
          currentMatch={matches.find((m) => m.id === selectedMatchId) || null}
          clickTimestamp={eventModalData.clickTimestamp}
          clickPeriod={eventModalData.clickPeriod}
          onSave={(finalDescriptors, pitchData, modalPlayerId, modalTeamName) =>
            commitEvent(
              eventModalData.button,
              finalDescriptors,
              pitchData,
              modalPlayerId,
              modalTeamName,
              eventModalData.clickTimestamp,
              eventModalData.clickPeriod
            )
          }
          onCancel={() => setEventModalData(null)}
        />
      )}

      {/* ----------------- EDIT VIDEO SETTINGS MODAL ----------------- */}
      {isEditVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" /> Editar Enlace / Vídeo de Partido
              </h3>
              <button onClick={() => setIsEditVideoModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideoSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Origen del Vídeo:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVideoType('link')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      editVideoType === 'link'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>🔗 Enlace (YouTube)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVideoType('local')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      editVideoType === 'local'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>📁 Archivo Local</span>
                  </button>
                </div>
              </div>

              {editVideoType === 'link' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">URL de YouTube / Vídeo:</label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Archivo de Vídeo MP4/MKV:</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditVideoFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  {videoSourceName && (
                    <p className="text-[10px] text-amber-400 mt-1 font-mono">
                      Archivo cargado actualmente: {videoSourceName}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditVideoModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow cursor-pointer"
                >
                  Guardar Vídeo en Partido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Visor Modal when clicking Abrir Visor on a saved analysis */}
      {activeVisorAnalysis && (
        <AnalysisVisor
          match={
            matches.find((m) => m.id === activeVisorAnalysis.match_id) || {
              id: activeVisorAnalysis.match_id,
              home_team: 'Shabab Al Ordon',
              away_team: 'Rival',
              date: '',
              competition: 'Jordan Pro League',
              season: '2026/2027',
              home_score: 0,
              away_score: 0,
              status: 'Finalizado',
              event_count: activeVisorAnalysis.events?.length || 0,
              import_status: 'XML Importado',
            }
          }
          analysis={activeVisorAnalysis}
          onClose={() => setActiveVisorAnalysis(null)}
          onUpdateAnalysis={(updated) => {
            dbStore.saveAnalysis(updated);
            setSavedAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
        />
      )}

      {/* Modal de Confirmación Previa para Eliminar Registro */}
      {deleteConfirmAnalysis && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">¿Confirmar Eliminación del Registro?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta acción es permanente e irreversible.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <p className="font-bold text-white">{deleteConfirmAnalysis.title}</p>
              <p className="text-slate-400">
                Eventos registrados: <span className="font-mono text-emerald-400 font-bold">{deleteConfirmAnalysis.events?.length || 0}</span>
              </p>
              <p className="text-slate-500 text-[11px]">Se borrará el registro de la plataforma y de Supabase.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmAnalysis(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  dbStore.deleteAnalysis(deleteConfirmAnalysis.id);
                  setSavedAnalyses((prev) => prev.filter((a) => a.id !== deleteConfirmAnalysis.id));
                  setDeleteConfirmAnalysis(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
