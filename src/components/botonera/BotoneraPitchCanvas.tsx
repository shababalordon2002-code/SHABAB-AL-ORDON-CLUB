'use client';

import React, { useState, useEffect } from 'react';
import { Target, MoveUp, Grid, RefreshCw, Compass, ArrowUp, CheckCircle2, X } from 'lucide-react';

interface BotoneraPitchCanvasProps {
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  onSetCoords: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  selectedZone: string | null;
  onSelectZone: (zoneName: string | null) => void;
  initialMode?: 'arrows' | 'zones' | 'point';
  onCloseModal?: () => void;
  onConfirmLocation?: () => void;
}

export const BotoneraPitchCanvas: React.FC<BotoneraPitchCanvasProps> = ({
  startX,
  startY,
  endX,
  endY,
  onSetCoords,
  selectedZone,
  onSelectZone,
  initialMode = 'arrows',
  onCloseModal,
  onConfirmLocation,
}) => {
  const [pitchMode, setPitchMode] = useState<'arrows' | 'zones'>(
    initialMode === 'zones' ? 'zones' : 'arrows'
  );

  useEffect(() => {
    if (initialMode === 'zones') {
      setPitchMode('zones');
    } else {
      setPitchMode('arrows');
    }
  }, [initialMode]);

  // Vertical Pitch dimensions for SVG (Portrait 680x1050)
  const width = 680;
  const height = 1050;
  const margin = 30;

  /**
   * Convert 0-100 normalized coordinates to Vertical SVG pitch coordinates.
   * ATAQUE ARRIBA (Attack Upwards):
   * - Longitudinal x (0=own goal at bottom, 100=opponent goal at top) -> svgY = margin + ((100-x)/100)*(height-2*margin)
   * - Lateral y (0=left touchline, 100=right touchline) -> svgX = margin + (y/100)*(width-2*margin)
   */
  const toSvgX = (pctY: number) => margin + (pctY / 100) * (width - 2 * margin);
  const toSvgY = (pctX: number) => margin + ((100 - pctX) / 100) * (height - 2 * margin);

  // Convert SVG coordinates back to percentage (0-100)
  const toPctX = (svgY: number) => {
    const raw = 100 - ((svgY - margin) / (height - 2 * margin)) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  };

  const toPctY = (svgX: number) => {
    const raw = ((svgX - margin) / (width - 2 * margin)) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  };

  // Handle click on vertical pitch in Arrow/Point Mode
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pitchMode !== 'arrows') return;

    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickSvgX = ((e.clientX - svgRect.left) / svgRect.width) * width;
    const clickSvgY = ((e.clientY - svgRect.top) / svgRect.height) * height;

    const clickedPctX = toPctX(clickSvgY);
    const clickedPctY = toPctY(clickSvgX);

    if (startX === null || (startX !== null && endX !== null)) {
      // First click (or Re-click if vector already completed): Reset & set new Start Point (Origen)
      onSetCoords({ x: clickedPctX, y: clickedPctY }, null);
    } else {
      // Second click: Set End Point (Destino / Vector Arrow complete)
      onSetCoords({ x: startX, y: startY! }, { x: clickedPctX, y: clickedPctY });
    }
  };

  // 15 Tactical Pitch Subzones (Vertical Layout) with Custom Tactical Names
  const tacticalZones = [
    // Attacking Third (Top)
    { id: 'z11', code: 'Z11', name: 'Ataque Banda Izq', minX: 66, maxX: 100, minY: 0, maxY: 33 },
    { id: 'z12', code: 'Z12', name: 'Área Rival / Zona 14', minX: 66, maxX: 100, minY: 33, maxY: 66 },
    { id: 'z13', code: 'Z13', name: 'Ataque Banda Der', minX: 66, maxX: 100, minY: 66, maxY: 100 },

    // Middle Third
    { id: 'z6', code: 'Z6', name: 'Medio Banda Izq', minX: 33, maxX: 66, minY: 0, maxY: 33 },
    { id: 'z7', code: 'Z7', name: 'Medio Campo Central', minX: 33, maxX: 66, minY: 33, maxY: 66 },
    { id: 'z8', code: 'Z8', name: 'Medio Banda Der', minX: 33, maxX: 66, minY: 66, maxY: 100 },

    // Defensive Third (Bottom)
    { id: 'z1', code: 'Z1', name: 'Def. Banda Izq', minX: 0, maxX: 33, minY: 0, maxY: 33 },
    { id: 'z2', code: 'Z2', name: 'Def. Área Propia', minX: 0, maxX: 33, minY: 33, maxY: 66 },
    { id: 'z3', code: 'Z3', name: 'Def. Banda Der', minX: 0, maxX: 33, minY: 66, maxY: 100 },
  ];

  const handleSelectZoneClick = (z: typeof tacticalZones[0]) => {
    onSelectZone(z.name);
    const centerX = Math.round((z.minX + z.maxX) / 2);
    const centerY = Math.round((z.minY + z.maxY) / 2);
    onSetCoords({ x: centerX, y: centerY }, null);
  };

  const handleResetCoords = () => {
    onSetCoords(null, null);
    onSelectZone(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 max-w-lg mx-auto select-none">
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">UBICAR EN EL CAMPO</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">Formato Vertical • Ataque Hacia Arriba ⬆️</p>
          </div>
        </div>

        {onCloseModal && (
          <button
            onClick={onCloseModal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Controls Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setPitchMode('arrows')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
              pitchMode === 'arrows'
                ? 'bg-emerald-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoveUp className="w-3.5 h-3.5" />
            <span>Punto / Vector</span>
          </button>

          <button
            onClick={() => setPitchMode('zones')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
              pitchMode === 'zones'
                ? 'bg-emerald-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Zonas Tácticas</span>
          </button>
        </div>

        <button
          onClick={handleResetCoords}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition text-xs"
          title="Limpiar Selección"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vertical Green Pitch SVG */}
      <div className="relative w-full aspect-[68/105] bg-emerald-950 rounded-xl border-2 border-emerald-800/80 overflow-hidden shadow-inner cursor-crosshair group">
        {/* Grass Gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90 pointer-events-none"></div>

        {/* Attack Indicator */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1">
          <ArrowUp className="w-3 h-3 text-emerald-400 animate-bounce" />
          <span>Ataque</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block relative z-10"
          onClick={handlePitchClick}
        >
          <defs>
            <marker
              id="vector-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
          </defs>

          {/* PITCH MARKINGS */}
          <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
            <rect x={margin} y={margin} width={width - 2 * margin} height={height - 2 * margin} rx="4" />
            <line x1={margin} y1={height / 2} x2={width - margin} y2={height / 2} />
            <circle cx={width / 2} cy={height / 2} r="91.5" />
            <circle cx={width / 2} cy={height / 2} r="3.5" fill="rgba(255, 255, 255, 0.9)" />

            {/* TOP PENALTY AREA (Opponent Goal / Attack) */}
            <rect x={width / 2 - 165} y={margin} width="330" height="165" />
            <rect x={width / 2 - 73} y={margin} width="146" height="55" />
            <circle cx={width / 2} cy={margin + 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
            <path d={`M ${width / 2 - 73} ${margin + 165} A 91.5 91.5 0 0 0 ${width / 2 + 73} ${margin + 165}`} />
            <rect x={width / 2 - 36.6} y={margin - 16} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />

            {/* BOTTOM PENALTY AREA (Own Goal / Defense) */}
            <rect x={width / 2 - 165} y={height - margin - 165} width="330" height="165" />
            <rect x={width / 2 - 73} y={height - margin - 55} width="146" height="55" />
            <circle cx={width / 2} cy={height - margin - 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
            <path d={`M ${width / 2 - 73} ${height - margin - 165} A 91.5 91.5 0 0 1 ${width / 2 + 73} ${height - margin - 165}`} />
            <rect x={width / 2 - 36.6} y={height - margin} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />

            {/* Corner Arcs */}
            <path d={`M ${margin + 15} ${margin} A 15 15 0 0 1 ${margin} ${margin + 15}`} />
            <path d={`M ${width - margin - 15} ${margin} A 15 15 0 0 0 ${width - margin} ${margin + 15}`} />
            <path d={`M ${margin + 15} ${height - margin} A 15 15 0 0 0 ${margin} ${height - margin - 15}`} />
            <path d={`M ${width - margin - 15} ${height - margin} A 15 15 0 0 1 ${width - margin} ${height - margin - 15}`} />
          </g>

          {/* ZONE MATRIX OVERLAY IN 'ZONES' MODE */}
          {pitchMode === 'zones' && (
            <g>
              {tacticalZones.map((z) => {
                const isSelected = selectedZone === z.name;
                const rectX = toSvgX(z.minY);
                const rectY = toSvgY(z.maxX);
                const rectW = toSvgX(z.maxY) - rectX;
                const rectH = toSvgY(z.minX) - rectY;

                return (
                  <g
                    key={z.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectZoneClick(z);
                    }}
                    className="cursor-pointer transition-all duration-150"
                  >
                    <rect
                      x={rectX}
                      y={rectY}
                      width={rectW}
                      height={rectH}
                      fill={isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(2, 44, 34, 0.5)'}
                      stroke={isSelected ? '#34d399' : 'rgba(255, 255, 255, 0.3)'}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      strokeDasharray={isSelected ? 'none' : '3 3'}
                      className="hover:fill-emerald-500/30 hover:stroke-emerald-300 transition"
                    />
                    <text
                      x={rectX + rectW / 2}
                      y={rectY + rectH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isSelected ? '#34d399' : '#e2e8f0'}
                      fontSize="13"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {z.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* RENDER ACTIVE SELECTION MARKERS */}
          {startX !== null && startY !== null && (
            <g>
              <circle
                cx={toSvgX(startY)}
                cy={toSvgY(startX)}
                r="10"
                fill="rgba(52, 211, 153, 0.4)"
                className="animate-ping"
              />
              <circle
                cx={toSvgX(startY)}
                cy={toSvgY(startX)}
                r="6.5"
                fill="#34d399"
                stroke="#022c22"
                strokeWidth="2"
              />

              {/* Vector Arrow */}
              {endX !== null && endY !== null && (
                <g>
                  <line
                    x1={toSvgX(startY)}
                    y1={toSvgY(startX)}
                    x2={toSvgX(endY)}
                    y2={toSvgY(endX)}
                    stroke="#34d399"
                    strokeWidth="3.5"
                    markerEnd="url(#vector-arrow)"
                  />
                  <circle
                    cx={toSvgX(endY)}
                    cy={toSvgY(endX)}
                    r="6.5"
                    fill="#6ee7b7"
                    stroke="#022c22"
                    strokeWidth="2"
                  />
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Empty state hint */}
        {startX === null && !selectedZone && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-emerald-500/40 px-3 py-1.5 rounded-full text-[11px] font-semibold text-emerald-300 pointer-events-none backdrop-blur-md shadow-lg flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Haz clic para fijar origen (X, Y) y destino (vuelve a pulsar para cambiar)</span>
          </div>
        )}
      </div>

      {/* Selected Location Summary */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ubicación seleccionada:</span>
          {startX !== null ? (
            <p className="font-bold text-emerald-400 font-mono">
              📍 Origen ({startX}%, {startY}%)
              {endX !== null && ` ➔ Destino (${endX}%, ${endY}%)`}
            </p>
          ) : selectedZone ? (
            <p className="font-bold text-blue-400 font-mono">
              🔷 Zona: {selectedZone}
            </p>
          ) : (
            <p className="text-slate-500 italic">Sin coordenadas fijadas</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Omitir
            </button>
          )}

          {onConfirmLocation && (
            <button
              onClick={onConfirmLocation}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Ubicación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
