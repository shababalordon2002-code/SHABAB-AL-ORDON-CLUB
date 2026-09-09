'use client';

import React, { useState, useEffect } from 'react';
import { Target, MoveUp, Grid, RefreshCw, Compass, ArrowUp, CheckCircle2, X, Plus, Minus } from 'lucide-react';
import { PitchRequiredType } from '@/types';

export interface EventPitchMarker {
  id?: string;
  startX: number | null;
  startY: number | null;
  endX?: number | null;
  endY?: number | null;
  isSelected?: boolean;
}

interface BotoneraPitchCanvasProps {
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  onSetCoords: (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => void;
  selectedZone: string | null;
  onSelectZone: (zoneName: string | null) => void;
  onSelectMarker?: (markerId: string) => void;
  initialMode?: PitchRequiredType;
  lockMode?: boolean;
  pitchViewMode?: 'full' | 'half';
  zoneCounts?: Record<string, number>;
  pointsList?: EventPitchMarker[];
  onUpdateZoneCount?: (zoneName: string, newCount: number) => void;
  onCloseModal?: () => void;
  onConfirmLocation?: () => void;
  hideHeader?: boolean;
}

export const BotoneraPitchCanvas: React.FC<BotoneraPitchCanvasProps> = ({
  startX,
  startY,
  endX,
  endY,
  onSetCoords,
  selectedZone,
  onSelectZone,
  onSelectMarker,
  initialMode = 'vector_arrow',
  lockMode = false,
  pitchViewMode = 'full',
  zoneCounts = {},
  pointsList = [],
  onUpdateZoneCount,
  onCloseModal,
  onConfirmLocation,
  hideHeader = false,
}) => {
  const [activeMode, setActiveMode] = useState<PitchRequiredType>(initialMode);
  const [internalZoneCounts, setInternalZoneCounts] = useState<Record<string, number>>(zoneCounts);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  const zoneCountsSerialized = JSON.stringify(zoneCounts || {});
  useEffect(() => {
    setInternalZoneCounts(zoneCounts || {});
  }, [zoneCountsSerialized]);

  // Vertical Pitch dimensions for SVG (Portrait 680x1050 for full pitch, 680x600 for half pitch)
  const isHalfPitch = pitchViewMode === 'half' || activeMode === 'point_half' || activeMode === 'zone_remate';
  const width = 680;
  const height = isHalfPitch ? 620 : 1050;
  const margin = 30;

  const toSvgX = (pctY: number) => margin + (pctY / 100) * (width - 2 * margin);
  const toSvgY = (pctX: number) => {
    if (isHalfPitch) {
      // Map pctX from 50 to 100 onto half pitch height
      const clampedPctX = Math.max(50, Math.min(100, pctX));
      return margin + ((100 - clampedPctX) / 50) * (height - 2 * margin);
    }
    return margin + ((100 - pctX) / 100) * (height - 2 * margin);
  };

  const toPctX = (svgY: number) => {
    if (isHalfPitch) {
      const raw = 100 - ((svgY - margin) / (height - 2 * margin)) * 50;
      return Math.min(100, Math.max(50, Math.round(raw)));
    }
    const raw = 100 - ((svgY - margin) / (height - 2 * margin)) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  };

  const toPctY = (svgX: number) => {
    const raw = ((svgX - margin) / (width - 2 * margin)) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  };

  const isVectorMode = activeMode === 'vector' || activeMode === 'vector_arrow';
  const isPointMode = activeMode === 'point' || activeMode === 'point_full' || activeMode === 'point_half';

  // Handle click on pitch SVG
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickSvgX = ((e.clientX - svgRect.left) / svgRect.width) * width;
    const clickSvgY = ((e.clientY - svgRect.top) / svgRect.height) * height;

    const clickedPctX = toPctX(clickSvgY);
    const clickedPctY = toPctY(clickSvgX);

    // If lockMode is enabled (dashboard detail modal / read-only view), detect clicked zone & fire selection
    if (lockMode || (!isVectorMode && !isPointMode)) {
      const activeZones = getActiveZones();
      const matchedZone = activeZones.find(
        (z) => clickedPctX >= z.minX && clickedPctX <= z.maxX && clickedPctY >= z.minY && clickedPctY <= z.maxY
      );
      if (matchedZone && onSelectZone) {
        onSelectZone(matchedZone.name);
      }
      return;
    }

    if (isPointMode) {
      onSetCoords({ x: clickedPctX, y: clickedPctY }, null);
    } else if (startX === null || (startX !== null && endX !== null)) {
      onSetCoords({ x: clickedPctX, y: clickedPctY }, null);
    } else {
      onSetCoords({ x: startX, y: startY! }, { x: clickedPctX, y: clickedPctY });
    }
  };

