import { DashboardWidget, DashboardWidgetType } from '@/types';

export interface WidgetTypeDef {
  type: DashboardWidgetType;
  label: string;
  group: 'Indicadores' | 'Comparación' | 'Evolución' | 'Composición' | 'Detalle' | 'Campograma';
  hint: string;
  defaultW: number;
  defaultH: number;
  needsDimension: boolean;
  supportsBreakdown: boolean;
}

export const WIDGET_TYPES: WidgetTypeDef[] = [
  { type: 'kpi', label: 'Indicador (KPI)', group: 'Indicadores', hint: 'Un número grande con su evolución', defaultW: 3, defaultH: 4, needsDimension: false, supportsBreakdown: false },
  { type: 'text', label: 'Nota / Texto', group: 'Indicadores', hint: 'Conclusiones o títulos de sección', defaultW: 3, defaultH: 3, needsDimension: false, supportsBreakdown: false },

  { type: 'bar', label: 'Barras horizontales', group: 'Comparación', hint: 'Ranking por categoría, jugador o descriptor', defaultW: 6, defaultH: 7, needsDimension: true, supportsBreakdown: true },
  { type: 'column', label: 'Barras verticales', group: 'Comparación', hint: 'Comparar pocas categorías o franjas', defaultW: 6, defaultH: 7, needsDimension: true, supportsBreakdown: true },

  { type: 'line', label: 'Línea temporal', group: 'Evolución', hint: 'Evolución por minuto o franja', defaultW: 6, defaultH: 6, needsDimension: true, supportsBreakdown: true },
  { type: 'area', label: 'Área / Acumulado', group: 'Evolución', hint: 'Acumulativo a lo largo del partido', defaultW: 6, defaultH: 6, needsDimension: true, supportsBreakdown: true },

  { type: 'donut', label: 'Donut', group: 'Composición', hint: 'Reparto parte-a-todo (≤ 6 porciones)', defaultW: 4, defaultH: 6, needsDimension: true, supportsBreakdown: false },
  { type: 'pie', label: 'Tarta', group: 'Composición', hint: 'Reparto parte-a-todo (≤ 6 porciones)', defaultW: 4, defaultH: 6, needsDimension: true, supportsBreakdown: false },

  { type: 'table', label: 'Tabla', group: 'Detalle', hint: 'Los valores exactos, ordenables', defaultW: 5, defaultH: 7, needsDimension: true, supportsBreakdown: false },
  { type: 'matrix', label: 'Tabla cruzada', group: 'Detalle', hint: 'Dimensión × desglose (tipo tabla dinámica)', defaultW: 7, defaultH: 7, needsDimension: true, supportsBreakdown: true },
  { type: 'timeline', label: 'Línea de tiempo', group: 'Detalle', hint: 'Cada evento sobre el minuto del partido', defaultW: 12, defaultH: 6, needsDimension: false, supportsBreakdown: false },

  { type: 'pitch_zones', label: 'Campograma · Zonas', group: 'Campograma', hint: 'Acumulado por zona registrada en la botonera', defaultW: 6, defaultH: 8, needsDimension: false, supportsBreakdown: false },
  { type: 'pitch_heatmap', label: 'Campograma · Mapa de calor', group: 'Campograma', hint: 'Densidad por celdas del campo', defaultW: 6, defaultH: 8, needsDimension: false, supportsBreakdown: false },
  { type: 'pitch_points', label: 'Campograma · Puntos', group: 'Campograma', hint: 'Cada evento donde ocurrió', defaultW: 6, defaultH: 8, needsDimension: false, supportsBreakdown: true },
  { type: 'pitch_arrows', label: 'Campograma · Flechas', group: 'Campograma', hint: 'Vectores origen → destino', defaultW: 6, defaultH: 8, needsDimension: false, supportsBreakdown: true },
];

export const WIDGET_GROUPS: WidgetTypeDef['group'][] = [
  'Indicadores',
  'Comparación',
  'Evolución',
  'Composición',
  'Detalle',
  'Campograma',
];

export function getWidgetTypeDef(type: DashboardWidgetType): WidgetTypeDef {
  return WIDGET_TYPES.find((w) => w.type === type) || WIDGET_TYPES[0];
}

export function createWidget(type: DashboardWidgetType, position: { x: number; y: number }): DashboardWidget {
  const def = getWidgetTypeDef(type);
  const timeType = type === 'line' || type === 'area';

  return {
    id: `wdg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    title: def.label,
    x: position.x,
    y: position.y,
    w: def.defaultW,
    h: def.defaultH,
    dimension: def.needsDimension ? (timeType ? 'time_bin' : 'category') : type === 'timeline' ? 'category' : undefined,
    measure: 'count',
    filters: [],
    limit: type === 'bar' || type === 'column' ? 10 : 0,
    sort: timeType ? 'natural' : 'value_desc',
    showValues: true,
    showLegend: true,
    cumulative: type === 'area',
    timeBinMinutes: 5,
    pitchOrientation: 'horizontal',
    pitchBinsX: 6,
    pitchBinsY: 4,
    colorSlot: 0,
    text: type === 'text' ? '' : undefined,
  };
}

/** Primera fila libre bajo los widgets existentes. */
export function nextFreePosition(widgets: DashboardWidget[]): { x: number; y: number } {
  const maxY = widgets.reduce((acc, w) => Math.max(acc, w.y + w.h), 0);
  return { x: 0, y: maxY };
}
