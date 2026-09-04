'use client';

import React, { useState, useEffect, useRef } from 'react';
import { dbStore, SEED_BOTONERA_TEMPLATES } from '@/lib/store/db-store';
import { Match, Player, NormalizedEvent, BotoneraTemplate, BotoneraButton, BotoneraProjectVideoType } from '@/types';
import { setRecordingLocked } from '@/lib/recording-lock';

import { BotoneraHeader } from '@/components/botonera/BotoneraHeader';
import { BotoneraPitchCanvas } from '@/components/botonera/BotoneraPitchCanvas';
import { BotoneraPlayerSelector } from '@/components/botonera/BotoneraPlayerSelector';
import { BotoneraPanelEditor } from '@/components/botonera/BotoneraPanelEditor';
import { BotoneraEventLog } from '@/components/botonera/BotoneraEventLog';
import { BotoneraSetupWizard } from '@/components/botonera/BotoneraSetupWizard';
import { BotoneraVideoPlayer, toEmbedUrl } from '@/components/botonera/BotoneraVideoPlayer';
import { BotoneraLiveStats } from '@/components/botonera/BotoneraLiveStats';
import { BotoneraStopwatch } from '@/components/botonera/BotoneraStopwatch';
import { BotoneraEventModal } from '@/components/botonera/BotoneraEventModal';
import { Compass, Flame, Sliders, PlayCircle, Trophy, CheckCircle2, FileCode2, Save, Radio, Pencil, Ban, X, Home } from 'lucide-react';