  // --- PREDEFINED ZONE DEFINITIONS ---

  // 1. Standard 9 Tactical Zones
  const tactical9Zones = [
    { id: 'z11', name: 'Ataque Banda Izq', minX: 66, maxX: 100, minY: 0, maxY: 33, color: 'rgba(16, 185, 129, 0.4)' },
    { id: 'z12', name: 'Área Rival / Z14', minX: 66, maxX: 100, minY: 33, maxY: 66, color: 'rgba(16, 185, 129, 0.5)' },
    { id: 'z13', name: 'Ataque Banda Der', minX: 66, maxX: 100, minY: 66, maxY: 100, color: 'rgba(16, 185, 129, 0.4)' },

    { id: 'z6', name: 'Medio Banda Izq', minX: 33, maxX: 66, minY: 0, maxY: 33, color: 'rgba(59, 130, 246, 0.35)' },
    { id: 'z7', name: 'Medio Campo Central', minX: 33, maxX: 66, minY: 33, maxY: 66, color: 'rgba(59, 130, 246, 0.45)' },
    { id: 'z8', name: 'Medio Banda Der', minX: 33, maxX: 66, minY: 66, maxY: 100, color: 'rgba(59, 130, 246, 0.35)' },

    { id: 'z1', name: 'Def. Banda Izq', minX: 0, maxX: 33, minY: 0, maxY: 33, color: 'rgba(245, 158, 11, 0.35)' },
    { id: 'z2', name: 'Def. Área Propia', minX: 0, maxX: 33, minY: 33, maxY: 66, color: 'rgba(245, 158, 11, 0.45)' },
    { id: 'z3', name: 'Def. Banda Der', minX: 0, maxX: 33, minY: 66, maxY: 100, color: 'rgba(245, 158, 11, 0.35)' },
  ];

  // 2. Bandas - Centro (3 Vertical Corridors)
  const bandasCentroZones = [
    { id: 'bc_izq', name: 'Banda Izquierda', minX: 0, maxX: 100, minY: 0, maxY: 30, color: 'rgba(249, 115, 22, 0.4)' },
    { id: 'bc_cen', name: 'Centro / Pasillo Central', minX: 0, maxX: 100, minY: 30, maxY: 70, color: 'rgba(59, 130, 246, 0.4)' },
    { id: 'bc_der', name: 'Banda Derecha', minX: 0, maxX: 100, minY: 70, maxY: 100, color: 'rgba(132, 204, 22, 0.4)' },
  ];

  // 3. 3 Zonas / Hitos (Inicio - Canalización - Finalización / Alta - Media - Baja)
  const hitos3Zones = [
    { id: 'h3_fin', name: 'Finalización (Zona Alta)', minX: 66, maxX: 100, minY: 0, maxY: 100, color: 'rgba(236, 72, 153, 0.4)' },
    { id: 'h3_can', name: 'Canalización (Zona Media)', minX: 33, maxX: 66, minY: 0, maxY: 100, color: 'rgba(168, 85, 247, 0.4)' },
    { id: 'h3_ini', name: 'Inicio (Zona Baja)', minX: 0, maxX: 33, minY: 0, maxY: 100, color: 'rgba(14, 165, 233, 0.4)' },
  ];

  // 4. 4 Zonas Horizontales
  const zonas4Horiz = [
    { id: 'z4_4', name: 'Zona 4 (Ataque Profundo)', minX: 75, maxX: 100, minY: 0, maxY: 100, color: 'rgba(239, 68, 68, 0.4)' },
    { id: 'z4_3', name: 'Zona 3 (Creación Alta)', minX: 50, maxX: 75, minY: 0, maxY: 100, color: 'rgba(245, 158, 11, 0.4)' },
    { id: 'z4_2', name: 'Zona 2 (Creación Baja)', minX: 25, maxX: 50, minY: 0, maxY: 100, color: 'rgba(16, 185, 129, 0.4)' },
    { id: 'z4_1', name: 'Zona 1 (Salida / Defensa)', minX: 0, maxX: 25, minY: 0, maxY: 100, color: 'rgba(59, 130, 246, 0.4)' },
  ];

