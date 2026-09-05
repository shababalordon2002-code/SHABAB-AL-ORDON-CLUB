/**
 * Motor de agregación de los Dashboards.
 *
 * Convierte los eventos registrados con la botonera (NormalizedEvent) en tablas
 * de dimensiones/medidas listas para pintar, al estilo de Tableau / Power BI:
 * cada widget elige un campo como dimensión, otro opcional como desglose y una
 * medida que se calcula sobre los eventos de cada celda.
 */
import {
  BotoneraButton,
  BotoneraTemplate,
  DashboardFieldDef,
  DashboardFilter,
  DashboardMeasure,
  DashboardWidget,
  NormalizedEvent,
} from '@/types';

export const EMPTY_VALUE = '(Sin dato)';

export const BUILTIN_FIELDS: DashboardFieldDef[] = [
  { key: 'category', label: 'Categoría', kind: 'dimension', source: 'builtin' },
  { key: 'event_type', label: 'Evento / Botón', kind: 'dimension', source: 'builtin' },
  { key: 'player_name', label: 'Jugador', kind: 'dimension', source: 'builtin' },
  { key: 'team_name', label: 'Equipo', kind: 'dimension', source: 'builtin' },
  { key: 'outcome', label: 'Resultado del evento', kind: 'dimension', source: 'builtin' },
  { key: 'descriptor', label: 'Descriptor (cualquiera)', kind: 'dimension', source: 'builtin', multiValue: true },
  { key: 'period', label: 'Periodo', kind: 'dimension', source: 'builtin' },
  { key: 'zone', label: 'Zona del campograma', kind: 'spatial', source: 'builtin' },
  { key: 'pitch_third', label: 'Tercio del campo (X)', kind: 'spatial', source: 'builtin' },
  { key: 'pitch_lane', label: 'Carril / banda (Y)', kind: 'spatial', source: 'builtin' },
  { key: 'time_bin', label: 'Franja de minutos', kind: 'time', source: 'builtin' },
  { key: 'minute', label: 'Minuto exacto', kind: 'time', source: 'builtin' },
];

export const MEASURE_LABELS: Record<DashboardMeasure, string> = {
  count: 'Nº de eventos',
  pct_of_total: '% sobre el total',
  success_rate: '% de acierto',
  sum_duration: 'Duración total (s)',
  avg_duration: 'Duración media (s)',
  distinct_players: 'Jugadores distintos',
};

const SUCCESS_TOKENS = ['éxito', 'exito', 'gol', 'acierto', 'completado', 'a puerta', 'ganado', 'positivo'];

/** Índice de botones de la botonera por id y por nombre, para resolver descriptores. */
export interface EngineContext {
  buttonsById: Record<string, BotoneraButton>;
  buttonsByName: Record<string, BotoneraButton>;
  descriptorTypes: string[];
  timeBinMinutes: number;
}

export function buildEngineContext(
  template: BotoneraTemplate | null | undefined,
  timeBinMinutes = 5
): EngineContext {
  const buttonsById: Record<string, BotoneraButton> = {};
  const buttonsByName: Record<string, BotoneraButton> = {};
  const descriptorTypes: string[] = [];

  (template?.buttons || []).forEach((btn) => {
    buttonsById[btn.id] = btn;
    buttonsByName[btn.name.toLowerCase()] = btn;
    (btn.descriptorGroups || []).forEach((grp) => {
      if (grp.type && !descriptorTypes.includes(grp.type)) descriptorTypes.push(grp.type);
    });
  });

  return { buttonsById, buttonsByName, descriptorTypes, timeBinMinutes };
}

/** Campos disponibles: los fijos + un campo por cada tipo de descriptor de la botonera. */
export function getAvailableFields(ctx: EngineContext): DashboardFieldDef[] {
  const descriptorFields: DashboardFieldDef[] = ctx.descriptorTypes.map((type) => ({
    key: `desc:${type}`,
    label: type,
    kind: 'dimension',
    source: 'descriptor',
    multiValue: true,
  }));
  return [...BUILTIN_FIELDS, ...descriptorFields];
}

export function getFieldLabel(fields: DashboardFieldDef[], key?: string): string {
  if (!key) return '—';
  return fields.find((f) => f.key === key)?.label || key;
}

