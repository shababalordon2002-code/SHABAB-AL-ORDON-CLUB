'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  UploadCloud,
  Users,
  Activity,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  FileCheck2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Match, ImportLog, Player } from '@/types';

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);

  useEffect(() => {
    // Load store data
    const m = dbStore.getMatches();
    const p = dbStore.getPlayers();
    const l = dbStore.getImportLogs();
    const allEvents = dbStore.getNormalizedEvents();

    setMatches(m);
    setPlayers(p);
    setImportLogs(l);

    // Sum event counts from imported matches
    const countFromMatches = m.reduce((acc, match) => acc + (match.event_count || 0), 0);
    setTotalEvents(Math.max(countFromMatches, allEvents.length));
  }, []);

  const importedMatchesCount = matches.filter(m => m.import_status === 'XML Importado').length;
  const recentMatches = matches.filter(m => m.status === 'Finalizado').slice(0, 5);
  const upcomingMatches = matches.filter(m => m.status === 'Programado').slice(0, 3);
  const lastImport = importLogs.length > 0 ? importLogs[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden shadow-xl">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
              FASE 1: INGESTIÓN & NORMALIZACIÓN XML
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium">
              LongoMatch Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <img src="/logo.png" alt="Shabab Al Ordon" className="w-8 h-8 object-contain drop-shadow" />
            <span>Shabab Al Ordon Club</span>
            <span className="text-emerald-400 text-lg font-semibold">| Analytics SaaS</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Gestión de partidos, análisis estructurado e importación segura de XMLs de LongoMatch con capa de normalización de datos.
          </p>
        </div>

        <Link
          href="/importar-xml"
          className="z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
          <span>+ Importar XML</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Partidos Importados */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 card-hover-effect">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Partidos Importados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{importedMatchesCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">de {matches.length} partidos</span>
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> XMLs procesados correctamente
          </p>
        </div>

        {/* Card 2: Eventos Registrados */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 card-hover-effect">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Eventos Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{totalEvents.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500 font-medium">en modelo normalizado</span>
          </div>
          <p className="text-[11px] text-blue-400 flex items-center gap-1 font-medium">
            <FileCheck2 className="w-3 h-3" /> Convertidos a NormalizedEvent
          </p>
        </div>

        {/* Card 3: Jugadores Registrados */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 card-hover-effect">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Jugadores Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{players.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">plantilla Shabab Al Ordon</span>
          </div>
          <p className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
            <Users className="w-3 h-3" /> Con mapeo de alias activo
          </p>
        </div>

        {/* Card 4: Última Importación */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 card-hover-effect">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Última Importación</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {lastImport ? (
            <div>
              <p className="text-xs font-bold text-slate-200 truncate">{lastImport.match_title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {new Date(lastImport.imported_at).toLocaleDateString('es-ES')} • {lastImport.event_count} eventos
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  lastImport.status === 'Completado' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {lastImport.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No hay importaciones aún</p>
          )}
        </div>
      </div>

      {/* Main Content Grid: Recent Matches & Upcoming / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Partidos Recientes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Partidos Recientes</h2>
            </div>
            <Link href="/partidos" className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Encuentro</th>
                    <th className="py-3 px-4 text-center">Resultado</th>
                    <th className="py-3 px-4 text-center">Eventos</th>
                    <th className="py-3 px-4 text-center">Estado XML</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{m.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{m.home_team} vs {m.away_team}</div>
                        <div className="text-[10px] text-slate-500">{m.competition}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-bold font-mono">
                          {m.home_score} - {m.away_score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300">
                        {m.event_count > 0 ? `${m.event_count} ev.` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          m.import_status === 'XML Importado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {m.import_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/partidos/${m.id}`}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors inline-block"
                        >
                          Ver partido
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Próximos Partidos & Info Box */}
        <div className="space-y-6">
          {/* Próximos Partidos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Próximos Partidos</h2>
            </div>

            <div className="space-y-2.5">
              {upcomingMatches.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{m.date}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                      PROGRAMADO
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-100">{m.home_team} vs {m.away_team}</p>
                  <p className="text-[10px] text-slate-500">{m.competition}</p>
                  <Link
                    href={`/importar-xml?match_id=${m.id}`}
                    className="mt-2 w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/30 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Asignar XML</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Reminder Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Arquitectura Desacoplada</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Los eventos importados de LongoMatch pasan por la capa <code className="text-emerald-300 font-mono">NormalizedEvent</code>. Esto garantiza que las futuras herramientas de visualización y analítica sean agnósticas de la fuente original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
