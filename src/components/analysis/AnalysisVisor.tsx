'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  PlayCircle,
  Pause,
  RotateCcw,
  Edit3,
  Trash2,
  Plus,
  Download,
  X,
  Activity,
  Layers,
  Clock,
  User,
  Filter,
  CheckCircle2,
  FileCode2,
  Eye,
  ExternalLink,
  ChevronRight,
  Target
} from 'lucide-react';
import { Match, MatchAnalysis, NormalizedEvent, Player } from '@/types';
import { dbStore } from '@/lib/store/db-store';
import { PitchViewer } from '@/components/pitch/PitchViewer';
import { PitchFilterBar, FilterState } from '@/components/pitch/PitchFilterBar';
import { FullEventFormModal } from './FullEventFormModal';
import { MatchTimeline } from '@/components/pitch/MatchTimeline';
import { MatchStatsPanel } from '@/components/pitch/MatchStatsPanel';
import { BotoneraPitchCanvas } from '@/components/botonera/BotoneraPitchCanvas';

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
  onUpdateAnalysis,
}) => {
  const [events, setEvents] = useState<NormalizedEvent[]>(analysis.events || []);
  const [activeTab, setActiveTab] = useState<'pitch' | 'table'>('pitch');
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<NormalizedEvent | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState<boolean>(false);

  // Video State & Binding
  const [videoUrl, setVideoUrl] = useState<string>(analysis.video_url || match.video_url || '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isChangingVideo, setIsChangingVideo] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(analysis.video_url || match.video_url || '');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleSaveVideoUrl = (newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setVideoUrl(trimmed);
    setVideoFile(null);
    setIsChangingVideo(false);

    // Save to Analysis and Match in Supabase & local DB
    const updatedAnalysis: MatchAnalysis = {
      ...analysis,
      video_url: trimmed,
      updated_at: new Date().toISOString(),
    };
    dbStore.saveAnalysis(updatedAnalysis);
    onUpdateAnalysis(updatedAnalysis);

    const updatedMatch: Match = {
      ...match,
      video_url: trimmed,
    };
    dbStore.saveMatch(updatedMatch);
  };

  const handleSelectLocalVideoFile = (file: File) => {
    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setIsChangingVideo(false);

    // Update DB record with file name
    const updatedAnalysis: MatchAnalysis = {
      ...analysis,
      video_url: file.name,
      updated_at: new Date().toISOString(),
    };
    dbStore.saveAnalysis(updatedAnalysis);
    onUpdateAnalysis(updatedAnalysis);

    const updatedMatch: Match = {
      ...match,
      video_url: file.name,
    };
    dbStore.saveMatch(updatedMatch);
  };

  // Players list for event editing
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    setPlayers(dbStore.getPlayers());
  }, []);

  // Filter State
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
  const playEventVideo = (evt: NormalizedEvent) => {
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

    const seekTime = Math.max(0, targetVideoTime - 3); // 3 seconds lead time

    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      videoRef.current.play().catch(() => {});
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  const handleSaveEvents = (updatedEvents: NormalizedEvent[]) => {
    setEvents(updatedEvents);
    const updatedAnalysis: MatchAnalysis = {
      ...analysis,
      events: updatedEvents,
      updated_at: new Date().toISOString(),
    };
    dbStore.saveAnalysis(updatedAnalysis);
    onUpdateAnalysis(updatedAnalysis);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('¿Eliminar este evento del análisis?')) {
      const next = events.filter((e) => e.event_id !== eventId);
      handleSaveEvents(next);
      if (selectedEvent?.event_id === eventId) setSelectedEvent(null);
    }
  };

  const handleUpdateSingleEvent = (updatedEvt: NormalizedEvent) => {
    const next = events.map((e) => (e.event_id === updatedEvt.event_id ? updatedEvt : e));
    handleSaveEvents(next);
    setEditingEvent(null);
  };

  const handleCreateNewEvent = (newEvent: NormalizedEvent) => {
    const next = [newEvent, ...events];
    handleSaveEvents(next);
    setIsAddingEvent(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-7xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Visor Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  VISOR DE ANÁLISIS
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {match.home_team} vs {match.away_team}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{analysis.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddingEvent(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Añadir Evento</span>
            </button>

            <Link
              href={`/botonera?match_id=${match.id}&analysis_id=${analysis.id}`}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5"
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

        {/* Visor Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Top Video Player Bar - ALWAYS VISIBLE */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-wider">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Vídeo del Partido Sincronizado</span>
              </div>

              <div className="flex items-center gap-2">
                {videoUrl && !videoFile && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Enlace del Vídeo</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChangingVideo(!isChangingVideo)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isChangingVideo
                      ? 'Ocultar Selector'
                      : videoUrl || videoFile
                      ? 'Cambiar Vídeo'
                      : '🔗 Vincular / Cargar Vídeo'}
                  </span>
                </button>
              </div>
            </div>

            {/* Video Change / Binding Panel */}
            {isChangingVideo && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3 text-xs animate-fade-in">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ExternalLink className="w-4 h-4" />
                  <span>Vincular o Cargar Vídeo del Partido</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Vincula un archivo de vídeo local de tu ordenador o introduce una URL / enlace de YouTube para reproducir y sincronizar los clips.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: Local File */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-slate-400 font-bold text-[10px] uppercase">
                      📁 Archivo de Vídeo Local (MP4, MKV, AVI, MOV)
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleSelectLocalVideoFile(file);
                        }
                      }}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-slate-950 hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 2: Web URL / YouTube */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-slate-400 font-bold text-[10px] uppercase">
                      🔗 Enlace Web (YouTube o Vídeo MP4 Directo)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveVideoUrl(inputUrl)}
                        className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
                      >
                        Vincular
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Video Player Render */}
            {videoUrl || videoFile ? (
              <div className="flex flex-col md:flex-row items-center gap-4 pt-1">
                <div className="w-full md:w-80 h-44 rounded-lg bg-black overflow-hidden relative border border-slate-800 shrink-0">
                  {videoFile ? (
                    <video
                      ref={videoRef}
                      src={URL.createObjectURL(videoFile)}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                    <iframe
                      ref={iframeRef}
                      src={`https://www.youtube.com/embed/${
                        videoUrl.includes('v=')
                          ? videoUrl.split('v=')[1]?.split('&')[0]
                          : videoUrl.split('/').pop()
                      }?enablejsapi=1`}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  <p className="text-xs text-slate-300">
                    Haz clic en cualquier evento de la tabla o del campo para saltar automáticamente al segundo exacto del vídeo.
                  </p>

                  {/* Synchronization Timings */}
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400">1ª Parte empieza en:</span>
                      <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {analysis.p1_video_start_time != null
                          ? `${Math.floor(analysis.p1_video_start_time / 60).toString().padStart(2, '0')}:${Math.floor(analysis.p1_video_start_time % 60).toString().padStart(2, '0')}`
                          : match.p1_video_start_time != null
                          ? `${Math.floor(match.p1_video_start_time / 60).toString().padStart(2, '0')}:${Math.floor(match.p1_video_start_time % 60).toString().padStart(2, '0')}`
                          : '--:--'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400">2ª Parte empieza en:</span>
                      <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {analysis.p2_video_start_time != null
                          ? `${Math.floor(analysis.p2_video_start_time / 60).toString().padStart(2, '0')}:${Math.floor(analysis.p2_video_start_time % 60).toString().padStart(2, '0')}`
                          : match.p2_video_start_time != null
                          ? `${Math.floor(match.p2_video_start_time / 60).toString().padStart(2, '0')}:${Math.floor(match.p2_video_start_time % 60).toString().padStart(2, '0')}`
                          : '--:--'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                      Total Eventos: {events.length}
                    </span>
                    <span className="text-[11px] font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-emerald-400 font-bold">
                      Filtro Activo: {filteredEvents.length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <Video className="w-7 h-7 text-amber-400 mx-auto opacity-80" />
                <h4 className="font-bold text-slate-200 text-xs">Sin vídeo vinculado actualmente</h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Selecciona un archivo de vídeo local de tu equipo o pega un enlace web/YouTube arriba para reproducir el partido.
                </p>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('pitch')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'pitch'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Visor de Campo & Timeline Interactivo</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'table'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Tabla de Eventos & Edición Directa</span>
            </button>
          </div>

          {/* Filter Bar */}
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

          {/* TAB 1: PITCH & TIMELINE */}
          {activeTab === 'pitch' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-3">
                  <PitchViewer
                    events={filteredEvents}
                    selectedEventId={selectedEvent?.event_id || null}
                    onSelectEvent={(evt) => playEventVideo(evt)}
                  />
                </div>

                <div>
                  <MatchStatsPanel events={filteredEvents} />
                </div>
              </div>

              <MatchTimeline
                events={filteredEvents}
                selectedEventId={selectedEvent?.event_id || null}
                onSelectEvent={(evt) => playEventVideo(evt)}
              />
            </div>
          )}

          {/* TAB 2: DETAILED TABLE WITH INLINE ACTIONS */}
          {activeTab === 'table' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Acción</th>
                      <th className="py-3 px-3 font-mono">Min : Seg</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3">Evento</th>
                      <th className="py-3 px-3">Jugador</th>
                      <th className="py-3 px-3">Equipo</th>
                      <th className="py-3 px-3 text-center">Posición (X,Y)</th>
                      <th className="py-3 px-3 text-right">Opciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                          No hay eventos que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((evt) => (
                        <tr key={evt.event_id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => playEventVideo(evt)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                              title="Reproducir clip en el vídeo"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                            {evt.minute !== null ? `${evt.minute}' ${evt.second?.toString().padStart(2, '0')}"` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                              {evt.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">{evt.event_type}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-200">{evt.player_name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{evt.team_name || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300 text-[10px]">
                            {evt.x !== null && evt.y !== null ? `(${evt.x}, ${evt.y})` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingEvent(evt)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                                title="Editar Evento"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(evt.event_id)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                                title="Eliminar Evento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          match={match}
          players={players}
          onSave={handleUpdateSingleEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Add Event Modal */}
      {isAddingEvent && (
        <AddEventModal
          match={match}
          players={players}
          onSave={handleCreateNewEvent}
          onClose={() => setIsAddingEvent(false)}
        />
      )}
    </div>
  );
};



// Sub-component for editing an existing event
const EditEventModal: React.FC<{
  event: NormalizedEvent;
  match: Match;
  players: Player[];
  onSave: (updated: NormalizedEvent) => void;
  onClose: () => void;
}> = ({ event, match, players, onSave, onClose }) => {
  return (
    <FullEventFormModal
      initialEvent={event}
      match={match}
      players={players}
      onSave={onSave}
      onClose={onClose}
      title="Editar Evento Completo"
    />
  );
};

// Sub-component for adding a new event manually
const AddEventModal: React.FC<{
  match: Match;
  players: Player[];
  onSave: (newEvent: NormalizedEvent) => void;
  onClose: () => void;
}> = ({ match, players, onSave, onClose }) => {
  return (
    <FullEventFormModal
      match={match}
      players={players}
      onSave={onSave}
      onClose={onClose}
      title="Añadir Nuevo Evento Completo"
    />
  );
};

