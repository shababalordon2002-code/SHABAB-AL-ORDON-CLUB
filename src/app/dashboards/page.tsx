'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  Database,
  Gamepad2,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
  X,
  Eye,
  Settings,
  Radio,
  Video,
  Users,
  PlayCircle,
  Activity,
} from 'lucide-react';
import { dbStore, DEFAULT_DASHBOARD_CONFIG } from '@/lib/store/db-store';
import { createClient } from '@/lib/supabase/client';
import {
  BotoneraTemplate,
  Match,
  MatchAnalysis,
  MatchDashboard,
  NormalizedEvent,
  ActiveBotoneraSession,
  DashboardGlobalConfig,
} from '@/types';
import { createDashboard } from '@/components/dashboards/dashboard-presets';
import { AnalysisVisor } from '@/components/analysis/AnalysisVisor';
import { MatchAnalysisSelectorModal } from '@/components/analysis/MatchAnalysisSelectorModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { AdminDashboardConfigModal } from '@/components/dashboards/AdminDashboardConfigModal';
import { TacticalLineupPitch } from '@/components/pitch/TacticalLineupPitch';
import { calculateMatchScoresFromEvents } from '@/lib/analytics/dashboard-engine';

interface MatchBlock {
  match: Match;
  events: NormalizedEvent[];
  analyses: MatchAnalysis[];
  dashboards: MatchDashboard[];
}

const getYouTubeThumbnail = (url?: string | null) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
};

