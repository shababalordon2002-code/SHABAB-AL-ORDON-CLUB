'use client';

import React from 'react';
import { NormalizedEvent, DashboardMeasure } from '@/types';
import {
  EngineContext,
  computeMeasure,
  formatMeasure,
  getFieldValues,
  withPitchCoords,
  withPitchVectors,
} from '@/lib/analytics/dashboard-engine';
import { PITCH_ZONE_GEOMETRY, dominantZoneSet } from '@/lib/analytics/pitch-zones';
import { VIZ, inkOn, sequentialColor, seriesColor } from './theme';
import { ChartLegend, ChartTooltip, EmptyChart, useElementSize, useTooltip } from './primitives';
import { ArrowUp, ArrowRight } from 'lucide-react';

type PitchMode = 'points' | 'arrows' | 'heatmap' | 'zones';

interface PitchChartProps {
  events: NormalizedEvent[];
  mode: PitchMode;
  measure: DashboardMeasure;
  ctx: EngineContext;
  breakdown?: string;
  orientation?: 'horizontal' | 'vertical';
  binsX?: number;
  binsY?: number;
  showValues?: boolean;
  showLegend?: boolean;
  colorSlot?: number;
}

const PAD = 8;

export const PitchChart: React.FC<PitchChartProps> = ({
  events,
  mode,
  measure,
  ctx,
  breakdown,
  orientation = 'horizontal',
  binsX = 6,
  binsY = 4,
  showValues = true,
  showLegend = true,
  colorSlot = 0,
}) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();

  const vertical = orientation === 'vertical';
  const ratio = vertical ? 105 / 68 : 68 / 105; // alto / ancho

  const availW = Math.max(0, width);
  const availH = Math.max(0, height - (showLegend && breakdown ? 22 : 0));

  let pitchW = availW;
  let pitchH = pitchW * ratio;
  if (pitchH > availH) {
    pitchH = availH;
    pitchW = pitchH / ratio;
  }
  const offsetX = (availW - pitchW) / 2;

  const innerW = pitchW - PAD * 2;
  const innerH = pitchH - PAD * 2;

  /** 0-100 normalizado -> px. x: portería propia (0) a portería rival (100). */
  const toPx = (x: number, y: number) =>
    vertical
      ? { px: PAD + (y / 100) * innerW, py: PAD + ((100 - x) / 100) * innerH }
      : { px: PAD + (x / 100) * innerW, py: PAD + (y / 100) * innerH };

  const rectPx = (minX: number, maxX: number, minY: number, maxY: number) => {
    const a = toPx(minX, minY);
    const b = toPx(maxX, maxY);
    return {
      x: Math.min(a.px, b.px),
      y: Math.min(a.py, b.py),
      w: Math.abs(b.px - a.px),
      h: Math.abs(b.py - a.py),
    };
  };

  const dataEvents = mode === 'arrows' ? withPitchVectors(events) : mode === 'zones' ? events : withPitchCoords(events);
  const zoneNames = dataEvents.map((e) => (e.metadata?.zone as string) || '').filter(Boolean);

  if (dataEvents.length === 0 || (mode === 'zones' && zoneNames.length === 0)) {
    return (
      <EmptyChart
        message={
          mode === 'arrows'
            ? 'Ningún evento del filtro tiene vector (origen y destino) registrado en el campograma.'
            : mode === 'zones'
            ? 'Ningún evento del filtro tiene zona del campograma registrada.'
            : 'Ningún evento del filtro tiene coordenadas del campograma.'
        }
      />
    );
  }

  const seriesKeys = breakdown
    ? Array.from(new Set(dataEvents.flatMap((e) => getFieldValues(e, breakdown, ctx)))).slice(0, 8)
    : [];
  const legendItems = seriesKeys.map((k, i) => ({ label: k, color: seriesColor(i, k) }));
  const colorForEvent = (evt: NormalizedEvent) => {
    if (!breakdown) return seriesColor(colorSlot);
    const v = getFieldValues(evt, breakdown, ctx)[0];
    const idx = seriesKeys.indexOf(v);
    return seriesColor(idx >= 0 ? idx : seriesKeys.length, v);
  };

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {pitchW > 40 && pitchH > 40 && (
        <div className={`relative mx-auto flex ${vertical ? 'flex-row' : 'flex-col'}`} style={{ width: pitchW, height: pitchH, marginLeft: offsetX }}>
          <div className="relative flex-1 rounded-xl bg-emerald-950 border border-emerald-900/70 overflow-hidden">
            <svg width={pitchW} height={pitchH} className="block" onMouseLeave={hide}>
              <PitchMarkings vertical={vertical} pad={PAD} innerW={innerW} innerH={innerH} />

              {mode === 'heatmap' && renderHeatmap()}
              {mode === 'zones' && renderZones()}
              {mode === 'arrows' && renderArrows()}
              {mode === 'points' && renderPoints()}
            </svg>
          </div>
          {/* Lateral Attack Strip */}
          {vertical ? (
            <div className="w-5 bg-slate-950/90 border-l border-emerald-800/60 flex flex-col items-center justify-center py-2 text-emerald-300 select-none pointer-events-none shrink-0 rounded-r-xl">
              <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300 [writing-mode:vertical-rl] rotate-180 mt-1">
                ATAQUE
              </span>
            </div>
          ) : (
            <div className="h-5 bg-slate-950/90 border-t border-emerald-800/60 flex flex-row items-center justify-center px-2 gap-1 text-emerald-300 select-none pointer-events-none shrink-0 rounded-b-xl">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">
                ATAQUE
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>
          )}
        </div>
      )}
      {showLegend && breakdown && <ChartLegend items={legendItems} />}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );

  function renderPoints() {
    return (
      <g>
        {dataEvents.map((evt) => {
          const { px, py } = toPx(evt.x as number, evt.y as number);
          const color = colorForEvent(evt);
          return (
            <circle
              key={evt.event_id}
              cx={px}
              cy={py}
              r={4}
              fill={color}
              stroke="#052e22"
              strokeWidth={2}
              onMouseMove={(e) =>
                show(
                  e,
                  evt.event_type,
                  [
                    { label: 'Minuto', value: `${evt.minute ?? 0}'`, color },
                    { label: 'Jugador', value: evt.player_name || '—' },
                    ...(evt.outcome ? [{ label: 'Resultado', value: evt.outcome }] : []),
                  ],
                  ref.current
                )
              }
            />
          );
        })}
      </g>
    );
  }

  function renderArrows() {
    return (
      <g>
        <defs>
          {(breakdown ? seriesKeys : ['__single__']).map((k, i) => (
            <marker
              key={k}
              id={`arrow-${i}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={breakdown ? seriesColor(i, k) : seriesColor(colorSlot)} />
            </marker>
          ))}
        </defs>
        {dataEvents.map((evt) => {
          const from = toPx(evt.x as number, evt.y as number);
          const to = toPx(evt.end_x as number, evt.end_y as number);
          const color = colorForEvent(evt);
          const markerIdx = breakdown ? Math.max(0, seriesKeys.indexOf(getFieldValues(evt, breakdown, ctx)[0])) : 0;
          return (
            <line
              key={evt.event_id}
              x1={from.px}
              y1={from.py}
              x2={to.px}
              y2={to.py}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              markerEnd={`url(#arrow-${markerIdx})`}
              onMouseMove={(e) =>
                show(
                  e,
                  evt.event_type,
                  [
                    { label: 'Minuto', value: `${evt.minute ?? 0}'`, color },
                    { label: 'Jugador', value: evt.player_name || '—' },
                  ],
                  ref.current
                )
              }
            />
          );
        })}
      </g>
    );
  }

  function renderHeatmap() {
    const nx = Math.max(2, Math.min(12, binsX));
    const ny = Math.max(2, Math.min(10, binsY));
    const cells: { ix: number; iy: number; events: NormalizedEvent[] }[] = [];

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) cells.push({ ix, iy, events: [] });
    }

    dataEvents.forEach((evt) => {
      const ix = Math.min(nx - 1, Math.floor(((evt.x as number) / 100) * nx));
      const iy = Math.min(ny - 1, Math.floor(((evt.y as number) / 100) * ny));
      const cell = cells.find((c) => c.ix === ix && c.iy === iy);
      if (cell) cell.events.push(evt);
    });

    const values = cells.map((c) => computeMeasure(c.events, measure, dataEvents.length));
    const max = Math.max(...values, 0.0001);

    return (
      <g>
        {cells.map((cell, i) => {
          const value = values[i];
          if (value <= 0) return null;
          const r = rectPx((cell.ix / nx) * 100, ((cell.ix + 1) / nx) * 100, (cell.iy / ny) * 100, ((cell.iy + 1) / ny) * 100);
          const color = sequentialColor(value / max);
          return (
            <g key={`${cell.ix}-${cell.iy}`}>
              <rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                fill={color}
                fillOpacity={0.85}
                rx={2}
                onMouseMove={(e) =>
                  show(
                    e,
                    `Celda ${cell.ix + 1}·${cell.iy + 1}`,
                    [
                      { label: 'Valor', value: formatMeasure(value, measure), color },
                      { label: 'Eventos', value: String(cell.events.length) },
                    ],
                    ref.current
                  )
                }
              />
              {showValues && r.w > 26 && r.h > 18 && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + 3}
                  fill={inkOn(color)}
                  fontSize={10}
                  fontWeight={700}
                  textAnchor="middle"
                  pointerEvents="none"
                  className="tabular-nums"
                >
                  {formatMeasure(value, measure)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  function renderZones() {
    const set = dominantZoneSet(zoneNames);
    const zones = PITCH_ZONE_GEOMETRY.filter((z) => !set || z.set === set);

    const byZone = new Map<string, NormalizedEvent[]>();
    dataEvents.forEach((evt) => {
      const zone = (evt.metadata?.zone as string) || '';
      if (!zone) return;
      if (!byZone.has(zone)) byZone.set(zone, []);
      byZone.get(zone)!.push(evt);
    });

    const values = zones.map((z) => computeMeasure(byZone.get(z.name) || [], measure, dataEvents.length));
    const max = Math.max(...values, 0.0001);

    return (
      <g>
        {zones.map((zone, i) => {
          const value = values[i];
          const r = rectPx(zone.minX, zone.maxX, zone.minY, zone.maxY);
          const color = sequentialColor(value / max);
          return (
            <g key={zone.name}>
              <rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                fill={value > 0 ? color : 'rgba(255,255,255,0.03)'}
                fillOpacity={value > 0 ? 0.85 : 1}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
                rx={3}
                onMouseMove={(e) =>
                  show(
                    e,
                    zone.name,
                    [
                      { label: 'Valor', value: formatMeasure(value, measure), color },
                      { label: 'Eventos', value: String((byZone.get(zone.name) || []).length) },
                    ],
                    ref.current
                  )
                }
              />
              {r.w > 46 && r.h > 26 && (
                <g pointerEvents="none">
                  {showValues && (
                    <text
                      x={r.x + r.w / 2}
                      y={r.y + r.h / 2 + 2}
                      fill={value > 0 ? inkOn(color) : VIZ.textSecondary}
                      fontSize={13}
                      fontWeight={800}
                      textAnchor="middle"
                      className="tabular-nums"
                    >
                      {formatMeasure(value, measure)}
                    </text>
                  )}
                  <text
                    x={r.x + r.w / 2}
                    y={r.y + r.h / 2 + 16}
                    fill={value > 0 ? inkOn(color) : VIZ.textMuted}
                    fontSize={8}
                    textAnchor="middle"
                    opacity={0.9}
                  >
                    {zone.name.length > 22 ? `${zone.name.slice(0, 21)}…` : zone.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  }
};

const PitchMarkings: React.FC<{ vertical: boolean; pad: number; innerW: number; innerH: number }> = ({
  vertical,
  pad,
  innerW,
  innerH,
}) => {
  const stroke = 'rgba(255,255,255,0.35)';
  const common = { stroke, strokeWidth: 1.5, fill: 'none' as const };

  if (vertical) {
    const boxW = innerW * 0.6;
    const boxH = innerH * 0.16;
    const smallW = innerW * 0.28;
    const smallH = innerH * 0.06;
    return (
      <g {...common}>
        <rect x={pad} y={pad} width={innerW} height={innerH} rx={3} />
        <line x1={pad} x2={pad + innerW} y1={pad + innerH / 2} y2={pad + innerH / 2} />
        <circle cx={pad + innerW / 2} cy={pad + innerH / 2} r={innerH * 0.085} />
        <rect x={pad + (innerW - boxW) / 2} y={pad} width={boxW} height={boxH} />
        <rect x={pad + (innerW - smallW) / 2} y={pad} width={smallW} height={smallH} />
        <rect x={pad + (innerW - boxW) / 2} y={pad + innerH - boxH} width={boxW} height={boxH} />
        <rect x={pad + (innerW - smallW) / 2} y={pad + innerH - smallH} width={smallW} height={smallH} />
      </g>
    );
  }

  const boxW = innerW * 0.16;
  const boxH = innerH * 0.6;
  const smallW = innerW * 0.06;
  const smallH = innerH * 0.28;
  return (
    <g {...common}>
      <rect x={pad} y={pad} width={innerW} height={innerH} rx={3} />
      <line x1={pad + innerW / 2} x2={pad + innerW / 2} y1={pad} y2={pad + innerH} />
      <circle cx={pad + innerW / 2} cy={pad + innerH / 2} r={innerW * 0.085} />
      <rect x={pad} y={pad + (innerH - boxH) / 2} width={boxW} height={boxH} />
      <rect x={pad} y={pad + (innerH - smallH) / 2} width={smallW} height={smallH} />
      <rect x={pad + innerW - boxW} y={pad + (innerH - boxH) / 2} width={boxW} height={boxH} />
      <rect x={pad + innerW - smallW} y={pad + (innerH - smallH) / 2} width={smallW} height={smallH} />
    </g>
  );
};
