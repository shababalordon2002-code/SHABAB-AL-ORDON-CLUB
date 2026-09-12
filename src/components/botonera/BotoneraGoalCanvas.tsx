'use client';

import React, { useState, useEffect } from 'react';
import { Target, RefreshCw, CheckCircle2, X } from 'lucide-react';

export interface GoalCoords {
  x: number; // 0 to 100% inside/around the goal mouth
  y: number; // 0 to 100% (0: top crossbar, 100: ground line)
}

interface BotoneraGoalCanvasProps {
  goalX: number | null;
  goalY: number | null;
  goalZone?: string | null;
  onSetGoalCoords: (coords: GoalCoords | null, zone: string | null) => void;
  readOnly?: boolean;
  hideHeader?: boolean;
  hideQuickButtons?: boolean;
  className?: string;
}

export const GOAL_ZONES = [
  { id: 'top_left', name: 'Escuadra Izq', x: 15, y: 15, tag: '🎯 Escuadra Izq' },
  { id: 'top_center', name: 'Alto Centro', x: 50, y: 15, tag: '⬆️ Alto Centro' },
  { id: 'top_right', name: 'Escuadra Der', x: 85, y: 15, tag: '🎯 Escuadra Der' },
  { id: 'mid_left', name: 'Media Izq', x: 15, y: 50, tag: '⬅️ Media Izq' },
  { id: 'center', name: 'Centro', x: 50, y: 50, tag: '⏺️ Centro' },
  { id: 'mid_right', name: 'Media Der', x: 85, y: 50, tag: '➡️ Media Der' },
  { id: 'low_left', name: 'Raso Izq', x: 15, y: 85, tag: '↙️ Raso Izq' },
  { id: 'low_center', name: 'Raso Centro', x: 50, y: 85, tag: '⬇️ Raso Centro' },
  { id: 'low_right', name: 'Raso Der', x: 85, y: 85, tag: '↘️ Raso Der' },
  { id: 'post_left', name: 'Poste Izquierdo', x: 3, y: 50, tag: '🧱 Poste Izq' },
  { id: 'crossbar', name: 'Larguero', x: 50, y: 2, tag: '🧱 Larguero' },
  { id: 'post_right', name: 'Poste Derecho', x: 97, y: 50, tag: '🧱 Poste Der' },
  { id: 'miss_wide_left', name: 'Fuera Izquierda', x: -12, y: 50, tag: '⚠️ Fuera Izq' },
  { id: 'miss_high', name: 'Fuera Alto', x: 50, y: -15, tag: '⚠️ Fuera Alto' },
  { id: 'miss_wide_right', name: 'Fuera Derecha', x: 112, y: 50, tag: '⚠️ Fuera Der' },
];

export function detectGoalZone(x: number, y: number): string {
  // Out of bounds detection
  if (y < 0) return 'Fuera Alto';
  if (x < 0) return 'Fuera Izquierda';
  if (x > 100) return 'Fuera Derecha';

  // Posts & Crossbar hits
  if (y <= 4 && x >= 4 && x <= 96) return 'Larguero';
  if (x <= 4 && y >= 0 && y <= 100) return 'Poste Izquierdo';
  if (x >= 96 && y >= 0 && y <= 100) return 'Poste Derecho';

  // Top tier
  if (y <= 33) {
    if (x <= 33) return 'Escuadra Izquierda';
    if (x >= 67) return 'Escuadra Derecha';
    return 'Alto Centro';
  }

  // Mid tier
  if (y <= 67) {
    if (x <= 33) return 'Media Izquierda';
    if (x >= 67) return 'Media Derecha';
    return 'Centro';
  }

  // Low / Bottom tier (raso)
  if (x <= 33) return 'Raso Izquierda';
  if (x >= 67) return 'Raso Derecha';
  return 'Raso Centro';
}

