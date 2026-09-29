'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  FileDown,
  Layers,
  LineChart,
  Loader2,
  Map as MapIcon,
  RefreshCw,
  Split,
  Table2,
  Trophy,
  Users,
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { BotoneraTemplate, Match, NormalizedEvent } from '@/types';
import { buildEngineContext, isGoalEvent } from '@/lib/analytics/dashboard-engine';
import {
  JornadaRow,
  MINUTE_BINS,
  MetricDef,
  MetricSummary,
  SectionDef,
  buildJornadas,
  buildMetrics,
  cumulative,
  eventDescriptors,
  eventSuccess,
  eventsOfType,
  formatShortDate,
  formatValue,
  minuteDistribution,
  rollingAverage,
  summarizeMetric,
  summarizePlayers,
  summarizeRecord,
} from '@/lib/analytics/team-stats-engine';
import { downloadTeamStatsReport } from '@/lib/services/team-report-pdf';
import { PitchChart } from '@/components/dashboards/viz/PitchChart';
import { SERIES_COLORS } from '@/components/dashboards/viz/theme';
import { TeamLogo } from '@/components/player/PlayerBadge';
import {
  EvolutionChart,
  GoalMouthChart,
  OWN_COLOR,
  PairBarRow,
  PitchHeatmap,
  RIVAL_COLOR,
  Sparkline,
  TRAMO_COLORS,
  TRAMO_NAMES,
  TramoBarsRow,
} from '@/components/team-stats/charts';
import { JornadaMatrix, KpiCard, MatrixRow, Panel, ResultChip, SectionHeader, TrendBadge } from '@/components/team-stats/ui';

const CLUB_NAME = 'Shabab Al Ordon Club';
const ALL = '__all__';

const NAV = [
  { id: 'resumen', label: 'Resumen', icon: Trophy },
  { id: 'acumulativo', label: 'Acumulativo', icon: Layers },
  { id: 'evolutivo', label: 'Evolutivo', icon: LineChart },
  { id: 'tramos', label: 'Tramos', icon: Split },
  { id: 'campogramas', label: 'Campogramas', icon: MapIcon },
  { id: 'jornadas', label: 'Jornada a jornada', icon: CalendarDays },
  { id: 'secciones', label: 'Secciones', icon: BarChart3 },
  { id: 'jugadores', label: 'Jugadores', icon: Users },
];