  // 5. Zonas de Remate (Exact match for user uploaded graphic!)
  const zonasRemate = [
    { id: 'zr_area_peq', name: 'Área Pequeña', minX: 92, maxX: 100, minY: 37, maxY: 63, color: 'rgba(55, 65, 81, 0.85)' },
    { id: 'zr_area_gde', name: 'Área Grande', minX: 78, maxX: 92, minY: 25, maxY: 75, color: 'rgba(236, 72, 153, 0.75)' },
    { id: 'zr_borde_area', name: 'Borde Área', minX: 62, maxX: 78, minY: 25, maxY: 75, color: 'rgba(59, 130, 246, 0.75)' },
    { id: 'zr_lat_izq', name: 'Lateral Izquierdo', minX: 62, maxX: 100, minY: 0, maxY: 25, color: 'rgba(249, 115, 22, 0.75)' },
    { id: 'zr_lat_der', name: 'Lateral Derecho', minX: 62, maxX: 100, minY: 75, maxY: 100, color: 'rgba(132, 204, 22, 0.75)' },
  ];

  const getActiveZones = () => {
    switch (activeMode) {
      case 'zone_bandas_centro':
        return bandasCentroZones;
      case 'zone_3_hitos':
        return hitos3Zones;
      case 'zone_4_zonas':
        return zonas4Horiz;
      case 'zone_remate':
        return zonasRemate;
      case 'zone_counter':
      case 'zone':
      default:
        return tactical9Zones;
    }
  };

  const handleZoneSelect = (name: string, minX: number, maxX: number, minY: number, maxY: number) => {
    onSelectZone(name);
    const centerX = Math.round((minX + maxX) / 2);
    const centerY = Math.round((minY + maxY) / 2);
    onSetCoords({ x: centerX, y: centerY }, null);
  };

  const handleIncrementZoneCount = (zoneName: string) => {
    const current = internalZoneCounts[zoneName] || 0;
    const updated = { ...internalZoneCounts, [zoneName]: current + 1 };
    setInternalZoneCounts(updated);
    if (onUpdateZoneCount) onUpdateZoneCount(zoneName, current + 1);
  };

  const handleDecrementZoneCount = (zoneName: string) => {
    const current = internalZoneCounts[zoneName] || 0;
    if (current <= 0) return;
    const updated = { ...internalZoneCounts, [zoneName]: current - 1 };
    setInternalZoneCounts(updated);
    if (onUpdateZoneCount) onUpdateZoneCount(zoneName, current - 1);
  };

  const handleResetCoords = () => {
    onSetCoords(null, null);
    onSelectZone(null);
  };

  const isZoneMode = activeMode.startsWith('zone');