export default function BotoneraPage() {
  // Page Main Operating Mode: null (landing / sin elegir) | 'analysis' (etiquetado en vivo) | 'edit' (configurar pizarras)
  const [pageMode, setPageMode] = useState<'analysis' | 'edit' | null>(null);

  // Database Data
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('free_session');

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
  } | null>(null);

  // Active Player State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Live Tagged Events List
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

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

  // Load Initial Data & Restore Active Tagging Session from dbStore
  useEffect(() => {
    const loadedMatches = dbStore.getMatches();
    const loadedPlayers = dbStore.getPlayers();
    const loadedTemplates = dbStore.getBotoneraTemplates();

    setMatches(loadedMatches);
    setPlayers(loadedPlayers);

    if (loadedTemplates.length > 0) {
      setTemplate(loadedTemplates[0]);
    }

    // Restore active session if analyst navigated away and returned
    const activeSession = dbStore.getActiveBotoneraSession();
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
        setVideoType(activeSession.videoType || null);
        setVideoSourceName(activeSession.videoSourceName || null);
        setVideoUrl(activeSession.videoUrl || null);
        if (activeSession.botoneraTemplateId && loadedTemplates.length > 0) {
          const savedTemplate = loadedTemplates.find((t) => t.id === activeSession.botoneraTemplateId);
          if (savedTemplate) setTemplate(savedTemplate);
        }
        setPageMode('analysis');
      }
    }
  }, []);

  // Keep app-wide navigation lock in sync with the recording session state
  useEffect(() => {
    setRecordingLocked(pageMode === 'analysis' && isSessionConfigured);
    return () => setRecordingLocked(false);
  }, [pageMode, isSessionConfigured]);

  // Background Timer Tick Interval Engine
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Sync Active Tagging Session State to LocalStorage / dbStore
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
      botoneraTemplateId: template?.id || null,
    });
  }, [timerSeconds, isTimerRunning, period, selectedMatchId, events.length, isSessionConfigured, videoType, videoSourceName, videoUrl, template]);

  const handleSetupComplete = (config: {
    videoType: BotoneraProjectVideoType;
    videoSourceName: string | null;
    videoUrl: string | null;
    videoFile: File | null;
    matchId: string;
    templateId: string;
  }) => {
    setVideoType(config.videoType);
    setVideoSourceName(config.videoSourceName);
    setVideoUrl(config.videoUrl);
    setVideoFile(config.videoFile);
    handleSelectMatch(config.matchId);

    const chosenTemplate = dbStore.getBotoneraTemplates().find((t) => t.id === config.templateId);
    if (chosenTemplate) setTemplate(chosenTemplate);

    setIsSessionConfigured(true);
  };

  const handleEndSession = () => {
    if (isTimerRunning || events.length > 0) {
      const ok = confirm('¿Finalizar el registro en directo? El cronómetro se detendrá y podrás volver a navegar libremente por la plataforma.');
      if (!ok) return;
    }
    setIsTimerRunning(false);
    setIsSessionConfigured(false);
    setVideoType(null);
    setVideoSourceName(null);
    setVideoUrl(null);
    setVideoFile(null);
    setIsVideoPoppedOut(false);
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
        // YouTube infoDelivery: carries currentTime
        if (data.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          youtubeCurrentTimeRef.current = data.info.currentTime;
        }
        // Also handle the onReady event to start listening
        if (data.event === 'onReady' || data.info === 1 /* playing */) {
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
  }, []);

  // When the iframe ref is first set, tell YouTube to start broadcasting infoDelivery messages
  const handleIframeRef = (el: HTMLIFrameElement | null) => {
    iframeElementRef.current = el;
    if (el?.contentWindow) {
      // Small delay to let the iframe finish its initial handshake
      setTimeout(() => {
        el.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }, 500);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    if (matchId !== 'free_session') {
      const matchEvents = dbStore.getNormalizedEvents(matchId);
      setEvents(matchEvents);
    } else {
      setEvents([]);
    }
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setPeriodVideoOffsets({}); // also clear video offsets on reset
    dbStore.clearActiveBotoneraSession();
  };

  /**
   * Called by BotoneraStopwatch when the user presses PLAY (not pause).
   * Records the video's currentTime as the start offset for the current period.
   * - Local HTML5 video: reads currentTime directly from the <video> element.
   * - YouTube iframe: reads the last known time from youtubeCurrentTimeRef
   *   (kept up-to-date by the window 'message' listener above).
   * Only records ONCE per period — pausing and resuming does NOT overwrite the offset.
   */
  const handleTimerStarted = () => {
    if (!(period in periodVideoOffsets)) {
      const videoTime =
        videoElementRef.current?.currentTime   // local video: exact
        ?? youtubeCurrentTimeRef.current;      // YouTube: last postMessage update
      setPeriodVideoOffsets((prev) => ({ ...prev, [period]: videoTime }));
    }
  };

  /**
   * Seeks the video to (periodOffset + eventMatchTimestamp - 12s).
   * Called when the user clicks the ▶ play button on an event row in the Feed.
   * Now opens in a POP-OUT window so the live tagging video is not disrupted.
   */
  const handleSeekToEvent = (evt: NormalizedEvent) => {
    const evtPeriod = evt.period ?? 1;
    const offset = periodVideoOffsets[evtPeriod] ?? 0;
    const matchTimestamp = evt.timestamp ?? 0;
    const targetVideoTime = Math.max(0, offset + matchTimestamp - 12);

    if (videoType === 'local' && videoElementRef.current?.src) {
      const src = videoElementRef.current.src;
      const win = window.open('', '_blank', 'width=960,height=560,menubar=no,toolbar=no,location=no');
      if (win) {
        win.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Revisión Evento: ${evt.category}</title>
              <style>
                html, body { margin:0; padding:0; background:#000; height:100%; overflow:hidden; }
                video { width:100%; height:100%; object-fit:contain; background:#000; }
              </style>
            </head>
            <body>
              <video id="v" src="${src}" controls autoplay></video>
              <script>
                const v = document.getElementById('v');
                v.currentTime = ${targetVideoTime};
                v.addEventListener('loadedmetadata', () => { v.currentTime = ${targetVideoTime}; });
              </script>
            </body>
          </html>
        `);
        win.document.close();
      }
    } else if (videoType === 'link' && videoUrl) {
      const embedUrl = new URL(toEmbedUrl(videoUrl));
      embedUrl.searchParams.set('start', Math.floor(targetVideoTime).toString());
      embedUrl.searchParams.set('autoplay', '1');
      window.open(embedUrl.toString(), '_blank', 'width=960,height=560,menubar=no,toolbar=no,location=no');
    } else {
      alert(
        `Para buscar este evento en el vídeo, rebobina a ${Math.floor(targetVideoTime / 60)}:${String(Math.floor(targetVideoTime % 60)).padStart(2, '0')} del vídeo.`
      );
    }
  };

  /**
   * Seeks the MAIN live video to the current match time (periodOffset + timerSeconds).
   * Used by the "Ir al vídeo" button in the stopwatch.
   */
  const handleSeekVideoToNow = () => {
    const offset = periodVideoOffsets[period];
    if (offset === undefined) return;
    const targetVideoTime = Math.max(0, offset + timerSeconds);

    if (videoElementRef.current) {
      videoElementRef.current.currentTime = targetVideoTime;
      if (videoElementRef.current.paused) {
        videoElementRef.current.play().catch(() => {});
      }
    } else if (iframeElementRef.current?.contentWindow) {
      const win = iframeElementRef.current.contentWindow;
      win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [targetVideoTime, true] }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    dbStore.savePlayer(newPlayer);
    setPlayers(dbStore.getPlayers());
  };

  // Event Trigger Callback when analyst clicks a category button
  const handleTriggerEvent = (btn: BotoneraButton, activeDescriptors: string[]) => {
    const hasDescriptors = btn.descriptors && btn.descriptors.length > 0;
    const hasPitch = btn.pitchRequired && btn.pitchRequired !== 'none';

    if (hasDescriptors || hasPitch) {
      setEventModalData({ button: btn, activeDescriptors });
    } else {
      commitEvent(btn, activeDescriptors);
    }
  };

  const commitEvent = (btn: BotoneraButton, descriptorsToSave: string[], pitchData?: any) => {
    const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
    let outcomeVal = descriptorsToSave.find((d) => ['Éxito', 'Fallido', 'Gol', 'A puerta', 'Fuera'].includes(d)) || null;

    const newEvt: NormalizedEvent = {
      event_id: `evt_tag_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      source_event_id: `src_${Date.now()}`,
      match_id: selectedMatchId === 'free_session' ? 'free_session' : selectedMatchId,
      team_id: selectedPlayer ? selectedPlayer.team_id : 'team_shabab_al_ordon',
      team_name: selectedPlayer ? selectedPlayer.team_name : 'Shabab Al Ordon Club',
      player_id: selectedPlayer ? selectedPlayer.id : null,
      player_name: selectedPlayer ? selectedPlayer.name : 'Jugador Sin Asignar',
      event_type: btn.name,
      category: btn.category || btn.name,
      subcategory: descriptorsToSave.join(', ') || null,
      timestamp: timerSeconds,
      minute: Math.floor(timerSeconds / 60),
      second: Math.floor(timerSeconds % 60),
      duration: btn.leadTime + btn.lagTime,
      period: period,
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
      },
      source: 'longomatch',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEvents((prev) => [newEvt, ...prev]);
    setEventModalData(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
  };

  const handleUpdateEvent = (updatedEvt: NormalizedEvent) => {
    setEvents((prev) => {
      const nextEvents = prev.map((e) => (e.event_id === updatedEvt.event_id ? updatedEvt : e));
      if (selectedMatchId && selectedMatchId !== 'free_session') {
        dbStore.saveNormalizedEvents(nextEvents, true);
      }
      return nextEvents;
    });
  };

  const handleClearAllEvents = () => {
    if (confirm('¿Estás seguro de borrar todos los eventos registrados en esta sesión?')) {
      setEvents([]);
      dbStore.clearActiveBotoneraSession();
    }
  };

  const handleSaveToMatch = () => {
    if (events.length === 0) return;

    const targetId = selectedMatchId === 'free_session' ? 'match_demo_1' : selectedMatchId;
    dbStore.saveNormalizedEvents(events.map((e) => ({ ...e, match_id: targetId })), true);

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
      const startTime = Math.max(0, (e.timestamp || 0) - (e.metadata?.leadTime || 5));
      const stopTime = (e.timestamp || 0) + (e.metadata?.lagTime || 5);

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
    <div className="-m-6 px-4 py-4 space-y-4 w-[calc(100%+3rem)] min-h-screen">
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
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
            </div>
            <p className="text-xs text-slate-400">
              Captura de acciones con cronómetro sincronizado, campograma, estadísticas en vivo y exportación LongoMatch XML.
            </p>
          </div>
        </div>

        {/* DUAL MODE TOGGLE BUTTONS (only shown once an operating mode has been chosen) */}
        {pageMode !== null && (
          <div className="flex items-center gap-2.5">
            {pageMode === 'analysis' && isSessionConfigured && (
              <>
                <button
                  onClick={() => setIsEditPanelOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  <span>✏️ EDITAR BOTONERA</span>
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 transition-all"
                >
                  <X className="w-4 h-4" />
                  <span>FINALIZAR REGISTRO</span>
                </button>
              </>
            )}

            {!isSessionConfigured && (
              <button
                onClick={() => setPageMode(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Volver a Elegir</span>
              </button>
            )}

            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button
                onClick={() => setPageMode('analysis')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                  pageMode === 'analysis'
                    ? 'bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlayCircle className="w-4 h-4 fill-slate-950" />
                <span>⚡ MODO ANÁLISIS (REGISTRAR PARTIDO)</span>
              </button>

              <button
                onClick={() => setPageMode('edit')}
                disabled={isSessionConfigured}
                title={isSessionConfigured ? 'Finaliza el registro en curso para acceder al diseño de pizarras' : undefined}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                  pageMode === 'edit'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40'
                    : isSessionConfigured
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4 text-slate-950" />
                <span>🎨 MODO CONFIGURACIÓN (DISEÑAR PIZARRAS)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- LANDING: ELEGIR ENTRE REGISTRO O EDITAR ----------------- */}
      {pageMode === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto py-10 animate-fade-in">
          <button
            onClick={() => setPageMode('analysis')}
            className="group p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition-all shadow-xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <PlayCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-sm font-extrabold text-white tracking-wide mb-1.5">⚡ REGISTRAR PARTIDO</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configura un nuevo registro en directo: elige vídeo, partido y botonera, y empieza a etiquetar eventos con el cronómetro activo.
            </p>
          </button>

          <button
            onClick={() => setPageMode('edit')}
            className="group p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 text-left transition-all shadow-xl"
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
      )}

      {/* ----------------- SETUP WIZARD (Antes de comenzar un nuevo registro) ----------------- */}
      {pageMode === 'analysis' && !isSessionConfigured && (
        <BotoneraSetupWizard
          matches={matches}
          templates={dbStore.getBotoneraTemplates()}
          onComplete={handleSetupComplete}
        />
      )}

      {/* ----------------- MODO 1: MODO ANÁLISIS / ETIQUETADO EN DIRECTO ----------------- */}
      {pageMode === 'analysis' && isSessionConfigured && (
        <div className="space-y-4 animate-fade-in">
          {videoType && videoType !== 'none' && !isVideoPoppedOut ? (
            /*
             * LAYOUT 1 — CON VÍDEO EN PÁGINA
             * ┌─────────────────────────┬──────────────────────────┐
             * │  Vídeo (arriba)         │  Crono (barra compacta)  │
             * │                         │  Botonera completa       │
             * │  Feed Eventos (abajo)   │  Estadísticas            │
             * └─────────────────────────┴──────────────────────────┘
             */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* ── COLUMNA IZQUIERDA (7/12): Vídeo + Feed de Eventos ── */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <BotoneraVideoPlayer
                  videoType={videoType}
                  videoUrl={videoUrl}
                  videoFile={videoFile}
                  videoSourceName={videoSourceName}
                  isPoppedOut={false}
                  onTogglePopOut={(popped) => setIsVideoPoppedOut(popped)}
                  onVideoRef={(el) => { videoElementRef.current = el; }}
                  onIframeRef={handleIframeRef}
                  periodVideoOffsets={periodVideoOffsets}
                  onClearPeriodOffset={(p) =>
                    setPeriodVideoOffsets((prev) => {
                      const next = { ...prev };
                      delete next[p];
                      return next;
                    })
                  }
                />

                {/* Feed de Eventos — directamente debajo del vídeo */}
                <BotoneraEventLog
                  events={events}
                  onDeleteEvent={handleDeleteEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onClearAllEvents={handleClearAllEvents}
                  onExportXml={handleExportXml}
                  onExportJson={handleExportJson}
                  onSeekToEvent={handleSeekToEvent}
                />
              </div>

              {/* ── COLUMNA DERECHA (5/12): Cronómetro → Botonera → Stats ── */}
              <div className="lg:col-span-5 flex flex-col gap-4">

                {/* 1. Cronómetro compacto — DIRECTAMENTE encima de la botonera */}
                <BotoneraStopwatch
                  period={period}
                  onPeriodChange={setPeriod}
                  timerSeconds={timerSeconds}
                  onTimerChange={setTimerSeconds}
                  isTimerRunning={isTimerRunning}
                  onToggleTimer={handleToggleTimer}
                  onResetTimer={handleResetTimer}
                  onTimerStarted={handleTimerStarted}
                  onSeekVideoToNow={handleSeekVideoToNow}
                  hasVideoSync={period in periodVideoOffsets}
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
                <BotoneraLiveStats events={events} />
              </div>
            </div>
          ) : (
            /*
             * LAYOUT 2 — VÍDEO EN VENTANA EXTERNA O SIN VÍDEO
             * ┌──────────────────────────────────────┬────────────────────┐
             * │  Cronómetro compacto                 │  Feed de Eventos   │
             * │  [Banner pop-out si aplica]          │                    │
             * │  Selector Jugadores + Botonera grande│  Estadísticas      │
             * └──────────────────────────────────────┴────────────────────┘
             */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* ── COLUMNA IZQUIERDA GRANDE (7/12): Crono + Botonera ── */}
              <div className="lg:col-span-7 flex flex-col gap-4">

                {/* 1. Cronómetro compacto — encima de la botonera */}
                <BotoneraStopwatch
                  period={period}
                  onPeriodChange={setPeriod}
                  timerSeconds={timerSeconds}
                  onTimerChange={setTimerSeconds}
                  isTimerRunning={isTimerRunning}
                  onToggleTimer={handleToggleTimer}
                  onResetTimer={handleResetTimer}
                  onTimerStarted={handleTimerStarted}
                  onSeekVideoToNow={handleSeekVideoToNow}
                  hasVideoSync={period in periodVideoOffsets}
                />

                {/* Banner informativo si el vídeo está en ventana aparte */}
                {videoType && videoType !== 'none' && (
                  <BotoneraVideoPlayer
                    videoType={videoType}
                    videoUrl={videoUrl}
                    videoFile={videoFile}
                    videoSourceName={videoSourceName}
                    isPoppedOut={true}
                    onTogglePopOut={(popped) => setIsVideoPoppedOut(popped)}
                  />
                )}

                {/* Selector de Jugadores + Botonera en grande */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <BotoneraPlayerSelector
                      players={players}
                      selectedPlayerId={selectedPlayerId}
                      onSelectPlayer={(p) => setSelectedPlayerId(p ? p.id : null)}
                      onAddPlayer={handleAddPlayer}
                      homeTeamName={selectedMatch ? selectedMatch.home_team : 'Shabab Al Ordon Club'}
                      awayTeamName={selectedMatch ? selectedMatch.away_team : 'Rival SC'}
                    />
                  </div>
                  <div className="col-span-8">
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

              {/* ── COLUMNA DERECHA (5/12): Feed + Stats ── */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <BotoneraEventLog
                  events={events}
                  onDeleteEvent={handleDeleteEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onClearAllEvents={handleClearAllEvents}
                  onExportXml={handleExportXml}
                  onExportJson={handleExportJson}
                  onSeekToEvent={handleSeekToEvent}
                />

                <BotoneraLiveStats events={events} />
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
            onTimerChange={setTimerSeconds}
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

      {/* ----------------- EVENT TAGGING MODAL (DESCRIPTORS + PITCH) ----------------- */}
      {eventModalData && (
        <BotoneraEventModal
          button={eventModalData.button}
          initialGlobalDescriptors={eventModalData.activeDescriptors}
          onSave={(finalDescriptors, pitchData) => commitEvent(eventModalData.button, finalDescriptors, pitchData)}
          onCancel={() => setEventModalData(null)}
        />
      )}
    </div>
  );
}
