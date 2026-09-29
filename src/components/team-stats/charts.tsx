'use client';

import React from 'react';
import { NormalizedEvent } from '@/types';
import { isGoalEvent } from '@/lib/analytics/dashboard-engine';
import { SERIES_COLORS, VIZ, SEQUENTIAL_RAMP, niceTicks, compactNumber, truncate } from '@/components/dashboards/viz/theme';
import { ChartLegend, ChartTooltip, EmptyChart, useElementSize, useTooltip } from '@/components/dashboards/viz/primitives';

/** Identidad fija: propio = slot 1, rival = slot 2. Tramos = slots 3, 4 y 7. */
export const OWN_COLOR = SERIES_COLORS[0];
export const RIVAL_COLOR = SERIES_COLORS[1];
export const TRAMO_COLORS = [SERIES_COLORS[2], SERIES_COLORS[3], SERIES_COLORS[6]];
export const TRAMO_NAMES = ['Tramo 1', 'Tramo 2', 'Tramo 3'];

/** Rampa secuencial naranja (rival), mismos pasos de luminosidad que la azul. */
export const ORANGE_RAMP = ['#3a1a0c', '#6b2c12', '#9c3f18', '#d95926', '#e98a5f', '#f3b597', '#fbe0d1'];

export const RESULT_STYLE: Record<'G' | 'E' | 'P', { bg: string; text: string; label: string }> = {
  G: { bg: '#15803d', text: '#ffffff', label: 'Victoria' },
  E: { bg: '#a16207', text: '#ffffff', label: 'Empate' },
  P: { bg: '#b91c1c', text: '#ffffff', label: 'Derrota' },
};

function rampColor(ramp: string[], t: number): string {
  const c = Math.max(0, Math.min(1, isFinite(t) ? t : 0));
  return ramp[Math.round(c * (ramp.length - 1))];
}

// ─────────────────────────────────────────────────────────────
// Evolución por jornada: barras agrupadas y/o líneas sobre un único eje
// ─────────────────────────────────────────────────────────────

export interface EvoSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  type: 'bar' | 'line';
  dashed?: boolean;
}

