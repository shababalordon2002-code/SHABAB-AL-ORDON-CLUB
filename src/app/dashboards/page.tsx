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
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { BotoneraTemplate, Match, MatchAnalysis, MatchDashboard, NormalizedEvent } from '@/types';
import { createDashboard } from '@/components/dashboards/dashboard-presets';

interface MatchBlock {
  match: Match;
  events: NormalizedEvent[];
  analyses: MatchAnalysis[];
  dashboards: MatchDashboard[];
}

export default function DashboardsPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<MatchBlock[]>([]);
  const [templates, setTemplates] = useState<BotoneraTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<MatchBlock | null>(null);

  const load = () => {
    const matches = dbStore.getMatches();
    const dashboards = dbStore.getDashboards();

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
      .filter((b) => b.events.length > 0 || b.analyses.length > 0 || b.dashboards.length > 0)
      .sort((a, b) => (a.match.date < b.match.date ? 1 : -1));

    setBlocks(next);
    setTemplates(dbStore.getBotoneraTemplates());
  };

  useEffect(() => {
    load();
    setLoading(false);

    Promise.all([dbStore.syncDashboardsFromSupabase(), dbStore.syncAnalysesFromSupabase(), dbStore.syncBotoneraTemplatesFromSupabase()])
      .then(load)
      .catch(() => {});
  }, []);

  const totalDashboards = useMemo(() => blocks.reduce((acc, b) => acc + b.dashboards.length, 0), [blocks]);

  const handleDelete = (dashboard: MatchDashboard) => {
    if (!confirm(`¿Eliminar el dashboard "${dashboard.name}"?`)) return;
    dbStore.deleteDashboard(dashboard.id);
    load();
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Dashboards por partido</h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Un dashboard por partido analizado. Cada pizarra se edita a tu gusto: eliges la botonera, sus campos y
              descriptores, y montas las gráficas, campogramas y tablas que quieras.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            {blocks.length} partidos
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
            {totalDashboards} dashboards
          </span>
        </div>
      </div>

      {!loading && blocks.length === 0 && (
        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Database className="w-9 h-9 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-300">Todavía no hay partidos con datos analizados</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Registra eventos con la Botonera Live o importa un XML de LongoMatch. En cuanto un partido tenga eventos,
            aparecerá aquí para construir su dashboard.
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
          const totalEvents = block.events.length || block.analyses.reduce((acc, a) => acc + (a.events?.length || 0), 0);

          return (
            <div key={block.match.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    <span>{block.match.date}</span>
                    <span>·</span>
                    <span>{block.match.competition}</span>
                  </div>
                  <h2 className="text-sm font-extrabold text-white mt-1 truncate">
                    {block.match.home_team} <span className="text-slate-500 font-mono mx-1">{block.match.home_score}-{block.match.away_score}</span> {block.match.away_team}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      {totalEvents} eventos
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                      {block.analyses.length} análisis
                    </span>
                    <Link
                      href={`/partidos/${block.match.id}`}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-400 hover:text-sky-300"
                    >
                      Ver partido
                    </Link>
                  </div>
                </div>

                <button
                  onClick={() => setCreatingFor(block)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo dashboard</span>
                </button>
              </div>

              <div className="p-4">
                {block.dashboards.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Sin dashboards todavía para este partido. Crea uno y monta la pizarra con los datos de tu botonera.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {block.dashboards.map((dashboard) => {
                      const analysis = block.analyses.find((a) => a.id === dashboard.analysis_id);
                      return (
                        <div
                          key={dashboard.id}
                          className="rounded-xl bg-slate-950 border border-slate-800 p-3 hover:border-emerald-600/40 transition group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/dashboards/${dashboard.id}`} className="min-w-0 flex items-start gap-2">
                              <LayoutDashboard className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-100 truncate group-hover:text-emerald-300">
                                  {dashboard.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {dashboard.widgets.length} visualizaciones ·{' '}
                                  {analysis ? analysis.title : 'Todos los eventos del partido'}
                                </p>
                              </div>
                            </Link>
                            <button
                              onClick={() => handleDelete(dashboard)}
                              className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 opacity-0 group-hover:opacity-100 transition"
                              title="Eliminar dashboard"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {creatingFor && (
        <CreateDashboardModal
          block={creatingFor}
          templates={templates}
          onClose={() => setCreatingFor(null)}
          onCreate={(dashboard) => {
            dbStore.saveDashboard(dashboard);
            router.push(`/dashboards/${dashboard.id}`);
          }}
        />
      )}
    </div>
  );
}

const CreateDashboardModal: React.FC<{
  block: MatchBlock;
  templates: BotoneraTemplate[];
  onClose: () => void;
  onCreate: (dashboard: MatchDashboard) => void;
}> = ({ block, templates, onClose, onCreate }) => {
  const defaultTemplateId =
    block.match.botonera_template_id ||
    block.analyses.find((a) => a.botonera_template_id)?.botonera_template_id ||
    templates.find((t) => t.isDefault)?.id ||
    templates[0]?.id ||
    '';

  const [name, setName] = useState(`Dashboard ${block.match.home_team} vs ${block.match.away_team}`);
  const [analysisId, setAnalysisId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>(defaultTemplateId);
  const [withStarter, setWithStarter] = useState(true);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-white text-sm">Nuevo dashboard</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-dark" />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Origen de los datos</span>
            <select value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} className="input-dark">
              <option value="">Todos los eventos del partido ({block.events.length})</option>
              {block.analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.events?.length || 0} eventos)
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Botonera (define los campos y descriptores disponibles)
            </span>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input-dark">
              <option value="">Sin botonera (sólo campos básicos del evento)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={withStarter}
              onChange={(e) => setWithStarter(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-500"
            />
            <span className="text-[11px] text-slate-300">Empezar con una pizarra de ejemplo (editable)</span>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700">
            Cancelar
          </button>
          <button
            onClick={() =>
              onCreate(
                createDashboard({
                  matchId: block.match.id,
                  analysisId: analysisId || null,
                  name: name.trim() || 'Dashboard',
                  botoneraTemplateId: templateId || null,
                  withStarter,
                })
              )
            }
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold"
          >
            Crear dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
