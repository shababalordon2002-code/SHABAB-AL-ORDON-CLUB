'use client';

import React from 'react';
import { Copy, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { DashboardFieldDef, DashboardWidget, NormalizedEvent } from '@/types';
import { EngineContext, MEASURE_LABELS, getFieldLabel } from '@/lib/analytics/dashboard-engine';
import { WidgetContent } from './WidgetContent';

interface WidgetCardProps {
  widget: DashboardWidget;
  events: NormalizedEvent[];
  ctx: EngineContext;
  fields: DashboardFieldDef[];
  editMode: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  widget,
  events,
  ctx,
  fields,
  editMode,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onResizeStart,
}) => {
  const subtitle =
    widget.subtitle ||
    (widget.type === 'text'
      ? ''
      : [
          MEASURE_LABELS[widget.measure],
          widget.dimension ? `por ${getFieldLabel(fields, widget.dimension)}` : '',
          widget.breakdown ? `· ${getFieldLabel(fields, widget.breakdown)}` : '',
          widget.cumulative ? '· acumulado' : '',
        ]
          .filter(Boolean)
          .join(' '));

  return (
    <div className="relative h-full w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col overflow-hidden group">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5 shrink-0">
        <div
          className={`min-w-0 flex items-start gap-1.5 ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={editMode ? onDragStart : undefined}
        >
          {editMode && <GripVertical className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <h3 className="text-[11px] font-extrabold text-slate-100 tracking-tight truncate">{widget.title}</h3>
            {subtitle && <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>

        {editMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
              title="Editar widget"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700"
              title="Duplicar widget"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700"
              title="Eliminar widget"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 px-2.5 pb-2.5">
        <WidgetContent widget={widget} events={events} ctx={ctx} fields={fields} compact={widget.h <= 3} />
      </div>

      {editMode && (
        <div
          onPointerDown={onResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
          title="Redimensionar"
        >
          <svg viewBox="0 0 20 20" className="w-full h-full text-slate-500">
            <path d="M19 7 L7 19 M19 12 L12 19 M19 17 L17 19" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
};
