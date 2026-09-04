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
  Maximize2
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Match, NormalizedEvent } from '@/types';
import { PitchViewer } from '@/components/pitch/PitchViewer';
import { PitchFilterBar, FilterState } from '@/components/pitch/PitchFilterBar';
import { MatchTimeline } from '@/components/pitch/MatchTimeline';
import { MatchStatsPanel } from '@/components/pitch/MatchStatsPanel';

export default function PartidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
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
    const m = dbStore.getMatchById(matchId);
    if (m) {
      setMatch(m);
      const evs = dbStore.getNormalizedEvents(matchId);
      setEvents(evs);
    }
  }, [matchId]);

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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{match.date}</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">{match.competition}</span>
              <span>•</span>
              <span className="text-slate-400">Duración: {match.duration || "90' 00\""}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-4">
              <span>{match.home_team}</span>
              <span className="px-3 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold">
                {match.home_score} - {match.away_score}
              </span>
              <span>{match.away_team}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/importar-xml?match_id=${match.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <UploadCloud className="w-4 h-4 stroke-[2.5]" />
              <span>Re-importar XML</span>
            </Link>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
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
                onSelectEvent={(evt) => setSelectedEvent(evt)}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
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

            <div className="grid grid-cols-2 gap-3 text-xs">
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
    </div>
  );
}
