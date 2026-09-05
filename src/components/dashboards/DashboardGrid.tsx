'use client';

import React, { useCallback, useRef, useState } from 'react';
import { DashboardFieldDef, DashboardWidget, NormalizedEvent } from '@/types';
import { EngineContext } from '@/lib/analytics/dashboard-engine';
import { WidgetCard } from './WidgetCard';
import { useElementSize } from './viz/primitives';

interface DashboardGridProps {
  widgets: DashboardWidget[];
  cols: number;
  rowHeight: number;
  events: NormalizedEvent[];
  ctx: EngineContext;
  fields: DashboardFieldDef[];
  editMode: boolean;
  onChangeLayout: (widgets: DashboardWidget[]) => void;
  onEditWidget: (widget: DashboardWidget) => void;
  onDuplicateWidget: (widget: DashboardWidget) => void;
  onDeleteWidget: (widget: DashboardWidget) => void;
}

const GAP = 10;
const MIN_W = 2;
const MIN_H = 3;

interface DragState {
  id: string;
  mode: 'move' | 'resize';
  startPointerX: number;
  startPointerY: number;
  origin: { x: number; y: number; w: number; h: number };
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  cols,
  rowHeight,
  events,
  ctx,
  fields,
  editMode,
  onChangeLayout,
  onEditWidget,
  onDuplicateWidget,
  onDeleteWidget,
}) => {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<DashboardWidget[] | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const colWidth = width > 0 ? (width - GAP * (cols - 1)) / cols : 0;
  const list = preview || widgets;
  const maxY = list.reduce((acc, w) => Math.max(acc, w.y + w.h), 0);
  const gridHeight = Math.max(6, maxY + 2) * (rowHeight + GAP);

  const pxToGrid = useCallback(
    (dx: number, dy: number) => ({
      dCols: Math.round(dx / (colWidth + GAP)),
      dRows: Math.round(dy / (rowHeight + GAP)),
    }),
    [colWidth, rowHeight]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      const { dCols, dRows } = pxToGrid(e.clientX - state.startPointerX, e.clientY - state.startPointerY);

      setPreview(
        widgets.map((w) => {
          if (w.id !== state.id) return w;
          if (state.mode === 'move') {
            const x = Math.max(0, Math.min(cols - state.origin.w, state.origin.x + dCols));
            const y = Math.max(0, state.origin.y + dRows);
            return { ...w, x, y };
          }
          const width_ = Math.max(MIN_W, Math.min(cols - state.origin.x, state.origin.w + dCols));
          const height_ = Math.max(MIN_H, state.origin.h + dRows);
          return { ...w, w: width_, h: height_ };
        })
      );
    },
    [cols, pxToGrid, widgets]
  );

  const handlePointerUp = useCallback(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    setPreview((current) => {
      if (current) onChangeLayout(current);
      return null;
    });
    dragRef.current = null;
    setDrag(null);
  }, [handlePointerMove, onChangeLayout]);

  const startDrag = (widget: DashboardWidget, mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const state: DragState = {
      id: widget.id,
      mode,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      origin: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
    };
    dragRef.current = state;
    setDrag(state);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{ height: gridHeight, minHeight: 320 }}
    >
      {editMode && colWidth > 0 && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]">
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-dashed border-slate-800"
              style={{ left: i * (colWidth + GAP) }}
            />
          ))}
        </div>
      )}

      {colWidth > 0 &&
        list.map((widget) => (
          <div
            key={widget.id}
            className={`absolute transition-[box-shadow] ${drag?.id === widget.id ? 'z-20 ring-2 ring-emerald-500/60 rounded-2xl' : 'z-10'}`}
            style={{
              left: widget.x * (colWidth + GAP),
              top: widget.y * (rowHeight + GAP),
              width: widget.w * colWidth + (widget.w - 1) * GAP,
              height: widget.h * rowHeight + (widget.h - 1) * GAP,
            }}
          >
            <WidgetCard
              widget={widget}
              events={events}
              ctx={ctx}
              fields={fields}
              editMode={editMode}
              onEdit={() => onEditWidget(widget)}
              onDuplicate={() => onDuplicateWidget(widget)}
              onDelete={() => onDeleteWidget(widget)}
              onDragStart={startDrag(widget, 'move')}
              onResizeStart={startDrag(widget, 'resize')}
            />
          </div>
        ))}
    </div>
  );
};
