'use client';

import React, { useState } from 'react';
import { NormalizedEvent } from '@/types';
import { ArrowUp, ArrowRight, RotateCw } from 'lucide-react';

interface PitchViewerProps {
  events: NormalizedEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: NormalizedEvent) => void;
}

export const PitchViewer: React.FC<PitchViewerProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
}) => {
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [hoveredEvent, setHoveredEvent] = useState<NormalizedEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isVertical = orientation === 'vertical';

  // SVG dimensions
  const width = isVertical ? 680 : 1050;
  const height = isVertical ? 1050 : 680;
  const margin = 30;

  /**
   * Converts 0-100 normalized coordinates to SVG pitch coordinates.
   * Vertical (Ataque Arriba):
   * - x (0=own goal bottom, 100=opponent goal top) -> svgY = margin + ((100-x)/100)*(height - 2*margin)
   * - y (0=left touchline, 100=right touchline) -> svgX = margin + (y/100)*(width - 2*margin)
   * Horizontal (Ataque Derecha):
   * - x (0=own goal left, 100=opponent goal right) -> svgX = margin + (x/100)*(width - 2*margin)
   * - y (0=top touchline, 100=bottom touchline) -> svgY = margin + (y/100)*(height - 2*margin)
   */
  const getSvgCoords = (x: number | null, y: number | null) => {
    if (x === null || y === null) return null;

    if (isVertical) {
      const svgX = margin + (y / 100) * (width - 2 * margin);
      const svgY = margin + ((100 - x) / 100) * (height - 2 * margin);
      return { x: svgX, y: svgY };
    } else {
      const svgX = margin + (x / 100) * (width - 2 * margin);
      const svgY = margin + (y / 100) * (height - 2 * margin);
      return { x: svgX, y: svgY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, evt: NormalizedEvent) => {
    const rect = e.currentTarget.ownerSVGElement
      ? e.currentTarget.ownerSVGElement.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();

    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredEvent(evt);
  };

  return (
    <div className="space-y-2">
      {/* Top Header Controls: Orientation Switcher & Direction Indicator */}
      <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          {isVertical ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-emerald-400" />
              <span>Ataque Hacia Arriba</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-blue-400" />
              <span>Ataque De Izquierda a Derecha</span>
            </span>
          )}
        </div>

        {/* Orientation Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
          <button
            onClick={() => setOrientation('vertical')}
            className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
              isVertical ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>↕️ Vertical</span>
          </button>
          <button
            onClick={() => setOrientation('horizontal')}
            className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
              !isVertical ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>↔️ Horizontal</span>
          </button>
        </div>
      </div>

      {/* Main Pitch Container */}
      <div
        className={`relative w-full mx-auto bg-emerald-950 rounded-2xl border-2 border-emerald-800/80 overflow-hidden shadow-2xl select-none group ${
          isVertical ? 'max-w-md max-h-[580px] aspect-[68/105]' : 'aspect-[105/68]'
        }`}
      >
        {/* Tactical Grass Stripes Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90 pointer-events-none"></div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block relative z-10"
          onMouseLeave={() => setHoveredEvent(null)}
        >
          {/* PITCH MARKINGS */}
          <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
            {/* Pitch Outer Boundary */}
            <rect x={margin} y={margin} width={width - 2 * margin} height={height - 2 * margin} rx="4" />

            {/* Halfway Line */}
            {isVertical ? (
              <line x1={margin} y1={height / 2} x2={width - margin} y2={height / 2} />
            ) : (
              <line x1={width / 2} y1={margin} x2={width / 2} y2={height - margin} />
            )}

            {/* Center Circle */}
            <circle cx={width / 2} cy={height / 2} r="91.5" />
            <circle cx={width / 2} cy={height / 2} r="3.5" fill="rgba(255, 255, 255, 0.9)" />

            {/* PENALTY AREAS */}
            {isVertical ? (
              // VERTICAL PENALTY AREAS
              <>
                {/* Top Penalty Area (Opponent Goal / Attack) */}
                <rect x={width / 2 - 165} y={margin} width="330" height="165" />
                <rect x={width / 2 - 73} y={margin} width="146" height="55" />
                <circle cx={width / 2} cy={margin + 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
                <path d={`M ${width / 2 - 73} ${margin + 165} A 91.5 91.5 0 0 0 ${width / 2 + 73} ${margin + 165}`} />
                <rect x={width / 2 - 36.6} y={margin - 16} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />

                {/* Bottom Penalty Area (Own Goal / Defense) */}
                <rect x={width / 2 - 165} y={height - margin - 165} width="330" height="165" />
                <rect x={width / 2 - 73} y={height - margin - 55} width="146" height="55" />
                <circle cx={width / 2} cy={height - margin - 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
                <path d={`M ${width / 2 - 73} ${height - margin - 165} A 91.5 91.5 0 0 1 ${width / 2 + 73} ${height - margin - 165}`} />
                <rect x={width / 2 - 36.6} y={height - margin} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />
              </>
            ) : (
              // HORIZONTAL PENALTY AREAS
              <>
                {/* Left Penalty Area */}
                <rect x={margin} y={height / 2 - 165} width="165" height="330" />
                <rect x={margin} y={height / 2 - 73} width="55" height="146" />
                <circle cx={margin + 110} cy={height / 2} r="3" fill="rgba(255, 255, 255, 0.9)" />
                <path d={`M ${margin + 165} ${height / 2 - 73} A 91.5 91.5 0 0 1 ${margin + 165} ${height / 2 + 73}`} />
                <rect x={margin - 16} y={height / 2 - 36.6} width="16" height="73.2" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />

                {/* Right Penalty Area */}
                <rect x={width - margin - 165} y={height / 2 - 165} width="165" height="330" />
                <rect x={width - margin - 55} y={height / 2 - 73} width="55" height="146" />
                <circle cx={width - margin - 110} cy={height / 2} r="3" fill="rgba(255, 255, 255, 0.9)" />
                <path d={`M ${width - margin - 165} ${height / 2 - 73} A 91.5 91.5 0 0 0 ${width - margin - 165} ${height / 2 + 73}`} />
                <rect x={width - margin} y={height / 2 - 36.6} width="16" height="73.2" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />
              </>
            )}

            {/* Corner Arcs */}
            <path d={`M ${margin + 15} ${margin} A 15 15 0 0 1 ${margin} ${margin + 15}`} />
            <path d={`M ${width - margin - 15} ${margin} A 15 15 0 0 0 ${width - margin} ${margin + 15}`} />
            <path d={`M ${margin + 15} ${height - margin} A 15 15 0 0 0 ${margin} ${height - margin - 15}`} />
            <path d={`M ${width - margin - 15} ${height - margin} A 15 15 0 0 1 ${width - margin} ${height - margin - 15}`} />
          </g>

          {/* DEFINE ARROW MARKERS */}
          <defs>
            <marker id="arrow-pass" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
          </defs>

          {/* RENDER EVENT VECTORS & MARKERS */}
          {events.map((evt) => {
            const startCoords = getSvgCoords(evt.x, evt.y);
            if (!startCoords) return null;

            const isSelected = selectedEventId === evt.event_id;
            const isPass = evt.category.toLowerCase().includes('pase') || evt.category.toLowerCase().includes('centro');
            const isShot = evt.category.toLowerCase().includes('tiro') || evt.category.toLowerCase().includes('remate') || evt.category.toLowerCase().includes('gol');
            const isRecovery = evt.category.toLowerCase().includes('recuperacion') || evt.category.toLowerCase().includes('intercepcion');

            let endCoords = getSvgCoords(evt.end_x, evt.end_y);
            if (!endCoords && isPass) {
              endCoords = isVertical
                ? { x: startCoords.x + 15, y: startCoords.y - 45 }
                : { x: startCoords.x + 45, y: startCoords.y - 15 };
            }

            return (
              <g
                key={evt.event_id}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectEvent(evt)}
                onMouseMove={(e) => handleMouseMove(e, evt)}
              >
                {/* PASS VECTORS */}
                {isPass && endCoords && (
                  <g>
                    <line
                      x1={startCoords.x}
                      y1={startCoords.y}
                      x2={endCoords.x}
                      y2={endCoords.y}
                      stroke={isSelected ? '#6ee7b7' : '#34d399'}
                      strokeWidth={isSelected ? '4' : '2.5'}
                      strokeOpacity={isSelected ? '1' : '0.85'}
                      markerEnd="url(#arrow-pass)"
                    />
                    <circle
                      cx={startCoords.x}
                      cy={startCoords.y}
                      r={isSelected ? 6 : 4}
                      fill="#34d399"
                      stroke="#022c22"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* SHOTS & GOALS */}
                {isShot && (
                  <g>
                    {isSelected && (
                      <circle cx={startCoords.x} cy={startCoords.y} r="14" fill="rgba(245, 158, 11, 0.4)" className="animate-ping" />
                    )}
                    <circle
                      cx={startCoords.x}
                      cy={startCoords.y}
                      r={isSelected ? 8 : 6.5}
                      fill={evt.outcome === 'Gol' || evt.category.toLowerCase().includes('gol') ? '#10b981' : '#f59e0b'}
                      stroke="#022c22"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* RECOVERIES */}
                {isRecovery && (
                  <g>
                    {isSelected && (
                      <circle cx={startCoords.x} cy={startCoords.y} r="12" fill="rgba(56, 189, 248, 0.4)" />
                    )}
                    <rect
                      x={startCoords.x - 5}
                      y={startCoords.y - 5}
                      width="10"
                      height="10"
                      fill="#38bdf8"
                      transform={`rotate(45 ${startCoords.x} ${startCoords.y})`}
                      stroke="#022c22"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* OTHER GENERAL EVENTS */}
                {!isPass && !isShot && !isRecovery && (
                  <g>
                    {isSelected && (
                      <circle cx={startCoords.x} cy={startCoords.y} r="10" fill="rgba(239, 68, 68, 0.4)" />
                    )}
                    <circle
                      cx={startCoords.x}
                      cy={startCoords.y}
                      r={isSelected ? 6 : 4.5}
                      fill={isSelected ? '#f87171' : '#cbd5e1'}
                      stroke="#022c22"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* HOVER TOOLTIP */}
        {hoveredEvent && (
          <div
            className="absolute z-30 pointer-events-none p-3 rounded-xl bg-slate-950/95 border border-emerald-500/40 shadow-2xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-44"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-emerald-400">{hoveredEvent.category}</span>
              <span className="font-mono text-[10px] text-slate-400">
                {hoveredEvent.minute !== null ? `${hoveredEvent.minute}' ${hoveredEvent.second?.toString().padStart(2, '0')}"` : '-'}
              </span>
            </div>

            <p className="font-semibold text-slate-100 text-xs">{hoveredEvent.player_name}</p>
            <p className="text-[10px] text-slate-400">{hoveredEvent.team_name || 'Shabab Al Ordon'}</p>

            {hoveredEvent.outcome && (
              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Resultado:</span>
                <span className="font-bold text-amber-400">{hoveredEvent.outcome}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
