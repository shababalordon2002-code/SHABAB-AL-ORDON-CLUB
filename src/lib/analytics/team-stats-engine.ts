/**
 * Motor de la página "Estadísticas Equipo".
 *
 * Cruza todos los partidos analizados con la botonera live y los ordena por
 * fecha: cada partido es una jornada (J1..Jn). Sobre esa serie calcula el
 * acumulado, la evolución jornada a jornada, 3 tramos evolutivos y las
 * métricas agrupadas por sección (categoría del botón).
 */
import { BotoneraTemplate, Match, NormalizedEvent } from '@/types';
import { calculateMatchScoresFromEvents, isEventOfHomeTeam, isGoalEvent } from './dashboard-engine';

export type Side = 'own' | 'rival';
export type MatchResult = 'G' | 'E' | 'P';

export const UNASSIGNED_PLAYER_TOKENS = ['jugador sin asignar', 'jugador pendiente de asociar', ''];

export function isOurTeamName(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('shabab') || n.includes('ordon');
}

/** Convierte la fecha del partido (ISO, dd.mm.yyyy o dd/mm/yyyy) en epoch ms. */
export function parseMatchDate(dateStr?: string, time?: string): number {
  if (!dateStr) return 0;
  let y = 0, m = 0, d = 0;
  if (dateStr.includes('.') || dateStr.includes('/')) {
    const parts = dateStr.split(dateStr.includes('.') ? '.' : '/').map((p) => parseInt(p, 10));
    if (parts.length === 3) [d, m, y] = parts;
  } else {
    const parts = dateStr.split('T')[0].split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3) [y, m, d] = parts;
  }
  if (!y || !m || !d) {
    const t = Date.parse(dateStr);
    return isNaN(t) ? 0 : t;
  }
  const [hh, mm] = (time || '').split(':').map((p) => parseInt(p, 10));
  return new Date(y < 100 ? 2000 + y : y, m - 1, d, isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm).getTime();
}

export function formatShortDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Minuto absoluto del partido (2ª parte = 45 + relativo), tolerante a periodos mal asignados. */
export function absoluteMinute(evt: NormalizedEvent): number {
  const p = evt.period !== null && evt.period !== undefined ? Number(evt.period) : null;
  const raw =
    evt.minute !== null && evt.minute !== undefined
      ? Number(evt.minute)
      : evt.timestamp !== null && evt.timestamp !== undefined
      ? Math.floor(Number(evt.timestamp) / 60)
      : 0;
  if (p === 2 || p === 4) return raw >= 45 ? raw : 45 + raw;
  return Math.max(0, raw);
}

export const MINUTE_BINS = [
  { key: '0-15', label: "0-15'", from: 0, to: 15 },
  { key: '15-30', label: "15-30'", from: 15, to: 30 },
  { key: '30-45', label: "30-45+'", from: 30, to: 45 },
  { key: '45-60', label: "45-60'", from: 45, to: 60 },
  { key: '60-75', label: "60-75'", from: 60, to: 75 },
  { key: '75-90', label: "75-90+'", from: 75, to: Infinity },
];

export function minuteBinIndex(evt: NormalizedEvent): number {
  const m = absoluteMinute(evt);
  const idx = MINUTE_BINS.findIndex((b) => m >= b.from && m < b.to);
  return idx < 0 ? MINUTE_BINS.length - 1 : idx;
}

export function eventDescriptors(evt: NormalizedEvent): string[] {
  const raw = (evt.metadata?.descriptors || evt.metadata?.tags || []) as unknown;
  const list = Array.isArray(raw)
    ? raw.map((d) => String(d))
    : evt.subcategory
    ? evt.subcategory.split(',')
    : [];
  return list
    .map((d) => (d.includes(':') ? d.split(':').pop() || '' : d).trim())
    .filter(Boolean);
}

const SUCCESS_TOKENS = ['éxito', 'exito', 'gol', 'acierto', 'completado', 'a puerta', 'ganado', 'positivo', 'parada', 'poste'];
const FAIL_TOKENS = ['fallido', 'fuera', 'interceptado', 'perdido', 'negativo', 'bloqueado'];