const selectCls =
  'bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer';

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default function TeamStatsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [templates, setTemplates] = useState<BotoneraTemplate[]>([]);
  const [syncing, setSyncing] = useState(true);

  const [competition, setCompetition] = useState<string>(ALL);
  const [evoMetricKey, setEvoMetricKey] = useState<string>('goals');
  const [evoCumulative, setEvoCumulative] = useState(false);
  const [pitchType, setPitchType] = useState<string>(ALL);
  const [pitchPoints, setPitchPoints] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const loadLocal = () => {
    setMatches(dbStore.getMatches());
    setEvents(dbStore.getNormalizedEvents());
    setTemplates(dbStore.getBotoneraTemplates());
  };

  const syncAll = async () => {
    setSyncing(true);
    loadLocal();
    try {
      await Promise.all([
        dbStore.syncMatchesFromSupabase?.(),
        dbStore.syncAnalysesFromSupabase?.(),
        dbStore.syncBotoneraTemplatesFromSupabase?.(),
      ]);
      await Promise.all(dbStore.getMatches().map((m) => dbStore.syncAnalysisEventsFromSupabase(m.id)));
    } catch (err) {
      console.warn('Estadísticas equipo: sincronización parcial', err);
    }
    loadLocal();
    setSyncing(false);
  };

  useEffect(() => {
    syncAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plantilla combinada: los partidos pueden haberse analizado con botoneras distintas.
  const mergedTemplate = useMemo<BotoneraTemplate | null>(() => {
    if (!templates.length) return null;
    const seen = new Set<string>();
    const ordered = [...templates].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
    return {
      ...ordered[0],
      buttons: ordered.flatMap((t) => t.buttons).filter((b) => {
        const k = b.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }),
    };
  }, [templates]);
  const ctx = useMemo(() => buildEngineContext(mergedTemplate), [mergedTemplate]);

  const allRows = useMemo(() => buildJornadas(matches, events), [matches, events]);
  const competitions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.match.competition).filter(Boolean))).sort(),
    [allRows]
  );
  const rows = useMemo(() => {
    const filtered = competition === ALL ? matches : matches.filter((m) => m.competition === competition);
    return buildJornadas(filtered, events);
  }, [matches, events, competition]);

  const { metrics, sections } = useMemo(
    () => buildMetrics(rows.flatMap((r) => r.events), mergedTemplate),
    [rows, mergedTemplate]
  );
  const summaries = useMemo(() => {
    const map = new Map<string, MetricSummary>();
    metrics.forEach((m) => map.set(m.key, summarizeMetric(rows, m)));
    return map;
  }, [rows, metrics]);
  const primaryMetrics = useMemo(() => metrics.filter((m) => m.primary), [metrics]);
  const record = useMemo(() => summarizeRecord(rows), [rows]);
  const players = useMemo(() => summarizePlayers(rows), [rows]);

  const ownAll = useMemo(() => rows.flatMap((r) => r.own), [rows]);
  const rivalAll = useMemo(() => rows.flatMap((r) => r.rival), [rows]);
  const labels = rows.map((r) => r.label);
  const subLabels = rows.map((r) => r.opponentShort);
  const tramos = rows.map((r) => r.tramo);

  const evoMetric = metrics.find((m) => m.key === evoMetricKey) || metrics[0];
  const evoSummary = evoMetric ? summaries.get(evoMetric.key) : undefined;

  const pitchOwn = pitchType === ALL ? ownAll : eventsOfType(ownAll, pitchType);
  const pitchRival = pitchType === ALL ? rivalAll : eventsOfType(rivalAll, pitchType);
  const eventTypes = sections.flatMap((s) => s.eventTypes);

  const periodLabel = rows.length
    ? `${rows.length} jornadas · ${formatShortDate(rows[0].dateMs)} – ${formatShortDate(rows[rows.length - 1].dateMs)}`
    : 'Sin jornadas analizadas';

  const handleExport = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    setProgress('Preparando maquetación del informe…');
    // Ancho fijo de escritorio para que todas las gráficas se re-midan antes de capturar
    await new Promise((r) => setTimeout(r, 450));
    try {
      await downloadTeamStatsReport(
        reportRef.current,
        {
          clubName: CLUB_NAME,
          subtitle: 'Acumulado, evolutivo, tramos, campogramas y secciones · Botonera Live',
          periodLabel,
          filterLabel: competition === ALL ? 'Todas las competiciones' : `Competición: ${competition}`,
          kpis: [
            { label: 'Partidos', value: String(record.played) },
            { label: 'Victorias', value: String(record.w), color: '#4ade80' },
            { label: 'Empates', value: String(record.d), color: '#fbbf24' },
            { label: 'Derrotas', value: String(record.l), color: '#f87171' },
            { label: 'Puntos', value: String(record.points), color: '#fbbf24' },
            { label: 'Goles favor', value: String(record.gf) },
            { label: 'Goles contra', value: String(record.ga) },
            { label: 'Acciones', value: String(ownAll.length), color: '#6da7ec' },
            { label: '% puntos', value: `${record.pointsPct.toFixed(0)}%` },
          ],
          form: rows.map((r) => ({ label: r.label, result: r.result })),
        },
        setProgress
      );
    } catch (err) {
      console.error('Error exportando informe de equipo', err);
      alert('No se pudo generar el PDF. Revisa la consola para más detalle.');
    } finally {
      setExporting(false);
      setProgress('');
    }
  };

  // ── Filas de matriz ───────────────────────────────────────
  const matrixRowFor = (m: MetricDef): MatrixRow => {
    const s = summaries.get(m.key)!;
    return {
      key: m.key,
      label: m.primary ? m.label : m.label.split(' · ').slice(1).join(' · ') || m.label,
      unit: m.unit,
      values: s.ownSeries,
      total: s.ownTotal,
      avg: s.ownAvg,
      rivalAvg: s.rivalAvg,
      primary: m.primary,
    };
  };

  const isEmpty = !syncing && rows.length === 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-5">
      {/* Cabecera + navegación */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-3 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <TeamLogo teamName={CLUB_NAME} size={40} />
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Estadísticas Equipo
                {syncing && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {periodLabel} · {ownAll.length} acciones propias · {rivalAll.length} del rival
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={selectCls} value={competition} onChange={(e) => setCompetition(e.target.value)}>
              <option value={ALL}>Todas las competiciones</option>
              {competitions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={syncAll}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4 stroke-[2.5]" />
              Exportar PDF
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto mt-3 -mb-1 pb-1">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-amber-300 hover:bg-slate-800/70 whitespace-nowrap transition-colors"
            >
              <n.icon className="w-3.5 h-3.5" />
              {n.label}
            </a>
          ))}
        </nav>
      </div>

      {syncing && rows.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-xs text-slate-400">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-2" />
          Sincronizando partidos y eventos de la botonera…
        </div>
      ) : isEmpty ? (
        <div className="p-16 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">Aún no hay partidos analizados con la Botonera Live</h3>
          <p className="text-xs text-slate-500 mt-1">Cuando registres eventos en un partido aparecerá aquí como una jornada.</p>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-10 mx-auto" style={exporting ? { width: 1600, maxWidth: 'none' } : undefined}>
          {/* ════════ 1. RESUMEN ════════ */}
          <section id="resumen" data-pdf-section data-pdf-title="Resumen de temporada" className="space-y-4 scroll-mt-32">
            <SectionHeader index={1} title="Resumen de temporada" description="Balance, secuencia de resultados y rendimiento global." icon={Trophy} />

            <Panel>
              <div className="flex flex-col xl:flex-row gap-6 xl:items-center">
                <div className="flex items-center gap-4 shrink-0">
                  <TeamLogo teamName={CLUB_NAME} size={72} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Balance</p>
                    <p className="text-2xl font-black text-white leading-tight">{CLUB_NAME}</p>
                    <p className="text-xs text-slate-400">{periodLabel}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-11 gap-2 flex-1">
                  <KpiCard label="PJ" value={String(record.played)} />
                  <KpiCard label="G" value={String(record.w)} accent="text-green-400" />
                  <KpiCard label="E" value={String(record.d)} accent="text-amber-400" />
                  <KpiCard label="P" value={String(record.l)} accent="text-red-400" />
                  <KpiCard label="Puntos" value={String(record.points)} accent="text-amber-300" hint={`${(record.points / Math.max(1, record.played)).toFixed(2)} / partido`} />
                  <KpiCard label="% puntos" value={`${record.pointsPct.toFixed(0)}%`} />
                  <KpiCard label="GF" value={String(record.gf)} hint={`${(record.gf / Math.max(1, record.played)).toFixed(2)} / partido`} />
                  <KpiCard label="GC" value={String(record.ga)} hint={`${(record.ga / Math.max(1, record.played)).toFixed(2)} / partido`} />
                  <KpiCard label="DG" value={`${record.gf - record.ga > 0 ? '+' : ''}${record.gf - record.ga}`} accent={record.gf >= record.ga ? 'text-sky-300' : 'text-orange-300'} />
                  <KpiCard label="Portería 0" value={String(record.cleanSheets)} hint={`Marcó en ${record.scoredIn}`} />
                  <KpiCard label="Racha" value={record.currentStreak || '—'} hint={`Invicto máx. ${record.longestUnbeaten}`} />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Secuencia de resultados (ordenada por fecha)</p>
                <div className="flex flex-wrap gap-2">
                  {rows.map((r) => (
                    <div key={r.match.id} className="flex flex-col items-center gap-0.5 w-[4.2rem]" title={`${r.label} · ${r.dateLabel} · ${r.match.home_team} ${r.match.home_score}-${r.match.away_score} ${r.match.away_team}`}>
                      <ResultChip result={r.result} size={30} />
                      <span className="text-[9.5px] font-bold text-slate-300">{r.label} · {r.gf}-{r.ga}</span>
                      <span className="text-[9px] text-slate-500 truncate max-w-full">{r.isHome ? 'vs' : '@'} {r.opponentShort}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Panel title="Goles por jornada" subtitle="Goles a favor y en contra en cada partido">
                <div className="h-[260px]">
                  <EvolutionChart
                    labels={labels}
                    subLabels={subLabels}
                    tramos={tramos}
                    showValues
                    series={[
                      { key: 'gf', label: 'Goles a favor', color: OWN_COLOR, type: 'bar', values: rows.map((r) => r.gf) },
                      { key: 'ga', label: 'Goles en contra', color: RIVAL_COLOR, type: 'bar', values: rows.map((r) => r.ga) },
                    ]}
                  />
                </div>
              </Panel>
              <Panel title="Puntos acumulados" subtitle="Progresión de puntos frente al ritmo de 2 puntos por partido">
                <div className="h-[260px]">
                  <EvolutionChart
                    labels={labels}
                    subLabels={subLabels}
                    tramos={tramos}
                    series={[
                      { key: 'pts', label: 'Puntos acumulados', color: OWN_COLOR, type: 'line', values: cumulative(rows.map((r) => r.points)) },
                      { key: 'pace', label: 'Ritmo 2 pts/partido', color: '#94a3b8', type: 'line', dashed: true, values: rows.map((_, i) => (i + 1) * 2) },
                    ]}
                  />
                </div>
              </Panel>
            </div>

            <Panel title="Indicadores clave por partido" subtitle="Media por partido propia vs rival y tendencia a lo largo de las jornadas">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {primaryMetrics.slice(0, 18).map((m) => {
                  const s = summaries.get(m.key)!;
                  return (
                    <KpiCard key={m.key} label={m.label} value={formatValue(s.ownAvg, m.unit)} hint={`Rival ${formatValue(s.rivalAvg, m.unit)} · Total ${formatValue(s.ownTotal, m.unit, 0)}`}>
                      <div className="flex items-end justify-between gap-2 mt-1">
                        <Sparkline values={s.ownSeries} width={84} height={24} />
                        <TrendBadge slope={s.trend} unit={m.unit} />
                      </div>
                    </KpiCard>
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* ════════ 2. ACUMULATIVO ════════ */}
          <section id="acumulativo" data-pdf-section data-pdf-title="Acumulativo" className="space-y-4 scroll-mt-32">
            <SectionHeader index={2} title="Acumulativo" description="Suma de todas las jornadas: comparativa con el rival, distribución por minutos y tabla completa de métricas." icon={Layers} />

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              <Panel title="Propio vs rival · media por partido" subtitle="Cada fila muestra la media por partido y el reparto porcentual" className="xl:col-span-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1 px-1">
                  <span style={{ color: '#6da7ec' }}>{CLUB_NAME}</span>
                  <span style={{ color: '#e98a5f' }}>Rivales</span>
                </div>
                {primaryMetrics.map((m) => {
                  const s = summaries.get(m.key)!;
                  return <PairBarRow key={m.key} label={m.label} own={s.ownAvg} rival={s.rivalAvg} max={Math.max(s.ownAvg, s.rivalAvg)} unit={m.unit} />;
                })}
              </Panel>
              <div className="xl:col-span-2 space-y-4">
                <Panel title="Distribución por franjas de 15'" subtitle="Acciones acumuladas registradas en cada tramo del partido">
                  <div className="h-[240px]">
                    <EvolutionChart
                      labels={MINUTE_BINS.map((b) => b.label)}
                      showValues
                      series={[
                        { key: 'own', label: 'Propias', color: OWN_COLOR, type: 'bar', values: minuteDistribution(ownAll) },
                        { key: 'rival', label: 'Rival', color: RIVAL_COLOR, type: 'bar', values: minuteDistribution(rivalAll) },
                      ]}
                    />
                  </div>
                </Panel>
                <Panel title="Goles por franjas de 15'" subtitle="Cuándo marcamos y cuándo encajamos (según goles registrados en la botonera)">
                  <div className="h-[200px]">
                    <EvolutionChart
                      labels={MINUTE_BINS.map((b) => b.label)}
                      showValues
                      series={[
                        { key: 'gf', label: 'A favor', color: OWN_COLOR, type: 'bar', values: minuteDistribution(ownAll.filter((e) => isGoalEvent(e))) },
                        { key: 'ga', label: 'En contra', color: RIVAL_COLOR, type: 'bar', values: minuteDistribution(rivalAll.filter((e) => isGoalEvent(e))) },
                      ]}
                    />
                  </div>
                </Panel>
              </div>
            </div>

            <Panel title="Tabla acumulada de métricas" subtitle="Totales, medias, extremos, rival, diferencial y tendencia de cada métrica registrada">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-[9.5px] uppercase tracking-wider text-slate-400">
                      {['Sección', 'Métrica', 'Total', 'Media/P', 'Máx (J)', 'Mín', 'Rival total', 'Rival media', 'Dif. media', 'Tendencia', 'Evolución'].map((h) => (
                        <th key={h} className={`px-2 py-2 border-b border-slate-800 font-bold ${h === 'Sección' || h === 'Métrica' ? 'text-left' : 'text-center'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => {
                      const s = summaries.get(m.key)!;
                      const diffGood = m.unit === '%' ? s.diffAvg >= 0 : s.diffAvg >= 0;
                      return (
                        <tr key={m.key} className="hover:bg-slate-800/30">
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-slate-500">{m.primary ? m.section : ''}</td>
                          <td className={`px-2 py-1.5 border-b border-slate-800/70 ${m.primary ? 'font-bold text-slate-100' : 'pl-5 text-slate-400'}`}>
                            {m.primary ? m.label : m.label.split(' · ').slice(1).join(' · ')}
                          </td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center font-black tabular-nums text-white">{formatValue(s.ownTotal, m.unit, 0)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center font-bold tabular-nums text-sky-300">{formatValue(s.ownAvg, m.unit)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-slate-300">{formatValue(s.ownMax, m.unit)} <span className="text-slate-500">({s.ownMaxLabel})</span></td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-slate-400">{formatValue(s.ownMin, m.unit)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-slate-300">{formatValue(s.rivalTotal, m.unit, 0)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center font-bold tabular-nums text-orange-300">{formatValue(s.rivalAvg, m.unit)}</td>
                          <td className={`px-2 py-1.5 border-b border-slate-800/70 text-center font-bold tabular-nums ${diffGood ? 'text-sky-300' : 'text-orange-300'}`}>
                            {s.diffAvg > 0 ? '+' : ''}{formatValue(s.diffAvg, m.unit)}
                          </td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center"><TrendBadge slope={s.trend} unit={m.unit} /></td>
                          <td className="px-2 py-1 border-b border-slate-800/70"><Sparkline values={s.ownSeries} width={90} height={22} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          {/* ════════ 3. EVOLUTIVO ════════ */}
          <section id="evolutivo" data-pdf-section data-pdf-title="Evolutivo" className="space-y-4 scroll-mt-32">
            <SectionHeader index={3} title="Evolutivo" description="Cómo cambia cada métrica jornada a jornada, con media móvil y los 3 tramos marcados." icon={LineChart} />

            {evoMetric && evoSummary && (
              <Panel
                title={`${evoMetric.label} · ${evoCumulative ? 'acumulado' : 'por jornada'}`}
                subtitle={`Media ${formatValue(evoSummary.ownAvg, evoMetric.unit)} · Rival ${formatValue(evoSummary.rivalAvg, evoMetric.unit)} · Máx ${formatValue(evoSummary.ownMax, evoMetric.unit)} en ${evoSummary.ownMaxLabel}`}
                right={
                  <>
                    <select className={selectCls} value={evoMetric.key} onChange={(e) => setEvoMetricKey(e.target.value)}>
                      <option value="goals">Goles</option>
                      {sections.map((s) => (
                        <optgroup key={s.name} label={s.name}>
                          {s.metrics.map((m) => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                      {[
                        { v: false, l: 'Por jornada' },
                        { v: true, l: 'Acumulado' },
                      ].map((o) => (
                        <button
                          key={o.l}
                          onClick={() => setEvoCumulative(o.v)}
                          disabled={o.v && evoMetric.unit === '%'}
                          className={`px-2.5 py-1.5 text-[11px] font-bold cursor-pointer disabled:opacity-30 ${evoCumulative === o.v ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </>
                }
              >
                <div className="h-[340px]">
                  <EvolutionChart
                    labels={labels}
                    subLabels={subLabels}
                    tramos={tramos}
                    unit={evoMetric.unit}
                    showValues
                    series={
                      evoCumulative && evoMetric.unit !== '%'
                        ? [
                            { key: 'own', label: 'Propio (acumulado)', color: OWN_COLOR, type: 'line', values: cumulative(evoSummary.ownSeries) },
                            { key: 'rival', label: 'Rival (acumulado)', color: RIVAL_COLOR, type: 'line', values: cumulative(evoSummary.rivalSeries) },
                          ]
                        : [
                            { key: 'own', label: 'Propio', color: OWN_COLOR, type: 'bar', values: evoSummary.ownSeries },
                            { key: 'rival', label: 'Rival', color: RIVAL_COLOR, type: 'bar', values: evoSummary.rivalSeries },
                            { key: 'avg3', label: 'Media móvil 3J (propio)', color: '#cde2fb', type: 'line', dashed: true, values: rollingAverage(evoSummary.ownSeries, 3) },
                          ]
                    }
                  />
                </div>
              </Panel>
            )}

            <Panel title="Evolución de todas las métricas principales" subtitle="Propio (azul) vs rival (naranja) por jornada · un gráfico por métrica">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {primaryMetrics.map((m) => {
                  const s = summaries.get(m.key)!;
                  return (
                    <div key={m.key} className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-200 truncate">{m.label}</span>
                        <span className="flex items-center gap-2 text-[10px] tabular-nums">
                          <span className="text-sky-300 font-bold">{formatValue(s.ownAvg, m.unit)}</span>
                          <span className="text-orange-300 font-bold">{formatValue(s.rivalAvg, m.unit)}</span>
                          <TrendBadge slope={s.trend} unit={m.unit} />
                        </span>
                      </div>
                      <div className="h-[140px]">
                        <EvolutionChart
                          labels={labels}
                          tramos={tramos}
                          unit={m.unit}
                          series={[
                            { key: 'own', label: 'Propio', color: OWN_COLOR, type: 'line', values: s.ownSeries },
                            { key: 'rival', label: 'Rival', color: RIVAL_COLOR, type: 'line', values: s.rivalSeries },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* ════════ 4. TRAMOS ════════ */}
          <TramosSection rows={rows} metrics={metrics} summaries={summaries} />

          {/* ════════ 5. CAMPOGRAMAS ════════ */}
          <section id="campogramas" data-pdf-section data-pdf-title="Campogramas y mapas de calor" className="space-y-4 scroll-mt-32">
            <SectionHeader index={5} title="Campogramas y mapas de calor" description="Dónde ocurren las acciones: acumulado de todas las jornadas, propio y rival." icon={MapIcon} />

            <Panel
              title={`Mapa de calor acumulado · ${pitchType === ALL ? 'Todas las acciones' : pitchType}`}
              subtitle={`${pitchOwn.length} acciones propias · ${pitchRival.length} del rival · ataque hacia la derecha`}
              right={
                <>
                  <select className={selectCls} value={pitchType} onChange={(e) => setPitchType(e.target.value)}>
                    <option value={ALL}>Todas las acciones</option>
                    {eventTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={pitchPoints} onChange={(e) => setPitchPoints(e.target.checked)} className="accent-amber-500" />
                    Mostrar puntos
                  </label>
                </>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#6da7ec' }}>{CLUB_NAME}</p>
                  <div className="h-[340px]"><PitchHeatmap events={pitchOwn} showPoints={pitchPoints} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#e98a5f' }}>Rivales</p>
                  <div className="h-[340px]"><PitchHeatmap events={pitchRival} ramp="orange" showPoints={pitchPoints} /></div>
                </div>
              </div>
            </Panel>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Panel title="Zonas registradas (propio)" subtitle="Acumulado por zona del campograma">
                <div className="h-[280px]">
                  <PitchChart key={`zones-${pitchType}-${pitchOwn.length}`} events={pitchOwn} mode="zones" measure="count" ctx={ctx} showLegend={false} />
                </div>
              </Panel>
              <Panel title="Acciones por resultado (propio)" subtitle="Cada punto coloreado según el resultado registrado">
                <div className="h-[280px]">
                  <PitchChart key={`points-${pitchType}-${pitchOwn.length}`} events={pitchOwn} mode="points" measure="count" ctx={ctx} breakdown="outcome" />
                </div>
              </Panel>
              <Panel title="Vectores (propio)" subtitle="Acciones con origen y destino (pases, conducciones…)">
                <div className="h-[280px]">
                  <PitchChart key={`arrows-${pitchType}-${pitchOwn.length}`} events={pitchOwn} mode="arrows" measure="count" ctx={ctx} showLegend={false} />
                </div>
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Portería · remates propios" subtitle="Impacto en portería registrado en la botonera">
                <GoalMouthChart events={ownAll} />
              </Panel>
              <Panel title="Portería · remates del rival" subtitle="Dónde nos disparan">
                <GoalMouthChart events={rivalAll} />
              </Panel>
            </div>
          </section>

          {/* ════════ 6. JORNADA A JORNADA ════════ */}
          <section id="jornadas" data-pdf-section data-pdf-title="Jornada a jornada" className="space-y-4 scroll-mt-32">
            <SectionHeader index={6} title="Jornada a jornada" description="Cada jornada es un partido, ordenado por fecha." icon={CalendarDays} />

            <Panel title="Partidos analizados" subtitle="Ficha resumen de cada jornada">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                {rows.map((r) => (
                  <MatchCard key={r.match.id} row={r} metrics={primaryMetrics} />
                ))}
              </div>
            </Panel>

            <JornadaMatrix
              title="Métricas principales por jornada"
              subtitle="Intensidad del color relativa al máximo de cada fila"
              jornadas={rows}
              showRival
              rows={primaryMetrics.map(matrixRowFor)}
            />
          </section>

          {/* ════════ 7. SECCIONES ════════ */}
          <div id="secciones" className="space-y-10 scroll-mt-32">
            {sections.map((sec, i) => (
              <SectionBlock
                key={sec.name}
                index={7 + i}
                section={sec}
                rows={rows}
                summaries={summaries}
                matrixRowFor={matrixRowFor}
              />
            ))}
          </div>

          {/* ════════ 8. JUGADORES ════════ */}
          <section id="jugadores" data-pdf-section data-pdf-title="Participación de jugadores" className="space-y-4 scroll-mt-32">
            <SectionHeader index={7 + sections.length} title="Participación de jugadores" description="Acciones propias atribuidas a cada jugador en la botonera." icon={Users} />
            <Panel title="Ranking de participación" subtitle={`${players.length} jugadores con acciones registradas`}>
              {players.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No hay acciones asignadas a jugadores.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-separate border-spacing-0">
                    <thead>
                      <tr className="text-[9.5px] uppercase tracking-wider text-slate-400">
                        {['#', 'Jugador', 'PJ', 'Acciones', 'Acc/P', '% éxito', 'Goles', 'Participación', 'Acciones principales'].map((h) => (
                          <th key={h} className={`px-2 py-2 border-b border-slate-800 font-bold ${h === 'Jugador' || h === 'Acciones principales' || h === 'Participación' ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.slice(0, 30).map((p, i) => (
                        <tr key={p.name} className="hover:bg-slate-800/30">
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center text-slate-500 font-bold">{i + 1}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 font-bold text-slate-100">{p.name}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-slate-300">{p.matches}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums font-black text-white">{p.total}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-sky-300 font-bold">{(p.total / Math.max(1, p.matches)).toFixed(1)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-slate-300">{formatValue(p.successRate, '%')}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-green-400 font-bold">{p.goals || '—'}</td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 w-40">
                            <div className="h-2 rounded-r-full bg-slate-800/60 overflow-hidden">
                              <div className="h-full rounded-r-full" style={{ width: `${(p.total / players[0].total) * 100}%`, background: OWN_COLOR }} />
                            </div>
                          </td>
                          <td className="px-2 py-1.5 border-b border-slate-800/70 text-slate-400">
                            {Object.entries(p.byType)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 4)
                              .map(([t, n]) => `${t} (${n})`)
                              .join(' · ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-black text-white">Generando informe PDF</h3>
            <p className="text-xs text-slate-400 mt-1.5">{progress}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function MatchCard({ row, metrics }: { row: JornadaRow; metrics: MetricDef[] }) {
  const top = metrics
    .filter((m) => m.kind === 'count')
    .map((m) => ({ m, own: eventsOfType(row.own, m.eventType).length, rival: eventsOfType(row.rival, m.eventType).length }))
    .filter((x) => x.own + x.rival > 0)
    .sort((a, b) => b.own + b.rival - (a.own + a.rival))
    .slice(0, 5);
  const max = Math.max(...top.map((t) => Math.max(t.own, t.rival)), 1);
  return (
    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">{row.label} · {row.dateLabel}</span>
        <span className="text-[9.5px] font-bold text-slate-500 truncate max-w-[9rem]">{row.match.competition}</span>
      </div>
      <div className="flex items-center gap-2">
        <TeamLogo teamName={row.opponent} match={row.match} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-100 truncate">{row.isHome ? 'vs' : '@'} {row.opponent}</p>
          <p className="text-[10px] text-slate-500">{row.isHome ? 'Local' : 'Visitante'} · {row.own.length} acc. propias · {row.rival.length} rival</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black tabular-nums text-white">{row.gf}-{row.ga}</span>
          <ResultChip result={row.result} size={22} />
        </div>
      </div>
      <div className="space-y-1">
        {top.map(({ m, own, rival }) => (
          <div key={m.key} className="grid grid-cols-[1.4rem_1fr_6.5rem_1fr_1.4rem] items-center gap-1.5">
            <span className="text-[10px] font-bold tabular-nums text-right text-slate-200">{own}</span>
            <div className="h-1.5 bg-slate-800/60 rounded-full flex justify-end overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(own / max) * 100}%`, background: OWN_COLOR }} />
            </div>
            <span className="text-[9.5px] text-slate-400 text-center truncate">{m.label}</span>
            <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(rival / max) * 100}%`, background: RIVAL_COLOR }} />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-slate-200">{rival}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TramosSection({ rows, metrics, summaries }: { rows: JornadaRow[]; metrics: MetricDef[]; summaries: Map<string, MetricSummary> }) {
  const tramoRows = [0, 1, 2].map((t) => rows.filter((r) => r.tramo === t));
  const primary = metrics.filter((m) => m.primary || m.kind === 'success_rate');

  return (
    <section id="tramos" data-pdf-section data-pdf-title="Tramos evolutivos" className="space-y-4 scroll-mt-32">
      <SectionHeader index={4} title="Tramos evolutivos" description="La temporada dividida en 3 tramos consecutivos de jornadas para ver la tendencia del equipo." icon={Split} />

      <Panel title="Balance por tramo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tramoRows.map((tr, t) => {
            const rec = summarizeRecord(tr);
            const acc = tr.reduce((a, r) => a + r.own.length, 0);
            return (
              <div key={t} className="rounded-xl bg-slate-950/70 border border-slate-800 p-4" style={{ borderTop: `3px solid ${TRAMO_COLORS[t]}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{TRAMO_NAMES[t]}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {tr.length ? `${tr[0].label}–${tr[tr.length - 1].label} · ${tr[0].dateLabel} – ${tr[tr.length - 1].dateLabel}` : 'Sin jornadas'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  {[
                    { l: 'PJ', v: rec.played },
                    { l: 'G-E-P', v: `${rec.w}-${rec.d}-${rec.l}` },
                    { l: 'Pts', v: rec.points },
                    { l: 'Pts/P', v: (rec.points / Math.max(1, rec.played)).toFixed(2) },
                    { l: 'GF', v: rec.gf },
                    { l: 'GC', v: rec.ga },
                    { l: 'GF/P', v: (rec.gf / Math.max(1, rec.played)).toFixed(2) },
                    { l: 'Acc/P', v: (acc / Math.max(1, rec.played)).toFixed(1) },
                  ].map((k) => (
                    <div key={k.l}>
                      <p className="text-base font-black tabular-nums text-slate-100">{k.v}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-500">{k.l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {tr.map((r) => (
                    <ResultChip key={r.match.id} result={r.result} size={18} title={`${r.label} vs ${r.opponent} ${r.gf}-${r.ga}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Media por partido en cada tramo (propio)" subtitle="Comparativa T1 → T2 → T3 de cada métrica">
          <div className="mb-2">
            <Legend items={TRAMO_NAMES.map((n, i) => ({ label: n, color: TRAMO_COLORS[i] }))} />
          </div>
          {primary.map((m) => (
            <TramoBarsRow key={m.key} label={m.label} values={summaries.get(m.key)!.tramoOwnAvg} unit={m.unit} />
          ))}
        </Panel>
        <Panel title="Tabla de tramos" subtitle="Propio y rival por tramo · variación del tramo 1 al 3">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-separate border-spacing-0">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 border-b border-slate-800 text-left">Métrica</th>
                  {TRAMO_NAMES.map((n, i) => (
                    <th key={n} className="px-2 py-2 border-b border-slate-800 text-center" style={{ color: TRAMO_COLORS[i] }}>{n}</th>
                  ))}
                  <th className="px-2 py-2 border-b border-slate-800 text-center">Δ T1→T3</th>
                  <th className="px-2 py-2 border-b border-slate-800 text-center text-orange-300/80">Rival T1 / T2 / T3</th>
                </tr>
              </thead>
              <tbody>
                {primary.map((m) => {
                  const s = summaries.get(m.key)!;
                  const [a, , c] = s.tramoOwnAvg;
                  const delta = m.unit === '%' ? c - a : a ? ((c - a) / a) * 100 : c ? 100 : 0;
                  return (
                    <tr key={m.key} className="hover:bg-slate-800/30">
                      <td className={`px-2 py-1.5 border-b border-slate-800/70 ${m.primary ? 'font-bold text-slate-100' : 'pl-5 text-slate-400'}`}>{m.label}</td>
                      {s.tramoOwnAvg.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums font-bold text-slate-200">{formatValue(v, m.unit)}</td>
                      ))}
                      <td className={`px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums font-black ${delta > 0 ? 'text-sky-300' : delta < 0 ? 'text-orange-300' : 'text-slate-400'}`}>
                        {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}{m.unit === '%' ? `${delta.toFixed(0)} pp` : `${delta.toFixed(0)}%`}
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-800/70 text-center tabular-nums text-orange-300/90">
                        {s.tramoRivalAvg.map((v) => formatValue(v, m.unit)).join(' / ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Campogramas acumulativos por tramo · propio" subtitle="Mapa de calor de todas las acciones propias en cada tramo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tramoRows.map((tr, t) => (
            <div key={t}>
              <p className="text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: TRAMO_COLORS[t] }}>
                {TRAMO_NAMES[t]} · {tr.reduce((a, r) => a + r.own.length, 0)} acciones
              </p>
              <div className="h-[230px]"><PitchHeatmap events={tr.flatMap((r) => r.own)} /></div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Campogramas acumulativos por tramo · rival" subtitle="Mapa de calor de las acciones del rival en cada tramo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tramoRows.map((tr, t) => (
            <div key={t}>
              <p className="text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: TRAMO_COLORS[t] }}>
                {TRAMO_NAMES[t]} · {tr.reduce((a, r) => a + r.rival.length, 0)} acciones
              </p>
              <div className="h-[230px]"><PitchHeatmap events={tr.flatMap((r) => r.rival)} ramp="orange" /></div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function SectionBlock({
  index,
  section,
  rows,
  summaries,
  matrixRowFor,
}: {
  index: number;
  section: SectionDef;
  rows: JornadaRow[];
  summaries: Map<string, MetricSummary>;
  matrixRowFor: (m: MetricDef) => MatrixRow;
}) {
  const types = section.eventTypes;
  const own = rows.flatMap((r) => r.own).filter((e) => types.some((t) => t.toLowerCase() === (e.event_type || '').toLowerCase()));
  const rival = rows.flatMap((r) => r.rival).filter((e) => types.some((t) => t.toLowerCase() === (e.event_type || '').toLowerCase()));
  const evaluable = own.map(eventSuccess).filter((v) => v !== null);
  const successPct = evaluable.length ? (evaluable.filter(Boolean).length / evaluable.length) * 100 : null;
  const perRow = rows.map((r) => r.own.filter((e) => types.some((t) => t.toLowerCase() === (e.event_type || '').toLowerCase())).length);

  const topPlayer = (() => {
    const c: Record<string, number> = {};
    own.forEach((e) => {
      const n = (e.player_name || '').trim();
      if (!n || n.toLowerCase().includes('sin asignar') || n.toLowerCase().includes('pendiente')) return;
      c[n] = (c[n] || 0) + 1;
    });
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return best ? `${best[0]} (${best[1]})` : '—';
  })();

  const primaries = section.metrics.filter((m) => m.primary);

  return (
    <section id={`sec-${section.name}`} data-pdf-section data-pdf-title={`Sección · ${section.name}`} className="space-y-4 scroll-mt-32">
      <SectionHeader index={index} title={`Sección · ${section.name}`} description={`${types.length} acciones: ${types.join(', ')}`} icon={Table2} />

      <Panel>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          <KpiCard label="Acciones propias" value={String(own.length)} hint={`${(own.length / Math.max(1, rows.length)).toFixed(1)} por partido`} accent="text-sky-300" />
          <KpiCard label="Acciones rival" value={String(rival.length)} hint={`${(rival.length / Math.max(1, rows.length)).toFixed(1)} por partido`} accent="text-orange-300" />
          <KpiCard label="Cuota propia" value={`${own.length + rival.length ? ((own.length / (own.length + rival.length)) * 100).toFixed(0) : 0}%`} hint="del total de la sección" />
          <KpiCard label="% éxito" value={formatValue(successPct, '%')} hint={`${evaluable.length} acciones evaluables`} />
          <KpiCard label="Mejor jornada" value={perRow.length ? rows[perRow.indexOf(Math.max(...perRow))].label : '—'} hint={`${Math.max(0, ...perRow)} acciones`} />
          <KpiCard label="Jugador más activo" value={topPlayer.split(' (')[0].split(' ').slice(-1)[0] || '—'} hint={topPlayer} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <p className="text-[11px] font-bold text-slate-300 mb-1">Evolución por jornada (propio)</p>
            <div className="h-[250px]">
              <EvolutionChart
                labels={rows.map((r) => r.label)}
                subLabels={rows.map((r) => r.opponentShort)}
                tramos={rows.map((r) => r.tramo)}
                series={primaries.slice(0, 8).map((m, i) => ({
                  key: m.key,
                  label: m.label,
                  color: SERIES_COLORS[i],
                  type: 'line' as const,
                  values: summaries.get(m.key)!.ownSeries,
                }))}
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300 mb-1">Distribución por franjas de 15&apos;</p>
            <div className="h-[250px]">
              <EvolutionChart
                labels={MINUTE_BINS.map((b) => b.label)}
                series={[
                  { key: 'own', label: 'Propio', color: OWN_COLOR, type: 'bar', values: minuteDistribution(own) },
                  { key: 'rival', label: 'Rival', color: RIVAL_COLOR, type: 'bar', values: minuteDistribution(rival) },
                ]}
              />
            </div>
          </div>
        </div>
      </Panel>

      <JornadaMatrix
        title={`${section.name} · tabla por jornada`}
        subtitle="Métricas de la sección con sus descriptores y % de éxito · propio"
        jornadas={rows}
        showRival
        rows={section.metrics.map(matrixRowFor)}
      />

      {types.map((t) => (
        <EventTypeCard key={t} eventType={t} rows={rows} summaries={summaries} metrics={section.metrics.filter((m) => m.eventType === t)} />
      ))}
    </section>
  );
}

function EventTypeCard({
  eventType,
  rows,
  summaries,
  metrics,
}: {
  eventType: string;
  rows: JornadaRow[];
  summaries: Map<string, MetricSummary>;
  metrics: MetricDef[];
}) {
  const own = eventsOfType(rows.flatMap((r) => r.own), eventType);
  const rival = eventsOfType(rows.flatMap((r) => r.rival), eventType);
  const main = metrics.find((m) => m.primary);
  const success = metrics.find((m) => m.kind === 'success_rate');
  const s = main ? summaries.get(main.key) : undefined;

  const descCounts: Record<string, number> = {};
  own.forEach((e) => eventDescriptors(e).forEach((d) => (descCounts[d] = (descCounts[d] || 0) + 1)));
  const desc = Object.entries(descCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const descMax = desc[0]?.[1] || 1;

  return (
    <Panel
      title={eventType}
      subtitle={`${own.length} propias (${s ? formatValue(s.ownAvg) : '—'}/P) · ${rival.length} rival (${s ? formatValue(s.rivalAvg) : '—'}/P)${
        success ? ` · ${formatValue(summaries.get(success.key)!.ownTotal, '%')} éxito` : ''
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#6da7ec' }}>Mapa de calor propio</p>
          <div className="h-[220px]"><PitchHeatmap events={own} showPoints /></div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-slate-400">Descriptores (propio)</p>
          {desc.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-6">Sin descriptores registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {desc.map(([d, n]) => (
                <div key={d} className="grid grid-cols-[minmax(6rem,9rem)_1fr_3.5rem] items-center gap-2">
                  <span className="text-[11px] text-slate-300 truncate" title={d}>{d}</span>
                  <div className="h-2 rounded-r-full bg-slate-800/60 overflow-hidden">
                    <div className="h-full rounded-r-full" style={{ width: `${(n / descMax) * 100}%`, background: OWN_COLOR }} />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-slate-300 text-right">
                    {n} · {((n / Math.max(1, own.length)) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          {s && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400">Media por tramo</p>
              <TramoBarsRow label="Propio" values={s.tramoOwnAvg} />
              <TramoBarsRow label="Rival" values={s.tramoRivalAvg} />
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-slate-400">Por jornada</p>
          <div className="h-[220px]">
            {s && (
              <EvolutionChart
                labels={rows.map((r) => r.label)}
                tramos={rows.map((r) => r.tramo)}
                series={[
                  { key: 'own', label: 'Propio', color: OWN_COLOR, type: 'bar', values: s.ownSeries },
                  { key: 'rival', label: 'Rival', color: RIVAL_COLOR, type: 'bar', values: s.rivalSeries },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
