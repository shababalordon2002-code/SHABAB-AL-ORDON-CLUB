'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  UploadCloud,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Globe,
  FileCode2,
  ExternalLink,
  AlertCircle,
  Radio,
  PlayCircle
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Match, ActiveBotoneraSession } from '@/types';

export default function PartidosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeSessionsMap, setActiveSessionsMap] = useState<Record<string, ActiveBotoneraSession>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [importFilter, setImportFilter] = useState<string>('todos');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const loadMatches = async () => {
    setMatches(dbStore.getMatches());
    const synced = await dbStore.syncMatchesFromSupabase();
    if (synced && synced.length > 0) {
      setMatches(synced);
    }
  };

  useEffect(() => {
    loadMatches();
    dbStore.getAllActiveSessions().then((sessions) => {
      if (sessions) setActiveSessionsMap(sessions);
    });
  }, []);

  const handleScrapeFlashscore = async () => {
    setIsScraping(true);
    setScrapeMessage('Conectando con Flashscore y extrayendo partidos con sus marcadores oficiales...');

    try {
      const res = await fetch('/api/scrape-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 15 })
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.matches)) {
        let addedCount = 0;
        data.matches.forEach((scrapedMatch: Match) => {
          dbStore.saveMatch(scrapedMatch);
          addedCount++;
        });

        loadMatches();
        setScrapeMessage(`¡Éxito! Se han descargado y actualizado ${data.matches.length} partidos con sus marcadores de Flashscore.`);
      } else {
        setScrapeMessage(`Error: ${data.error || 'No se pudieron descargar partidos'}`);
      }
    } catch (err: any) {
      console.error('Error al realizar el scraping:', err);
      setScrapeMessage(`Error en el proceso de scraping: ${err.message || err}`);
    } finally {
      setIsScraping(false);
      setTimeout(() => {
        setScrapeMessage(null);
      }, 7000);
    }
  };

  const filteredMatches = matches.filter(m => {
    const matchesSearch = 
      m.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.competition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.round && m.round.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;
    const matchesImport = importFilter === 'todos' || m.import_status === importFilter;

    return matchesSearch && matchesStatus && matchesImport;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Gestión de Partidos</span>
          </h1>
          <p className="text-xs text-slate-400">
            Registro de encuentros, sincronización de marcadores de Flashscore e importación de datos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScrapeFlashscore}
            disabled={isScraping}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-950/40 transition-all cursor-pointer"
          >
            <Globe className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Sincronizando de Flashscore...' : 'Sincronizar Flashscore (Resultados)'}</span>
          </button>

          <Link
            href="/importar-xml"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-red-950/40 transition-all"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.5]" />
            <span>Importar XML</span>
          </Link>
        </div>
      </div>

      {/* Scrape Notification Banner */}
      {scrapeMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
          scrapeMessage.includes('Error') 
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' 
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {scrapeMessage.includes('Error') ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{scrapeMessage}</span>
          </div>
          <button 
            onClick={() => setScrapeMessage(null)}
            className="text-slate-400 hover:text-white underline ml-4 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar rival, liga o jornada..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="Finalizado">Finalizados</option>
            <option value="Programado">Programados</option>
          </select>

          <select
            value={importFilter}
            onChange={e => setImportFilter(e.target.value)}
            className="py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="todos">Estado XML (Todos)</option>
            <option value="XML Importado">XML Importado</option>
            <option value="Pendiente">Pendiente XML</option>
          </select>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map((m) => {
          const isShababHome = m.home_team.toLowerCase().includes('shabab al ordon');
          const isShababAway = m.away_team.toLowerCase().includes('shabab al ordon');
          const activeSession = activeSessionsMap[m.id];

          return (
            <div key={m.id} className={`p-5 rounded-2xl bg-slate-900/90 border space-y-4 card-hover-effect relative flex flex-col justify-between shadow-xl ${
              activeSession ? 'border-rose-500/60 ring-1 ring-rose-500/30' : 'border-slate-800/80'
            }`}>
              <div>
                {/* Top row: Date/Time + League & Round */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2.5 border-b border-slate-800/60 gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{m.date} {m.time ? `• ${m.time}` : ''}</span>
                  </div>
                  
                  <span className="font-semibold text-amber-400 text-right truncate" title={`${m.competition} ${m.round ? '- ' + m.round : ''}`}>
                    {m.competition} {m.round ? `• ${m.round}` : ''}
                  </span>
                </div>

                {/* Teams with Logos & Scores */}
                <div className="py-4 space-y-3">
                  {/* Home Team */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {m.home_team_logo ? (
                        <img 
                          src={m.home_team_logo} 
                          alt={m.home_team} 
                          className="w-6 h-6 object-contain shrink-0 rounded bg-slate-950 p-0.5"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                          {m.home_team.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`font-bold text-xs truncate ${isShababHome ? 'text-amber-400' : 'text-slate-200'}`}>
                        {m.home_team}
                      </span>
                    </div>

                    <span className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg border shrink-0 ${
                      m.status === 'Finalizado' 
                        ? 'bg-slate-950 text-amber-400 border-amber-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}>
                      {m.status === 'Finalizado' ? m.home_score : '-'}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {m.away_team_logo ? (
                        <img 
                          src={m.away_team_logo} 
                          alt={m.away_team} 
                          className="w-6 h-6 object-contain shrink-0 rounded bg-slate-950 p-0.5"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                          {m.away_team.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`font-bold text-xs truncate ${isShababAway ? 'text-amber-400' : 'text-slate-200'}`}>
                        {m.away_team}
                      </span>
                    </div>

                    <span className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg border shrink-0 ${
                      m.status === 'Finalizado' 
                        ? 'bg-slate-950 text-amber-400 border-amber-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}>
                      {m.status === 'Finalizado' ? m.away_score : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="space-y-3 pt-3 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-300 font-semibold">
                      {activeSession?.events?.length ?? m.event_count} eventos
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {m.flashscore_url && (
                      <a
                        href={m.flashscore_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-400 border border-sky-800/60 transition-colors"
                        title="Ver resultado en Flashscore"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {activeSession ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                        <Radio className="w-3 h-3 text-rose-400" />
                        <span>En marcha</span>
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        m.status === 'Finalizado'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {m.status === 'Finalizado' ? `Finalizado (${m.home_score}-${m.away_score})` : 'Programado'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {activeSession && (
                    <Link
                      href={`/botonera?match_id=${m.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-rose-950/40 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlayCircle className="w-4 h-4 stroke-[2.5]" />
                      <span>Entrar en el Análisis</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/partidos/${m.id}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 text-center transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Ver Detalle & Eventos</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    {m.import_status !== 'XML Importado' && (
                      <Link
                        href={`/importar-xml?match_id=${m.id}`}
                        className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                        title="Importar XML para este partido"
                      >
                        <UploadCloud className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