/** true / false si el evento tiene un resultado evaluable, null si no lo tiene. */
export function eventSuccess(evt: NormalizedEvent): boolean | null {
  const hay = [evt.outcome || '', ...eventDescriptors(evt)].join(' | ').toLowerCase();
  if (!hay.trim()) return null;
  if (FAIL_TOKENS.some((t) => hay.includes(t))) return false;
  if (SUCCESS_TOKENS.some((t) => hay.includes(t))) return true;
  return null;
}

// ─────────────────────────────────────────────────────────────
// Jornadas
// ─────────────────────────────────────────────────────────────

export interface JornadaRow {
  index: number;          // 0-based
  label: string;          // "J1"
  match: Match;
  dateMs: number;
  dateLabel: string;
  opponent: string;
  opponentShort: string;
  isHome: boolean;
  gf: number;
  ga: number;
  result: MatchResult;
  points: number;
  tramo: number;          // 0, 1, 2
  events: NormalizedEvent[];
  own: NormalizedEvent[];
  rival: NormalizedEvent[];
}

export function shortTeamName(name: string): string {
  const clean = name.replace(/\b(SC|FC|CF|Club|SAO)\b/gi, '').trim();
  return clean.length > 14 ? `${clean.slice(0, 13)}…` : clean;
}

/** Reparte n jornadas consecutivas en 3 tramos lo más iguales posible. */
export function tramoBoundaries(n: number): [number, number][] {
  if (n <= 0) return [[0, -1], [0, -1], [0, -1]];
  const base = Math.floor(n / 3);
  const extra = n % 3;
  const sizes = [0, 1, 2].map((i) => base + (i < extra ? 1 : 0));
  const out: [number, number][] = [];
  let start = 0;
  sizes.forEach((s) => {
    out.push([start, start + s - 1]);
    start += s;
  });
  return out;
}

