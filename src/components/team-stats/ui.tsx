'use client';

import React from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { JornadaRow, formatValue } from '@/lib/analytics/team-stats-engine';
import { RESULT_STYLE, Sparkline, heatCellStyle, OWN_COLOR } from './charts';

/** Bloque exportable: cada Panel es una unidad indivisible en el PDF. */
export const Panel: React.FC<{
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, className = '', children }) => (
  <div data-pdf-block className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl ${className}`}>
    {(title || right) && (
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {right && <div data-pdf-ignore="true" className="flex items-center gap-2 flex-wrap">{right}</div>}
      </div>
    )}
    {children}
  </div>
);

export const SectionHeader: React.FC<{ index: number; title: string; description: string; icon: React.ElementType }> = ({
  index,
  title,
  description,
  icon: Icon,
}) => (
  <div className="flex items-center gap-3 pt-4">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-900/70 to-amber-700/40 border border-amber-500/30 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-amber-300" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80">Sección {String(index).padStart(2, '0')}</p>
      <h2 className="text-xl font-black text-white tracking-tight leading-tight">{title}</h2>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  </div>
);

export const KpiCard: React.FC<{ label: string; value: string; hint?: string; accent?: string; children?: React.ReactNode }> = ({
  label,
  value,
  hint,
  accent = 'text-white',
  children,
}) => (
  <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-3.5 py-3 flex flex-col gap-1 min-w-0">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{label}</span>
    <span className={`text-2xl font-black tabular-nums leading-none ${accent}`}>{value}</span>
    {hint && <span className="text-[10px] text-slate-400 truncate">{hint}</span>}
    {children}
  </div>
);

export const ResultChip: React.FC<{ result: 'G' | 'E' | 'P'; size?: number; title?: string }> = ({ result, size = 26, title }) => (
  <span
    title={title || RESULT_STYLE[result].label}
    className="inline-flex items-center justify-center rounded-md font-black shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.46, background: RESULT_STYLE[result].bg, color: RESULT_STYLE[result].text }}
  >
    {result}
  </span>
);

export const TrendBadge: React.FC<{ slope: number; unit?: '' | '%' }> = ({ slope, unit = '' }) => {
  const flat = Math.abs(slope) < (unit === '%' ? 0.5 : 0.05);
  const Icon = flat ? ArrowRight : slope > 0 ? ArrowUpRight : ArrowDownRight;
  const color = flat ? 'text-slate-400' : slope > 0 ? 'text-sky-300' : 'text-orange-300';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${color}`} title="Pendiente por jornada (regresión lineal)">
      <Icon className="w-3 h-3" />
      {slope > 0 ? '+' : ''}
      {slope.toFixed(unit === '%' ? 1 : 2)}
    </span>
  );
};

export interface MatrixRow {
  key: string;
  label: string;
  unit: '' | '%';
  values: (number | null)[];
  rivalValues?: (number | null)[];
  total?: number | null;
  avg?: number | null;
  rivalAvg?: number | null;
  primary?: boolean;
}

/**
 * Tabla métrica × jornada, ordenada por fecha. Se parte en bloques de
 * `chunk` jornadas para que cada bloque quepa completo en una hoja del PDF.
 */
export const JornadaMatrix: React.FC<{
  title: string;
  subtitle?: string;
  rows: MatrixRow[];
  jornadas: JornadaRow[];
  chunk?: number;
  showRival?: boolean;
}> = ({ title, subtitle, rows, jornadas, chunk = 12, showRival = false }) => {
  const chunks: JornadaRow[][] = [];
  for (let i = 0; i < jornadas.length; i += chunk) chunks.push(jornadas.slice(i, i + chunk));
  if (!chunks.length) chunks.push([]);

  return (
    <>
      {chunks.map((cols, ci) => (
        <Panel
          key={ci}
          title={chunks.length > 1 ? `${title} · ${cols[0]?.label}–${cols[cols.length - 1]?.label}` : title}
          subtitle={subtitle}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900 text-left px-2 py-2 font-bold text-slate-400 uppercase tracking-wider text-[9.5px] min-w-[11rem] border-b border-slate-800">
                    Métrica
                  </th>
                  {cols.map((j) => (
                    <th key={j.match.id} className="px-1.5 py-1.5 text-center border-b border-slate-800 min-w-[3.6rem]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10.5px] font-black text-slate-100">{j.label}</span>
                        <span className="text-[9px] text-slate-400 font-medium truncate max-w-[4.5rem]" title={j.opponent}>
                          {j.isHome ? 'vs' : '@'} {j.opponentShort}
                        </span>
                        <span className="flex items-center gap-1">
                          <ResultChip result={j.result} size={15} />
                          <span className="text-[9.5px] font-bold tabular-nums text-slate-300">{j.gf}-{j.ga}</span>
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center border-b border-l border-slate-800 text-[9.5px] font-bold uppercase text-slate-400">Total</th>
                  <th className="px-2 py-2 text-center border-b border-slate-800 text-[9.5px] font-bold uppercase text-slate-400">Media</th>
                  {showRival && <th className="px-2 py-2 text-center border-b border-slate-800 text-[9.5px] font-bold uppercase text-orange-300/80">Rival</th>}
                  <th className="px-2 py-2 text-center border-b border-slate-800 text-[9.5px] font-bold uppercase text-slate-400">Evol.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const offset = jornadas.indexOf(cols[0]);
                  const slice = row.values.slice(offset, offset + cols.length);
                  const rowMax = row.unit === '%' ? 100 : Math.max(...row.values.map((v) => v ?? 0), 0);
                  return (
                    <tr key={row.key} className="hover:bg-slate-800/30">
                      <td
                        className={`sticky left-0 z-10 bg-slate-900 px-2 py-1.5 border-b border-slate-800/70 ${
                          row.primary ? 'font-bold text-slate-100' : 'pl-5 text-slate-400'
                        }`}
                      >
                        {row.label}
                      </td>
                      {slice.map((v, i) => (
                        <td key={i} className="px-1 py-1 border-b border-slate-800/70 text-center">
                          <span
                            className="inline-block min-w-[2.2rem] rounded px-1 py-0.5 font-bold tabular-nums text-slate-300"
                            style={heatCellStyle(v, rowMax)}
                          >
                            {formatValue(v, row.unit)}
                          </span>
                        </td>
                      ))}
                      <td className="px-2 py-1 border-b border-l border-slate-800/70 text-center font-black tabular-nums text-white">
                        {formatValue(row.total ?? null, row.unit)}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-800/70 text-center font-bold tabular-nums text-sky-300">
                        {formatValue(row.avg ?? null, row.unit)}
                      </td>
                      {showRival && (
                        <td className="px-2 py-1 border-b border-slate-800/70 text-center font-bold tabular-nums text-orange-300">
                          {formatValue(row.rivalAvg ?? null, row.unit)}
                        </td>
                      )}
                      <td className="px-2 py-1 border-b border-slate-800/70">
                        <Sparkline values={row.values} color={OWN_COLOR} width={80} height={22} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </>
  );
};
