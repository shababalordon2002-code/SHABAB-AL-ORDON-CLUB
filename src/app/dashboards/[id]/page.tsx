'use client';

import React, { use, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  Edit3,
  Eye,
  Filter,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import {
  BotoneraTemplate,
  DashboardWidget,
  DashboardWidgetType,
  Match,
  MatchAnalysis,
  MatchDashboard,
  NormalizedEvent,
} from '@/types';
import {
  buildEngineContext,
  getAvailableFields,
} from '@/lib/analytics/dashboard-engine';
import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { WidgetEditorModal } from '@/components/dashboards/WidgetEditorModal';
import { createWidget, WIDGET_TYPES } from '@/components/dashboards/widget-catalog';
import { buildButtonByButtonWidgets, DEFAULT_BUTTONS } from '@/components/dashboards/dashboard-presets';
import { MatchResultHeader } from '@/components/dashboards/MatchResultHeader';
import { useAuth } from '@/components/providers/AuthProvider';

function DashboardDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const dashboardId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();
  // Sólo se entra en el editor cuando se navega explícitamente con ?mode=edit
  // (botón "Editar dashboard", visible únicamente para admin). Clicar el partido
  // desde el listado siempre abre el dashboard en modo visualización.
  const canEdit = isAdmin && searchParams.get('mode') === 'edit';

  const [dashboard, setDashboard] = useState<MatchDashboard | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [template, setTemplate] = useState<BotoneraTemplate | null>(null);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedButtonFilter, setSelectedButtonFilter] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const d = dbStore.getDashboards().find((item) => item.id === dashboardId);
    if (d) {
      setDashboard(d);
      const m = dbStore.getMatchById(d.match_id);
      if (m) setMatch(m);

      const evs = d.analysis_id
        ? dbStore.getAnalysisById(d.analysis_id)?.events || dbStore.getNormalizedEvents(d.match_id)
        : dbStore.getNormalizedEvents(d.match_id);
      setEvents(evs);

      const tmplId = d.botonera_template_id || m?.botonera_template_id;
      if (tmplId) {
        const tmpl = dbStore.getBotoneraTemplates().find((t) => t.id === tmplId);
        if (tmpl) setTemplate(tmpl);
      }
    }
  }, [dashboardId]);

  const editMode = canEdit;

  const ctx = useMemo(() => buildEngineContext(template), [template]);
  const fields = useMemo(() => getAvailableFields(ctx), [ctx]);

  // List of buttons available in the Botonera template
  const buttonList = useMemo(() => {
    const tmplButtons = template?.buttons?.filter((b) => b.type === 'category') || [];
    if (tmplButtons.length > 0) return tmplButtons.map((b) => ({ name: b.name, category: b.category, color: b.color }));
    return DEFAULT_BUTTONS.map((b) => ({ name: b.name, category: b.category, color: b.color }));
  }, [template]);

  // Filter widgets by selected button
  const visibleWidgets = useMemo(() => {
    if (!dashboard) return [];
    if (!selectedButtonFilter) return dashboard.widgets;
    return dashboard.widgets.filter((w) => {
      const hasFilterVal = w.filters?.some(
        (f) => f.field === 'event_type' && f.values.includes(selectedButtonFilter)
      );
      const titleMatch = w.title.toLowerCase().includes(selectedButtonFilter.toLowerCase());
      return hasFilterVal || titleMatch;
    });
  }, [dashboard, selectedButtonFilter]);

  if (!dashboard || !match) {
    return (
      <div className="p-12 text-center space-y-4">
        <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-300">Dashboard no encontrado</h2>
        <Link href="/dashboards" className="text-xs text-amber-400 hover:underline">
          Volver a la lista de dashboards
        </Link>
      </div>
    );
  }

  const handleSaveDashboard = (updatedDashboard?: MatchDashboard) => {
    const target = updatedDashboard || dashboard;
    dbStore.saveDashboard(target);
    setDashboard(target);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddWidget = (type: DashboardWidgetType) => {
    const maxY = dashboard.widgets.reduce((acc, w) => Math.max(acc, w.y + w.h), 0);
    const newWidget = createWidget(type, { x: 0, y: maxY });
    const updated = {
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    };
    setDashboard(updated);
    handleSaveDashboard(updated);
    setShowCatalogModal(false);
    setEditingWidget(newWidget);
  };

  const handleAddButtonWidget = (btnName: string, category?: string) => {
    const maxY = dashboard.widgets.reduce((acc, w) => Math.max(acc, w.y + w.h), 0);
    const newWidget: DashboardWidget = {
      ...createWidget('pitch_zones', { x: 0, y: maxY }),
      id: `w_btn_${Date.now()}`,
      title: `Botonera: ${btnName}`,
      subtitle: `Widget de análisis exclusivo para ${btnName} (${category || 'Acción'})`,
      filters: [
        {
          id: `f_${Date.now()}`,
          field: 'event_type',
          operator: 'in',
          values: [btnName],
        },
      ],
      w: 6,
      h: 8,
    };
    const updated = {
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    };
    setDashboard(updated);
    handleSaveDashboard(updated);
    setShowCatalogModal(false);
    setEditingWidget(newWidget);
  };

  const handleGenerateButtonByButtonWidgets = () => {
    if (
      dashboard.widgets.length > 0 &&
      !confirm('¿Reemplazar los widgets actuales por 1 widget exclusivo para cada botón de la botonera?')
    ) {
      return;
    }
    const buttonWidgets = buildButtonByButtonWidgets(template);
    const updated = {
      ...dashboard,
      widgets: buttonWidgets,
    };
    setDashboard(updated);
    handleSaveDashboard(updated);
  };

  const handleUpdateWidget = (savedWidget: DashboardWidget) => {
    const updatedWidgets = dashboard.widgets.map((w) => (w.id === savedWidget.id ? savedWidget : w));
    const updated = { ...dashboard, widgets: updatedWidgets };
    setDashboard(updated);
    handleSaveDashboard(updated);
    setEditingWidget(null);
  };

  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const dup: DashboardWidget = {
      ...widget,
      id: `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      y: widget.y + widget.h,
    };
    const updated = { ...dashboard, widgets: [...dashboard.widgets, dup] };
    setDashboard(updated);
    handleSaveDashboard(updated);
  };

  const handleDeleteWidget = (widget: DashboardWidget) => {
    const updatedWidgets = dashboard.widgets.filter((w) => w.id !== widget.id);
    const updated = { ...dashboard, widgets: updatedWidgets };
    setDashboard(updated);
    handleSaveDashboard(updated);
  };

  const handleLayoutChange = (newWidgets: DashboardWidget[]) => {
    const updated = { ...dashboard, widgets: newWidgets };
    setDashboard(updated);
    handleSaveDashboard(updated);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto">
      {/* Top Header Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <Link
            href="/dashboards"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Dashboards</span>
          </Link>
          <div className="flex items-center gap-3">
            {canEdit ? (
              <input
                type="text"
                value={dashboard.name}
                onChange={(e) => setDashboard({ ...dashboard, name: e.target.value })}
                onBlur={() => handleSaveDashboard()}
                className="text-lg font-extrabold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none transition-all"
              />
            ) : (
              <h1 className="text-lg font-extrabold text-white">{dashboard.name}</h1>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold">
              {events.length} eventos
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>{match.home_team} ({match.home_score}) vs {match.away_team} ({match.away_score})</span>
            <span>•</span>
            <span>{match.competition}</span>
          </p>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-extrabold text-xs flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              <span>Editor de Dashboard</span>
            </span>

            <button
              onClick={handleGenerateButtonByButtonWidgets}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-extrabold text-xs flex items-center gap-1.5 border border-sky-500/30 shadow transition-all cursor-pointer"
              title="Generar 1 widget exclusivo por cada botón de la botonera (Córner, Falta, Tiro, Pase, etc.)"
            >
              <Zap className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              <span>1 Widget por Botón</span>
            </button>

            <button
              onClick={() => setShowCatalogModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Añadir Widget</span>
            </button>

            <button
              onClick={() => handleSaveDashboard()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? <Check className="w-4 h-4 text-slate-950 stroke-[3]" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
              <span>{isSaved ? '¡Guardado!' : 'Guardar Pizarra'}</span>
            </button>

            <Link
              href={`/dashboards/${dashboardId}`}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Salir del editor</span>
            </Link>
          </div>
        ) : isAdmin ? (
          <Link
            href={`/dashboards/${dashboardId}?mode=edit`}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Pencil className="w-4 h-4 stroke-[2.5]" />
            <span>Editar dashboard</span>
          </Link>
        ) : null}
      </div>

      {/* Resultado, escudos y comparativa de métricas */}
      <MatchResultHeader match={match} events={events} ctx={ctx} />

      {/* Button-by-Button Filtering Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5 shrink-0 pl-1">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>Ver por Botón:</span>
        </span>

        <button
          onClick={() => setSelectedButtonFilter('')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
            !selectedButtonFilter
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Todos ({dashboard.widgets.length} widgets)
        </button>

        {buttonList.map((btn) => (
          <button
            key={btn.name}
            onClick={() => setSelectedButtonFilter(selectedButtonFilter === btn.name ? '' : btn.name)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedButtonFilter === btn.name
                ? 'bg-emerald-500 text-slate-950 font-black shadow'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>{btn.name}</span>
          </button>
        ))}
      </div>

      {/* Grid Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[600px] shadow-2xl">
        {visibleWidgets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <LayoutDashboard className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              No hay widgets {selectedButtonFilter ? `para el botón "${selectedButtonFilter}"` : 'en este dashboard'}
            </h3>
            {canEdit ? (
              <>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Haz clic en "1 Widget por Botón" para generar la plantilla completa o en "+ Añadir Widget" para añadir uno personalizado.
                </p>
                <button
                  onClick={handleGenerateButtonByButtonWidgets}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs cursor-pointer shadow"
                >
                  <Zap className="w-4 h-4" />
                  <span>Generar 1 Widget por Botón</span>
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Este dashboard todavía no tiene visualizaciones configuradas.
              </p>
            )}
          </div>
        ) : (
          <DashboardGrid
            widgets={visibleWidgets}
            cols={dashboard.cols || 12}
            rowHeight={dashboard.row_height || 40}
            events={events}
            ctx={ctx}
            fields={fields}
            editMode={editMode}
            onChangeLayout={handleLayoutChange}
            onEditWidget={(w) => setEditingWidget(w)}
            onDuplicateWidget={handleDuplicateWidget}
            onDeleteWidget={handleDeleteWidget}
          />
        )}
      </div>

      {/* Catalog Modal for Adding New Widgets */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Catálogo de Widgets de Pizarra</span>
                </h3>
                <p className="text-[11px] text-slate-400">Selecciona el tipo de widget o crea uno directo por botón de la botonera.</p>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              {/* Section 1: Quick Add Widgets By Botonera Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
                    <span>Añadir Widget Específico por Botón</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">1-Clic por cada botón de la botonera</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {buttonList.map((btn) => (
                    <button
                      key={btn.name}
                      onClick={() => handleAddButtonWidget(btn.name, btn.category)}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left space-y-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-200 group-hover:text-emerald-400 truncate">
                          {btn.name}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{btn.category || 'Acción'}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: General Visualization Catalog Types */}
              <div className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Tipos de Gráficas y Visualizaciones Generales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WIDGET_TYPES.map((wt) => (
                    <button
                      key={wt.type}
                      onClick={() => handleAddWidget(wt.type)}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-left transition-all space-y-1.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white group-hover:text-amber-400">
                          {wt.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {wt.group}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{wt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Customization Editor Modal */}
      {editingWidget && (
        <WidgetEditorModal
          widget={editingWidget}
          events={events}
          ctx={ctx}
          fields={fields}
          onSave={handleUpdateWidget}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}

export default function DashboardDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center text-slate-400 text-xs">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Cargando dashboard...</span>
        </div>
      }
    >
      <DashboardDetailContent {...props} />
    </Suspense>
  );
}