function getEventDescriptors(evt: NormalizedEvent): string[] {
  const raw = (evt.metadata?.descriptors || evt.metadata?.tags || []) as unknown;
  if (Array.isArray(raw)) return raw.map((d) => String(d)).filter(Boolean);
  if (evt.subcategory) return evt.subcategory.split(',').map((d) => d.trim()).filter(Boolean);
  return [];
}

function resolveButton(evt: NormalizedEvent, ctx: EngineContext): BotoneraButton | undefined {
  const byId = evt.metadata?.buttonId ? ctx.buttonsById[evt.metadata.buttonId] : undefined;
  if (byId) return byId;
  return ctx.buttonsByName[(evt.event_type || '').toLowerCase()];
}

/** Opciones declaradas en la botonera para un tipo de descriptor concreto. */
function descriptorOptionsForType(type: string, evt: NormalizedEvent, ctx: EngineContext): string[] {
  const btn = resolveButton(evt, ctx);
  const fromBtn = (btn?.descriptorGroups || [])
    .filter((g) => g.type === type)
    .flatMap((g) => g.options);
  if (fromBtn.length > 0) return fromBtn;

  // El evento no resuelve a un botón conocido: aceptamos las opciones de cualquier
  // botón que declare ese mismo tipo de descriptor.
  return Object.values(ctx.buttonsById)
    .flatMap((b) => b.descriptorGroups || [])
    .filter((g) => g.type === type)
    .flatMap((g) => g.options);
}

export function pitchThird(x: number | null): string | null {
  if (x === null || x === undefined || isNaN(x)) return null;
  if (x < 100 / 3) return 'Tercio defensivo';
  if (x < 200 / 3) return 'Tercio medio';
  return 'Tercio ofensivo';
}

export function pitchLane(y: number | null): string | null {
  if (y === null || y === undefined || isNaN(y)) return null;
  if (y < 100 / 3) return 'Banda izquierda';
  if (y < 200 / 3) return 'Carril central';
  return 'Banda derecha';
}

export function timeBinLabel(timestampSeconds: number | null, binMinutes: number): string | null {
  if (timestampSeconds === null || timestampSeconds === undefined || isNaN(timestampSeconds)) return null;
  const minute = Math.floor(timestampSeconds / 60);
  const start = Math.floor(minute / binMinutes) * binMinutes;
  return `${start}-${start + binMinutes}'`;
}

/** Todos los valores que un evento aporta a un campo (los descriptores son multivalor). */
export function getFieldValues(evt: NormalizedEvent, field: string, ctx: EngineContext): string[] {
  if (field.startsWith('desc:')) {
    const type = field.slice(5);
    const options = descriptorOptionsForType(type, evt, ctx).map((o) => o.toLowerCase());
    const values = getEventDescriptors(evt).filter((d) => options.includes(d.toLowerCase()));
    return values.length ? values : [EMPTY_VALUE];
  }

  switch (field) {
    case 'category':
      return [evt.category || EMPTY_VALUE];
    case 'event_type':
      return [evt.event_type || EMPTY_VALUE];
    case 'player_name':
      return [evt.player_name || EMPTY_VALUE];
    case 'team_name':
      return [evt.team_name || EMPTY_VALUE];
    case 'outcome':
      return [evt.outcome || EMPTY_VALUE];
    case 'descriptor': {
      const all = getEventDescriptors(evt);
      return all.length ? all : [EMPTY_VALUE];
    }
    case 'period':
      return [evt.period ? `${evt.period}ª parte` : EMPTY_VALUE];
    case 'zone':
      return [(evt.metadata?.zone as string) || EMPTY_VALUE];
    case 'pitch_third':
      return [pitchThird(evt.x) || EMPTY_VALUE];
    case 'pitch_lane':
      return [pitchLane(evt.y) || EMPTY_VALUE];
    case 'time_bin':
      return [timeBinLabel(evt.timestamp, ctx.timeBinMinutes) || EMPTY_VALUE];
    case 'minute':
      return [evt.minute !== null && evt.minute !== undefined ? `${evt.minute}'` : EMPTY_VALUE];
    default:
      return [EMPTY_VALUE];
  }
}

