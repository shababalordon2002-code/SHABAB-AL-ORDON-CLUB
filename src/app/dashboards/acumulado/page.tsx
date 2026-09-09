'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, Layers, Pencil, RefreshCw, Trophy, Zap } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { BotoneraTemplate, DashboardWidget, Match, NormalizedEvent } from '@/types';
import { aggregate, buildEngineContext, getAvailableFields } from '@/lib/analytics/dashboard-engine';
import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { WidgetEditorModal } from '@/components/dashboards/WidgetEditorModal';
import { buildButtonByButtonWidgets } from '@/components/dashboards/dashboard-presets';
import { CategoryChart } from '@/components/dashboards/viz/CategoryChart';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { useAuth } from '@/components/providers/AuthProvider';

const STORAGE_KEY = 'sao_cumulative_dashboard_widgets_v1';

const COMPARISON_WIDGET: DashboardWidget = {
  id: 'w_cum_comparison',
  type: 'bar',
  title: 'Comparativa acumulada por botón',
  x: 0, y: 0, w: 12, h: 8,
  dimension: 'event_type',
  breakdown: 'team_name',
  measure: 'count',
  filters: [],
  limit: 12,
  sort: 'value_desc',
  showValues: true,
  showLegend: true,
};

function CumulativeDashboardContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  // Igual que el dashboard por partido: sólo se edita entrando explícitamente
  // con ?mode=edit (botón "Editar", visible sólo para admin).
  const canEdit = isAdmin && searchParams.get('mode') === 'edit';
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [template, setTemplate] = useState<BotoneraTemplate | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const editMode = canEdit;
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

  const loadData = () => {
    const allMatches = dbStore.getMatches();
    setMatches(allMatches);
    setEvents(dbStore.getNormalizedEvents());
    const templates = dbStore.getBotoneraTemplates();
    setTemplate(templates.find((t) => t.isDefault) || templates[0] || null);
  };

  useEffect(() => {
    loadData();
    (async () => {
      await Promise.all([
        dbStore.syncAnalysesFromSupabase?.(),
        dbStore.syncBotoneraTemplatesFromSupabase?.(),
      ]);
      loadData();
    })();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setWidgets(JSON.parse(saved));
        return;
      }
    } catch {}
    setWidgets(buildButtonByButtonWidgets(template));
  }, [template]);

  const persist = (w: DashboardWidget[]) => {
    setWidgets(w);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
    } catch {}
  };

  const handleRegenerate = () => {
    if (widgets.length > 0 && !confirm('¿Regenerar la plantilla acumulada (gráfica + campograma por botón)?')) return;
    persist(buildButtonByButtonWidgets(template));
  };

  const ctx = useMemo(() => buildEngineContext(template), [template]);
  const fields = useMemo(() => getAvailableFields(ctx), [ctx]);
  const comparison = useMemo(() => aggregate(events, COMPARISON_WIDGET, ctx), [events, ctx]);

  const record = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    matches.forEach((m) => {
      if (m.status !== 'Finalizado') return;
      const isHome = m.home_team.toLowerCase().includes('shabab') || m.home_team.toLowerCase().includes('ordon');
      const us = isHome ? m.home_score : m.away_score;
      const them = isHome ? m.away_score : m.home_score;
      gf += us; ga += them;
      if (us > them) w++; else if (us === them) d++; else l++;
    });
    return { w, d, l, gf, ga, played: w + d + l };
  }, [matches]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <Link href="/dashboards" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Dashboards</span>
          </Link>
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-extrabold text-white">Dashboard Acumulativo</h1>
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold">
              {events.length} eventos · {matches.length} partidos
            </span>
          </div>
          <p className="text-xs text-slate-400">Agregado de todos los partidos y análisis registrados.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
          {canEdit ? (
            <>
              <button
                onClick={handleRegenerate}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-extrabold text-xs flex items-center gap-1.5 border border-sky-500/30 shadow transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                <span>1 Widget por Botón</span>
              </button>
              <Link
                href="/dashboards/acumulado"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Salir del editor</span>
              </Link>
            </>
          ) : isAdmin ? (
            <Link
              href="/dashboards/acumulado?mode=edit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-4 h-4 stroke-[2.5]" />
              <span>Editar dashboard</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Resumen: escudo, récord y comparativa */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col items-center gap-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-400/80 font-extrabold">
            <Trophy className="w-3.5 h-3.5" />
            <span>Balance histórico</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <TeamLogo teamName="Shabab Al Ordon Club" size={64} />
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              <Stat label="PJ" value={record.played} />
              <Stat label="G" value={record.w} accent="text-emerald-400" />
              <Stat label="E" value={record.d} accent="text-amber-400" />
              <Stat label="P" value={record.l} accent="text-red-400" />
              <Stat label="GF" value={record.gf} />
              <Stat label="GC" value={record.ga} />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            Comparativa acumulada por botón (todos los partidos)
          </h3>
          <div className="h-[360px]">
            {comparison.labels.length > 0 ? (
              <CategoryChart result={comparison} measure="count" orientation="horizontal" showValues showLegend />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Aún no hay eventos registrados en ningún partido.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: gráfica + campograma por cada botón, sobre TODOS los eventos */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[600px] shadow-2xl">
        {widgets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Sin widgets todavía</h3>
            {canEdit && (
              <button
                onClick={handleRegenerate}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs cursor-pointer shadow"
              >
                <Zap className="w-4 h-4" />
                <span>Generar 1 Widget por Botón</span>
              </button>
            )}
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets}
            cols={12}
            rowHeight={40}
            events={events}
            ctx={ctx}
            fields={fields}
            editMode={editMode}
            onChangeLayout={persist}
            onEditWidget={(w) => setEditingWidget(w)}
            onDuplicateWidget={(w) => persist([...widgets, { ...w, id: `w_${Date.now()}`, y: w.y + w.h }])}
            onDeleteWidget={(w) => persist(widgets.filter((x) => x.id !== w.id))}
          />
        )}
      </div>

      {editingWidget && (
        <WidgetEditorModal
          widget={editingWidget}
          events={events}
          ctx={ctx}
          fields={fields}
          onSave={(saved) => {
            persist(widgets.map((w) => (w.id === saved.id ? saved : w)));
            setEditingWidget(null);
          }}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent = 'text-white' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-black tabular-nums ${accent}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
    </div>
  );
}

export default function CumulativeDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center text-slate-400 text-xs">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Cargando dashboard acumulado...</span>
        </div>
      }
    >
      <CumulativeDashboardContent />
    </Suspense>
  );
}
