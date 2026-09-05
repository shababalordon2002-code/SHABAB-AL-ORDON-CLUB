'use client';

import React, { useMemo } from 'react';
import { DashboardFieldDef, DashboardWidget, NormalizedEvent } from '@/types';
import {
  EngineContext,
  MEASURE_LABELS,
  aggregate,
  applyFilters,
  computeMeasure,
  getFieldLabel,
  timeBinLabel,
} from '@/lib/analytics/dashboard-engine';
import { CategoryChart } from './viz/CategoryChart';
import { TimeSeriesChart } from './viz/TimeSeriesChart';
import { PieChart } from './viz/PieChart';
import { DataTableChart } from './viz/DataTableChart';
import { TimelineChart } from './viz/TimelineChart';
import { PitchChart } from './viz/PitchChart';
import { KpiTile } from './viz/KpiTile';
import { EmptyChart } from './viz/primitives';

interface WidgetContentProps {
  widget: DashboardWidget;
  events: NormalizedEvent[];
  ctx: EngineContext;
  fields: DashboardFieldDef[];
  compact?: boolean;
}

export const WidgetContent: React.FC<WidgetContentProps> = ({ widget, events, ctx, fields, compact }) => {
  const filtered = useMemo(() => applyFilters(events, widget.filters, ctx), [events, widget.filters, ctx]);

  const result = useMemo(() => {
    const needsAgg = ['bar', 'column', 'line', 'area', 'pie', 'donut', 'table', 'matrix'].includes(widget.type);
    if (!needsAgg) return null;
    return aggregate(filtered, widget, ctx);
  }, [filtered, widget, ctx]);

  if (widget.type === 'text') {
    return (
      <div className="h-full w-full overflow-auto px-1">
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
          {widget.text || 'Doble clic en “Editar” para escribir una nota, una conclusión o el título de una sección.'}
        </p>
      </div>
    );
  }

  if (widget.type === 'kpi') {
    const value = computeMeasure(filtered, widget.measure, events.length);
    const bin = widget.timeBinMinutes || 5;
    const buckets = new Map<number, NormalizedEvent[]>();
    filtered.forEach((e) => {
      const label = timeBinLabel(e.timestamp, bin);
      if (!label) return;
      const start = parseInt(label, 10);
      if (!buckets.has(start)) buckets.set(start, []);
      buckets.get(start)!.push(e);
    });
    const sparkline = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, evts]) => computeMeasure(evts, widget.measure, filtered.length));

    return (
      <KpiTile
        value={value}
        measure={widget.measure}
        label={widget.subtitle || MEASURE_LABELS[widget.measure]}
        sparkline={sparkline}
        colorSlot={widget.colorSlot || 0}
        compact={compact}
      />
    );
  }

  if (widget.type === 'timeline') {
    return (
      <TimelineChart events={filtered} ctx={ctx} laneField={widget.dimension} colorSlot={widget.colorSlot || 0} />
    );
  }

  if (widget.type.startsWith('pitch_')) {
    const mode =
      widget.type === 'pitch_points'
        ? 'points'
        : widget.type === 'pitch_arrows'
        ? 'arrows'
        : widget.type === 'pitch_heatmap'
        ? 'heatmap'
        : 'zones';

    return (
      <PitchChart
        events={filtered}
        mode={mode}
        measure={widget.measure}
        ctx={ctx}
        breakdown={mode === 'points' || mode === 'arrows' ? widget.breakdown : undefined}
        orientation={widget.pitchOrientation || 'horizontal'}
        binsX={widget.pitchBinsX || 6}
        binsY={widget.pitchBinsY || 4}
        showValues={widget.showValues !== false}
        showLegend={widget.showLegend !== false}
        colorSlot={widget.colorSlot || 0}
      />
    );
  }

  if (!result) return <EmptyChart />;

  switch (widget.type) {
    case 'bar':
    case 'column':
      return (
        <CategoryChart
          result={result}
          measure={widget.measure}
          orientation={widget.type === 'bar' ? 'horizontal' : 'vertical'}
          showValues={widget.showValues !== false}
          showLegend={widget.showLegend !== false}
          colorSlot={widget.colorSlot || 0}
        />
      );
    case 'line':
    case 'area':
      return (
        <TimeSeriesChart
          result={result}
          measure={widget.measure}
          variant={widget.type}
          showValues={widget.showValues !== false}
          showLegend={widget.showLegend !== false}
          colorSlot={widget.colorSlot || 0}
        />
      );
    case 'pie':
    case 'donut':
      return (
        <PieChart
          result={result}
          measure={widget.measure}
          variant={widget.type}
          showLegend={widget.showLegend !== false}
        />
      );
    case 'table':
    case 'matrix':
      return (
        <DataTableChart
          result={result}
          measure={widget.measure}
          dimensionLabel={getFieldLabel(fields, widget.dimension)}
          breakdownLabel={widget.breakdown ? getFieldLabel(fields, widget.breakdown) : undefined}
          variant={widget.type}
        />
      );
    default:
      return <EmptyChart />;
  }
};
