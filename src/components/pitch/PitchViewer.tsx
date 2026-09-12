'use client';

import React, { useState } from 'react';
import { NormalizedEvent } from '@/types';
import { ArrowUp, ArrowRight, RotateCw } from 'lucide-react';
import { TeamLogo } from '@/components/player/PlayerBadge';

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
              <span>ATAQUE</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-blue-400" />
              <span>ATAQUE</span>
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
        className={`relative w-full mx-auto bg-emerald-950 rounded-2xl border-2 border-emerald-800/80 shadow-2xl select-none group flex ${
          isVertical ? 'flex-row max-w-md max-h-[580px]' : 'flex-col'
        }`}
      >
        <div className={`relative flex-1 ${isVertical ? 'aspect-[68/105]' : 'aspect-[105/68]'}`}>
          {/* Tactical Grass Stripes Overlay (Inner clipped) */}
          <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90"></div>
          </div>

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
            <marker id="arrow-pass" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* RENDER EVENT VECTORS & MARKERS */}
          {events.map((evt) => {
            const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? null;
            const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? null;
            const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
            const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

            const startCoords = getSvgCoords(startX, startY);
            if (!startCoords) return null;

            const isSelected = selectedEventId === evt.event_id;
            const catLower = (evt.category || '').toLowerCase();
            const isPassCategory =
              catLower.includes('pase') ||
              catLower.includes('centro') ||
              catLower.includes('transicion') ||
              catLower.includes('desmarque');

            const hasEndCoords = endX !== null && endY !== null && (endX !== startX || endY !== startY);
            const isArrow = hasEndCoords || isPassCategory;

            let endCoords = getSvgCoords(endX, endY);
            if (!endCoords && isPassCategory) {
              endCoords = isVertical
                ? { x: startCoords.x + 15, y: startCoords.y - 45 }
                : { x: startCoords.x + 45, y: startCoords.y - 15 };
            }

            const isShot = catLower.includes('tiro') || catLower.includes('remate') || catLower.includes('gol');
            const isRecovery = catLower.includes('recuperacion') || catLower.includes('intercepcion');

            let strokeColor = isSelected ? '#6ee7b7' : '#34d399';
            let markerId = 'arrow-pass';
            if (isShot || evt.outcome === 'Gol') {
              strokeColor = '#f59e0b';
              markerId = 'arrow-amber';
            } else if (isRecovery) {
              strokeColor = '#38bdf8';
              markerId = 'arrow-blue';
            }

            return (
              <g
                key={evt.event_id}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectEvent(evt)}
                onMouseMove={(e) => handleMouseMove(e, evt)}
              >
                {/* ARROWS / VECTORS */}
                {isArrow && endCoords && (
                  <g>
                    <line
                      x1={startCoords.x}
                      y1={startCoords.y}
                      x2={endCoords.x}
                      y2={endCoords.y}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '4.5' : '3'}
                      strokeOpacity={isSelected ? '1' : '0.9'}
                      markerEnd={`url(#${markerId})`}
                    />
                    <circle
                      cx={startCoords.x}
                      cy={startCoords.y}
                      r={isSelected ? 6 : 4.5}
                      fill={strokeColor}
                      stroke="#022c22"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* SHOTS & GOALS (SINGLE POINT) */}
                {!isArrow && isShot && (
                  <g>
                    {isSelected && (
                      <circle cx={startCoords.x} cy={startCoords.y} r="14" fill="rgba(245, 158, 11, 0.4)" className="animate-ping" />
                    )}
                    <circle
                      cx={startCoords.x}
                      cy={startCoords.y}
                      r={isSelected ? 8 : 6.5}
                      fill={evt.outcome === 'Gol' || catLower.includes('gol') ? '#10b981' : '#f59e0b'}
                      stroke="#022c22"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* RECOVERIES (SINGLE POINT) */}
                {!isArrow && isRecovery && (
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
                {!isArrow && !isShot && !isRecovery && (
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
            className="absolute z-[150] pointer-events-none p-3.5 rounded-2xl bg-slate-950/95 border border-emerald-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-44"
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
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <TeamLogo teamName={hoveredEvent.team_name} size={14} />
              <span>{hoveredEvent.team_name || 'Shabab Al Ordon'}</span>
            </div>

            {hoveredEvent.outcome && (
              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Resultado:</span>
                <span className="font-bold text-amber-400">{hoveredEvent.outcome}</span>
              </div>
            )}

            {/* DESCRIPTORES AL PASAR EL RATÓN POR ENCIMA DE LA FLECHA O PUNTO */}
            {(() => {
              const descList: string[] = [];
              if (Array.isArray(hoveredEvent.metadata?.descriptors)) descList.push(...hoveredEvent.metadata.descriptors);
              if (hoveredEvent.subcategory) descList.push(...hoveredEvent.subcategory.split(',').map((s) => s.trim()));
              if (hoveredEvent.metadata?.bodyPart) descList.push(`Parte: ${hoveredEvent.metadata.bodyPart}`);
              if (hoveredEvent.metadata?.result) descList.push(`Efecto: ${hoveredEvent.metadata.result}`);
              const uniqueDescs = Array.from(new Set(descList.filter(Boolean)));

              if (uniqueDescs.length === 0) return null;

              return (
                <div className="pt-1 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Descriptores:</span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueDescs.map((d, i) => {
                      const colonIdx = d.indexOf(':');
                      const displayVal = colonIdx !== -1 ? d.slice(colonIdx + 1).trim() : d.trim();
                      return (
                        <span key={i} title={d} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200 font-bold">
                          {displayVal}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        </div>

        {/* Lateral Attack Indicator Strip */}
        {isVertical ? (
          <div className="w-6 sm:w-7 bg-slate-950/90 border-l border-emerald-800/60 flex flex-col items-center justify-center py-4 gap-2 text-emerald-300 select-none pointer-events-none shrink-0 z-20 rounded-r-[14px]">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-300 [writing-mode:vertical-rl] rotate-180">
              ATAQUE
            </span>
          </div>
        ) : (
          <div className="h-6 bg-slate-950/90 border-t border-emerald-800/60 flex flex-row items-center justify-center px-4 gap-2 text-emerald-300 select-none pointer-events-none shrink-0 z-20 rounded-b-[14px]">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-300">
              ATAQUE
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
};
