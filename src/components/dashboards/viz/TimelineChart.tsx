'use client';

import React from 'react';
import { NormalizedEvent } from '@/types';
import { EngineContext, getFieldValues } from '@/lib/analytics/dashboard-engine';
import { VIZ, seriesColor, truncate } from './theme';
import { ChartTooltip, EmptyChart, useElementSize, useTooltip } from './primitives';

interface TimelineChartProps {
  events: NormalizedEvent[];
  ctx: EngineContext;
  laneField?: string;
  colorSlot?: number;
}

/** Cada evento sobre el eje de tiempo del partido, agrupado en carriles. */
export const TimelineChart: React.FC<TimelineChartProps> = ({ events, ctx, laneField, colorSlot = 0 }) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { tooltip, show, hide } = useTooltip();

  if (events.length === 0) return <EmptyChart />;

  const maxMinute = Math.max(90, ...events.map((e) => e.minute || 0));
  const lanes = laneField
    ? Array.from(new Set(events.flatMap((e) => getFieldValues(e, laneField, ctx)))).slice(0, 12)
    : ['Eventos'];

  const padLeft = laneField ? Math.min(110, Math.max(60, width * 0.24)) : 8;
  const padRight = 10;
  const padTop = 8;
  const padBottom = 22;
  const innerW = Math.max(10, width - padLeft - padRight);
  const innerH = Math.max(10, height - padTop - padBottom);
  const laneH = innerH / lanes.length;
  const xAt = (minute: number) => padLeft + (minute / maxMinute) * innerW;

  const ticks = [0, 15, 30, 45, 60, 75, 90].filter((t) => t <= maxMinute);

  return (
    <div ref={ref} className="viz-host relative h-full w-full">
      {width > 0 && height > 40 && (
        <svg width={width} height={height} className="block" onMouseLeave={hide}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={xAt(t)} x2={xAt(t)} y1={padTop} y2={padTop + innerH} stroke={VIZ.grid} strokeWidth={1} />
              <text x={xAt(t)} y={height - 6} fill={VIZ.textMuted} fontSize={9} textAnchor="middle" className="tabular-nums">
                {t}'
              </text>
            </g>
          ))}

          {lanes.map((lane, li) => (
            <g key={lane}>
              {laneField && (
                <text
                  x={padLeft - 8}
                  y={padTop + laneH * li + laneH / 2 + 3}
                  fill={VIZ.textSecondary}
                  fontSize={10}
                  textAnchor="end"
                >
                  {truncate(lane, Math.floor(padLeft / 6))}
                </text>
              )}
              <line
                x1={padLeft}
                x2={padLeft + innerW}
                y1={padTop + laneH * li + laneH / 2}
                y2={padTop + laneH * li + laneH / 2}
                stroke={VIZ.grid}
                strokeWidth={1}
              />
              {events
                .filter((e) => (laneField ? getFieldValues(e, laneField, ctx).includes(lane) : true))
                .map((evt) => {
                  const color = seriesColor(laneField ? li : colorSlot, lane);
                  const markH = Math.min(18, Math.max(8, laneH - 8));
                  return (
                    <rect
                      key={`${lane}-${evt.event_id}`}
                      x={xAt(evt.minute || 0) - 1.5}
                      y={padTop + laneH * li + (laneH - markH) / 2}
                      width={3}
                      height={markH}
                      rx={1.5}
                      fill={color}
                      onMouseMove={(e) =>
                        show(
                          e,
                          `${evt.minute ?? 0}' · ${evt.event_type}`,
                          [
                            { label: 'Jugador', value: evt.player_name || '—', color },
                            ...(evt.outcome ? [{ label: 'Resultado', value: evt.outcome }] : []),
                          ],
                          ref.current
                        )
                      }
                    />
                  );
                })}
            </g>
          ))}
        </svg>
      )}
      <ChartTooltip tooltip={tooltip} containerWidth={width} />
    </div>
  );
};
