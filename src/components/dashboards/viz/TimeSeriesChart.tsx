'use client';

import React, { useState } from 'react';
import { AggResult, formatMeasure } from '@/lib/analytics/dashboard-engine';
import { DashboardMeasure } from '@/types';
import { VIZ, compactNumber, niceTicks, seriesColor, truncate } from './theme';
import { ChartLegend, ChartTooltip, EmptyChart, useElementSize, useTooltip } from './primitives';

interface TimeSeriesChartProps {
  result: AggResult;
  measure: DashboardMeasure;
  variant: 'line' | 'area';
  showLegend?: boolean;
  showValues?: boolean;
  colorSlot?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  result,
  measure,
  variant,
  showLegend = true,
  showValues = true,
  colorSlot = 0,
}) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (result.labels.length === 0) return <EmptyChart />;

  const multi = result.series.length > 1;
  const legendItems = multi ? result.series.map((s, i) => ({ label: s.key, color: seriesColor(i, s.key) })) : [];
  const legendHeight = multi && showLegend ? 22 : 0;

  const plotW = Math.max(0, width);
  const plotH = Math.max(0, height - legendHeight);
  const padLeft = 34;
  const padRight = multi ? 12 : 44;
  const padTop = 10;
  const padBottom = 24;
  const innerW = Math.max(10, plotW - padLeft - padRight);
  const innerH = Math.max(10, plotH - padTop - padBottom);

  const maxValue = Math.max(...result.series.flatMap((s) => s.values), 0.0001);
  const ticks = niceTicks(maxValue, 4);
  const axisMax = ticks[ticks.length - 1] || maxValue;

  const n = result.labels.length;
  const xAt = (i: number) => (n === 1 ? padLeft + innerW / 2 : padLeft + (i / (n - 1)) * innerW);
  const yAt = (v: number) => padTop + innerH - (v / axisMax) * innerH;

  const labelStep = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 46))));

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const host = ref.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const idx = n === 1 ? 0 : Math.round(((relX - padLeft) / innerW) * (n - 1));
    const clamped = Math.max(0, Math.min(n - 1, idx));
    setHoverIdx(clamped);
    show(
      e,
      result.labels[clamped],
      result.series.map((s, si) => ({
        label: multi ? s.key : 'Valor',
        value: formatMeasure(s.values[clamped], measure),
        color: seriesColor(multi ? si : colorSlot, s.key),
      })),
      host
    );
  };

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {width > 0 && plotH > 40 && (
        <svg
          width={plotW}
          height={plotH}
          className="block"
          onMouseLeave={() => {
            hide();
            setHoverIdx(null);
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={padLeft + innerW} y1={yAt(t)} y2={yAt(t)} stroke={VIZ.grid} strokeWidth={1} />
              <text x={padLeft - 6} y={yAt(t) + 3} fill={VIZ.textMuted} fontSize={9} textAnchor="end" className="tabular-nums">
                {compactNumber(t)}
              </text>
            </g>
          ))}

          {result.labels.map((label, i) =>
            i % labelStep === 0 ? (
              <text key={label} x={xAt(i)} y={plotH - 7} fill={VIZ.textSecondary} fontSize={9} textAnchor="middle">
                {truncate(label, 8)}
              </text>
            ) : null
          )}

          {/* Crosshair */}
          {hoverIdx !== null && (
            <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padTop} y2={padTop + innerH} stroke={VIZ.axis} strokeWidth={1} />
          )}

          {result.series.map((s, si) => {
            const color = seriesColor(multi ? si : colorSlot, s.key);
            const path = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
            const areaPath = `${path} L ${xAt(n - 1)} ${padTop + innerH} L ${xAt(0)} ${padTop + innerH} Z`;

            return (
              <g key={s.key}>
                {variant === 'area' && <path d={areaPath} fill={color} fillOpacity={0.1} />}
                <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* Marcador final ≥8px con anillo de 2px en color de superficie */}
                <circle cx={xAt(n - 1)} cy={yAt(s.values[n - 1])} r={4} fill={color} stroke={VIZ.surface} strokeWidth={2} />
                {hoverIdx !== null && (
                  <circle cx={xAt(hoverIdx)} cy={yAt(s.values[hoverIdx])} r={4} fill={color} stroke={VIZ.surface} strokeWidth={2} />
                )}
                {!multi && showValues && (
                  <text
                    x={xAt(n - 1) + 8}
                    y={yAt(s.values[n - 1]) + 3}
                    fill={VIZ.textPrimary}
                    fontSize={10}
                    fontWeight={600}
                    className="tabular-nums"
                  >
                    {formatMeasure(s.values[n - 1], measure)}
                  </text>
                )}
              </g>
            );
          })}

          <rect
            x={padLeft}
            y={padTop}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={handleMove}
          />
        </svg>
      )}
      {multi && showLegend && <ChartLegend items={legendItems} />}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};