export const BotoneraGoalCanvas: React.FC<BotoneraGoalCanvasProps> = ({
  goalX,
  goalY,
  goalZone,
  onSetGoalCoords,
  readOnly = false,
  hideHeader = false,
  hideQuickButtons = false,
  className = '',
}) => {
  const [internalX, setInternalX] = useState<number | null>(goalX);
  const [internalY, setInternalY] = useState<number | null>(goalY);
  const [activeZone, setActiveZone] = useState<string | null>(goalZone || null);

  useEffect(() => {
    setInternalX(goalX);
    setInternalY(goalY);
    if (goalZone) {
      setActiveZone(goalZone);
    } else if (goalX !== null && goalY !== null) {
      setActiveZone(detectGoalZone(goalX, goalY));
    } else {
      setActiveZone(null);
    }
  }, [goalX, goalY, goalZone]);

  // Coordinate system for SVG:
  // ViewBox: 0 0 600 360
  // Goal Mouth: X=90 to X=510 (width 420), Y=60 to Y=300 (height 240) -> Ratio 7.32m / 2.44m = 3:1 (420:140 on scale, adjusted for clear visual depth)
  const goalLeft = 90;
  const goalTop = 60;
  const goalWidth = 420;
  const goalHeight = 240;

  const toSvgX = (xPct: number) => goalLeft + (xPct / 100) * goalWidth;
  const toSvgY = (yPct: number) => goalTop + (yPct / 100) * goalHeight;

  const toPctX = (svgX: number) => {
    const raw = ((svgX - goalLeft) / goalWidth) * 100;
    return Math.round(raw);
  };

  const toPctY = (svgY: number) => {
    const raw = ((svgY - goalTop) / goalHeight) * 100;
    return Math.round(raw);
  };

  const handleGoalClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickSvgX = ((e.clientX - svgRect.left) / svgRect.width) * 600;
    const clickSvgY = ((e.clientY - svgRect.top) / svgRect.height) * 360;

    let x = toPctX(clickSvgX);
    let y = toPctY(clickSvgY);

    // Limit boundaries to reasonable range (-20 to 120 for wide/high shots)
    x = Math.max(-20, Math.min(120, x));
    y = Math.max(-20, Math.min(105, y));

    const zone = detectGoalZone(x, y);
    setInternalX(x);
    setInternalY(y);
    setActiveZone(zone);
    onSetGoalCoords({ x, y }, zone);
  };


  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInternalX(null);
    setInternalY(null);
    setActiveZone(null);
    onSetGoalCoords(null, null);
  };

  const hasSelection = internalX !== null && internalY !== null;

  return (
    <div className={`flex flex-col bg-slate-950/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header with Title and Current Goal Zone */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🥅</span>
            <div className="flex flex-col">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Campograma de Portería</span>
                {hasSelection && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    <span>({internalX}%, {internalY}%)</span>
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400">
                {activeZone ? (
                  <strong className="text-emerald-400">{activeZone}</strong>
                ) : (
                  'Haz clic en la portería para registrar la ubicación del disparo'
                )}
              </span>
            </div>
          </div>

          {hasSelection && !readOnly && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Borrar registro de portería"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
        </div>
      )}

      {/* SVG Canvas */}
      <div className="relative p-2 flex items-center justify-center select-none bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        <svg
          viewBox="0 0 600 360"
          className={`w-full max-w-[560px] h-auto rounded-xl shadow-inner ${readOnly ? '' : 'cursor-crosshair'}`}
          onClick={handleGoalClick}
        >
          <defs>
            {/* Net mesh pattern */}
            <pattern id="goal-net-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 0 14 L 14 0 M 0 0 L 14 14" fill="none" stroke="#64748b" strokeWidth="0.75" strokeOpacity="0.3" />
            </pattern>

            {/* Depth net shading */}
            <linearGradient id="net-depth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0d2419" stopOpacity="0.8" />
            </linearGradient>

            {/* Pitch Grass Gradient */}
            <linearGradient id="goal-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="15%" stopColor="#047857" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            {/* Post 3D White Gradient */}
            <linearGradient id="post-white" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="35%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Crossbar 3D Gradient */}
            <linearGradient id="crossbar-white" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="35%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Ball Glow Filter */}
            <filter id="ball-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stadium / Background atmosphere */}
          <rect x="0" y="0" width="600" height="360" fill="#090d16" />

          {/* Out-of-bounds target zones (Top, Left, Right) */}
          <g opacity="0.4">
            {/* Top outside */}
            <rect x="50" y="8" width="500" height="46" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x="300" y="34" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">
              FUERA ALTO (POR ARRIBA)
            </text>

            {/* Left outside */}
            <rect x="12" y="60" width="70" height="240" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x="47" y="185" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(-90, 47, 185)">
              FUERA IZQUIERDA
            </text>

            {/* Right outside */}
            <rect x="518" y="60" width="70" height="240" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x="553" y="185" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" transform="rotate(90, 553, 185)">
              FUERA DERECHA
            </text>
          </g>

          {/* Pitch Green Grass at Ground Line */}
          <rect x="50" y="300" width="500" height="52" rx="4" fill="url(#goal-grass)" />
          {/* Pitch Goal Line */}
          <line x1="60" y1="300" x2="540" y2="300" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.9" />

          {/* Net Backing Depth (Hexagonal mesh with shading) */}
          <polygon
            points="90,60 510,60 545,85 545,300 55,300 55,85"
            fill="url(#net-depth)"
          />
          <polygon
            points="90,60 510,60 510,300 90,300"
            fill="url(#goal-net-pattern)"
          />

          {/* Tactical 9-Zone Grid Overlay Lines (Subtle) */}
          <g stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="2 2" strokeOpacity="0.3">
            {/* Vertical zone lines: 1/3 and 2/3 of width */}
            <line x1={goalLeft + goalWidth / 3} y1={goalTop} x2={goalLeft + goalWidth / 3} y2={goalTop + goalHeight} />
            <line x1={goalLeft + (goalWidth * 2) / 3} y1={goalTop} x2={goalLeft + (goalWidth * 2) / 3} y2={goalTop + goalHeight} />

            {/* Horizontal zone lines: 1/3 and 2/3 of height */}
            <line x1={goalLeft} y1={goalTop + goalHeight / 3} x2={goalLeft + goalWidth} y2={goalTop + goalHeight / 3} />
            <line x1={goalLeft} y1={goalTop + (goalHeight * 2) / 3} x2={goalLeft + goalWidth} y2={goalTop + (goalHeight * 2) / 3} />
          </g>

          {/* Zone watermark labels inside the goal mouth */}
          <g fill="#94a3b8" fontSize="8.5" fontWeight="bold" opacity="0.35" textAnchor="middle">
            {/* Top row */}
            <text x={goalLeft + goalWidth * 0.16} y={goalTop + 24}>ESCUADRA IZQ</text>
            <text x={goalLeft + goalWidth * 0.5} y={goalTop + 24}>ALTO CENTRO</text>
            <text x={goalLeft + goalWidth * 0.84} y={goalTop + 24}>ESCUADRA DER</text>

            {/* Middle row */}
            <text x={goalLeft + goalWidth * 0.16} y={goalTop + goalHeight * 0.52}>MEDIA IZQ</text>
            <text x={goalLeft + goalWidth * 0.5} y={goalTop + goalHeight * 0.52}>CENTRO</text>
            <text x={goalLeft + goalWidth * 0.84} y={goalTop + goalHeight * 0.52}>MEDIA DER</text>

            {/* Bottom row */}
            <text x={goalLeft + goalWidth * 0.16} y={goalTop + goalHeight * 0.85}>RASO IZQ</text>
            <text x={goalLeft + goalWidth * 0.5} y={goalTop + goalHeight * 0.85}>RASO CENTRO</text>
            <text x={goalLeft + goalWidth * 0.84} y={goalTop + goalHeight * 0.85}>RASO DER</text>
          </g>

          {/* Goal Frame - 3D Posts & Crossbar */}
          {/* Left Post */}
          <rect x="80" y="50" width="12" height="252" rx="2" fill="url(#post-white)" stroke="#475569" strokeWidth="0.8" />
          {/* Right Post */}
          <rect x="508" y="50" width="12" height="252" rx="2" fill="url(#post-white)" stroke="#475569" strokeWidth="0.8" />
          {/* Crossbar */}
          <rect x="79" y="50" width="442" height="12" rx="2" fill="url(#crossbar-white)" stroke="#475569" strokeWidth="0.8" />

          {/* Post Corners Reinforcement */}
          <circle cx="86" cy="56" r="6" fill="#e2e8f0" />
          <circle cx="514" cy="56" r="6" fill="#e2e8f0" />

          {/* Selected Coordinate Shot Marker (Glowing Ball) */}
          {hasSelection && (
            <g
              transform={`translate(${toSvgX(internalX!)}, ${toSvgY(internalY!)})`}
              filter="url(#ball-glow)"
              className="transition-all duration-150"
            >
              {/* Outer pulsing ring */}
              <circle cx="0" cy="0" r="16" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeOpacity="0.8" strokeDasharray="3 2" />
              <circle cx="0" cy="0" r="22" fill="#f59e0b" fillOpacity="0.15" />

              {/* Crosshair lines */}
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#f59e0b" strokeWidth="1.5" />

              {/* Soccer Ball Center Disc */}
              <circle cx="0" cy="0" r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              {/* Soccer Ball Pentagon core */}
              <polygon points="0,-4 3.8,-1.2 2.4,3.2 -2.4,3.2 -3.8,-1.2" fill="#0f172a" />

              {/* Coordinate label floating badge */}
              <g transform="translate(0, -26)">
                <rect x="-42" y="-12" width="84" height="16" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text x="0" y="-1" fill="#fbbf24" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  {internalX}%, {internalY}%
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