/** Valores únicos de un campo en el dataset, listos para poblar el editor de filtros. */
export function getDistinctValues(events: NormalizedEvent[], field: string, ctx: EngineContext): string[] {
  const set = new Set<string>();
  events.forEach((e) => getFieldValues(e, field, ctx).forEach((v) => set.add(v)));
  return sortLabels(Array.from(set), field);
}

export function applyFilters(
  events: NormalizedEvent[],
  filters: DashboardFilter[] | undefined,
  ctx: EngineContext
): NormalizedEvent[] {
  if (!filters || filters.length === 0) return events;

  return events.filter((evt) =>
    filters.every((f) => {
      if (!f.field || !f.values || f.values.length === 0) return true;
      const values = getFieldValues(evt, f.field, ctx);
      const hit = values.some((v) => f.values.includes(v));
      return f.operator === 'not_in' ? !hit : hit;
    })
  );
}

function isSuccess(evt: NormalizedEvent): boolean {
  const haystack = [evt.outcome || '', ...getEventDescriptors(evt)].join(' ').toLowerCase();
  return SUCCESS_TOKENS.some((token) => haystack.includes(token));
}

export function computeMeasure(events: NormalizedEvent[], measure: DashboardMeasure, universeSize: number): number {
  if (events.length === 0) return 0;

  switch (measure) {
    case 'count':
      return events.length;
    case 'pct_of_total':
      return universeSize > 0 ? (events.length / universeSize) * 100 : 0;
    case 'success_rate':
      return (events.filter(isSuccess).length / events.length) * 100;
    case 'sum_duration':
      return events.reduce((acc, e) => acc + (e.duration || 0), 0);
    case 'avg_duration':
      return events.reduce((acc, e) => acc + (e.duration || 0), 0) / events.length;
    case 'distinct_players':
      return new Set(events.map((e) => e.player_name).filter(Boolean)).size;
    default:
      return events.length;
  }
}

export function measureUnit(measure: DashboardMeasure): string {
  if (measure === 'pct_of_total' || measure === 'success_rate') return '%';
  if (measure === 'sum_duration' || measure === 'avg_duration') return 's';
  return '';
}

export function formatMeasure(value: number, measure: DashboardMeasure): string {
  const unit = measureUnit(measure);
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 's') return `${value.toFixed(value < 10 ? 1 : 0)}s`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const TIME_FIELDS = ['time_bin', 'minute'];
export function isTimeField(field?: string): boolean {
  return !!field && TIME_FIELDS.includes(field);
}