  return (
    <div className={`select-none w-full ${hideHeader ? 'bg-transparent border-0 p-0 space-y-0' : 'bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 max-w-lg mx-auto'}`}>
      {!hideHeader && (
        <>
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
                  {activeMode === 'zone_remate'
                    ? '🎯 Zonas de Remate'
                    : activeMode === 'zone_bandas_centro'
                    ? '↔️ Bandas - Centro'
                    : activeMode === 'zone_3_hitos'
                    ? '📶 3 Zonas (Inicio-Canalización-Finalización)'
                    : activeMode === 'zone_4_zonas'
                    ? '📊 4 Zonas Horizontales'
                    : activeMode === 'zone_counter'
                    ? '🔢 Conteo de Cantidad por Zona'
                    : isVectorMode
                    ? '🏹 Vector (Origen ➔ Destino)'
                    : '📍 Punto en Campograma'}
                </h3>
                <p className="text-[10px] text-emerald-400 font-semibold">
                  {isHalfPitch ? 'Medio Campo / Área Rival • Vista Zoom' : 'Campo Entero • Ataque Hacia Arriba ⬆️'}
                </p>
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

          {/* Mode Switcher Buttons */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            {lockMode ? (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-black text-emerald-300 shadow-sm shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  {isVectorMode
                    ? '🏹 MODALIDAD: VECTOR / FLECHA (ORIGEN ➔ DESTINO) • MODO FIJO'
                    : isPointMode
                    ? '📍 MODALIDAD: PUNTO (X, Y) • MODO FIJO'
                    : `🔷 MODALIDAD: ${activeMode.toUpperCase()} • MODO FIJO`}
                </span>
              </div>
            ) : (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMode('vector_arrow')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    isVectorMode ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flecha
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('point_full')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    isPointMode ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Punto
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('zone_bandas_centro')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeMode === 'zone_bandas_centro' ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bandas-Centro
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('zone_3_hitos')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeMode === 'zone_3_hitos' ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3 Zonas
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('zone_remate')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeMode === 'zone_remate' ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Remate
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('zone_counter')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    activeMode === 'zone_counter' ? 'bg-emerald-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Conteo
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetCoords}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition text-xs shrink-0"
              title="Limpiar Selección"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Pitch SVG Container with Lateral Attack Strip */}
      <div className="relative w-full flex flex-row items-stretch bg-emerald-950 rounded-xl border-2 border-emerald-800/80 overflow-hidden shadow-inner select-none">
        {/* Field Coordinate Canvas Area */}
        <div className={`relative flex-1 ${isHalfPitch ? 'aspect-[68/62]' : 'aspect-[68/105]'} cursor-pointer group`}>
          {/* Grass Stripes */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90 pointer-events-none" />

          <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block relative z-10 cursor-pointer"
          onClick={handlePitchClick}
        >
          <defs>
            <filter id="vector-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComponentTransfer in="blur" result="glow1">
                <feFuncA type="linear" slope="2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
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
            <marker
              id="vector-arrow-selected"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="12"
              markerHeight="12"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff0055" stroke="#ffffff" strokeWidth="1.5" />
            </marker>
          </defs>

          {/* PITCH MARKINGS */}
          <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
            <rect x={margin} y={margin} width={width - 2 * margin} height={height - 2 * margin} rx="4" />

            {!isHalfPitch && (
              <>
                <line x1={margin} y1={height / 2} x2={width - margin} y2={height / 2} />
                <circle cx={width / 2} cy={height / 2} r="91.5" />
                <circle cx={width / 2} cy={height / 2} r="3.5" fill="rgba(255, 255, 255, 0.9)" />
              </>
            )}

            {/* TOP PENALTY AREA (Opponent Goal) */}
            <rect x={width / 2 - 165} y={margin} width="330" height="165" />
            <rect x={width / 2 - 73} y={margin} width="146" height="55" />
            <circle cx={width / 2} cy={margin + 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
            <path d={`M ${width / 2 - 73} ${margin + 165} A 91.5 91.5 0 0 0 ${width / 2 + 73} ${margin + 165}`} />
            <rect x={width / 2 - 36.6} y={margin - 16} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />

            {!isHalfPitch && (
              <>
                {/* BOTTOM PENALTY AREA (Own Goal) */}
                <rect x={width / 2 - 165} y={height - margin - 165} width="330" height="165" />
                <rect x={width / 2 - 73} y={height - margin - 55} width="146" height="55" />
                <circle cx={width / 2} cy={height - margin - 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
                <path d={`M ${width / 2 - 73} ${height - margin - 165} A 91.5 91.5 0 0 1 ${width / 2 + 73} ${height - margin - 165}`} />
                <rect x={width / 2 - 36.6} y={height - margin} width="73.2" height="16" stroke="rgba(255, 255, 255, 0.9)" fill="rgba(6, 78, 59, 0.6)" />
              </>
            )}

            {/* Corner Arcs */}
            <path d={`M ${margin + 15} ${margin} A 15 15 0 0 1 ${margin} ${margin + 15}`} />
            <path d={`M ${width - margin - 15} ${margin} A 15 15 0 0 0 ${width - margin} ${margin + 15}`} />
          </g>

          {/* ACTIVE ZONE OVERLAYS */}
          {isZoneMode && (() => {
            const activeZones = getActiveZones();
            const totalZoneEvents = Object.values(internalZoneCounts).reduce((a, b) => a + b, 0);

            return (
              <g>
                {activeZones.map((z) => {
                  const isSelected = selectedZone === z.name;
                  const rectX = toSvgX(z.minY);
                  const rectY = toSvgY(z.maxX);
                  const rectW = toSvgX(z.maxY) - rectX;
                  const rectH = toSvgY(z.minX) - rectY;

                  const count = internalZoneCounts[z.name] || 0;
                  const pct = totalZoneEvents > 0 ? Math.round((count / totalZoneEvents) * 100) : 0;
                  const showBadge = activeMode === 'zone_counter' || isZoneMode || totalZoneEvents > 0;

                  // Unified Heatmap Color & Intensity Scaling ("todas las zonas del mismo color, cambiando intensidad por %")
                  // Base Hue: Emerald Green (16, 185, 129)
                  const r = 16;
                  const g = 185;
                  const b = 129;

                  let zoneFill = 'rgba(15, 23, 42, 0.25)';
                  let zoneStroke = 'rgba(255, 255, 255, 0.2)';
                  let zoneStrokeWidth = '1';
                  let zoneFilter = 'none';

                  if (isSelected) {
                    zoneFill = 'rgba(245, 158, 11, 0.75)';
                    zoneStroke = '#fbbf24';
                    zoneStrokeWidth = '4';
                    zoneFilter = 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))';
                  } else if (totalZoneEvents > 0 && count > 0) {
                    // Scale opacity dynamically from 0.25 up to 0.88 based on percentage
                    const alpha = Math.min(0.88, Math.max(0.25, 0.2 + (pct / 100) * 0.68));
                    zoneFill = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
                    zoneStroke = pct >= 35 ? '#34d399' : `rgba(255, 255, 255, 0.6)`;
                    zoneStrokeWidth = pct >= 35 ? '3.5' : pct >= 15 ? '2.5' : '1.5';
                    zoneFilter = pct >= 30 ? `drop-shadow(0 0 8px rgba(52, 211, 153, 0.7))` : 'none';
                  }

                  return (
                    <g
                      key={z.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeMode === 'zone_counter') {
                          handleIncrementZoneCount(z.name);
                        } else {
                          handleZoneSelect(z.name, z.minX, z.maxX, z.minY, z.maxY);
                        }
                      }}
                      className="cursor-pointer transition-all duration-200 group/zone"
                    >
                      <rect
                        x={rectX}
                        y={rectY}
                        width={rectW}
                        height={rectH}
                        fill={zoneFill}
                        stroke={zoneStroke}
                        strokeWidth={zoneStrokeWidth}
                        style={{ filter: zoneFilter }}
                        className="cursor-pointer transition-all duration-200 hover:fill-amber-500/50 hover:stroke-amber-300 hover:stroke-[3.5px]"
                      />
                      <text
                        x={rectX + rectW / 2}
                        y={rectY + rectH / 2 - (showBadge ? 8 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={activeMode === 'zone_remate' ? '11' : '12'}
                        fontWeight="800"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                        className="pointer-events-none select-none"
                      >
                        {z.name}
                      </text>

                      {/* Zone counter badge with count & percentage */}
                      {showBadge && (
                        <g transform={`translate(${rectX + rectW / 2}, ${rectY + rectH / 2 + 10})`}>
                          <rect
                            x="-28"
                            y="-10"
                            width="56"
                            height="20"
                            rx="10"
                            fill="#090d16"
                            stroke={count > 0 ? (isSelected ? '#fbbf24' : `rgba(${r}, ${g}, ${b}, 1)`) : 'rgba(255, 255, 255, 0.3)'}
                            strokeWidth="1.5"
                          />
                          <text
                            x="0"
                            y="1"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={count > 0 ? (isSelected ? '#fbbf24' : '#34d399') : '#94a3b8'}
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {count} ({pct}%)
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* MULTIPLE EVENT MARKERS OVERLAY (Hidden in Zone Mode so only colored zones are shown) */}
          {pointsList && pointsList.length > 0 && !isZoneMode && (
            <g>
              {pointsList.map((pt, idx) => {
                if (pt.startX === null || pt.startY === null) return null;
                const isSelected = pt.isSelected;

                return (
                  <g
                    key={pt.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMarker && pt.id) {
                        onSelectMarker(pt.id);
                      }
                    }}
                    className="cursor-pointer group/marker"
                  >
                    {/* Glowing outer halo if selected */}
                    {isSelected && (
                      <circle
                        cx={toSvgX(pt.startY)}
                        cy={toSvgY(pt.startX)}
                        r="18"
                        fill="rgba(255, 0, 85, 0.4)"
                        stroke="#ff0055"
                        strokeWidth="2.5"
                        className="animate-pulse"
                        filter="url(#vector-glow)"
                      />
                    )}

                    {/* Origin Circle */}
                    <circle
                      cx={toSvgX(pt.startY)}
                      cy={toSvgY(pt.startX)}
                      r={isSelected ? "10" : "6.5"}
                      fill={isSelected ? "#ff0055" : "rgba(52, 211, 153, 0.85)"}
                      stroke={isSelected ? "#ffffff" : "#022c22"}
                      strokeWidth={isSelected ? "3" : "1.5"}
                      filter={isSelected ? "url(#vector-glow)" : undefined}
                      className="transition-all duration-150 group-hover/marker:fill-rose-400 group-hover/marker:stroke-white group-hover/marker:r-9"
                    />

                    {/* Vector Arrow Line */}
                    {isVectorMode && pt.endX != null && pt.endY != null && (
                      <g filter={isSelected ? "url(#vector-glow)" : undefined}>
                        {/* High contrast white outline line underneath selected vector */}
                        {isSelected && (
                          <line
                            x1={toSvgX(pt.startY)}
                            y1={toSvgY(pt.startX)}
                            x2={toSvgX(pt.endY)}
                            y2={toSvgY(pt.endX)}
                            stroke="#ffffff"
                            strokeWidth="9"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Foreground vector line */}
                        <line
                          x1={toSvgX(pt.startY)}
                          y1={toSvgY(pt.startX)}
                          x2={toSvgX(pt.endY)}
                          y2={toSvgY(pt.endX)}
                          stroke={isSelected ? "#ff0055" : "#34d399"}
                          strokeWidth={isSelected ? "6" : "2.5"}
                          strokeOpacity={isSelected ? "1" : "0.85"}
                          markerEnd={isSelected ? "url(#vector-arrow-selected)" : "url(#vector-arrow)"}
                          className="transition-all duration-150 group-hover/marker:stroke-rose-400 group-hover/marker:stroke-[6px]"
                        />

                        {/* Destination Pulsing Halo */}
                        {isSelected && (
                          <circle
                            cx={toSvgX(pt.endY)}
                            cy={toSvgY(pt.endX)}
                            r="16"
                            fill="rgba(255, 0, 85, 0.4)"
                            stroke="#ff0055"
                            strokeWidth="2.5"
                            className="animate-pulse"
                          />
                        )}

                        {/* Destination Target Circle */}
                        <circle
                          cx={toSvgX(pt.endY)}
                          cy={toSvgY(pt.endX)}
                          r={isSelected ? "9" : "5.5"}
                          fill={isSelected ? "#ff0055" : "#6ee7b7"}
                          stroke={isSelected ? "#ffffff" : "#022c22"}
                          strokeWidth={isSelected ? "3" : "1.5"}
                          className="transition-all duration-150 group-hover/marker:fill-rose-300 group-hover/marker:stroke-white group-hover/marker:r-8"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ACTIVE POINT / VECTOR MARKERS (Only when creating/editing, NOT in lockMode) */}
          {!lockMode && startX !== null && startY !== null && (
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
              {isVectorMode && endX !== null && endY !== null && (
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-emerald-500/40 px-3 py-1.5 rounded-full text-[11px] font-semibold text-emerald-300 pointer-events-none backdrop-blur-md shadow-lg flex items-center gap-1.5 text-center">
            <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {isVectorMode
                ? 'Haz clic para Origen y Destino (Flecha)'
                : isZoneMode
                ? 'Haz clic en una zona para seleccionarla'
                : 'Haz clic en el campo para fijar el punto (X, Y)'}
            </span>
          </div>
        )}
      </div>

      {/* Lateral Attack Strip - Does NOT take up pitch coordinate space */}
      <div className="w-6 sm:w-7 bg-slate-950/90 border-l border-emerald-800/60 flex flex-col items-center justify-center py-4 gap-2 text-emerald-300 select-none pointer-events-none shrink-0 z-20">
        <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-300 [writing-mode:vertical-rl] rotate-180">
          ATAQUE
        </span>
      </div>
    </div>

      {/* Selected Location Summary */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ubicación Registrada:</span>
          {startX !== null ? (
            <p className="font-bold text-emerald-400 font-mono">
              📍 Origen ({startX}%, {startY}%)
              {endX !== null && ` ➔ Destino (${endX}%, ${endY}%)`}
            </p>
          ) : selectedZone ? (
            <p className="font-bold text-blue-400 font-mono flex items-center gap-1">
              🔷 Zona: {selectedZone}
              {activeMode === 'zone_counter' && (
                <span className="ml-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Cantidad: {internalZoneCounts[selectedZone] || 1}
                </span>
              )}
            </p>
          ) : (
            <p className="text-slate-500 italic">Sin ubicación seleccionada</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Omitir
            </button>
          )}

          {onConfirmLocation && (
            <button
              type="button"
              onClick={onConfirmLocation}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
