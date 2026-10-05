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
  outcome?: string | null;
  player_number?: string | number | null;
  player_name?: string | null;
  color?: string | null;
  isSelected?: boolean;
  curveType?: 'convex' | 'concave' | 'straight' | null;
  cornerSide?: 'left' | 'right' | null;
  period?: number | null;
}

export type PitchOutcomeShape = 'goal' | 'saved' | 'missed' | 'blocked' | 'other';

export function getPitchOutcomeStyle(outcome?: string | null) {
  const o = (outcome || '').toLowerCase().trim();
  if (o.includes('gol') || o.includes('goal') || o.includes('tanto')) {
    return {
      type: 'goal' as PitchOutcomeShape,
      label: 'Gol',
      color: '#10b981',       // Emerald
      stroke: '#ffffff',
      ringColor: '#fbbf24',   // Gold ring
      haloColor: 'rgba(16, 185, 129, 0.45)',
      arrowMarker: 'url(#vector-arrow-emerald)',
      textColor: '#ffffff',
    };
  }
  if (
    o.includes('parada') ||
    o.includes('atajad') ||
    o.includes('puerta') ||
    o.includes('porter') ||
    o.includes('poste') ||
    o.includes('larguero') ||
    o.includes('palo')
  ) {
    return {
      type: 'saved' as PitchOutcomeShape,
      label: 'A Puerta / Parada',
      color: '#0284c7',       // Sky/Ocean Blue
      stroke: '#ffffff',
      ringColor: '#38bdf8',
      haloColor: 'rgba(2, 132, 199, 0.45)',
      arrowMarker: 'url(#vector-arrow-sky)',
      textColor: '#ffffff',
    };
  }
  if (
    o.includes('fuera') ||
    o.includes('desviad') ||
    o.includes('fall') ||
    o.includes('alto') ||
    o.includes('ancho') ||
    o.includes('miss')
  ) {
    return {
      type: 'missed' as PitchOutcomeShape,
      label: 'Fuera / Desviado',
      color: '#ef4444',       // Red / Coral
      stroke: '#ffffff',
      ringColor: '#f87171',
      haloColor: 'rgba(239, 68, 68, 0.45)',
      arrowMarker: 'url(#vector-arrow-rose)',
      textColor: '#ffffff',
    };
  }
  if (
    o.includes('bloque') ||
    o.includes('tapon') ||
    o.includes('rechaz') ||
    o.includes('defens') ||
    o.includes('cortad')
  ) {
    return {
      type: 'blocked' as PitchOutcomeShape,
      label: 'Bloqueado',
      color: '#f59e0b',       // Amber / Gold
      stroke: '#ffffff',
      ringColor: '#fbbf24',
      haloColor: 'rgba(245, 158, 11, 0.45)',
      arrowMarker: 'url(#vector-arrow-amber)',
      textColor: '#ffffff',
    };
  }
  return {
    type: 'other' as PitchOutcomeShape,
    label: outcome || 'Acción',
    color: '#f59e0b',
    stroke: '#ffffff',
    ringColor: '#fbbf24',
    haloColor: 'rgba(245, 158, 11, 0.35)',
    arrowMarker: 'url(#vector-arrow-amber)',
    textColor: '#ffffff',
  };
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
  hideFooter?: boolean;
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
  hideFooter = false,
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
  const isHeatmap = activeMode === 'heatmap';

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
                  {activeMode === 'heatmap'
                    ? '🔥 Mapa de Calor'
                    : activeMode === 'zone_remate'
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
                  {activeMode === 'heatmap'
                    ? '🔥 MODALIDAD: MAPA DE CALOR (DENSIDAD TÉRMICA) • MODO FIJO'
                    : isVectorMode
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
        {/* Sized via a padding-top spacer instead of the CSS `aspect-ratio` property:
            html2canvas doesn't reliably support `aspect-ratio`, which was letting this
            box fall back to its flex-basis content size during PDF export and clip or
            overlap the neighboring grid column. The spacer establishes a real pixel
            height in-flow (universally supported), and the grass/svg layers are
            absolutely positioned against it so they never depend on percentage-height
            resolution (which is what made the markers vanish in an earlier attempt). */}
        <div className="relative flex-1 min-w-0 cursor-pointer group">
          <div style={{ paddingTop: `${((isHalfPitch ? 620 : 1050) / 680) * 100}%` }} />
          {/* Grass Stripes */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90 pointer-events-none" />

          <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 w-full h-full block z-10 cursor-pointer"
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
            {/* Colored Outcome Arrow Markers */}
            <marker
              id="vector-arrow-emerald"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            </marker>
            <marker
              id="vector-arrow-sky"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
            </marker>
            <marker
              id="vector-arrow-rose"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </marker>
            <marker
              id="vector-arrow-amber"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" stroke="#000000" strokeWidth="1" />
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

            {/* Heatmap Multi-layer Continuous Gradients & Blur Filters */}
            <radialGradient id="heat-blob-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
              <stop offset="35%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="90%" stopColor="#082f49" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-blob-mid" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.75" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-blob-hot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="25%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#ef4444" stopOpacity="0.65" />
              <stop offset="85%" stopColor="#f97316" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="0" />
            </radialGradient>

            {/* Left Corner Heatmap Gradients (Cyan / Blue palette) */}
            <radialGradient id="heat-blob-left-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="65%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="85%" stopColor="#0369a1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-blob-left-hot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.65" />
              <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
            </radialGradient>

            {/* Right Corner Heatmap Gradients (Orange / Amber / Red palette) */}
            <radialGradient id="heat-blob-right-base" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="85%" stopColor="#ea580c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-blob-right-hot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.65" />
              <stop offset="85%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="heat-blob-selected" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="30%" stopColor="#ff0055" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ff0055" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff0055" stopOpacity="0" />
            </radialGradient>

            <filter id="heat-blur-wide" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="22" />
            </filter>
            <filter id="heat-blur-mid" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
            </filter>
            <filter id="heat-blur-core" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
            <filter id="heat-blur-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
            </filter>
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

            {isHalfPitch && (
              <>
                <path d={`M ${width / 2 - 91.5} ${height - margin} A 91.5 91.5 0 0 1 ${width / 2 + 91.5} ${height - margin}`} />
                <circle cx={width / 2} cy={height - margin} r="3.5" fill="rgba(255, 255, 255, 0.9)" />
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

          {/* HEATMAP LAYER (Multi-layer continuous thermal density visualization) */}
          {isHeatmap && pointsList && pointsList.length > 0 && (
            <g className="heatmap-layer">
              {/* Layer 1: Diffuse wide ambient aura */}
              <g filter="url(#heat-blur-wide)">
                {pointsList.map((pt, idx) => {
                  if (pt.startX === null || pt.startY === null) return null;
                  const baseFill = pt.isSelected
                    ? 'url(#heat-blob-selected)'
                    : pt.cornerSide === 'left'
                    ? 'url(#heat-blob-left-base)'
                    : pt.cornerSide === 'right'
                    ? 'url(#heat-blob-right-base)'
                    : 'url(#heat-blob-base)';

                  return (
                    <circle
                      key={`heat-base-${pt.id || idx}`}
                      cx={toSvgX(pt.startY)}
                      cy={toSvgY(pt.startX)}
                      r={pt.isSelected ? '110' : '92'}
                      fill={baseFill}
                      opacity={pt.isSelected ? 1 : 0.8}
                    />
                  );
                })}
              </g>

              {/* Layer 2: Mid-density thermal body */}
              <g filter="url(#heat-blur-mid)">
                {pointsList.map((pt, idx) => {
                  if (pt.startX === null || pt.startY === null) return null;
                  const midFill = pt.isSelected
                    ? 'url(#heat-blob-selected)'
                    : pt.cornerSide === 'left'
                    ? 'url(#heat-blob-left-hot)'
                    : pt.cornerSide === 'right'
                    ? 'url(#heat-blob-right-hot)'
                    : 'url(#heat-blob-mid)';

                  return (
                    <circle
                      key={`heat-mid-${pt.id || idx}`}
                      cx={toSvgX(pt.startY)}
                      cy={toSvgY(pt.startX)}
                      r={pt.isSelected ? '72' : '56'}
                      fill={midFill}
                      opacity={pt.isSelected ? 1 : 0.85}
                    />
                  );
                })}
              </g>

              {/* Layer 3: High-intensity thermal core */}
              <g filter="url(#heat-blur-core)">
                {pointsList.map((pt, idx) => {
                  if (pt.startX === null || pt.startY === null) return null;
                  const hotFill = pt.isSelected
                    ? 'url(#heat-blob-selected)'
                    : pt.cornerSide === 'left'
                    ? 'url(#heat-blob-left-hot)'
                    : pt.cornerSide === 'right'
                    ? 'url(#heat-blob-right-hot)'
                    : 'url(#heat-blob-hot)';

                  return (
                    <circle
                      key={`heat-core-${pt.id || idx}`}
                      cx={toSvgX(pt.startY)}
                      cy={toSvgY(pt.startX)}
                      r={pt.isSelected ? '44' : '30'}
                      fill={hotFill}
                      opacity={pt.isSelected ? 1 : 0.95}
                    />
                  );
                })}
              </g>

              {/* Interactive marker hotspots and selection rings */}
              {pointsList.map((pt, idx) => {
                if (pt.startX === null || pt.startY === null) return null;
                const isSelected = pt.isSelected;
                const dotFill = isSelected
                  ? '#ff0055'
                  : pt.cornerSide === 'left'
                  ? '#38bdf8'
                  : pt.cornerSide === 'right'
                  ? '#fb923c'
                  : '#ffffff';

                return (
                  <g
                    key={`heat-interactive-${pt.id || idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMarker && pt.id) {
                        onSelectMarker(pt.id);
                      }
                    }}
                    className="cursor-pointer group/heat-point"
                  >
                    {isSelected ? (
                      <>
                        <circle
                          cx={toSvgX(pt.startY)}
                          cy={toSvgY(pt.startX)}
                          r="26"
                          fill="rgba(255, 0, 85, 0.45)"
                          stroke="#ff0055"
                          strokeWidth="3.5"
                          className="animate-pulse"
                          filter="url(#vector-glow)"
                        />
                        <circle
                          cx={toSvgX(pt.startY)}
                          cy={toSvgY(pt.startX)}
                          r="14"
                          fill="#ff0055"
                          stroke="#ffffff"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx={toSvgX(pt.startY)}
                          cy={toSvgY(pt.startX)}
                          r="5"
                          fill="#ffffff"
                        />
                      </>
                    ) : (
                      <>
                        {/* Subtle interactive center dot on heatmap so individual actions can still be clicked */}
                        <circle
                          cx={toSvgX(pt.startY)}
                          cy={toSvgY(pt.startX)}
                          r="5.5"
                          fill={dotFill}
                          fillOpacity="0.85"
                          stroke="#000000"
                          strokeWidth="1.5"
                          className="transition-all duration-150 group-hover/heat-point:r-9 group-hover/heat-point:fill-amber-400 group-hover/heat-point:fill-opacity-1"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* MULTIPLE EVENT MARKERS OVERLAY (Hidden in Zone Mode & Heatmap Mode) */}
          {pointsList && pointsList.length > 0 && !isZoneMode && !isHeatmap && (
            <g>
              {pointsList.map((pt, idx) => {
                if (pt.startX === null || pt.startY === null) return null;
                const isSelected = pt.isSelected;
                const cx = toSvgX(pt.startY);
                const cy = toSvgY(pt.startX);
                const style = getPitchOutcomeStyle(pt.outcome);
                const dorsalStr = pt.player_number != null && pt.player_number !== '' ? String(pt.player_number) : '';

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
                    <title>
                      {pt.player_name ? `${pt.player_name}${dorsalStr ? ` (#${dorsalStr})` : ''}` : 'Acción'} - {pt.outcome || 'Tiro'}
                    </title>

                    {/* 1. OUTCOME-BASED ORIGIN SHAPE & HALO */}
                    {style.type === 'goal' && (
                      <>
                        {/* Double-ring halo for Goal */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 26 : 21}
                          fill={isSelected ? 'rgba(255, 0, 85, 0.45)' : style.haloColor}
                          stroke={isSelected ? '#ff0055' : style.color}
                          strokeWidth="2"
                          className="animate-pulse"
                          filter="url(#vector-glow)"
                        />
                        {/* Outer gold rim circle */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 17 : 14.5}
                          fill={isSelected ? '#ff0055' : style.color}
                          stroke={isSelected ? '#ffffff' : '#fbbf24'}
                          strokeWidth={isSelected ? '3.5' : '2.5'}
                          className="transition-all duration-150 group-hover/marker:r-17"
                        />
                      </>
                    )}

                    {style.type === 'saved' && (() => {
                      const s = isSelected ? 17 : 14;
                      const haloS = s + 7;
                      return (
                        <>
                          {/* Diamond Halo */}
                          <polygon
                            points={`${cx},${cy - haloS} ${cx + haloS},${cy} ${cx},${cy + haloS} ${cx - haloS},${cy}`}
                            fill={isSelected ? 'rgba(255, 0, 85, 0.45)' : style.haloColor}
                            stroke={isSelected ? '#ff0055' : style.color}
                            strokeWidth="2"
                            className="animate-pulse"
                            filter="url(#vector-glow)"
                          />
                          {/* Diamond Body */}
                          <polygon
                            points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                            fill={isSelected ? '#ff0055' : style.color}
                            stroke={isSelected ? '#ffffff' : '#e0f2fe'}
                            strokeWidth={isSelected ? '3.5' : '2.5'}
                            className="transition-all duration-150 group-hover/marker:scale-110"
                          />
                        </>
                      );
                    })()}

                    {style.type === 'missed' && (() => {
                      const s = isSelected ? 17 : 14;
                      const haloS = s + 7;
                      return (
                        <>
                          {/* Triangle Halo */}
                          <polygon
                            points={`${cx},${cy - haloS * 1.15} ${cx + haloS * 1.15},${cy + haloS * 0.85} ${cx - haloS * 1.15},${cy + haloS * 0.85}`}
                            fill={isSelected ? 'rgba(255, 0, 85, 0.45)' : style.haloColor}
                            stroke={isSelected ? '#ff0055' : style.color}
                            strokeWidth="2"
                            className="animate-pulse"
                            filter="url(#vector-glow)"
                          />
                          {/* Triangle Body */}
                          <polygon
                            points={`${cx},${cy - s * 1.15} ${cx + s * 1.15},${cy + s * 0.85} ${cx - s * 1.15},${cy + s * 0.85}`}
                            fill={isSelected ? '#ff0055' : style.color}
                            stroke={isSelected ? '#ffffff' : '#ffe4e6'}
                            strokeWidth={isSelected ? '3.5' : '2.5'}
                            className="transition-all duration-150 group-hover/marker:scale-110"
                          />
                        </>
                      );
                    })()}

                    {style.type === 'blocked' && (() => {
                      const s = isSelected ? 16 : 13.5;
                      const dx = s * 0.866;
                      const haloS = s + 7;
                      const haloDx = haloS * 0.866;
                      return (
                        <>
                          {/* Hexagon Halo */}
                          <polygon
                            points={`${cx},${cy - haloS} ${cx + haloDx},${cy - haloS * 0.5} ${cx + haloDx},${cy + haloS * 0.5} ${cx},${cy + haloS} ${cx - haloDx},${cy + haloS * 0.5} ${cx - haloDx},${cy - haloS * 0.5}`}
                            fill={isSelected ? 'rgba(255, 0, 85, 0.45)' : style.haloColor}
                            stroke={isSelected ? '#ff0055' : style.color}
                            strokeWidth="2"
                            className="animate-pulse"
                            filter="url(#vector-glow)"
                          />
                          {/* Hexagon Body */}
                          <polygon
                            points={`${cx},${cy - s} ${cx + dx},${cy - s * 0.5} ${cx + dx},${cy + s * 0.5} ${cx},${cy + s} ${cx - dx},${cy + s * 0.5} ${cx - dx},${cy - s * 0.5}`}
                            fill={isSelected ? '#ff0055' : style.color}
                            stroke={isSelected ? '#ffffff' : '#fef3c7'}
                            strokeWidth={isSelected ? '3.5' : '2.5'}
                            className="transition-all duration-150 group-hover/marker:scale-110"
                          />
                        </>
                      );
                    })()}

                    {style.type === 'other' && (
                      <>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 26 : 20}
                          fill={isSelected ? 'rgba(255, 0, 85, 0.45)' : style.haloColor}
                          stroke={isSelected ? '#ff0055' : style.color}
                          strokeWidth="2"
                          className="animate-pulse"
                          filter="url(#vector-glow)"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 16 : 13.5}
                          fill={isSelected ? '#ff0055' : style.color}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? '3.5' : '2.5'}
                          className="transition-all duration-150 group-hover/marker:r-16"
                        />
                      </>
                    )}

                    {/* 2. DORSAL NUMBER OR INNER CORE INSIDE ORIGIN SHAPE */}
                    {dorsalStr ? (
                      <text
                        x={cx}
                        y={style.type === 'missed' ? cy + 2.5 : cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize={dorsalStr.length > 2 ? '9' : dorsalStr.length === 2 ? '10.5' : '12'}
                        fontWeight="900"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                        className="font-mono select-none pointer-events-none"
                      >
                        {dorsalStr}
                      </text>
                    ) : (
                      <circle
                        cx={cx}
                        cy={style.type === 'missed' ? cy + 1.5 : cy}
                        r={isSelected ? 4.5 : 3.5}
                        fill="#ffffff"
                        className="pointer-events-none"
                      />
                    )}

                    {/* 3. VECTOR ARROW LINE & DESTINATION TARGET */}
                    {isVectorMode && pt.endX != null && pt.endY != null && (() => {
                      const x1 = toSvgX(pt.startY);
                      const y1 = toSvgY(pt.startX);
                      const x2 = toSvgX(pt.endY);
                      const y2 = toSvgY(pt.endX);

                      let pathD = `M ${x1} ${y1} L ${x2} ${y2}`;

                      if (pt.curveType === 'convex' || pt.curveType === 'concave') {
                        const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        // Perpendicular normal unit vector: (-dy/dist, dx/dist)
                        const nx = -(y2 - y1) / dist;
                        const ny = (x2 - x1) / dist;

                        // Arc curvature magnitude (subtle, elegant tactical curve)
                        const arcMagnitude = Math.min(38, Math.max(16, dist * 0.22));
                        const isLeft = pt.cornerSide ? pt.cornerSide === 'left' : (pt.startY ?? 0) < 50;

                        let ctrlX = mx;
                        let ctrlY = my;

                        if (pt.curveType === 'convex') {
                          // Abierto (Convexa): curves inward towards goal line / outswinger arc
                          const sign = isLeft ? -1 : 1;
                          ctrlX = mx + nx * arcMagnitude * sign;
                          ctrlY = my - Math.abs(ny * arcMagnitude);
                        } else if (pt.curveType === 'concave') {
                          // Cerrado (Cóncava): curves outward toward penalty spot / inswinger arc
                          const sign = isLeft ? 1 : -1;
                          ctrlX = mx + nx * arcMagnitude * sign;
                          ctrlY = my + Math.abs(ny * arcMagnitude);
                        }

                        pathD = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
                      }

                      return (
                        <g filter="url(#vector-glow)">
                          {/* High contrast dark outline line underneath vector */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#000000"
                            strokeWidth={isSelected ? '11' : '7'}
                            strokeOpacity="0.8"
                            strokeLinecap="round"
                          />

                          {/* Foreground vector line */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={isSelected ? '#ff0055' : style.color}
                            strokeWidth={isSelected ? '6' : '4'}
                            strokeOpacity="1"
                            strokeLinecap="round"
                            markerEnd={isSelected ? 'url(#vector-arrow-selected)' : style.arrowMarker}
                            className="transition-all duration-150 group-hover/marker:stroke-[5.5px]"
                          />

                          {/* Destination Pulsing Halo */}
                          {isSelected && (
                            <circle
                              cx={x2}
                              cy={y2}
                              r="22"
                              fill="rgba(255, 0, 85, 0.45)"
                              stroke="#ff0055"
                              strokeWidth="2.5"
                              className="animate-pulse"
                            />
                          )}

                          {/* Destination Target Circle */}
                          <circle
                            cx={x2}
                            cy={y2}
                            r={isSelected ? '13' : '9'}
                            fill={isSelected ? '#ff0055' : style.color}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="transition-all duration-150 group-hover/marker:r-11"
                          />
                        </g>
                      );
                    })()}
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
                r="22"
                fill="rgba(245, 158, 11, 0.35)"
                stroke="#f59e0b"
                strokeWidth="2"
                className="animate-pulse"
              />
              <circle
                cx={toSvgX(startY)}
                cy={toSvgY(startX)}
                r="14"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="3"
              />
              <circle
                cx={toSvgX(startY)}
                cy={toSvgY(startX)}
                r="4.5"
                fill="#090d16"
              />

              {/* Vector Arrow */}
              {isVectorMode && endX !== null && endY !== null && (
                <g>
                  {/* High contrast outline */}
                  <line
                    x1={toSvgX(startY)}
                    y1={toSvgY(startX)}
                    x2={toSvgX(endY)}
                    y2={toSvgY(endX)}
                    stroke="#000000"
                    strokeWidth="7"
                    strokeOpacity="0.75"
                    strokeLinecap="round"
                  />
                  <line
                    x1={toSvgX(startY)}
                    y1={toSvgY(startX)}
                    x2={toSvgX(endY)}
                    y2={toSvgY(endX)}
                    stroke="#fbbf24"
                    strokeWidth="4"
                    markerEnd="url(#vector-arrow-amber)"
                  />
                  <circle
                    cx={toSvgX(endY)}
                    cy={toSvgY(endX)}
                    r="9"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </g>
          )}
        </svg>
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
      {!hideFooter && !hideHeader && (
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
      )}
    </div>
  );
};