function labelSortKey(label: string): number | null {
  const match = label.match(/^-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function sortLabels(labels: string[], field?: string): string[] {
  const sorted = [...labels];
  if (isTimeField(field) || field === 'period') {
    return sorted.sort((a, b) => {
      const ka = labelSortKey(a);
      const kb = labelSortKey(b);
      if (ka === null || kb === null) return a.localeCompare(b, 'es');
      return ka - kb;
    });
  }
  return sorted.sort((a, b) => a.localeCompare(b, 'es'));
}

export interface AggSeries {
  key: string;
  values: number[];
  /** Eventos por celda, para tooltips y drill-down */
  cells: NormalizedEvent[][];
}

export interface AggResult {
  labels: string[];
  series: AggSeries[];
  /** Valor total por etiqueta (suma de series, o medida sobre todos los eventos de la etiqueta) */
  totals: number[];
  grandTotal: number;
  eventsByLabel: NormalizedEvent[][];
  measure: DashboardMeasure;
  isTime: boolean;
}

/**
 * Agrega los eventos en la matriz dimensión × desglose que consume cada gráfico.
 * Los campos multivalor (descriptores) cuentan el evento en cada valor presente.
 */
export function aggregate(events: NormalizedEvent[], widget: DashboardWidget, ctx: EngineContext): AggResult {
  const measure = widget.measure || 'count';
  const dimension = widget.dimension || 'category';
  const breakdown = widget.breakdown;

  const byLabel = new Map<string, NormalizedEvent[]>();
  const byLabelSeries = new Map<string, Map<string, NormalizedEvent[]>>();
  const seriesKeys = new Set<string>();

  events.forEach((evt) => {
    const labels = getFieldValues(evt, dimension, ctx);
    const seriesValues = breakdown ? getFieldValues(evt, breakdown, ctx) : ['__all__'];

    labels.forEach((label) => {
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label)!.push(evt);

      if (!byLabelSeries.has(label)) byLabelSeries.set(label, new Map());
      const seriesMap = byLabelSeries.get(label)!;
      seriesValues.forEach((sv) => {
        seriesKeys.add(sv);
        if (!seriesMap.has(sv)) seriesMap.set(sv, []);
        seriesMap.get(sv)!.push(evt);
      });
    });
  });

  let labels = Array.from(byLabel.keys());
  const timeDim = isTimeField(dimension);

  // Orden
  const sortMode = widget.sort || (timeDim ? 'natural' : 'value_desc');
  if (sortMode === 'natural' || timeDim) {
    labels = sortLabels(labels, dimension);
  } else if (sortMode === 'label_asc') {
    labels = sortLabels(labels, dimension);
  } else {
    labels.sort((a, b) => {
      const va = computeMeasure(byLabel.get(a) || [], measure, events.length);
      const vb = computeMeasure(byLabel.get(b) || [], measure, events.length);
      return sortMode === 'value_asc' ? va - vb : vb - va;
    });
  }

  // Top N (el resto se agrupa en "Otros" para no inventar colores nuevos)
  const limit = widget.limit && widget.limit > 0 ? widget.limit : 0;
  if (limit > 0 && labels.length > limit && !timeDim) {
    const kept = labels.slice(0, limit);
    const rest = labels.slice(limit);
    const restEvents = rest.flatMap((l) => byLabel.get(l) || []);
    if (restEvents.length > 0) {
      byLabel.set('Otros', restEvents);
      const restSeries = new Map<string, NormalizedEvent[]>();
      rest.forEach((l) => {
        (byLabelSeries.get(l) || new Map()).forEach((evts, sk) => {
          if (!restSeries.has(sk)) restSeries.set(sk, []);
          restSeries.get(sk)!.push(...evts);
        });
      });
      byLabelSeries.set('Otros', restSeries);
      labels = [...kept, 'Otros'];
    } else {
      labels = kept;
    }
  }

  const orderedSeriesKeys = breakdown
    ? Array.from(seriesKeys).sort((a, b) => {
        const sum = (k: string) =>
          labels.reduce((acc, l) => acc + ((byLabelSeries.get(l)?.get(k) || []).length), 0);
        return sum(b) - sum(a);
      })
    : ['__all__'];

  const series: AggSeries[] = orderedSeriesKeys.map((key) => {
    const cells = labels.map((label) => byLabelSeries.get(label)?.get(key) || []);
    return {
      key,
      cells,
      values: cells.map((cellEvents) => computeMeasure(cellEvents, measure, events.length)),
    };
  });

  const eventsByLabel = labels.map((l) => byLabel.get(l) || []);
  let totals = eventsByLabel.map((cellEvents) => computeMeasure(cellEvents, measure, events.length));

  // Acumulado (sólo tiene sentido en medidas aditivas sobre una dimensión temporal)
  const additive = measure === 'count' || measure === 'sum_duration' || measure === 'pct_of_total';
  if (widget.cumulative && additive) {
    let running = 0;
    totals = totals.map((v) => (running += v));
    series.forEach((s) => {
      let acc = 0;
      s.values = s.values.map((v) => (acc += v));
    });
  }

  return {
    labels,
    series,
    totals,
    grandTotal: computeMeasure(events, measure, events.length),
    eventsByLabel,
    measure,
    isTime: timeDim,
  };
}

/** Eventos con coordenadas registradas en el campograma. */
export function withPitchCoords(events: NormalizedEvent[]): NormalizedEvent[] {
  return events.filter((e) => e.x !== null && e.x !== undefined && e.y !== null && e.y !== undefined);
}

/** Eventos con vector (origen y destino) registrado. */
export function withPitchVectors(events: NormalizedEvent[]): NormalizedEvent[] {
  return withPitchCoords(events).filter(
    (e) => e.end_x !== null && e.end_x !== undefined && e.end_y !== null && e.end_y !== undefined
  );
}