interface EvolutionChartProps {
  labels: string[];
  subLabels?: string[];
  series: EvoSeries[];
  unit?: '' | '%';
  tramos?: number[];
  showValues?: boolean;
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ labels, subLabels, series, unit = '', tramos, showValues = false }) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  // El contenedor medido se monta siempre: si llegan datos más tarde, ya tiene tamaño.
  if (labels.length === 0)
    return (
      <div ref={ref} className="h-full w-full">
        <EmptyChart message="Sin jornadas analizadas todavía." />
      </div>
    );

  const legendH = series.length > 1 ? 24 : 0;
  const m = { top: 12, right: 12, bottom: subLabels ? 36 : 22, left: 36 };
  const w = Math.max(0, width - m.left - m.right);
  const h = Math.max(0, height - legendH - m.top - m.bottom);

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const rawMax = unit === '%' ? 100 : Math.max(...all, 1);
  const ticks = niceTicks(rawMax, 4);
  const yMax = ticks[ticks.length - 1] || rawMax;
  const y = (v: number) => m.top + h - (v / yMax) * h;
  const band = w / labels.length;
  const xc = (i: number) => m.left + band * i + band / 2;

  const bars = series.filter((s) => s.type === 'bar');
  const lines = series.filter((s) => s.type === 'line');
  const groupW = Math.min(band * 0.72, 18 * Math.max(1, bars.length) + 2 * (bars.length - 1));
  const barW = bars.length ? (groupW - 2 * (bars.length - 1)) / bars.length : 0;
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(w / 34))));

  const fmt = (v: number | null) => (v === null ? '—' : unit === '%' ? `${v.toFixed(0)}%` : compactNumber(Number(v.toFixed(2))));

  const onMove = (e: React.MouseEvent<SVGRectElement>, i: number) => {
    setHoverIdx(i);
    show(
      e,
      subLabels ? `${labels[i]} · ${subLabels[i]}` : labels[i],
      series.map((s) => ({ label: s.label, value: fmt(s.values[i]), color: s.color })),
      ref.current
    );
  };

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {width > 60 && h > 20 && (
        <svg width={width} height={height - legendH} className="block" onMouseLeave={() => { hide(); setHoverIdx(null); }}>
          {tramos && tramos.length === labels.length &&
            [0, 1, 2].map((t) => {
              const idxs = tramos.map((tt, i) => (tt === t ? i : -1)).filter((i) => i >= 0);
              if (!idxs.length) return null;
              const x0 = m.left + band * idxs[0];
              const x1 = m.left + band * (idxs[idxs.length - 1] + 1);
              return (
                <g key={t}>
                  <rect x={x0} y={m.top} width={x1 - x0} height={h} fill={t % 2 === 0 ? '#ffffff' : 'transparent'} fillOpacity={0.025} />
                  {t > 0 && <line x1={x0} x2={x0} y1={m.top} y2={m.top + h} stroke={VIZ.axis} strokeDasharray="3 4" />}
                  <text x={x0 + 4} y={m.top + 9} fontSize={9} fill={VIZ.textMuted} fontWeight={700}>
                    {TRAMO_NAMES[t].toUpperCase()}
                  </text>
                </g>
              );
            })}

          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} stroke={VIZ.grid} strokeWidth={1} />
              <text x={m.left - 6} y={y(t)} fontSize={10} fill={VIZ.textMuted} textAnchor="end" dominantBaseline="middle">
                {unit === '%' ? `${t}%` : compactNumber(t)}
              </text>
            </g>
          ))}

          {hoverIdx !== null && (
            <rect x={m.left + band * hoverIdx} y={m.top} width={band} height={h} fill="#ffffff" fillOpacity={0.05} />
          )}

          {bars.map((s, si) =>
            s.values.map((v, i) => {
              if (v === null || v <= 0) return null;
              const x = xc(i) - groupW / 2 + si * (barW + 2);
              const top = y(v);
              const bh = m.top + h - top;
              const r = Math.min(4, barW / 2, bh);
              return (
                <path
                  key={`${s.key}-${i}`}
                  d={`M${x},${m.top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${m.top + h} Z`}
                  fill={s.color}
                />
              );
            })
          )}

          {lines.map((s) => {
            const pts = s.values.map((v, i) => (v === null ? null : ([xc(i), y(v)] as const)));
            const segs: string[] = [];
            let cur = '';
            pts.forEach((p) => {
              if (!p) {
                if (cur) segs.push(cur);
                cur = '';
                return;
              }
              cur += `${cur ? 'L' : 'M'}${p[0]},${p[1]} `;
            });
            if (cur) segs.push(cur);
            return (
              <g key={s.key}>
                {segs.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {!s.dashed &&
                  pts.map((p, i) =>
                    p ? <circle key={i} cx={p[0]} cy={p[1]} r={hoverIdx === i ? 5 : 3.5} fill={s.color} stroke={VIZ.surface} strokeWidth={2} /> : null
                  )}
              </g>
            );
          })}

          {showValues &&
            series
              .filter((s) => !s.dashed)
              .slice(0, 2)
              .map((s, si) =>
                s.values.map((v, i) => {
                  if (v === null || labels.length > 16) return null;
                  const x = s.type === 'bar' ? xc(i) - groupW / 2 + bars.indexOf(s) * (barW + 2) + barW / 2 : xc(i);
                  return (
                    <text key={`${s.key}-v-${i}`} x={x} y={y(v) - 6 - (s.type === 'line' ? 2 : 0)} fontSize={9} fontWeight={700} fill={VIZ.textSecondary} textAnchor="middle">
                      {fmt(v)}
                    </text>
                  );
                })
              )}

          <line x1={m.left} x2={m.left + w} y1={m.top + h} y2={m.top + h} stroke={VIZ.axis} />
          {labels.map((l, i) =>
            i % labelEvery === 0 ? (
              <g key={l + i}>
                <text x={xc(i)} y={m.top + h + 14} fontSize={10} fontWeight={700} fill={VIZ.textSecondary} textAnchor="middle">
                  {l}
                </text>
                {subLabels && (
                  <text x={xc(i)} y={m.top + h + 27} fontSize={8.5} fill={VIZ.textMuted} textAnchor="middle">
                    {truncate(subLabels[i], Math.max(4, Math.floor(band / 5.5)))}
                  </text>
                )}
              </g>
            ) : null
          )}

          {labels.map((_, i) => (
            <rect key={`hit-${i}`} x={m.left + band * i} y={m.top} width={band} height={h} fill="transparent" onMouseMove={(e) => onMove(e, i)} />
          ))}
        </svg>
      )}
      {series.length > 1 && <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sparkline (tamaño fijo, apta para celdas de tabla)
// ─────────────────────────────────────────────────────────────

export const Sparkline: React.FC<{ values: (number | null)[]; color?: string; width?: number; height?: number }> = ({
  values,
  color = OWN_COLOR,
  width = 96,
  height = 26,
}) => {
  const vals = values.map((v) => v ?? 0);
  if (vals.length < 2) return <span className="text-[10px] text-slate-600">—</span>;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const x = (i: number) => 2 + (i / (vals.length - 1)) * (width - 4);
  const y = (v: number) => 3 + (1 - (v - min) / (max - min || 1)) * (height - 6);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const last = vals.length - 1;
  return (
    <svg width={width} height={height} className="block">
      <path d={`${d} L${x(last)},${height} L${x(0)},${height} Z`} fill={color} fillOpacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(vals[last])} r={2.5} fill={color} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Mapa de calor suavizado sobre el campo
// ─────────────────────────────────────────────────────────────

const PITCH_PAD = 6;

const PitchLines: React.FC<{ w: number; h: number; half?: boolean }> = ({ w, h }) => {
  const stroke = 'rgba(255,255,255,0.38)';
  const iw = w - PITCH_PAD * 2;
  const ih = h - PITCH_PAD * 2;
  const boxW = iw * 0.16, boxH = ih * 0.6, smallW = iw * 0.06, smallH = ih * 0.28;
  return (
    <g stroke={stroke} strokeWidth={1.3} fill="none" pointerEvents="none">
      <rect x={PITCH_PAD} y={PITCH_PAD} width={iw} height={ih} rx={3} />
      <line x1={PITCH_PAD + iw / 2} x2={PITCH_PAD + iw / 2} y1={PITCH_PAD} y2={PITCH_PAD + ih} />
      <circle cx={PITCH_PAD + iw / 2} cy={PITCH_PAD + ih / 2} r={iw * 0.085} />
      <rect x={PITCH_PAD} y={PITCH_PAD + (ih - boxH) / 2} width={boxW} height={boxH} />
      <rect x={PITCH_PAD} y={PITCH_PAD + (ih - smallH) / 2} width={smallW} height={smallH} />
      <rect x={PITCH_PAD + iw - boxW} y={PITCH_PAD + (ih - boxH) / 2} width={boxW} height={boxH} />
      <rect x={PITCH_PAD + iw - smallW} y={PITCH_PAD + (ih - smallH) / 2} width={smallW} height={smallH} />
      <circle cx={PITCH_PAD + iw * 0.11} cy={PITCH_PAD + ih / 2} r={1.5} fill={stroke} />
      <circle cx={PITCH_PAD + iw * 0.89} cy={PITCH_PAD + ih / 2} r={1.5} fill={stroke} />
    </g>
  );
};

interface PitchHeatmapProps {
  events: NormalizedEvent[];
  ramp?: 'blue' | 'orange';
  showPoints?: boolean;
  showThirds?: boolean;
}

export const PitchHeatmap: React.FC<PitchHeatmapProps> = ({ events, ramp = 'blue', showPoints = false, showThirds = true }) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();
  const pts = events.filter((e) => e.x !== null && e.x !== undefined && e.y !== null && e.y !== undefined);
  const colors = ramp === 'orange' ? ORANGE_RAMP : SEQUENTIAL_RAMP;

  const ratio = 68 / 105;
  let pw = width;
  let ph = pw * ratio;
  if (ph > height - 18) {
    ph = Math.max(0, height - 18);
    pw = ph / ratio;
  }

  // Rejilla fina + núcleo gaussiano (KDE discreta)
  const NX = 24, NY = 16;
  const grid: number[] = new Array(NX * NY).fill(0);
  const sigma = 1.15;
  pts.forEach((e) => {
    const gx = ((e.x as number) / 100) * NX - 0.5;
    const gy = ((e.y as number) / 100) * NY - 0.5;
    for (let ix = Math.max(0, Math.floor(gx - 3)); ix <= Math.min(NX - 1, Math.ceil(gx + 3)); ix++) {
      for (let iy = Math.max(0, Math.floor(gy - 3)); iy <= Math.min(NY - 1, Math.ceil(gy + 3)); iy++) {
        const d2 = (ix - gx) ** 2 + (iy - gy) ** 2;
        grid[iy * NX + ix] += Math.exp(-d2 / (2 * sigma * sigma));
      }
    }
  });
  const max = Math.max(...grid, 0.0001);

  const thirds = [0, 0, 0];
  pts.forEach((e) => thirds[Math.min(2, Math.floor(((e.x as number) / 100) * 3))]++);

  const iw = pw - PITCH_PAD * 2;
  const ih = ph - PITCH_PAD * 2;
  const cw = iw / NX;
  const ch = ih / NY;

  return (
    <div ref={ref} className="viz-host relative h-full w-full flex flex-col items-center">
      {pts.length === 0 ? (
        <EmptyChart message="Sin eventos con coordenadas en el campograma." />
      ) : (
        pw > 40 && (
          <>
            <svg width={pw} height={ph} className="block rounded-lg" onMouseLeave={hide}>
              <rect width={pw} height={ph} rx={8} fill="#062a1d" />
              {grid.map((v, i) => {
                const t = v / max;
                if (t < 0.06) return null;
                const ix = i % NX;
                const iy = Math.floor(i / NX);
                return (
                  <rect
                    key={i}
                    x={PITCH_PAD + ix * cw}
                    y={PITCH_PAD + iy * ch}
                    width={cw + 0.6}
                    height={ch + 0.6}
                    fill={rampColor(colors, 0.15 + t * 0.85)}
                    fillOpacity={0.25 + t * 0.7}
                  />
                );
              })}
              {showThirds &&
                [1, 2].map((k) => (
                  <line key={k} x1={PITCH_PAD + (iw * k) / 3} x2={PITCH_PAD + (iw * k) / 3} y1={PITCH_PAD} y2={PITCH_PAD + ih} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
                ))}
              <PitchLines w={pw} h={ph} />
              {showPoints &&
                pts.map((e) => (
                  <circle
                    key={e.event_id}
                    cx={PITCH_PAD + ((e.x as number) / 100) * iw}
                    cy={PITCH_PAD + ((e.y as number) / 100) * ih}
                    r={2.6}
                    fill="#ffffff"
                    fillOpacity={0.85}
                    stroke="#062a1d"
                    strokeWidth={1}
                    onMouseMove={(ev) =>
                      show(ev, e.event_type, [
                        { label: 'Minuto', value: `${e.minute ?? 0}'` },
                        { label: 'Jugador', value: e.player_name || '—' },
                        ...(e.outcome ? [{ label: 'Resultado', value: e.outcome }] : []),
                      ], ref.current)
                    }
                  />
                ))}
            </svg>
            {showThirds && (
              <div className="flex text-[9.5px] font-bold text-slate-400 tabular-nums mt-1" style={{ width: pw }}>
                {['Def.', 'Medio', 'Ataque →'].map((l, i) => (
                  <span key={l} className="flex-1 text-center">
                    {l} {pts.length ? Math.round((thirds[i] / pts.length) * 100) : 0}%
                  </span>
                ))}
              </div>
            )}
          </>
        )
      )}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Portería: impactos de remate (goal_x / goal_y)
// ─────────────────────────────────────────────────────────────

export const GoalMouthChart: React.FC<{ events: NormalizedEvent[] }> = ({ events }) => {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();
  const shots = events.filter((e) => {
    const gx = e.goal_x ?? e.metadata?.goal_x;
    const gy = e.goal_y ?? e.metadata?.goal_y;
    return gx !== null && gx !== undefined && gy !== null && gy !== undefined;
  });
  const goals = shots.filter(isGoalEvent).length;

  return (
    <div ref={ref} className="viz-host relative w-full h-full">
      {shots.length === 0 ? (
        <EmptyChart message="Sin remates con coordenada de portería registrada." />
      ) : (
        <>
          <svg viewBox="0 0 600 330" className="w-full h-auto block" onMouseLeave={hide}>
            <rect width={600} height={330} rx={10} fill="#0b1222" />
            <rect x={40} y={300} width={520} height={24} rx={4} fill="#063d2a" />
            {[1, 2].map((k) => (
              <g key={k} stroke="rgba(255,255,255,0.08)">
                <line x1={90 + 140 * k} x2={90 + 140 * k} y1={60} y2={300} />
                <line x1={90} x2={510} y1={60 + 80 * k} y2={60 + 80 * k} />
              </g>
            ))}
            <path d="M84,302 V54 H516 V302" fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinejoin="round" />
            {shots.map((e) => {
              const gx = Number(e.goal_x ?? e.metadata?.goal_x);
              const gy = Number(e.goal_y ?? e.metadata?.goal_y);
              const px = Math.max(8, Math.min(592, 90 + (gx / 100) * 420));
              const py = Math.max(8, Math.min(322, 60 + (gy / 100) * 240));
              const goal = isGoalEvent(e);
              return (
                <circle
                  key={e.event_id}
                  cx={px}
                  cy={py}
                  r={goal ? 10 : 7}
                  fill={goal ? '#22c55e' : OWN_COLOR}
                  fillOpacity={goal ? 1 : 0.8}
                  stroke="#0b1222"
                  strokeWidth={2}
                  onMouseMove={(ev) =>
                    show(ev, goal ? 'Gol' : e.event_type, [
                      { label: 'Minuto', value: `${e.minute ?? 0}'` },
                      { label: 'Jugador', value: e.player_name || '—' },
                      { label: 'Zona', value: String(e.goal_zone || e.metadata?.goal_zone || '—') },
                    ], ref.current)
                  }
                />
              );
            })}
          </svg>
          <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />Gol ({goals})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: OWN_COLOR }} />Otro remate ({shots.length - goals})</span>
          </div>
        </>
      )}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Barras HTML (comparativas propio vs rival y por tramos)
// ─────────────────────────────────────────────────────────────

export const PairBarRow: React.FC<{ label: string; own: number; rival: number; max: number; unit?: '' | '%' }> = ({ label, own, rival, max, unit = '' }) => {
  const f = (v: number) => (unit === '%' ? `${v.toFixed(0)}%` : v.toFixed(v < 10 && !Number.isInteger(v) ? 1 : 0));
  const total = own + rival;
  const ownPct = total ? (own / total) * 100 : 50;
  return (
    <div className="grid grid-cols-[3rem_1fr_minmax(7rem,11rem)_1fr_3rem] items-center gap-2 py-1">
      <span className="text-right text-xs font-black tabular-nums text-slate-100">{f(own)}</span>
      <div className="h-2.5 rounded-full bg-slate-800/70 flex justify-end overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (own / (max || 1)) * 100)}%`, background: OWN_COLOR }} />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold text-slate-300 truncate" title={label}>{label}</p>
        <p className="text-[9px] text-slate-500 tabular-nums">{ownPct.toFixed(0)}% – {(100 - ownPct).toFixed(0)}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800/70 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (rival / (max || 1)) * 100)}%`, background: RIVAL_COLOR }} />
      </div>
      <span className="text-xs font-black tabular-nums text-slate-100">{f(rival)}</span>
    </div>
  );
};

export const TramoBarsRow: React.FC<{ label: string; values: number[]; unit?: '' | '%' }> = ({ label, values, unit = '' }) => {
  const max = unit === '%' ? 100 : Math.max(...values, 0.0001);
  return (
    <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] items-center gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[11px] font-bold text-slate-300 truncate" title={label}>{label}</span>
      <div className="space-y-[2px]">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-r-full bg-slate-800/50 overflow-hidden">
              <div className="h-full rounded-r-full" style={{ width: `${(v / max) * 100}%`, background: TRAMO_COLORS[i] }} />
            </div>
            <span className="w-10 text-right text-[10px] font-bold tabular-nums text-slate-300">
              {unit === '%' ? `${v.toFixed(0)}%` : v.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Celda de tabla con relleno secuencial según la magnitud dentro de su fila. */
export function heatCellStyle(value: number | null, rowMax: number, ramp: 'blue' | 'orange' = 'blue'): React.CSSProperties {
  if (value === null || rowMax <= 0 || value <= 0) return {};
  const t = value / rowMax;
  const color = rampColor(ramp === 'orange' ? ORANGE_RAMP : SEQUENTIAL_RAMP, 0.1 + t * 0.55);
  return { background: color, color: '#ffffff' };
}
