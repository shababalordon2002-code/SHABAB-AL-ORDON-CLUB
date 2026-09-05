'use client';

import React from 'react';
import { DashboardMeasure } from '@/types';
import { formatMeasure } from '@/lib/analytics/dashboard-engine';
import { SERIES_COLORS, VIZ, seriesColor } from './theme';

interface KpiTileProps {
  value: number;
  measure: DashboardMeasure;
  label: string;
  sparkline?: number[];
  colorSlot?: number;
  compact?: boolean;
}

/** Cuando la historia es un número, el número es el gráfico. */
export const KpiTile: React.FC<KpiTileProps> = ({ value, measure, label, sparkline = [], colorSlot = 0, compact }) => {
  const color = seriesColor(colorSlot);
  const max = Math.max(...sparkline, 0.0001);
  const w = 140;
  const h = 34;
  const points = sparkline.map((v, i) => {
    const x = sparkline.length === 1 ? w / 2 : (i / (sparkline.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  });

  return (
    <div className="h-full w-full flex flex-col justify-center px-1">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
      <p
        className="font-extrabold text-slate-50 leading-none mt-1"
        style={{ fontSize: compact ? 30 : 44 }}
      >
        {formatMeasure(value, measure)}
      </p>
      {sparkline.length > 1 && (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 block">
          <path d={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};

export const KPI_ACCENTS = SERIES_COLORS;
export const KPI_TEXT = VIZ.textSecondary;
