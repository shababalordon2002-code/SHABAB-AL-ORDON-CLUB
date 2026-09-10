'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Trophy,
  UploadCloud,
  ArrowLeft,
  Search,
  FileCode,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Database,
  AlertCircle,
  Activity,
  Maximize2,
  Radio,
  PlayCircle,
  FolderOpen,
  Plus,
  Eye,
  Edit3,
  Trash2,
  User,
  Video
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Match, NormalizedEvent, ActiveBotoneraSession, MatchAnalysis } from '@/types';
import { PitchViewer } from '@/components/pitch/PitchViewer';
import { PitchFilterBar, FilterState } from '@/components/pitch/PitchFilterBar';
import { MatchTimeline } from '@/components/pitch/MatchTimeline';
import { MatchStatsPanel } from '@/components/pitch/MatchStatsPanel';
import { AnalysisVisor } from '@/components/analysis/AnalysisVisor';

export default function PartidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveBotoneraSession | null>(null);
  const [analyses, setAnalyses] = useState<MatchAnalysis[]>([]);
  const [activeVisorAnalysis, setActiveVisorAnalysis] = useState<MatchAnalysis | null>(null);

  const [activeTab, setActiveTab] = useState<'pitch' | 'table'>('pitch');
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    team: 'todos',
    player: 'todos',
    category: 'todas',
    period: 'todos',
    minMinute: 0,
    maxMinute: 90,
  });

  useEffect(() => {
    const loadMatchData = () => {
      const m = dbStore.getMatchById(matchId);
      if (m) {
        setMatch(m);
        const evs = dbStore.getNormalizedEvents(matchId);
        setEvents(evs);
      }
      dbStore.syncActiveSessionFromSupabase(matchId).then((sess) => {
        if (sess && sess.selectedMatchId === matchId) {
          setActiveSession(sess);
        }
      });
      dbStore.syncAnalysesFromSupabase(matchId).then((ans) => {
        if (ans && ans.length > 0) {
          setAnalyses(ans);
          const updatedMatch = dbStore.getMatchById(matchId);
          if (updatedMatch) {
            setMatch(updatedMatch);
            setEvents(dbStore.getNormalizedEvents(matchId));
          }
        } else {
          setAnalyses(dbStore.getAnalyses(matchId));
        }
      });
    };

    loadMatchData();

    // Auto-refresh: re-pull match/analysis data every 5 min so viewers see
    // events registered live by analysts in Botonera without reloading.
    const interval = setInterval(loadMatchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [matchId]);

  const handleDeleteAnalysisCard = (analysisId: string) => {
    if (confirm('¿Estás seguro de eliminar esta tarjeta de análisis?')) {
      dbStore.deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    }
  };

  const handleUpdateAnalysisCard = (updated: MatchAnalysis) => {
    dbStore.saveAnalysis(updated);
    setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (updated.match_id === matchId && updated.events) {
      setEvents(updated.events);
    }
  };

  if (!match) {
    return (
      <div className="p-12 text-center space-y-4">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-300">Partido no encontrado</h2>
        <Link href="/partidos" className="text-xs text-emerald-400 hover:underline">
          Volver a la lista de partidos
        </Link>
      </div>
    );
  }

  // Extract Teams, Players & Categories for Filter options
  const teams = Array.from(new Set(events.map((e) => e.team_name))).filter(Boolean) as string[];
  const players = Array.from(new Set(events.map((e) => e.player_name))).filter(Boolean);
  const categories = Array.from(new Set(events.map((e) => e.category))).filter(Boolean);

  // Apply Real-time Filters
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

  const handleResetFilters = () => {
    setFilters({
      team: 'todos',
      player: 'todos',
      category: 'todas',
      period: 'todos',
      minMinute: 0,
      maxMinute: 90,
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/partidos"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Volver a Partidos</span>
      </Link>

      {/* Match Header Hero Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{match.date}</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{match.competition}</span>
              <span>•</span>
              <span className="text-slate-400">Duración: {match.duration || "90' 00\""}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-4">
              <span>{match.home_team}</span>
              <span className="px-3 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold">
                {match.home_score} - {match.away_score}
              </span>
              <span>{match.away_team}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const targetAnalysis = analyses[0] || {
                  id: `analysis_${match.id}`,
                  match_id: match.id,
                  title: `Análisis ${match.home_team} vs ${match.away_team}`,
                  analyst_name: 'Analista Principal (SAO)',
                  status: 'completed' as const,
                  video_type: match.video_type || (match.video_url ? (match.video_url.includes('http') ? 'link' : 'local') : undefined),
                  video_url: match.video_url,
                  video_source_name: match.video_source_name,
                  p1_video_start_time: match.p1_video_start_time,
                  p2_video_start_time: match.p2_video_start_time,
                  events: events,
                  created_at: match.date || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                setActiveVisorAnalysis(targetAnalysis);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>Abrir Visor (Vídeo + Botonera)</span>
            </button>

            <Link
              href={`/botonera?match_id=${match.id}&mode=tag`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all"
            >
              <PlayCircle className="w-4 h-4 stroke-[2.5]" />
              <span>{activeSession ? 'Reanudar Análisis' : 'Analizar / Etiquetar en Vivo'}</span>
            </Link>

            <Link
              href={`/importar-xml?match_id=${match.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <UploadCloud className="w-4 h-4 stroke-[2.5]" />
              <span>Re-importar XML</span>
            </Link>
          </div>
        </div>

        {activeSession && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-extrabold text-white text-sm">Este partido tiene un análisis en directo en marcha</p>
                <p className="text-slate-400 text-xs">Guardado en Supabase con {activeSession.events?.length || 0} eventos registrados.</p>
              </div>
            </div>

            <Link
              href={`/botonera?match_id=${match.id}&mode=tag`}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-rose-950/40 flex items-center gap-2 whitespace-nowrap transition-all shrink-0"
            >
              <PlayCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Reanudar / Entrar en el Análisis</span>
            </Link>
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pitch'
                ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Visor de Campo Interactivo & Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'table'
                ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tabla de Eventos & Metadata Raw</span>
          </button>
        </div>
      </div>

      {/* Section: Tarjetas de Análisis Realizados */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Tarjetas de Análisis Realizados ({analyses.length})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Abre cualquier análisis en formato Visor (vídeo + mapa de campo + edición directa) o edítalo en la botonera.
            </p>
          </div>

          <Link
            href={`/botonera?match_id=${match.id}&mode=tag`}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Crear Nuevo Análisis</span>
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
            <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">Aún no hay tarjetas de análisis guardadas para este partido.</p>
            <p className="text-[11px] text-slate-500">Puedes crear un nuevo análisis etiquetado en vivo o por vídeo haciendo clic en &quot;Crear Nuevo Análisis&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((an) => (
              <div key={an.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 space-y-3 transition-all flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60">
                    <span className="font-mono text-slate-300">{new Date(an.updated_at || an.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      an.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {an.status === 'completed' ? 'Finalizado' : 'En progreso'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-white mt-2.5 line-clamp-1">{an.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 line-clamp-1">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{an.analyst_name || 'Analista Principal'}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-300 font-mono">
                    <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      {an.events?.length || 0} eventos
                    </span>
                    {an.video_type && (
                      <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-sky-400 flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span>{an.video_type === 'link' ? 'Vídeo URL' : an.video_type === 'local' ? 'Vídeo Local' : 'Sin vídeo'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setActiveVisorAnalysis(an)}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Abrir Visor</span>
                  </button>

                  <Link
                    href={`/botonera?match_id=${match.id}&analysis_id=${an.id}&mode=tag`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
                    title="Editar en Botonera"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDeleteAnalysisCard(an.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition-colors"
                    title="Eliminar Tarjeta de Análisis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: INTERACTIVE PITCH & TIMELINE */}
      {activeTab === 'pitch' && (
        <div className="space-y-6">
          {/* Real-time Filter Bar */}
          <PitchFilterBar
            filters={filters}
            teams={teams}
            players={players}
            categories={categories}
            onChangeFilter={setFilters}
            onReset={handleResetFilters}
          />

          {/* Main Pitch Grid: 2/3 Pitch + 1/3 Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Campo de Fútbol Interactivo */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  Campo de Fútbol ({filteredEvents.length} eventos en vista)
                </span>
                <span className="text-[10px] text-emerald-400 italic">Pasa el ratón o haz clic sobre un evento</span>
              </div>

              <PitchViewer
                events={filteredEvents}
                selectedEventId={selectedEvent?.event_id || null}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  const targetAnalysis = analyses[0] || {
                    id: `analysis_${match.id}`,
                    match_id: match.id,
                    title: `Análisis ${match.home_team} vs ${match.away_team}`,
                    analyst_name: 'Analista Principal (SAO)',
                    status: 'completed' as const,
                    video_type: match.video_type || (match.video_url ? (match.video_url.includes('http') ? 'link' : 'local') : undefined),
                    video_url: match.video_url,
                    video_source_name: match.video_source_name,
                    p1_video_start_time: match.p1_video_start_time,
                    p2_video_start_time: match.p2_video_start_time,
                    events: events,
                    created_at: match.date || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  setActiveVisorAnalysis(targetAnalysis);
                }}
              />
            </div>

            {/* Right 1 Col: Estadísticas Calculadas */}
            <div>
              <MatchStatsPanel events={filteredEvents} />
            </div>
          </div>

          {/* Horizontal Timeline */}
          <MatchTimeline
            events={filteredEvents}
            selectedEventId={selectedEvent?.event_id || null}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
          />
        </div>
      )}

      {/* TAB 2: DETAILED EVENTS TABLE */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 font-mono">Min : Seg</th>
                    <th className="py-3 px-3 font-mono text-center">Duración</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Nombre Evento</th>
                    <th className="py-3 px-3">Jugador</th>
                    <th className="py-3 px-3">Equipo</th>
                    <th className="py-3 px-3 text-center">Posición (X, Y)</th>
                    <th className="py-3 px-3 text-center">Pos. Final (X, Y)</th>
                    <th className="py-3 px-3 text-right">Info Adicional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                        No hay eventos registrados en este partido.
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => {
                      const isPendingPlayer = evt.player_name.includes('pendiente de asociar');

                      return (
                        <tr key={evt.event_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                            {evt.minute !== null ? `${evt.minute}' ${evt.second?.toString().padStart(2, '0')}"` : '-'}
                          </td>
                          <td className="py-3 px-3 font-mono text-center text-slate-400">
                            {evt.duration !== null ? `${evt.duration}s` : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                              {evt.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {evt.event_type}
                          </td>
                          <td className="py-3 px-3">
                            {isPendingPlayer ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Jugador pendiente de asociar</span>
                              </span>
                            ) : (
                              <span className="font-medium text-slate-200">{evt.player_name}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{evt.team_name || '-'}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-300 text-[10px]">
                            {evt.x !== null && evt.y !== null ? `(${evt.x}, ${evt.y})` : <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-300 text-[10px]">
                            {evt.end_x !== null && evt.end_y !== null ? `(${evt.end_x}, ${evt.end_y})` : <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedEvent(evt)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700 transition-colors"
                            >
                              Metadata JSON
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Selected Event Information Panel */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Detalle de Evento Seleccionado</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Jugador</span>
                <p className="font-bold text-white mt-0.5">{selectedEvent.player_name}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Categoría / Evento</span>
                <p className="font-bold text-emerald-400 mt-0.5">{selectedEvent.category} ({selectedEvent.event_type})</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Minuto / Segundo</span>
                <p className="font-bold font-mono text-slate-200 mt-0.5">
                  {selectedEvent.minute !== null ? `${selectedEvent.minute}' ${selectedEvent.second?.toString().padStart(2, '0')}"` : '-'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Resultado / Outcome</span>
                <p className="font-bold text-amber-400 mt-0.5">{selectedEvent.outcome || 'Registrado'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Metadata JSON Raw</span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Visor Modal when selecting an analysis card */}
      {activeVisorAnalysis && match && (
        <AnalysisVisor
          match={match}
          analysis={activeVisorAnalysis}
          onClose={() => setActiveVisorAnalysis(null)}
          onUpdateAnalysis={(updated) => handleUpdateAnalysisCard(updated)}
        />
      )}
    </div>
  );
}
