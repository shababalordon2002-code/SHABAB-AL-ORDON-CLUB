'use client';

import React from 'react';
import { AggResult, formatMeasure } from '@/lib/analytics/dashboard-engine';
import { DashboardMeasure } from '@/types';
import { seriesColor } from './theme';
import { EmptyChart } from './primitives';

interface DataTableChartProps {
  result: AggResult;
  measure: DashboardMeasure;
  dimensionLabel: string;
  breakdownLabel?: string;
  variant: 'table' | 'matrix';
}

/** Tabla y tabla cruzada: el respaldo accesible de cualquier gráfico. */
export const DataTableChart: React.FC<DataTableChartProps> = ({
  result,
  measure,
  dimensionLabel,
  breakdownLabel,
  variant,
}) => {
  if (result.labels.length === 0) return <EmptyChart />;

  const isMatrix = variant === 'matrix' && result.series.length > 1;

  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-slate-900 z-10">
          <tr className="border-b border-slate-800">
            <th className="py-1.5 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {dimensionLabel}
            </th>
            {isMatrix ? (
              <>
                {result.series.map((s, i) => (
                  <th key={s.key} className="py-1.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-[2px]" style={{ background: seriesColor(i, s.key) }} />
                      {s.key}
                    </span>
                  </th>
                ))}
                <th className="py-1.5 pl-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</th>
              </>
            ) : (
              <th className="py-1.5 pl-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                {breakdownLabel ? `${breakdownLabel}` : 'Valor'}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {result.labels.map((label, i) => (
            <tr key={label} className="border-b border-slate-800/60 hover:bg-slate-800/40">
              <td className="py-1.5 pr-2 text-[11px] text-slate-200 font-medium">{label}</td>
              {isMatrix ? (
                <>
                  {result.series.map((s) => (
                    <td key={s.key} className="py-1.5 px-2 text-right text-[11px] font-mono text-slate-300 tabular-nums">
                      {s.values[i] > 0 ? formatMeasure(s.values[i], measure) : '·'}
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-right text-[11px] font-mono font-bold text-slate-100 tabular-nums">
                    {formatMeasure(
                      result.series.reduce((acc, s) => acc + s.values[i], 0),
                      measure
                    )}
                  </td>
                </>
              ) : (
                <td className="py-1.5 pl-2 text-right text-[11px] font-mono font-bold text-slate-100 tabular-nums">
                  {formatMeasure(result.totals[i], measure)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-700">
            <td className="py-1.5 pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</td>
            {isMatrix && result.series.map((s) => (
              <td key={s.key} className="py-1.5 px-2 text-right text-[11px] font-mono text-slate-400 tabular-nums">
                {formatMeasure(
                  s.values.reduce((a, b) => a + b, 0),
                  measure
                )}
              </td>
            ))}
            <td className="py-1.5 pl-2 text-right text-[11px] font-mono font-bold text-emerald-400 tabular-nums">
              {formatMeasure(result.grandTotal, measure)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