export default function DashboardsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [blocks, setBlocks] = useState<MatchBlock[]>([]);
  const [templates, setTemplates] = useState<BotoneraTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVisor, setActiveVisor] = useState<{ match: Match; analysis: MatchAnalysis } | null>(null);
  const [selectedMatchForAnalysis, setSelectedMatchForAnalysis] = useState<{ match: Match; analyses: MatchAnalysis[] } | null>(null);

  // Admin Customization & Live Sync States
  const [dashboardConfig, setDashboardConfig] = useState<DashboardGlobalConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeSessionsMap, setActiveSessionsMap] = useState<Record<string, ActiveBotoneraSession>>({});

  const load = () => {
    const matches = dbStore.getMatches();
    const dashboards = dbStore.getDashboards();
    setDashboardConfig(dbStore.getDashboardConfig());

    const next: MatchBlock[] = matches
      .map((match) => {
        const events = dbStore.getNormalizedEvents(match.id);
        const analyses = dbStore.getAnalyses(match.id);
        return {
          match,
          events,
          analyses,
          dashboards: dashboards.filter((d) => d.match_id === match.id),
        };
      })
      .filter((b) => b.analyses.length > 0)
      .sort((a, b) => (a.match.date < b.match.date ? 1 : -1));

    setBlocks(next);
    setTemplates(dbStore.getBotoneraTemplates());
  };

  useEffect(() => {
    load();
    setLoading(false);

    const syncAll = () =>
      Promise.all([
        dbStore.syncMatchesFromSupabase(),
        dbStore.syncDashboardsFromSupabase(),
        dbStore.syncAnalysesFromSupabase(),
        dbStore.syncBotoneraTemplatesFromSupabase(),
      ])
        .then(load)
        .catch(() => {});

    syncAll();

    // Fallback auto-refresh (in case realtime is momentarily disconnected).
    const interval = setInterval(syncAll, 5 * 60 * 1000);

    // Realtime push: any analyst saving/finishing a match's analysis, or creating
    // a match/dashboard, triggers an immediate refresh for every viewer on this page.
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncAll, 400);
    };
    const channel = supabase
      .channel('dashboards-page-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_analyses' }, debouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_dashboards' }, debouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, debouncedSync)
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Poll Active Live Session Status every 3 seconds for real-time live tagging updates
  useEffect(() => {
    const syncSessions = () => {
      dbStore.getAllActiveSessions().then((sessions) => {
        if (sessions) setActiveSessionsMap(sessions);
      });
    };
    syncSessions();
    const interval = setInterval(syncSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalDashboards = useMemo(() => blocks.reduce((acc, b) => acc + b.dashboards.length, 0), [blocks]);

  const handleDelete = (dashboard: MatchDashboard) => {
    if (!confirm(`¿Eliminar el dashboard "${dashboard.name}"?`)) return;
    dbStore.deleteDashboard(dashboard.id);
    load();
  };

  const handleDeleteAnalysis = (analysisId: string) => {
    dbStore.deleteAnalysis(analysisId);
    if (selectedMatchForAnalysis) {
      const updatedList = dbStore.getAnalyses(selectedMatchForAnalysis.match.id);
      setSelectedMatchForAnalysis({ match: selectedMatchForAnalysis.match, analyses: updatedList });
    }
    load();
  };

  // Los datos (análisis, botonera) ya están asociados al partido: se crea el dashboard
  // directamente con esos datos, sin pedir nada al usuario.
  const handleQuickCreate = (block: MatchBlock, openInEditor = false) => {
    const analysisId = block.analyses[0]?.id || null;
    const botoneraTemplateId =
      block.match.botonera_template_id ||
      block.analyses.find((a) => a.botonera_template_id)?.botonera_template_id ||
      templates.find((t) => t.isDefault)?.id ||
      templates[0]?.id ||
      null;

    const dashboard = createDashboard({
      matchId: block.match.id,
      analysisId,
      name: `Dashboard ${block.match.home_team} vs ${block.match.away_team}`,
      botoneraTemplateId,
      withStarter: true,
    });

    dbStore.saveDashboard(dashboard);
    router.push(`/dashboards/${dashboard.id}${openInEditor ? '?mode=edit' : ''}`);
  };

  return (
    <div className="p-3 sm:p-5 md:p-7 space-y-6 max-w-[1500px] mx-auto">
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Dashboards por Partido</span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Modo Admin
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Dashboard Oficial por Partido. Muestra la alineación táctica de ambos equipos, la comparativa evento a evento de la botonera y la gráfica evolutiva temporal. Haz clic en cualquier partido o evento para abrir su análisis táctico detallado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboards/acumulado"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs shadow-md transition-all flex items-center gap-2 border border-amber-500/30 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Acumulativo</span>
          </Link>

          {isAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 stroke-[2.5]" />
              <span>⚙️ Configuración Global (Admin)</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {blocks.length} partidos
            </span>
          </div>
        </div>
      </div>

      {!loading && blocks.length === 0 && (
        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Database className="w-9 h-9 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-300">Todavía no hay partidos con datos analizados</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Registra eventos con la Botonera Live o importa un XML de LongoMatch. En cuanto un partido tenga eventos,
            aparecerá aquí para visualizar su dashboard.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Link
              href="/botonera"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Ir a la Botonera</span>
            </Link>
            <Link
              href="/importar-xml"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
            >
              <span>Importar XML</span>
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {blocks.map((block) => {
          const liveSession = activeSessionsMap[block.match.id];
          const isLiveTagging = dashboardConfig.showLiveBadge && liveSession && liveSession.isTimerRunning;
          const currentEventsCount = isLiveTagging ? (liveSession.events?.length || 0) : (block.events.length || block.analyses.reduce((acc, a) => acc + (a.events?.length || 0), 0));
          const primaryAnalysis = block.analyses[0];
          const resolvedVideoUrl = primaryAnalysis?.video_url || block.match.video_url;
          const youtubeThumb = getYouTubeThumbnail(resolvedVideoUrl);

          const openVisorForMatch = () => {
            if (block.analyses.length > 1) {
              setSelectedMatchForAnalysis({ match: block.match, analyses: block.analyses });
              return;
            }

            const analysis = block.analyses[0] || {
              id: `analysis_${block.match.id}`,
              match_id: block.match.id,
              title: `Análisis ${block.match.home_team} vs ${block.match.away_team}`,
              analyst_name: 'Analista Principal (SAO)',
              status: 'completed' as const,
              video_type: block.match.video_type || (block.match.video_url ? (block.match.video_url.includes('http') ? 'link' : 'local') : undefined),
              video_url: block.match.video_url,
              video_source_name: block.match.video_source_name,
              p1_video_start_time: block.match.p1_video_start_time,
              p2_video_start_time: block.match.p2_video_start_time,
              events: block.events,
              created_at: block.match.date || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setActiveVisor({ match: block.match, analysis });
          };

          const handleCardClick = () => {
            if (block.dashboards.length > 0) {
              router.push(`/dashboards/${block.dashboards[0].id}`);
            } else {
              router.push(`/dashboards/${block.match.id}`);
            }
          };

          return (
            <div
              key={block.match.id}
              onClick={handleCardClick}
              className={`rounded-xl bg-slate-900 border p-4 space-y-3 transition-all shadow-md cursor-pointer ${
                isLiveTagging ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Live Tagging Banner */}
              {isLiveTagging && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-center justify-between gap-2 text-xs mb-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-[11px]">
                    <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>🔴 EN DIRECTO - REGISTRANDO EVENTOS LIVE</span>
                    <span className="font-mono bg-rose-950 px-1.5 py-0.5 rounded text-rose-200 border border-rose-800">
                      {currentEventsCount} eventos
                    </span>
                  </div>
                  <Link
                    href={`/botonera?match_id=${block.match.id}&mode=tag`}
                    className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] flex items-center gap-1 transition"
                  >
                    <PlayCircle className="w-3 h-3" />
                    <span>Ir a Botonera</span>
                  </Link>
                </div>
              )}

              {/* Main Compact Row: Video Thumb + Minimal Info + Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Video Thumbnail Box */}
                  <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                    {youtubeThumb ? (
                      <img
                        src={youtubeThumb}
                        alt="Vídeo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950">
                        <Video className="w-5 h-5" />
                        <span className="text-[9px] font-semibold text-slate-500 mt-0.5">Vídeo</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openVisorForMatch(); }}
                      className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/20 flex items-center justify-center transition-all cursor-pointer"
                      title="Abrir Vídeo"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow">
                        <PlayCircle className="w-4.5 h-4.5 fill-slate-950 stroke-none" />
                      </div>
                    </button>
                  </div>

                  {/* Minimal Match Info: Date, Teams, Registros */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-300">{block.match.date}</span>
                      <span>·</span>
                      <span className="truncate text-slate-400">{block.match.competition}</span>
                    </div>

                    {(() => {
                      const blockScores = calculateMatchScoresFromEvents(
                        block.events,
                        block.match.home_team,
                        block.match.away_team,
                        block.match.home_score ?? 0,
                        block.match.away_score ?? 0
                      );
                      return (
                        <h2 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
                          <img 
                            src={block.match.home_team.toLowerCase().includes('shabab') || block.match.home_team.toLowerCase().includes('ordon') ? '/logo.png' : (block.match.home_team_logo || '/logo.png')} 
                            alt="" 
                            className="w-4.5 h-4.5 object-contain" 
                          />
                          <span>{block.match.home_team}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 font-mono text-xs border border-slate-800 font-bold">
                            {blockScores.homeScore} - {blockScores.awayScore}
                          </span>
                          <span>{block.match.away_team}</span>
                          <img 
                            src={block.match.away_team.toLowerCase().includes('shabab') || block.match.away_team.toLowerCase().includes('ordon') ? '/logo.png' : (block.match.away_team_logo || '/logo.png')} 
                            alt="" 
                            className="w-4.5 h-4.5 object-contain" 
                          />
                        </h2>
                      );
                    })()}

                    <div className="flex items-center gap-2 text-[11px] pt-0.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono font-semibold">
                        {block.analyses.length} {block.analyses.length === 1 ? 'análisis' : 'análisis'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-semibold">
                        {currentEventsCount} registros
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                        {block.dashboards.length} dashboards
                      </span>
                      <Link
                        href={`/partidos/${block.match.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        Ver partido
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); openVisorForMatch(); }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Abrir Visor ({block.analyses.length})</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickCreate(block, true); }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo dashboard</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Created Dashboards Pills Bar — sólo si hay más de uno, o para admin (gestionar/borrar) */}
              {block.dashboards.length > 0 && (block.dashboards.length > 1 || isAdmin) && (
                <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-1">
                    Pizarras guardadas:
                  </span>
                  {block.dashboards.map((dashboard) => (
                    <div
                      key={dashboard.id}
                      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all text-xs"
                    >
                      <Link
                        href={`/dashboards/${dashboard.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 font-bold text-slate-200 group-hover:text-emerald-400"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{dashboard.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({dashboard.widgets.length} visualizaciones)
                        </span>
                      </Link>
                      {isAdmin && (
                        <>
                          <Link
                            href={`/dashboards/${dashboard.id}?mode=edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-500 hover:text-amber-400 p-0.5 transition cursor-pointer"
                            title="Editar dashboard"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(dashboard); }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                            title="Eliminar dashboard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Customization Modal */}
      {showAdminModal && (
        <AdminDashboardConfigModal
          currentConfig={dashboardConfig}
          onClose={() => setShowAdminModal(false)}
          onSave={(updatedConfig) => {
            setDashboardConfig(updatedConfig);
          }}
        />
      )}

      {/* Match Analysis Selector Modal */}
      {selectedMatchForAnalysis && (
        <MatchAnalysisSelectorModal
          match={selectedMatchForAnalysis.match}
          analyses={selectedMatchForAnalysis.analyses}
          onClose={() => setSelectedMatchForAnalysis(null)}
          onSelectVisor={(analysis) => {
            setActiveVisor({ match: selectedMatchForAnalysis.match, analysis });
          }}
          onDeleteAnalysis={handleDeleteAnalysis}
        />
      )}

      {/* Visor Overlay Modal */}
      {activeVisor && (
        <AnalysisVisor
          match={activeVisor.match}
          analysis={activeVisor.analysis}
          onClose={() => setActiveVisor(null)}
          onUpdateAnalysis={(updated) => {
            dbStore.saveAnalysis(updated);
            load();
          }}
        />
      )}
    </div>
  );
}
