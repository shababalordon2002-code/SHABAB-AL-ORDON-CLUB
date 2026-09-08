import { BotoneraTemplate, DashboardWidget, MatchDashboard } from '@/types';
import { createWidget } from './widget-catalog';

export const DEFAULT_BUTTONS = [
  { name: 'Córner', category: 'ABP', color: 'purple', pitchRequired: 'zone_remate', defaultType: 'pitch_zones' as const },
  { name: 'Falta Cometida', category: 'Defensa', color: 'orange', pitchRequired: 'point_full', defaultType: 'bar' as const },
  { name: 'Falta Recibida', category: 'ABP', color: 'cyan', pitchRequired: 'point_full', defaultType: 'bar' as const },
  { name: 'Tiro a Puerta', category: 'Ataque', color: 'amber', pitchRequired: 'zone_remate', defaultType: 'pitch_points' as const },
  { name: 'Gol', category: 'Ataque', color: 'emerald', pitchRequired: 'zone_remate', defaultType: 'pitch_zones' as const },
  { name: 'Pase Clave', category: 'Ataque', color: 'emerald', pitchRequired: 'vector_arrow', defaultType: 'pitch_arrows' as const },
  { name: 'Recuperación', category: 'Transición', color: 'blue', pitchRequired: 'zone_3_hitos', defaultType: 'pitch_zones' as const },
  { name: 'Pérdida Balón', category: 'Transición', color: 'red', pitchRequired: 'zone_bandas_centro', defaultType: 'bar' as const },
  { name: 'Duelo Ganado', category: 'Transición', color: 'indigo', pitchRequired: 'zone_bandas_centro', defaultType: 'matrix' as const },
  { name: 'Presión Alta', category: 'Transición', color: 'pink', pitchRequired: 'zone_3_hitos', defaultType: 'pitch_zones' as const },
];

/**
 * Genera un conjunto completo de widgets donde cada botón de la botonera
 * (Córner, Falta, Tiro, Pase, Recuperación, etc.) tiene un widget exclusivo.
 */
export function buildButtonByButtonWidgets(template?: BotoneraTemplate | null): DashboardWidget[] {
  const categoryButtons = template?.buttons?.filter((b) => b.type === 'category') || [];
  const sourceList = categoryButtons.length > 0
    ? categoryButtons.map((b) => ({
        name: b.name,
        category: b.category,
        color: b.color,
        pitchRequired: b.pitchRequired,
        defaultType: (b.pitchRequired === 'vector_arrow' ? 'pitch_arrows' : b.pitchRequired ? 'pitch_zones' : 'bar') as any
      }))
    : DEFAULT_BUTTONS;

  let currentY = 0;
  const widgets: DashboardWidget[] = [];

  // Summary KPIs & Global Bar Chart
  widgets.push({
    ...createWidget('kpi', { x: 0, y: currentY }),
    id: 'w_summary_kpi',
    title: 'Total Registros',
    subtitle: 'Acumulado del partido',
    w: 3,
    h: 4,
  });

  widgets.push({
    ...createWidget('kpi', { x: 3, y: currentY }),
    id: 'w_summary_success',
    title: 'Efectividad Global',
    subtitle: '% acciones con éxito',
    measure: 'success_rate',
    colorSlot: 2,
    w: 3,
    h: 4,
  });

  widgets.push({
    ...createWidget('donut', { x: 6, y: currentY }),
    id: 'w_summary_donut',
    title: 'Reparto General por Botón',
    dimension: 'event_type',
    w: 6,
    h: 8,
  });

  currentY += 8;

  // POR CADA BOTÓN: una gráfica (barras/otro) + su campograma asociado, uno junto al otro.
  sourceList.forEach((btn, index) => {
    const y = currentY + index * 8;
    const slug = btn.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const chartType = btn.defaultType?.startsWith('pitch_') ? 'bar' : btn.defaultType || 'bar';
    const pitchType = btn.pitchRequired === 'vector_arrow' ? 'pitch_arrows' : 'pitch_points';

    const filters = [
      {
        id: `filter_btn_${index}`,
        field: 'event_type',
        operator: 'in' as const,
        values: [btn.name],
      },
    ];

    // Gráfica del botón (izquierda)
    widgets.push({
      ...createWidget(chartType, { x: 0, y }),
      id: `w_btn_${index}_${slug}_chart`,
      title: `${btn.name} · Gráfica`,
      subtitle: `${btn.category || 'Acción'} · desglose por jugador y resultado`,
      dimension: 'player_name',
      breakdown: 'outcome',
      filters,
      w: 6,
      h: 8,
    });

    // Campograma asociado (derecha)
    widgets.push({
      ...createWidget(pitchType, { x: 6, y }),
      id: `w_btn_${index}_${slug}_pitch`,
      title: `${btn.name} · Campograma`,
      subtitle: `Ubicación en el campo de las acciones "${btn.name}"`,
      dimension: undefined,
      breakdown: 'outcome',
      filters,
      w: 6,
      h: 8,
    });
  });

  return widgets;
}

export function buildStarterWidgets(template?: BotoneraTemplate | null): DashboardWidget[] {
  return buildButtonByButtonWidgets(template);
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
