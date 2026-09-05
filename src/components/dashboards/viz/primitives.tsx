'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VIZ } from './theme';

/** Mide el contenedor para pintar SVG en píxeles reales (texto nítido, sin deformar). */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...size };
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
}

export const ChartTooltip: React.FC<{ tooltip: TooltipState | null; containerWidth: number }> = ({
  tooltip,
  containerWidth,
}) => {
  if (!tooltip) return null;

  const flip = tooltip.x > containerWidth - 170;

  return (
    <div
      className="pointer-events-none absolute z-30 rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-2 shadow-xl backdrop-blur-sm"
      style={{
        left: flip ? undefined : tooltip.x + 12,
        right: flip ? containerWidth - tooltip.x + 12 : undefined,
        top: Math.max(4, tooltip.y - 10),
        minWidth: 120,
        maxWidth: 220,
      }}
    >
      <p className="text-[10px] font-bold text-slate-100 leading-tight break-words">{tooltip.title}</p>
      <div className="mt-1 space-y-0.5">
        {tooltip.rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 min-w-0">
              {row.color && (
                <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: row.color }} />
              )}
              <span className="text-[10px] text-slate-400 truncate">{row.label}</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-100 shrink-0 tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Leyenda: canal de identidad obligatorio a partir de 2 series. */
export const ChartLegend: React.FC<{ items: { label: string; color: string }[] }> = ({ items }) => {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-1">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: item.color }} />
          <span className="text-[10px] text-slate-400">{item.label}</span>
        </span>
      ))}
    </div>
  );
};

export const EmptyChart: React.FC<{ message?: string }> = ({ message }) => (
  <div className="h-full w-full flex items-center justify-center px-4 text-center">
    <p className="text-[11px] text-slate-500 leading-relaxed">
      {message || 'Sin datos para esta configuración. Ajusta el campo, la medida o los filtros.'}
    </p>
  </div>
);

/** Hook de posición del ratón relativa al contenedor del gráfico. */
export function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const show = useCallback(
    (e: React.MouseEvent, title: string, rows: TooltipRow[], container: HTMLElement | null) => {
      const host = container || (e.currentTarget as SVGElement).closest('.viz-host');
      if (!host) return;
      const rect = (host as HTMLElement).getBoundingClientRect();
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, rows });
    },
    []
  );

  const hide = useCallback(() => setTooltip(null), []);

  return { tooltip, show, hide };
}

export const gridStroke = VIZ.grid;
