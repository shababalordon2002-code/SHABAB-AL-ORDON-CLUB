'use client';

import React from 'react';
import { AggResult, formatMeasure } from '@/lib/analytics/dashboard-engine';
import { DashboardMeasure } from '@/types';
import { VIZ, compactNumber, niceTicks, seriesColor, truncate } from './theme';
import { ChartLegend, ChartTooltip, EmptyChart, useElementSize, useTooltip } from './primitives';

interface CategoryChartProps {
  result: AggResult;
  measure: DashboardMeasure;
  orientation: 'horizontal' | 'vertical';
  showValues?: boolean;
  showLegend?: boolean;
  colorSlot?: number;
}

const MARK_MAX = 24; // grosor máximo de barra
const GAP = 2;       // separador en color de superficie entre segmentos apilados

export const CategoryChart: React.FC<CategoryChartProps> = ({
  result,
  measure,
  orientation,
  showValues = true,
  showLegend = true,
  colorSlot = 0,
}) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();

  const stacked = result.series.length > 1;
  const legendItems = stacked
    ? result.series.map((s, i) => ({ label: s.key, color: seriesColor(i, s.key) }))
    : [];

  if (result.labels.length === 0) return <EmptyChart />;

  const legendHeight = stacked && showLegend ? 22 : 0;
  const plotW = Math.max(0, width);
  const plotH = Math.max(0, height - legendHeight);

  const maxValue = Math.max(
    ...result.totals,
    ...result.series.flatMap((s) => s.values),
    0.0001
  );
  const stackMax = stacked
    ? Math.max(...result.labels.map((_, i) => result.series.reduce((acc, s) => acc + s.values[i], 0)), 0.0001)
    : maxValue;
  const ticks = niceTicks(stackMax, orientation === 'horizontal' ? 3 : 4);
  const axisMax = ticks[ticks.length - 1] || stackMax;

  const valueOf = (labelIdx: number) =>
    stacked ? result.series.reduce((acc, s) => acc + s.values[labelIdx], 0) : result.totals[labelIdx];

  const renderTooltipRows = (labelIdx: number) =>
    stacked
      ? result.series
          .map((s, si) => ({
            label: s.key,
            value: formatMeasure(s.values[labelIdx], measure),
            color: seriesColor(si, s.key),
            raw: s.values[labelIdx],
          }))
          .filter((r) => r.raw > 0)
          .slice(0, 8)
      : [{ label: 'Valor', value: formatMeasure(result.totals[labelIdx], measure), color: seriesColor(colorSlot) }];

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {width > 0 && plotH > 40 && (
        <svg width={plotW} height={plotH} className="block" onMouseLeave={hide}>
          {orientation === 'horizontal'
            ? renderHorizontal()
            : renderVertical()}
        </svg>
      )}
      {stacked && showLegend && <ChartLegend items={legendItems} />}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );

  function renderHorizontal() {
    const labelW = Math.min(120, Math.max(60, plotW * 0.28));
    const valueW = showValues ? 46 : 8;
    const padTop = 6;
    const padBottom = 18;
    const innerW = Math.max(10, plotW - labelW - valueW);
    const innerH = Math.max(10, plotH - padTop - padBottom);
    const band = innerH / result.labels.length;
    const thickness = Math.min(MARK_MAX, Math.max(4, band - 8));
    const scale = (v: number) => (v / axisMax) * innerW;

    return (
      <g>
        {/* Rejilla vertical (hairline sólida, recesiva) */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={labelW + scale(t)}
              x2={labelW + scale(t)}
              y1={padTop}
              y2={padTop + innerH}
              stroke={VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={labelW + scale(t)}
              y={plotH - 5}
              fill={VIZ.textMuted}
              fontSize={9}
              textAnchor="middle"
              className="tabular-nums"
            >
              {compactNumber(t)}
            </text>
          </g>
        ))}

        {result.labels.map((label, i) => {
          const y = padTop + band * i + (band - thickness) / 2;
          const total = valueOf(i);
          let cursor = labelW;

          return (
            <g
              key={label}
              onMouseMove={(e) => show(e, label, renderTooltipRows(i), ref.current)}
              onMouseLeave={hide}
            >
              {/* Zona de hover más grande que la marca */}
              <rect x={0} y={padTop + band * i} width={plotW} height={band} fill="transparent" />

              <text x={labelW - 8} y={y + thickness / 2 + 3} fill={VIZ.textSecondary} fontSize={10} textAnchor="end">
                {truncate(label, Math.floor(labelW / 6))}
              </text>

              {stacked
                ? result.series.map((s, si) => {
                    const w = scale(s.values[i]);
                    if (w <= 0) return null;
                    const isLast = si === result.series.length - 1;
                    const segW = Math.max(0, isLast ? w : w - GAP);
                    const x = cursor;
                    cursor += w;
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        y={y}
                        width={segW}
                        height={thickness}
                        rx={isLast ? 4 : 0}
                        fill={seriesColor(si, s.key)}
                      />
                    );
                  })
                : (() => {
                    const w = scale(total);
                    return (
                      <g>
                        {/* Extremo de dato redondeado 4px, cuadrado en la línea base */}
                        <rect x={labelW} y={y} width={Math.max(2, w)} height={thickness} rx={4} fill={seriesColor(colorSlot)} />
                        <rect x={labelW} y={y} width={Math.min(4, Math.max(2, w))} height={thickness} fill={seriesColor(colorSlot)} />
                      </g>
                    );
                  })()}

              {showValues && (
                <text
                  x={labelW + scale(total) + 6}
                  y={y + thickness / 2 + 3}
                  fill={VIZ.textPrimary}
                  fontSize={10}
                  fontWeight={600}
                  className="tabular-nums"
                >
                  {formatMeasure(total, measure)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  function renderVertical() {
    const padLeft = 34;
    const padRight = 10;
    const padTop = showValues ? 16 : 8;
    const padBottom = 26;
    const innerW = Math.max(10, plotW - padLeft - padRight);
    const innerH = Math.max(10, plotH - padTop - padBottom);
    const band = innerW / result.labels.length;
    const thickness = Math.min(MARK_MAX, Math.max(4, band - 8));
    const scale = (v: number) => (v / axisMax) * innerH;
    const labelStep = Math.max(1, Math.ceil(result.labels.length / Math.max(1, Math.floor(innerW / 46))));

    return (
      <g>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padLeft}
              x2={padLeft + innerW}
              y1={padTop + innerH - scale(t)}
              y2={padTop + innerH - scale(t)}
              stroke={VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={padLeft - 6}
              y={padTop + innerH - scale(t) + 3}
              fill={VIZ.textMuted}
              fontSize={9}
              textAnchor="end"
              className="tabular-nums"
            >
              {compactNumber(t)}
            </text>
          </g>
        ))}

        {result.labels.map((label, i) => {
          const x = padLeft + band * i + (band - thickness) / 2;
          const total = valueOf(i);
          let cursorY = padTop + innerH;

          return (
            <g
              key={label}
              onMouseMove={(e) => show(e, label, renderTooltipRows(i), ref.current)}
              onMouseLeave={hide}
            >
              <rect x={padLeft + band * i} y={padTop} width={band} height={innerH} fill="transparent" />

              {stacked
                ? result.series.map((s, si) => {
                    const h = scale(s.values[i]);
                    if (h <= 0) return null;
                    const isLast = si === result.series.length - 1;
                    const segH = Math.max(0, isLast ? h : h - GAP);
                    cursorY -= h;
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        y={isLast ? cursorY : cursorY + GAP}
                        width={thickness}
                        height={segH}
                        rx={isLast ? 4 : 0}
                        fill={seriesColor(si, s.key)}
                      />
                    );
                  })
                : (() => {
                    const h = Math.max(2, scale(total));
                    return (
                      <g>
                        <rect x={x} y={padTop + innerH - h} width={thickness} height={h} rx={4} fill={seriesColor(colorSlot)} />
                        <rect
                          x={x}
                          y={padTop + innerH - Math.min(4, h)}
                          width={thickness}
                          height={Math.min(4, h)}
                          fill={seriesColor(colorSlot)}
                        />
                      </g>
                    );
                  })()}

              {showValues && band > 26 && (
                <text
                  x={x + thickness / 2}
                  y={padTop + innerH - scale(total) - 5}
                  fill={VIZ.textPrimary}
                  fontSize={9}
                  fontWeight={600}
                  textAnchor="middle"
                  className="tabular-nums"
                >
                  {formatMeasure(total, measure)}
                </text>
              )}

              {i % labelStep === 0 && (
                <text
                  x={padLeft + band * i + band / 2}
                  y={plotH - 8}
                  fill={VIZ.textSecondary}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {truncate(label, Math.max(4, Math.floor((band * labelStep) / 5.5)))}
                </text>
              )}
            </g>
          );
        })}

        <line x1={padLeft} x2={padLeft + innerW} y1={padTop + innerH} y2={padTop + innerH} stroke={VIZ.axis} strokeWidth={1} />
      </g>
    );
  }
};
