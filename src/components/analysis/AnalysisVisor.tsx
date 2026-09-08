'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Video,
  Edit3,
  X,
  Activity,
  Layers,
  Eye,
  Lock,
} from 'lucide-react';
import { Match, MatchAnalysis, NormalizedEvent, BotoneraProjectVideoType } from '@/types';
import { PitchViewer } from '@/components/pitch/PitchViewer';
import { PitchFilterBar, FilterState } from '@/components/pitch/PitchFilterBar';
import { MatchTimeline } from '@/components/pitch/MatchTimeline';
import { MatchStatsPanel } from '@/components/pitch/MatchStatsPanel';
import { BotoneraVideoPlayer } from '@/components/botonera/BotoneraVideoPlayer';
import { BotoneraEventLog } from '@/components/botonera/BotoneraEventLog';
import { BotoneraLiveStats } from '@/components/botonera/BotoneraLiveStats';
import { dbStore } from '@/lib/store/db-store';

interface AnalysisVisorProps {
  match: Match;
  analysis: MatchAnalysis;
  onClose: () => void;
  onUpdateAnalysis: (updated: MatchAnalysis) => void;
}

export const AnalysisVisor: React.FC<AnalysisVisorProps> = ({
  match,
  analysis,
  onClose,
}) => {
  const events = analysis.events || [];
  const [activeTab, setActiveTab] = useState<'editor_view' | 'pitch'>('editor_view');
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);

  // Video State & Binding
  const videoFile = null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const resolvedVideoUrl = analysis.video_url || match.video_url || null;
  const resolvedVideoType: BotoneraProjectVideoType =
    analysis.video_type ||
    match.video_type ||
    (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : 'none');
  const resolvedVideoSourceName =
    analysis.video_source_name || match.video_source_name || (resolvedVideoUrl ? 'Vídeo del Partido' : null);

  const periodVideoOffsets: Record<number, number> = {};
  const p1 = analysis.p1_video_start_time ?? match.p1_video_start_time;
  const p2 = analysis.p2_video_start_time ?? match.p2_video_start_time;
  if (p1 != null) periodVideoOffsets[1] = p1;
  if (p2 != null) periodVideoOffsets[2] = p2;

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  const handleIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
  }, []);

  const seekVideoTo = (videoTime: number, alsoPlay = true) => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoTime;
      if (alsoPlay && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    } else if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [videoTime, true] }), '*');
      if (alsoPlay) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      }
    }
  };

  // Filter State for pitch tab
  const [filters, setFilters] = useState<FilterState>({
    team: 'todos',
    player: 'todos',
    category: 'todas',
    period: 'todos',
    minMinute: 0,
    maxMinute: 90,
  });

  const teams = Array.from(new Set(events.map((e) => e.team_name))).filter(Boolean) as string[];
  const playerNames = Array.from(new Set(events.map((e) => e.player_name))).filter(Boolean);
  const categories = Array.from(new Set(events.map((e) => e.category))).filter(Boolean);

  const filteredEvents = events.filter((e) => {
    const matchTeam = filters.team === 'todos' || e.team_name === filters.team;
    const matchPlayer = filters.player === 'todos' || e.player_name === filters.player;
    const matchCategory = filters.category === 'todas' || e.category === filters.category;
    const matchPeriod =
      filters.period === 'todos' ||
      (filters.period === '1' && (e.period === 1 || (e.minute !== null && e.minute <= 45))) ||
      (filters.period === '2' && (e.period === 2 || (e.minute !== null && e.minute > 45)));

    const minute = e.minute !== null ? e.minute : Math.floor((e.timestamp || 0) / 60);
    const matchMinute = minute >= filters.minMinute && minute <= filters.maxMinute;

    return matchTeam && matchPlayer && matchCategory && matchPeriod && matchMinute;
  });

  // Jump Video to Event Timestamp (considering period video offsets for 1st vs 2nd half)
  const handleSeekToEvent = (evt: NormalizedEvent) => {
    setSelectedEvent(evt);
    const matchSec = evt.timestamp ?? (evt.minute !== null ? evt.minute * 60 + (evt.second || 0) : 0);
    const evtPeriod = evt.period ?? (matchSec >= 2700 ? 2 : 1);

    const p1Offset = analysis.p1_video_start_time ?? match?.p1_video_start_time ?? 0;
    const p2Offset = analysis.p2_video_start_time ?? match?.p2_video_start_time ?? 0;

    let targetVideoTime = matchSec;
    if (evtPeriod === 1) {
      targetVideoTime = p1Offset + matchSec;
    } else if (evtPeriod >= 2) {
      const matchSecInPeriod = Math.max(0, matchSec - 2700);
      targetVideoTime = p2Offset + matchSecInPeriod;
    }

    const seekTime = Math.max(0, targetVideoTime - 12);
    seekVideoTo(seekTime, true);
  };

  const handleExportXml = () => {
    const homeName = match ? match.home_team : 'Shabab Al Ordon Club';
    const awayName = match ? match.away_team : 'Rival SC';

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
      xmlString += `    </event>\n`;
    });

    xmlString += `  </events>\n</longomatch_project>`;

    const blob = new Blob([xmlString], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `longomatch_${match.home_team}_vs_${match.away_team}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `events_${match.home_team}_vs_${match.away_team}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const templates = dbStore.getBotoneraTemplates();
  const activeTemplate =
    templates.find((t) => t.id === analysis.botonera_template_id || t.id === match.botonera_template_id) ||
    templates[0];
  const templateButtons = activeTemplate?.buttons || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-1 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[98vw] w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in my-auto">
        {/* Visor Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  VISOR DE ANÁLISIS (SOLO LECTURA)
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {match.home_team} vs {match.away_team}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{analysis.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/botonera?match_id=${match.id}&analysis_id=${analysis.id}&mode=tag`}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5]" />
              <span>Editar en Botonera</span>
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('editor_view')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'editor_view'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Vista Editor (Vídeo + Feed + Estadísticas)</span>
          </button>

          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'pitch'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Campograma Táctico, Mapas & Timeline</span>
          </button>
        </div>

        {/* Visor Main Body Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* TAB 1: ESTRUCTURA EXACTA DEL EDITOR (VÍDEO + FEED IZQUIERDA, SIN BOTONERA + ESTADÍSTICAS DERECHA) */}
          {activeTab === 'editor_view' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* ── COLUMNA IZQUIERDA (7/12): Reproductor de Vídeo Sincronizado + Feed de Registros (Solo Lectura) ── */}
              <div className="lg:col-span-7 flex flex-col gap-5 h-full">
                <BotoneraVideoPlayer
                  videoType={resolvedVideoType}
                  videoUrl={resolvedVideoUrl}
                  videoSourceName={resolvedVideoSourceName}
                  isPoppedOut={false}
                  onVideoRef={handleVideoRef}
                  onIframeRef={handleIframeRef}
                  periodVideoOffsets={periodVideoOffsets}
                  onSeekVideoToTime={(t) => seekVideoTo(t, true)}
                />

                <BotoneraEventLog
                  events={events}
                  onSeekToEvent={handleSeekToEvent}
                  onExportXml={handleExportXml}
                  onExportJson={handleExportJson}
                  buttons={templateButtons}
                  readOnly={true}
                />
              </div>

              {/* ── COLUMNA DERECHA (5/12): Estadísticas Provisionales + Panel de Métricas Detalladas (Sin Botonera) ── */}
              <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                <BotoneraLiveStats
                  events={events}
                  videoUrl={resolvedVideoUrl}
                  onSeekVideoToTime={(t) => seekVideoTo(t, true)}
                  onSeekToEvent={handleSeekToEvent}
                  buttons={templateButtons}
                />
                <MatchStatsPanel events={events} />
              </div>
            </div>
          )}

          {/* TAB 2: PITCH CAMPOGRAMA & TIMELINE */}
          {activeTab === 'pitch' && (
            <div className="space-y-5">
              <PitchFilterBar
                filters={filters}
                teams={teams}
                players={playerNames}
                categories={categories}
                onChangeFilter={setFilters}
                onReset={() =>
                  setFilters({
                    team: 'todos',
                    player: 'todos',
                    category: 'todas',
                    period: 'todos',
                    minMinute: 0,
                    maxMinute: 90,
                  })
                }
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-3">
                  <PitchViewer
                    events={filteredEvents}
                    selectedEventId={selectedEvent?.event_id || null}
                    onSelectEvent={(evt) => handleSeekToEvent(evt)}
                  />
                </div>

                <div>
                  <MatchStatsPanel events={filteredEvents} />
                </div>
              </div>

              <MatchTimeline
                events={filteredEvents}
                selectedEventId={selectedEvent?.event_id || null}
                onSelectEvent={(evt) => handleSeekToEvent(evt)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
