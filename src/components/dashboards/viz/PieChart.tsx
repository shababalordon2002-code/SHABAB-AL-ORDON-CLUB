'use client';

import React from 'react';
import { AggResult, formatMeasure } from '@/lib/analytics/dashboard-engine';
import { DashboardMeasure } from '@/types';
import { VIZ, seriesColor } from './theme';
import { ChartLegend, ChartTooltip, EmptyChart, useElementSize, useTooltip } from './primitives';

interface PieChartProps {
  result: AggResult;
  measure: DashboardMeasure;
  variant: 'pie' | 'donut';
  showLegend?: boolean;
}

/** Reparto parte-a-todo de un vistazo. Máximo 6 porciones legibles: el resto se pliega. */
export const PieChart: React.FC<PieChartProps> = ({ result, measure, variant, showLegend = true }) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();

  if (result.labels.length === 0) return <EmptyChart />;

  const raw = result.labels.map((label, i) => ({ label, value: result.totals[i] })).filter((d) => d.value > 0);
  if (raw.length === 0) return <EmptyChart />;

  const MAX_SLICES = 6;
  let slices = raw;
  if (raw.length > MAX_SLICES) {
    const head = raw.slice(0, MAX_SLICES - 1);
    const tail = raw.slice(MAX_SLICES - 1);
    slices = [...head, { label: 'Otros', value: tail.reduce((a, d) => a + d.value, 0) }];
  }

  const total = slices.reduce((a, d) => a + d.value, 0);
  const legendItems = slices.map((s, i) => ({ label: s.label, color: seriesColor(i, s.label) }));
  const legendH = showLegend ? Math.min(60, 22 * Math.ceil(slices.length / 3)) : 0;

  const plotH = Math.max(0, height - legendH);
  const size = Math.max(0, Math.min(width, plotH));
  const cx = width / 2;
  const cy = plotH / 2;
  const r = size / 2 - 8;
  const innerR = variant === 'donut' ? r * 0.58 : 0;

  let angle = -Math.PI / 2;

  const arc = (start: number, end: number) => {
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    if (innerR <= 0) {
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }
    const ix2 = cx + innerR * Math.cos(end);
    const iy2 = cy + innerR * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(start);
    const iy1 = cy + innerR * Math.sin(start);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
  };

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {size > 20 && (
        <svg width={width} height={plotH} className="block" onMouseLeave={hide}>
          {slices.map((slice, i) => {
            const sweep = (slice.value / total) * Math.PI * 2;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            const color = seriesColor(i, slice.label);
            return (
              <path
                key={slice.label}
                d={arc(start, end)}
                fill={color}
                stroke={VIZ.surface}
                strokeWidth={2}
                onMouseMove={(e) =>
                  show(
                    e,
                    slice.label,
                    [
                      { label: 'Valor', value: formatMeasure(slice.value, measure), color },
                      { label: 'Peso', value: `${((slice.value / total) * 100).toFixed(1)}%` },
                    ],
                    ref.current
                  )
                }
              />
            );
          })}

          {variant === 'donut' && (
            <g>
              <text x={cx} y={cy - 2} fill={VIZ.textPrimary} fontSize={Math.max(14, r * 0.34)} fontWeight={700} textAnchor="middle">
                {formatMeasure(total, measure)}
              </text>
              <text x={cx} y={cy + Math.max(12, r * 0.26)} fill={VIZ.textMuted} fontSize={9} textAnchor="middle">
                TOTAL
              </text>
            </g>
          )}
        </svg>
      )}
      {showLegend && <ChartLegend items={legendItems} />}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};