export function buildJornadas(matches: Match[], events: NormalizedEvent[]): JornadaRow[] {
  const byMatch = new Map<string, NormalizedEvent[]>();
  events.forEach((e) => {
    if (!e.match_id || e.match_id === 'free_session') return;
    if (!byMatch.has(e.match_id)) byMatch.set(e.match_id, []);
    byMatch.get(e.match_id)!.push(e);
  });

  const analysed = matches
    .filter((m) => (byMatch.get(m.id) || []).length > 0)
    .map((m) => ({ m, dateMs: parseMatchDate(m.date, m.time) }))
    .sort((a, b) => a.dateMs - b.dateMs);

  const bounds = tramoBoundaries(analysed.length);

  return analysed.map(({ m, dateMs }, index) => {
    const matchEvents = byMatch.get(m.id) || [];
    const isHome = isOurTeamName(m.home_team) || !isOurTeamName(m.away_team);
    const own: NormalizedEvent[] = [];
    const rival: NormalizedEvent[] = [];
    matchEvents.forEach((e) => {
      const homeSide = isEventOfHomeTeam(e, m.home_team, m.away_team);
      (homeSide === isHome ? own : rival).push(e);
    });

    const hasScore = m.status === 'Finalizado' || (m.home_score ?? 0) + (m.away_score ?? 0) > 0;
    const { homeScore, awayScore } = calculateMatchScoresFromEvents(
      matchEvents,
      m.home_team,
      m.away_team,
      hasScore ? m.home_score ?? 0 : null,
      hasScore ? m.away_score ?? 0 : null
    );
    const gf = isHome ? homeScore : awayScore;
    const ga = isHome ? awayScore : homeScore;
    const result: MatchResult = gf > ga ? 'G' : gf === ga ? 'E' : 'P';
    const opponent = isHome ? m.away_team : m.home_team;
    const tramo = bounds.findIndex(([a, b]) => index >= a && index <= b);

    return {
      index,
      label: `J${index + 1}`,
      match: m,
      dateMs,
      dateLabel: formatShortDate(dateMs),
      opponent,
      opponentShort: shortTeamName(opponent),
      isHome,
      gf,
      ga,
      result,
      points: result === 'G' ? 3 : result === 'E' ? 1 : 0,
      tramo: Math.max(0, tramo),
      events: matchEvents,
      own,
      rival,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Métricas
// ─────────────────────────────────────────────────────────────

export type MetricKind = 'count' | 'success_rate' | 'descriptor' | 'goals';

export interface MetricDef {
  key: string;
  label: string;
  section: string;
  eventType?: string;
  kind: MetricKind;
  descriptor?: string;
  /** Métrica principal del botón (las de descriptor/éxito cuelgan de ella). */
  primary: boolean;
  unit: '' | '%';
}

export interface SectionDef {
  name: string;
  eventTypes: string[];
  metrics: MetricDef[];
}

const SECTION_ORDER = ['ataque', 'abp', 'transición', 'transicion', 'defensa'];

function sectionRank(name: string): number {
  const i = SECTION_ORDER.indexOf(name.toLowerCase());
  return i < 0 ? SECTION_ORDER.length : i;
}

/**
 * Métricas derivadas de los datos reales (no sólo de la plantilla): un botón
 * genera su conteo, su % de éxito si registra resultado y un conteo por cada
 * descriptor usado. La sección es la categoría del botón.
 */
export function buildMetrics(
  events: NormalizedEvent[],
  template: BotoneraTemplate | null
): { metrics: MetricDef[]; sections: SectionDef[] } {
  const descriptorButtonNames = new Set(
    (template?.buttons || []).filter((b) => b.type !== 'category').map((b) => b.name.toLowerCase())
  );
  const btnCategory: Record<string, string> = {};
  const btnOrder: Record<string, number> = {};
  (template?.buttons || []).forEach((b, i) => {
    if (b.type !== 'category') return;
    btnCategory[b.name.toLowerCase()] = b.category || 'General';
    btnOrder[b.name.toLowerCase()] = i;
  });

  interface TypeInfo {
    name: string;
    section: string;
    count: number;
    withOutcome: number;
    descriptors: Map<string, number>;
  }
  const types = new Map<string, TypeInfo>();

  events.forEach((e) => {
    const name = (e.event_type || '').trim();
    if (!name || descriptorButtonNames.has(name.toLowerCase())) return;
    const key = name.toLowerCase();
    if (!types.has(key)) {
      const rawSection = btnCategory[key] || e.category || 'General';
      types.set(key, {
        name,
        section: rawSection.toLowerCase() === name.toLowerCase() ? 'General' : rawSection,
        count: 0,
        withOutcome: 0,
        descriptors: new Map(),
      });
    }
    const info = types.get(key)!;
    info.count++;
    if (eventSuccess(e) !== null) info.withOutcome++;
    eventDescriptors(e).forEach((d) => info.descriptors.set(d, (info.descriptors.get(d) || 0) + 1));
  });

  const sorted = Array.from(types.values()).sort((a, b) => {
    const sr = sectionRank(a.section) - sectionRank(b.section);
    if (sr !== 0) return sr;
    if (a.section !== b.section) return a.section.localeCompare(b.section, 'es');
    const oa = btnOrder[a.name.toLowerCase()] ?? 999;
    const ob = btnOrder[b.name.toLowerCase()] ?? 999;
    return oa !== ob ? oa - ob : b.count - a.count;
  });

  const metrics: MetricDef[] = [
    { key: 'goals', label: 'Goles', section: 'Resultado', kind: 'goals', primary: true, unit: '' },
  ];
  const sectionMap = new Map<string, SectionDef>();

  sorted.forEach((info) => {
    const base = `evt:${info.name}`;
    const list: MetricDef[] = [
      { key: base, label: info.name, section: info.section, eventType: info.name, kind: 'count', primary: true, unit: '' },
    ];
    if (info.withOutcome >= Math.max(1, info.count * 0.3)) {
      list.push({
        key: `${base}|success`,
        label: `${info.name} · % éxito`,
        section: info.section,
        eventType: info.name,
        kind: 'success_rate',
        primary: false,
        unit: '%',
      });
    }
    Array.from(info.descriptors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([d]) =>
        list.push({
          key: `${base}|desc:${d}`,
          label: `${info.name} · ${d}`,
          section: info.section,
          eventType: info.name,
          kind: 'descriptor',
          descriptor: d,
          primary: false,
          unit: '',
        })
      );
    metrics.push(...list);
    if (!sectionMap.has(info.section)) sectionMap.set(info.section, { name: info.section, eventTypes: [], metrics: [] });
    const sec = sectionMap.get(info.section)!;
    sec.eventTypes.push(info.name);
    sec.metrics.push(...list);
  });

  return { metrics, sections: Array.from(sectionMap.values()) };
}

export function eventsOfType(list: NormalizedEvent[], eventType?: string): NormalizedEvent[] {
  if (!eventType) return list;
  const t = eventType.toLowerCase();
  return list.filter((e) => (e.event_type || '').toLowerCase() === t);
}

/** Valor de una métrica en una jornada para un lado. null = no aplica (sin datos para %). */
export function metricValue(row: JornadaRow, metric: MetricDef, side: Side): number | null {
  if (metric.kind === 'goals') return side === 'own' ? row.gf : row.ga;
  const list = eventsOfType(side === 'own' ? row.own : row.rival, metric.eventType);
  switch (metric.kind) {
    case 'count':
      return list.length;
    case 'descriptor': {
      const d = (metric.descriptor || '').toLowerCase();
      return list.filter((e) => eventDescriptors(e).some((x) => x.toLowerCase() === d)).length;
    }
    case 'success_rate': {
      const evaluable = list.map(eventSuccess).filter((v) => v !== null);
      if (evaluable.length === 0) return null;
      return (evaluable.filter(Boolean).length / evaluable.length) * 100;
    }
    default:
      return null;
  }
}

export interface MetricSummary {
  metric: MetricDef;
  ownSeries: (number | null)[];
  rivalSeries: (number | null)[];
  ownTotal: number;
  rivalTotal: number;
  ownAvg: number;
  rivalAvg: number;
  ownMax: number;
  ownMin: number;
  ownMaxLabel: string;
  diffAvg: number;
  /** Pendiente de la recta de regresión (unidades por jornada) */
  trend: number;
  tramoOwnAvg: number[];
  tramoRivalAvg: number[];
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function linearSlope(values: (number | null)[]): number {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (pts.length < 2) return 0;
  const mx = mean(pts.map((p) => p[0]));
  const my = mean(pts.map((p) => p[1]));
  let num = 0, den = 0;
  pts.forEach(([x, y]) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export function summarizeMetric(rows: JornadaRow[], metric: MetricDef): MetricSummary {
  const ownSeries = rows.map((r) => metricValue(r, metric, 'own'));
  const rivalSeries = rows.map((r) => metricValue(r, metric, 'rival'));
  const ownVals = ownSeries.filter((v): v is number => v !== null);
  const rivalVals = rivalSeries.filter((v): v is number => v !== null);
  const isRate = metric.kind === 'success_rate';

  // % de éxito acumulado = sobre el total de eventos evaluables, no media de medias
  const pooledRate = (side: Side, subset: JornadaRow[]) => {
    const list = subset.flatMap((r) => eventsOfType(side === 'own' ? r.own : r.rival, metric.eventType));
    const evaluable = list.map(eventSuccess).filter((v) => v !== null);
    return evaluable.length ? (evaluable.filter(Boolean).length / evaluable.length) * 100 : 0;
  };

  const ownTotal = isRate ? pooledRate('own', rows) : ownVals.reduce((a, b) => a + b, 0);
  const rivalTotal = isRate ? pooledRate('rival', rows) : rivalVals.reduce((a, b) => a + b, 0);
  const ownAvg = isRate ? ownTotal : mean(ownVals);
  const rivalAvg = isRate ? rivalTotal : mean(rivalVals);

  let maxIdx = -1;
  ownSeries.forEach((v, i) => {
    if (v !== null && (maxIdx < 0 || v > (ownSeries[maxIdx] as number))) maxIdx = i;
  });

  const tramoAvg = (side: Side) =>
    [0, 1, 2].map((t) => {
      const subset = rows.filter((r) => r.tramo === t);
      if (!subset.length) return 0;
      if (isRate) return pooledRate(side, subset);
      const vals = subset.map((r) => metricValue(r, metric, side)).filter((v): v is number => v !== null);
      return mean(vals);
    });

  return {
    metric,
    ownSeries,
    rivalSeries,
    ownTotal,
    rivalTotal,
    ownAvg,
    rivalAvg,
    ownMax: ownVals.length ? Math.max(...ownVals) : 0,
    ownMin: ownVals.length ? Math.min(...ownVals) : 0,
    ownMaxLabel: maxIdx >= 0 ? rows[maxIdx].label : '—',
    diffAvg: ownAvg - rivalAvg,
    trend: linearSlope(ownSeries),
    tramoOwnAvg: tramoAvg('own'),
    tramoRivalAvg: tramoAvg('rival'),
  };
}

export function rollingAverage(values: (number | null)[], window = 3): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return slice.length ? mean(slice) : null;
  });
}

export function cumulative(values: (number | null)[]): number[] {
  let acc = 0;
  return values.map((v) => (acc += v ?? 0));
}

// ─────────────────────────────────────────────────────────────
// Resumen / tramos / jugadores
// ─────────────────────────────────────────────────────────────

export interface RecordSummary {
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  points: number;
  pointsPct: number;
  cleanSheets: number;
  scoredIn: number;
  currentStreak: string;
  longestUnbeaten: number;
}

export function summarizeRecord(rows: JornadaRow[]): RecordSummary {
  const w = rows.filter((r) => r.result === 'G').length;
  const d = rows.filter((r) => r.result === 'E').length;
  const l = rows.filter((r) => r.result === 'P').length;
  const points = rows.reduce((a, r) => a + r.points, 0);

  let streak = '';
  if (rows.length) {
    const last = rows[rows.length - 1].result;
    let n = 0;
    for (let i = rows.length - 1; i >= 0 && rows[i].result === last; i--) n++;
    streak = `${n}${last}`;
  }
  let longest = 0, run = 0;
  rows.forEach((r) => {
    run = r.result === 'P' ? 0 : run + 1;
    longest = Math.max(longest, run);
  });

  return {
    played: rows.length,
    w,
    d,
    l,
    gf: rows.reduce((a, r) => a + r.gf, 0),
    ga: rows.reduce((a, r) => a + r.ga, 0),
    points,
    pointsPct: rows.length ? (points / (rows.length * 3)) * 100 : 0,
    cleanSheets: rows.filter((r) => r.ga === 0).length,
    scoredIn: rows.filter((r) => r.gf > 0).length,
    currentStreak: streak,
    longestUnbeaten: longest,
  };
}

export interface PlayerSummary {
  name: string;
  total: number;
  matches: number;
  successRate: number | null;
  goals: number;
  byType: Record<string, number>;
}

export function summarizePlayers(rows: JornadaRow[]): PlayerSummary[] {
  const map = new Map<string, { total: number; matches: Set<string>; ok: number; eval: number; goals: number; byType: Record<string, number> }>();
  rows.forEach((r) =>
    r.own.forEach((e) => {
      const name = (e.player_name || '').trim();
      if (UNASSIGNED_PLAYER_TOKENS.includes(name.toLowerCase())) return;
      if (!map.has(name)) map.set(name, { total: 0, matches: new Set(), ok: 0, eval: 0, goals: 0, byType: {} });
      const p = map.get(name)!;
      p.total++;
      p.matches.add(r.match.id);
      const s = eventSuccess(e);
      if (s !== null) {
        p.eval++;
        if (s) p.ok++;
      }
      if (isGoalEvent(e)) p.goals++;
      p.byType[e.event_type] = (p.byType[e.event_type] || 0) + 1;
    })
  );
  return Array.from(map.entries())
    .map(([name, p]) => ({
      name,
      total: p.total,
      matches: p.matches.size,
      successRate: p.eval ? (p.ok / p.eval) * 100 : null,
      goals: p.goals,
      byType: p.byType,
    }))
    .sort((a, b) => b.total - a.total);
}

export function minuteDistribution(list: NormalizedEvent[]): number[] {
  const bins = MINUTE_BINS.map(() => 0);
  list.forEach((e) => bins[minuteBinIndex(e)]++);
  return bins;
}

export function formatValue(v: number | null | undefined, unit: '' | '%' = '', digits = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  if (unit === '%') return `${v.toFixed(0)}%`;
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}
