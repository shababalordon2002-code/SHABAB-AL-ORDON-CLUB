import { DashboardWidget, MatchDashboard } from '@/types';
import { createWidget } from './widget-catalog';

/**
 * Pizarra inicial: una plantilla razonable para no empezar en blanco.
 * Todo es editable después (tipo de gráfico, campo, medida, filtros y tamaño).
 */
export function buildStarterWidgets(): DashboardWidget[] {
  const kpiTotal: DashboardWidget = {
    ...createWidget('kpi', { x: 0, y: 0 }),
    title: 'Eventos registrados',
    subtitle: 'Total del partido',
    w: 3,
    h: 4,
  };

  const kpiSuccess: DashboardWidget = {
    ...createWidget('kpi', { x: 3, y: 0 }),
    title: 'Acierto global',
    subtitle: '% de acciones con éxito',
    measure: 'success_rate',
    colorSlot: 2,
    w: 3,
    h: 4,
  };

  const donut: DashboardWidget = {
    ...createWidget('donut', { x: 6, y: 0 }),
    title: 'Reparto por categoría',
    dimension: 'category',
    w: 6,
    h: 8,
  };

  const bar: DashboardWidget = {
    ...createWidget('bar', { x: 0, y: 4 }),
    title: 'Eventos por botón',
    dimension: 'event_type',
    limit: 10,
    w: 6,
    h: 8,
  };

  const zones: DashboardWidget = {
    ...createWidget('pitch_zones', { x: 0, y: 12 }),
    title: 'Campograma · acumulado por zona',
    w: 6,
    h: 9,
  };

  const area: DashboardWidget = {
    ...createWidget('area', { x: 6, y: 8 }),
    title: 'Acumulado por franja de 5’',
    dimension: 'time_bin',
    cumulative: true,
    w: 6,
    h: 6,
  };

  const table: DashboardWidget = {
    ...createWidget('matrix', { x: 6, y: 14 }),
    title: 'Jugador × resultado',
    dimension: 'player_name',
    breakdown: 'outcome',
    limit: 12,
    w: 6,
    h: 7,
  };

  return [kpiTotal, kpiSuccess, donut, bar, area, zones, table];
}

export function createDashboard(params: {
  matchId: string;
  analysisId?: string | null;
  name: string;
  botoneraTemplateId?: string | null;
  withStarter?: boolean;
}): MatchDashboard {
  const now = new Date().toISOString();
  return {
    id: `dash_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    match_id: params.matchId,
    analysis_id: params.analysisId || null,
    name: params.name,
    description: '',
    botonera_template_id: params.botoneraTemplateId || null,
    cols: 12,
    row_height: 40,
    widgets: params.withStarter === false ? [] : buildStarterWidgets(),
    global_filters: [],
    created_at: now,
    updated_at: now,
  };
}
