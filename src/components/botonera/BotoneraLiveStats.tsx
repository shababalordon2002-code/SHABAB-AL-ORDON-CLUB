'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Activity,
  User,
  Flame,
  CheckCircle2,
  Trophy,
  Video,
  Play,
  Filter,
  Tag,
  Sparkles,
  X,
  Film,
  Grid,
  RotateCcw,
  Shield,
  ArrowUp,
  ArrowRight,
  Layers,
  MapPin,
  Crosshair,
  Split,
  Percent,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { NormalizedEvent, BotoneraButton, Match } from '@/types';
import { getButtonColorHex } from './BotoneraPanelEditor';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { dbStore } from '@/lib/store/db-store';
import { calculateEventVideoTime, openClipPopupWindow } from '@/lib/analytics/video-utils';

interface BotoneraLiveStatsProps {
  events: NormalizedEvent[];
  match?: Match | null;
  videoUrl?: string | null;
  periodVideoOffsets?: Record<number, number>;
  onSeekVideoToTime?: (time: number) => void;
  onSeekToEvent?: (event: NormalizedEvent) => void;
  buttons?: BotoneraButton[];
  externalPlayingEvent?: NormalizedEvent | null;
  onClearExternalPlayingEvent?: () => void;
}

/** Helper to resolve the button name for a given event */
export const getEventButtonName = (evt: NormalizedEvent): string => {
  return evt.event_type || evt.metadata?.buttonName || evt.category || 'Acción General';
};

/** Helper to resolve the exact hex color of the button that created an event */
export const getEventButtonColorHex = (
  evt: NormalizedEvent,
  buttonsList: BotoneraButton[] = []
): string => {
  if (typeof evt.metadata?.buttonColor === 'string' && evt.metadata.buttonColor) {
    return getButtonColorHex(evt.metadata.buttonColor);
  }

  const btnName = getEventButtonName(evt);
  const matchedBtn = buttonsList.find(
    (b) => b.name === btnName || b.name === evt.event_type || b.category === evt.category
  );

  if (matchedBtn?.color) {
    return getButtonColorHex(matchedBtn.color);
  }

  const cat = (evt.category || '').toLowerCase();
  if (cat.includes('gol') || cat.includes('éxito')) return '#10b981';
  if (cat.includes('tiro') || cat.includes('remate')) return '#f59e0b';
  if (cat.includes('pase') || cat.includes('centro')) return '#3b82f6';
  if (cat.includes('recuperacion') || cat.includes('robo')) return '#06b6d4';
  if (cat.includes('falta') || cat.includes('tarjeta')) return '#ef4444';
  if (cat.includes('perdida')) return '#f43f5e';

  return '#38bdf8';
};

// --- ZONE DEFINITIONS ---
export interface PitchZoneDef {
  id: string;
  name: string;
  shortName: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// 1. 3 Zonas / Hitos (Inicio - Canalización - Finalización)
export const HITOS_3_ZONES: PitchZoneDef[] = [
  { id: 'h3_fin', name: 'Finalización (Zona Alta)', shortName: 'Finalización (3/4)', minX: 66.66, maxX: 100, minY: 0, maxY: 100 },
  { id: 'h3_can', name: 'Canalización (Zona Media)', shortName: 'Canalización (Medio)', minX: 33.33, maxX: 66.66, minY: 0, maxY: 100 },
  { id: 'h3_ini', name: 'Inicio (Zona Baja)', shortName: 'Inicio (Salida)', minX: 0, maxX: 33.33, minY: 0, maxY: 100 },
];

// 2. Bandas / Centro (3 Pasillos Longitudinales)
export const BANDAS_3_ZONES: PitchZoneDef[] = [
  { id: 'bc_izq', name: 'Banda Izquierda', shortName: 'Banda Izq', minX: 0, maxX: 100, minY: 0, maxY: 30 },
  { id: 'bc_cen', name: 'Centro / Pasillo Central', shortName: 'Centro', minX: 0, maxX: 100, minY: 30, maxY: 70 },
  { id: 'bc_der', name: 'Banda Derecha', shortName: 'Banda Der', minX: 0, maxX: 100, minY: 70, maxY: 100 },
];

// 3. 9 Zonas Tácticas (3x3)
export const TACTICAL_9_ZONES: PitchZoneDef[] = [
  { id: 'z11', name: 'Ataque Banda Izq', shortName: 'Fin. Izq', minX: 66.66, maxX: 100, minY: 0, maxY: 33.33 },
  { id: 'z12', name: 'Área Rival / Z14', shortName: 'Área Rival / Z14', minX: 66.66, maxX: 100, minY: 33.33, maxY: 66.66 },
  { id: 'z13', name: 'Ataque Banda Der', shortName: 'Fin. Der', minX: 66.66, maxX: 100, minY: 66.66, maxY: 100 },

  { id: 'z6', name: 'Medio Banda Izq', shortName: 'Medio Izq', minX: 33.33, maxX: 66.66, minY: 0, maxY: 33.33 },
  { id: 'z7', name: 'Medio Campo Central', shortName: 'Medio Centro', minX: 33.33, maxX: 66.66, minY: 33.33, maxY: 66.66 },
  { id: 'z8', name: 'Medio Banda Der', shortName: 'Medio Der', minX: 33.33, maxX: 66.66, minY: 66.66, maxY: 100 },

  { id: 'z1', name: 'Def. Banda Izq', shortName: 'Def. Izq', minX: 0, maxX: 33.33, minY: 0, maxY: 33.33 },
  { id: 'z2', name: 'Def. Área Propia', shortName: 'Área Propia', minX: 0, maxX: 33.33, minY: 33.33, maxY: 66.66 },
  { id: 'z3', name: 'Def. Banda Der', shortName: 'Def. Der', minX: 0, maxX: 33.33, minY: 66.66, maxY: 100 },
];

// 4. Zonas de Remate
export const REMATE_ZONES: PitchZoneDef[] = [
  { id: 'zr_area_peq', name: 'Área Pequeña', shortName: 'Área Pequeña', minX: 92, maxX: 100, minY: 37, maxY: 63 },
  { id: 'zr_area_gde', name: 'Área Grande', shortName: 'Área Grande', minX: 78, maxX: 92, minY: 25, maxY: 75 },
  { id: 'zr_borde_area', name: 'Borde Área', shortName: 'Borde Área', minX: 62, maxX: 78, minY: 25, maxY: 75 },
  { id: 'zr_lat_izq', name: 'Lateral Izquierdo', shortName: 'Lat. Izq', minX: 62, maxX: 100, minY: 0, maxY: 25 },
  { id: 'zr_lat_der', name: 'Lateral Derecho', shortName: 'Lat. Der', minX: 62, maxX: 100, minY: 75, maxY: 100 },
];

export type PitchDisplayMode = 'vectors' | 'heatmap' | 'zones';
export type HeatmapTarget = 'destination' | 'origin';
export type ZoneTypeSelection = 'hitos3' | 'bandas' | 'tactical9' | 'remate';

/** Helper to extract descriptors of an event */
export const getEventDescriptorsList = (evt: NormalizedEvent): string[] => {
  const descList: string[] = [];
  if (Array.isArray(evt.metadata?.descriptors)) {
    descList.push(...evt.metadata.descriptors);
  } else if (evt.metadata?.descriptor) {
    descList.push(evt.metadata.descriptor);
  }
  if (evt.subcategory) {
    evt.subcategory
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((d) => descList.push(d));
  }
  if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
  if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);
  return Array.from(new Set(descList));
};

export const formatTimeStr = (evt: NormalizedEvent) => {
  const p = evt.period ? (evt.period === 1 ? '1ªP' : evt.period === 2 ? '2ªP' : `P${evt.period}`) : '';
  let timeStr = '--:--';
  if (evt.minute !== null && evt.minute !== undefined) {
    const m = evt.minute;
    const s = evt.second ?? 0;
    timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else if (evt.timestamp !== null && evt.timestamp !== undefined) {
    const m = Math.floor(evt.timestamp / 60);
    const s = Math.floor(evt.timestamp % 60);
    timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return p ? `${p} • ${timeStr}` : timeStr;
};

// ─── REUSABLE CAMPOGRAM COMPONENT (TACTICAL PITCH) ───
interface TacticalPitchViewProps {
  events: NormalizedEvent[];
  teamName: string;
  buttons: BotoneraButton[];
  activeButton: string;
  activePlayingEvent: NormalizedEvent | null;
  onPlayEvent: (evt: NormalizedEvent) => void;
  onSelectCluster: (cluster: NormalizedEvent[]) => void;
  orientation: 'vertical' | 'horizontal';
  onToggleOrientation?: () => void;
  displayMode: PitchDisplayMode;
  onChangeDisplayMode: (mode: PitchDisplayMode) => void;
  heatmapTarget: HeatmapTarget;
  onChangeHeatmapTarget: (target: HeatmapTarget) => void;
  zoneType: ZoneTypeSelection;
  onChangeZoneType: (zt: ZoneTypeSelection) => void;
  title?: string;
  subtitle?: string;
  badgeCount?: number;
  totalTeamEvents?: number;
  compact?: boolean;
}

export const TacticalPitchView: React.FC<TacticalPitchViewProps> = ({
  events,
  teamName,
  buttons,
  activeButton,
  activePlayingEvent,
  onPlayEvent,
  onSelectCluster,
  orientation,
  onToggleOrientation,
  displayMode,
  onChangeDisplayMode,
  heatmapTarget,
  onChangeHeatmapTarget,
  zoneType,
  onChangeZoneType,
  title,
  subtitle,
  badgeCount,
  totalTeamEvents,
  compact = false,
}) => {
  const isVertical = orientation === 'vertical';
  const [hoveredEvent, setHoveredEvent] = useState<NormalizedEvent | null>(null);
  const [hoveredZone, setHoveredZone] = useState<{ name: string; pct: number; count: number } | null>(null);
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ pct: number; count: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const pitchWidth = isVertical ? 500 : 800;
  const pitchHeight = isVertical ? 800 : 500;
  const margin = 24;

  const getSvgCoords = (x: number | null, y: number | null) => {
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
    if (isVertical) {
      const svgX = margin + (y / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + ((100 - x) / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY };
    } else {
      const svgX = margin + (x / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + (y / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY };
    }
  };

  const getSvgRect = (minX: number, maxX: number, minY: number, maxY: number) => {
    if (isVertical) {
      const svgX = margin + (minY / 100) * (pitchWidth - 2 * margin);
      const svgW = ((maxY - minY) / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + ((100 - maxX) / 100) * (pitchHeight - 2 * margin);
      const svgH = ((maxX - minX) / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY, width: svgW, height: svgH };
    } else {
      const svgX = margin + (minX / 100) * (pitchWidth - 2 * margin);
      const svgW = ((maxX - minX) / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + (minY / 100) * (pitchHeight - 2 * margin);
      const svgH = ((maxY - minY) / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY, width: svgW, height: svgH };
    }
  };

  const activeZoneList = useMemo(() => {
    switch (zoneType) {
      case 'bandas':
        return BANDAS_3_ZONES;
      case 'tactical9':
        return TACTICAL_9_ZONES;
      case 'remate':
        return REMATE_ZONES;
      case 'hitos3':
      default:
        return HITOS_3_ZONES;
    }
  }, [zoneType]);

  // Unique Color Hexes used across events
  const uniqueColorHexes = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      set.add(getEventButtonColorHex(evt, buttons));
    });
    return Array.from(set);
  }, [events, buttons]);

  // Zone Stats Calculation
  const zoneStats = useMemo(() => {
    const counts: Record<string, NormalizedEvent[]> = {};
    activeZoneList.forEach((z) => {
      counts[z.id] = [];
    });

    events.forEach((evt) => {
      const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? 50;
      const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? 50;
      const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
      const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

      // In destination mode, we can use end coordinates if available
      const evalX = heatmapTarget === 'destination' && endX !== null ? endX : startX;
      const evalY = heatmapTarget === 'destination' && endY !== null ? endY : startY;

      // Match by explicit metadata.zone name first
      let matched = activeZoneList.find((z) => z.name === evt.metadata?.zone);
      if (!matched) {
        // Fallback to bounding box coordinate test
        matched = activeZoneList.find(
          (z) => evalX >= z.minX && evalX <= z.maxX && evalY >= z.minY && evalY <= z.maxY
        );
      }
      if (matched) {
        counts[matched.id].push(evt);
      } else if (activeZoneList.length > 0) {
        counts[activeZoneList[0].id].push(evt);
      }
    });

    const total = events.length;
    return activeZoneList.map((z) => {
      const matchedEvts = counts[z.id] || [];
      const count = matchedEvts.length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        ...z,
        count,
        pct,
        events: matchedEvts,
      };
    });
  }, [events, activeZoneList, heatmapTarget]);

  // Heatmap Spatial Density Grid (6x4 bins)
  const heatmapData = useMemo(() => {
    const binsX = 6;
    const binsY = 4;
    const grid: {
      ix: number;
      iy: number;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      events: NormalizedEvent[];
    }[] = [];

    for (let ix = 0; ix < binsX; ix++) {
      for (let iy = 0; iy < binsY; iy++) {
        grid.push({
          ix,
          iy,
          minX: (ix / binsX) * 100,
          maxX: ((ix + 1) / binsX) * 100,
          minY: (iy / binsY) * 100,
          maxY: ((iy + 1) / binsY) * 100,
          events: [],
        });
      }
    }

    events.forEach((evt) => {
      const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? 50;
      const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? 50;
      const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
      const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

      const evalX = heatmapTarget === 'destination' && endX !== null ? endX : startX;
      const evalY = heatmapTarget === 'destination' && endY !== null ? endY : startY;

      const ix = Math.min(binsX - 1, Math.max(0, Math.floor((evalX / 100) * binsX)));
      const iy = Math.min(binsY - 1, Math.max(0, Math.floor((evalY / 100) * binsY)));

      const cell = grid.find((c) => c.ix === ix && c.iy === iy);
      if (cell) cell.events.push(evt);
    });

    const maxCount = Math.max(...grid.map((c) => c.events.length), 1);
    const total = events.length;

    return grid.map((c) => ({
      ...c,
      count: c.events.length,
      pct: total > 0 ? Math.round((c.events.length / total) * 100) : 0,
      intensity: c.events.length / maxCount,
    }));
  }, [events, heatmapTarget]);

  const handleMouseMoveItem = (e: React.MouseEvent<SVGElement>, evt: NormalizedEvent) => {
    const rect = e.currentTarget.ownerSVGElement
      ? e.currentTarget.ownerSVGElement.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();

    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredEvent(evt);
    setHoveredZone(null);
    setHoveredHeatCell(null);
  };

  const handlePitchCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (events.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = pitchWidth / rect.width;
    const scaleY = pitchHeight / rect.height;
    const svgClickX = (e.clientX - rect.left) * scaleX;
    const svgClickY = (e.clientY - rect.top) * scaleY;

    let closestEvt: NormalizedEvent | null = null;
    let minDistance = Infinity;

    events.forEach((evt) => {
      const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? null;
      const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? null;
      const coords = getSvgCoords(startX, startY);
      if (!coords) return;
      const dist = Math.hypot(coords.x - svgClickX, coords.y - svgClickY);
      if (dist < minDistance) {
        minDistance = dist;
        closestEvt = evt;
      }
    });

    if (closestEvt && minDistance <= 50) {
      onPlayEvent(closestEvt);
      onSelectCluster([closestEvt]);
    }
  };

  return (
    <div className="space-y-3 bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* ── CARD HEADER ── */}
      <div className="space-y-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <TeamLogo teamName={teamName} size={compact ? 22 : 28} />
            <div className="min-w-0">
              <h4 className="font-black text-slate-100 text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>{title || teamName}</span>
              </h4>
              <p className="text-[10px] text-cyan-300 font-extrabold truncate">
                {subtitle || `${events.length} acciones de "${activeButton}"`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {badgeCount !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-black">
                {badgeCount} ACC
              </span>
            )}
            {onToggleOrientation && (
              <button
                type="button"
                onClick={onToggleOrientation}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Cambiar orientación"
              >
                <span>{isVertical ? '↕️' : '↔️'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── VISUAL MODE SELECTOR: FLECHAS / MAPA DE CALOR / ZONAS % ── */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
          {/* Main Visual Mode Pills */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => onChangeDisplayMode('vectors')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'vectors'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏹 Flechas</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDisplayMode('heatmap')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'heatmap'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Mapa Calor</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDisplayMode('zones')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'zones'
                  ? 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>Zonas (%)</span>
            </button>
          </div>

          {/* Sub-mode selector depending on active visual mode */}
          {displayMode === 'heatmap' && (
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-amber-500/30 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => onChangeHeatmapTarget('destination')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  heatmapTarget === 'destination'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-amber-300/80 hover:text-amber-200'
                }`}
                title="Mapa de calor donde acaba la flecha o cae el punto"
              >
                🎯 Fin Flecha / Llegada
              </button>
              <button
                type="button"
                onClick={() => onChangeHeatmapTarget('origin')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  heatmapTarget === 'origin'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-amber-300/80 hover:text-amber-200'
                }`}
                title="Mapa de calor donde inicia la flecha"
              >
                📍 Inicio
              </button>
            </div>
          )}

          {displayMode === 'zones' && (
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-indigo-500/30 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => onChangeZoneType('hitos3')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  zoneType === 'hitos3'
                    ? 'bg-indigo-500 text-white font-black'
                    : 'text-indigo-300/80 hover:text-indigo-200'
                }`}
              >
                3 Hitos (Alturas)
              </button>
              <button
                type="button"
                onClick={() => onChangeZoneType('bandas')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  zoneType === 'bandas'
                    ? 'bg-indigo-500 text-white font-black'
                    : 'text-indigo-300/80 hover:text-indigo-200'
                }`}
              >
                3 Pasillos
              </button>
              <button
                type="button"
                onClick={() => onChangeZoneType('tactical9')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  zoneType === 'tactical9'
                    ? 'bg-indigo-500 text-white font-black'
                    : 'text-indigo-300/80 hover:text-indigo-200'
                }`}
              >
                9 Zonas
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SVG PITCH CANVAS ── */}
      <div
        className={`relative w-full mx-auto bg-emerald-950 rounded-2xl border-2 border-emerald-800/80 shadow-2xl select-none flex ${
          isVertical ? 'flex-row max-w-xs sm:max-w-sm' : 'flex-col'
        }`}
        onMouseLeave={() => {
          setHoveredEvent(null);
          setHoveredZone(null);
          setHoveredHeatCell(null);
        }}
      >
        <div className={`relative flex-1 ${isVertical ? 'aspect-[5/8]' : 'aspect-[8/5]'}`}>
          {/* Grass Stripes Pattern */}
          <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90" />
          </div>

          <svg
            viewBox={`0 0 ${pitchWidth} ${pitchHeight}`}
            className="w-full h-full block relative z-10 cursor-pointer"
            onClick={handlePitchCanvasClick}
          >
            {/* PITCH MARKINGS */}
            <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
              <rect x={margin} y={margin} width={pitchWidth - 2 * margin} height={pitchHeight - 2 * margin} rx="4" />
              {isVertical ? (
                <line x1={margin} y1={pitchHeight / 2} x2={pitchWidth - margin} y2={pitchHeight / 2} />
              ) : (
                <line x1={pitchWidth / 2} y1={margin} x2={pitchWidth / 2} y2={pitchHeight - margin} />
              )}
              <circle cx={pitchWidth / 2} cy={pitchHeight / 2} r="65" />
              <circle cx={pitchWidth / 2} cy={pitchHeight / 2} r="3" fill="white" />

              {/* Penalty Areas */}
              {isVertical ? (
                <>
                  <rect x={pitchWidth / 2 - 120} y={margin} width="240" height="120" />
                  <rect x={pitchWidth / 2 - 50} y={margin} width="100" height="40" />
                  <rect x={pitchWidth / 2 - 120} y={pitchHeight - margin - 120} width="240" height="120" />
                  <rect x={pitchWidth / 2 - 50} y={pitchHeight - margin - 40} width="100" height="40" />
                </>
              ) : (
                <>
                  <rect x={margin} y={pitchHeight / 2 - 120} width="120" height="240" />
                  <rect x={margin} y={pitchHeight / 2 - 50} width="40" height="100" />
                  <rect x={pitchWidth - margin - 120} y={pitchHeight / 2 - 120} width="120" height="240" />
                  <rect x={pitchWidth - margin - 40} y={pitchHeight / 2 - 50} width="40" height="100" />
                </>
              )}
            </g>

            {/* DYNAMIC SVG ARROWHEAD MARKERS */}
            <defs>
              {uniqueColorHexes.map((colorHex) => {
                const markerId = `arrow-head-${teamName.replace(/\s+/g, '')}-${colorHex.replace('#', '')}`;
                return (
                  <marker
                    key={markerId}
                    id={markerId}
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={colorHex} />
                  </marker>
                );
              })}
              {/* Radial heat glow filter */}
              <filter id="heat-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ── MODE 1: ZONAS CON PORCENTAJES COLOREADOS (3 ZONAS / HITOS / PASILLOS) ── */}
            {displayMode === 'zones' && (
              <g className="animate-fade-in">
                {zoneStats.map((z) => {
                  const r = getSvgRect(z.minX, z.maxX, z.minY, z.maxY);
                  const isZero = z.count === 0;

                  // Color intensity mapping based on %
                  let fillColor = 'rgba(15, 23, 42, 0.4)';
                  let strokeColor = 'rgba(255, 255, 255, 0.15)';
                  let strokeW = 1.5;

                  if (z.pct >= 45) {
                    fillColor = 'rgba(16, 185, 129, 0.45)';
                    strokeColor = '#34d399';
                    strokeW = 3;
                  } else if (z.pct >= 25) {
                    fillColor = 'rgba(245, 158, 11, 0.38)';
                    strokeColor = '#fbbf24';
                    strokeW = 2.5;
                  } else if (z.pct > 0) {
                    fillColor = 'rgba(59, 130, 246, 0.30)';
                    strokeColor = '#60a5fa';
                    strokeW = 2;
                  }

                  const centerX = r.x + r.width / 2;
                  const centerY = r.y + r.height / 2;

                  return (
                    <g
                      key={z.id}
                      className="cursor-pointer group/zone transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (z.events.length > 0) {
                          onSelectCluster(z.events);
                          onPlayEvent(z.events[0]);
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.ownerSVGElement
                          ? e.currentTarget.ownerSVGElement.getBoundingClientRect()
                          : e.currentTarget.getBoundingClientRect();
                        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setHoveredZone({ name: z.name, pct: z.pct, count: z.count });
                        setHoveredEvent(null);
                        setHoveredHeatCell(null);
                      }}
                    >
                      {/* Zone Colored Rectangle */}
                      <rect
                        x={r.x + 2}
                        y={r.y + 2}
                        width={Math.max(0, r.width - 4)}
                        height={Math.max(0, r.height - 4)}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeW}
                        rx={6}
                        className="group-hover/zone:fill-opacity-80 transition-all duration-200"
                      />

                      {/* Center Zone HUD Card / Percentage */}
                      <g className="pointer-events-none select-none">
                        {/* Background pill */}
                        <rect
                          x={centerX - (compact ? 45 : 55)}
                          y={centerY - (compact ? 20 : 25)}
                          width={compact ? 90 : 110}
                          height={compact ? 40 : 50}
                          rx={10}
                          fill="rgba(2, 6, 23, 0.85)"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          className="shadow-2xl"
                        />

                        {/* Zone Name */}
                        <text
                          x={centerX}
                          y={centerY - (compact ? 7 : 10)}
                          fill="#94a3b8"
                          fontSize={compact ? 8 : 9}
                          fontWeight="800"
                          textAnchor="middle"
                          className="uppercase tracking-wider"
                        >
                          {z.shortName}
                        </text>

                        {/* Big Percentage Label */}
                        <text
                          x={centerX}
                          y={centerY + (compact ? 9 : 12)}
                          fill={z.pct >= 45 ? '#34d399' : z.pct >= 25 ? '#fbbf24' : z.pct > 0 ? '#60a5fa' : '#64748b'}
                          fontSize={compact ? 14 : 17}
                          fontWeight="900"
                          textAnchor="middle"
                          className="font-mono tracking-tight"
                        >
                          {z.pct}%
                        </text>

                        {/* Action Count */}
                        <text
                          x={centerX}
                          y={centerY + (compact ? 17 : 21)}
                          fill="#cbd5e1"
                          fontSize={compact ? 7 : 8}
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {z.count} {z.count === 1 ? 'acción' : 'acciones'}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* ── MODE 2: MAPA DE CALOR (HEATMAP EN DESTINO / DONDE ACABA LA FLECHA O PUNTOS) ── */}
            {displayMode === 'heatmap' && (
              <g className="animate-fade-in">
                {heatmapData.map((cell) => {
                  if (cell.count === 0) return null;
                  const r = getSvgRect(cell.minX, cell.maxX, cell.minY, cell.maxY);

                  // Heatmap color gradient: cyan -> emerald -> yellow -> orange -> glowing hot red
                  let heatColor = '#10b981';
                  let heatOpacity = 0.45;
                  if (cell.intensity >= 0.75) {
                    heatColor = '#ef4444';
                    heatOpacity = 0.85;
                  } else if (cell.intensity >= 0.5) {
                    heatColor = '#f97316';
                    heatOpacity = 0.75;
                  } else if (cell.intensity >= 0.25) {
                    heatColor = '#f59e0b';
                    heatOpacity = 0.65;
                  } else {
                    heatColor = '#06b6d4';
                    heatOpacity = 0.50;
                  }

                  const centerX = r.x + r.width / 2;
                  const centerY = r.y + r.height / 2;

                  return (
                    <g
                      key={`heat-${cell.ix}-${cell.iy}`}
                      className="cursor-pointer group/heat"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cell.events.length > 0) {
                          onSelectCluster(cell.events);
                          onPlayEvent(cell.events[0]);
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.ownerSVGElement
                          ? e.currentTarget.ownerSVGElement.getBoundingClientRect()
                          : e.currentTarget.getBoundingClientRect();
                        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setHoveredHeatCell({ pct: cell.pct, count: cell.count });
                        setHoveredEvent(null);
                        setHoveredZone(null);
                      }}
                    >
                      {/* Thermal Cell Glow */}
                      <rect
                        x={r.x + 2}
                        y={r.y + 2}
                        width={Math.max(0, r.width - 4)}
                        height={Math.max(0, r.height - 4)}
                        fill={heatColor}
                        fillOpacity={heatOpacity}
                        stroke={heatColor}
                        strokeWidth="1.5"
                        rx={8}
                        className="group-hover/heat:fill-opacity-95 transition-all duration-200"
                      />

                      {/* Percentage & Count Badge inside hot cells */}
                      {cell.pct >= 5 && (
                        <g className="pointer-events-none select-none">
                          <text
                            x={centerX}
                            y={centerY + 2}
                            fill="#ffffff"
                            fontSize={compact ? 11 : 13}
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                          >
                            {cell.pct}%
                          </text>
                          <text
                            x={centerX}
                            y={centerY + (compact ? 12 : 14)}
                            fill="rgba(255, 255, 255, 0.85)"
                            fontSize={compact ? 7 : 8}
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            ({cell.count})
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* ── MODE 3: FLECHAS VECTORIALES Y PUNTOS CON LOS COLORES DE LOS BOTONES ── */}
            {displayMode === 'vectors' && (
              <g className="animate-fade-in">
                {events.map((evt) => {
                  const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? null;
                  const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? null;
                  const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
                  const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

                  const startCoords = getSvgCoords(startX, startY);
                  if (!startCoords) return null;

                  const buttonColorHex = getEventButtonColorHex(evt, buttons);
                  const markerId = `arrow-head-${teamName.replace(/\s+/g, '')}-${buttonColorHex.replace('#', '')}`;
                  const isSelected = activePlayingEvent?.event_id === evt.event_id;

                  const catLower = (evt.category || '').toLowerCase();
                  const isPassCategory =
                    catLower.includes('pase') ||
                    catLower.includes('centro') ||
                    catLower.includes('transicion') ||
                    catLower.includes('desmarque');

                  const hasEndCoords =
                    endX !== null && endY !== null && (endX !== startX || endY !== startY);
                  const isArrow = hasEndCoords || isPassCategory;

                  let endCoords = getSvgCoords(endX, endY);
                  if (!endCoords && isPassCategory) {
                    endCoords = isVertical
                      ? { x: startCoords.x + 15, y: startCoords.y - 45 }
                      : { x: startCoords.x + 45, y: startCoords.y - 15 };
                  }

                  return (
                    <g
                      key={evt.event_id}
                      className="cursor-pointer group/node"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCluster([evt]);
                        onPlayEvent(evt);
                      }}
                      onMouseMove={(e) => handleMouseMoveItem(e, evt)}
                    >
                      {/* ARROW VECTOR */}
                      {isArrow && endCoords && (
                        <g>
                          {isSelected && (
                            <line
                              x1={startCoords.x}
                              y1={startCoords.y}
                              x2={endCoords.x}
                              y2={endCoords.y}
                              stroke="#f59e0b"
                              strokeWidth="7"
                              strokeOpacity="0.5"
                              className="animate-pulse"
                            />
                          )}
                          <line
                            x1={startCoords.x}
                            y1={startCoords.y}
                            x2={endCoords.x}
                            y2={endCoords.y}
                            stroke={isSelected ? '#f59e0b' : buttonColorHex}
                            strokeWidth={isSelected ? '5' : '3.5'}
                            strokeOpacity="0.95"
                            markerEnd={`url(#${markerId})`}
                            className="group-hover/node:stroke-amber-300 group-hover/node:stroke-[5] transition-all"
                          />
                          {/* Start Point Dot */}
                          <circle
                            cx={startCoords.x}
                            cy={startCoords.y}
                            r={isSelected ? 6 : 5}
                            fill={buttonColorHex}
                            stroke={isSelected ? '#f59e0b' : '#022c22'}
                            strokeWidth="2"
                          />
                        </g>
                      )}

                      {/* SINGLE POINT ACTION */}
                      {!isArrow && (
                        <g>
                          <circle
                            cx={startCoords.x}
                            cy={startCoords.y}
                            r={isSelected ? 14 : 10}
                            fill={isSelected ? 'rgba(245, 158, 11, 0.5)' : `${buttonColorHex}40`}
                            className="animate-pulse"
                          />
                          <circle
                            cx={startCoords.x}
                            cy={startCoords.y}
                            r={isSelected ? 8.5 : 7}
                            fill={isSelected ? '#f59e0b' : buttonColorHex}
                            stroke="#022c22"
                            strokeWidth="2"
                            className="group-hover/node:r-9 transition-all"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {/* ── HOVER TOOLTIP POPUP ── */}
          {hoveredEvent && (
            <div
              className="absolute z-[150] pointer-events-none p-3.5 rounded-2xl bg-slate-950/95 border border-amber-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-56 text-slate-100 animate-fade-in"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: getEventButtonColorHex(hoveredEvent, buttons) }}
                  />
                  <span className="text-white">{getEventButtonName(hoveredEvent)}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {formatTimeStr(hoveredEvent)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <TeamLogo teamName={hoveredEvent.team_name} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-100 text-xs truncate">{hoveredEvent.player_name}</p>
                  <p className="text-[10px] text-cyan-300 font-extrabold truncate">{hoveredEvent.team_name || 'Sin equipo'}</p>
                </div>
              </div>

              {hoveredEvent.outcome && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-semibold">Resultado:</span>
                  <span className="font-extrabold text-amber-400">{hoveredEvent.outcome}</span>
                </div>
              )}

              {getEventDescriptorsList(hoveredEvent).length > 0 && (
                <div className="pt-1 border-t border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    <span>Descriptores:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getEventDescriptorsList(hoveredEvent).map((desc, i) => {
                      const colonIdx = desc.indexOf(':');
                      const displayVal = colonIdx !== -1 ? desc.slice(colonIdx + 1).trim() : desc.trim();
                      return (
                        <span key={i} title={desc} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-200">
                          {displayVal}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hover tooltip for Zones */}
          {hoveredZone && (
            <div
              className="absolute z-[150] pointer-events-none p-3 rounded-xl bg-slate-950/95 border border-indigo-500/60 shadow-2xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-44 text-slate-100 animate-fade-in"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <div className="font-black text-indigo-300 uppercase text-[11px] border-b border-slate-800 pb-1">
                {hoveredZone.name}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 text-[11px]">Concentración:</span>
                <span className="font-black text-emerald-400 text-sm font-mono">{hoveredZone.pct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Acciones en zona:</span>
                <span className="font-bold text-slate-200">{hoveredZone.count}</span>
              </div>
            </div>
          )}

          {/* Hover tooltip for Heatmap Cells */}
          {hoveredHeatCell && (
            <div
              className="absolute z-[150] pointer-events-none p-3 rounded-xl bg-slate-950/95 border border-amber-500/60 shadow-2xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-44 text-slate-100 animate-fade-in"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <div className="font-black text-amber-300 uppercase text-[11px] border-b border-slate-800 pb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Sector Térmico ({heatmapTarget === 'destination' ? 'Llegada' : 'Inicio'})</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 text-[11px]">Concentración:</span>
                <span className="font-black text-amber-400 text-sm font-mono">{hoveredHeatCell.pct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Acciones registradas:</span>
                <span className="font-bold text-slate-200">{hoveredHeatCell.count}</span>
              </div>
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

      {/* Footer hint */}
      <p className="text-[10px] text-slate-400 text-center italic">
        💡 {displayMode === 'zones'
          ? 'Haz clic en una zona para reproducir las acciones de ese sector'
          : displayMode === 'heatmap'
          ? 'Haz clic en una celda térmica para saltar a sus vídeos'
          : 'Haz clic en cualquier flecha o punto para reproducir su vídeo'}
      </p>
    </div>
  );
};

// ─── MAIN BOTONERA LIVE STATS COMPONENT ───
export const BotoneraLiveStats: React.FC<BotoneraLiveStatsProps> = ({
  events = [],
  match = null,
  videoUrl,
  periodVideoOffsets = {},
  onSeekVideoToTime,
  onSeekToEvent,
  buttons = [],
  externalPlayingEvent = null,
  onClearExternalPlayingEvent,
}) => {
  const totalEvents = events.length;

  // Team & Player Selectors State
  const [selectedTeam, setSelectedTeam] = useState<string>('todos');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('todos');

  // Pitch Layout State ('single' | 'dual_team')
  const [pitchLayout, setPitchLayout] = useState<'single' | 'dual_team'>('single');

  // Pitch Visual Mode State ('vectors' | 'heatmap' | 'zones')
  const [displayMode, setDisplayMode] = useState<PitchDisplayMode>('vectors');
  const [heatmapTarget, setHeatmapTarget] = useState<HeatmapTarget>('destination');
  const [zoneType, setZoneType] = useState<ZoneTypeSelection>('hitos3');

  // Active Button Tab ('todas' or specific button name string)
  const [activeButton, setActiveButton] = useState<string>('todas');

  // Filter by selected descriptor badge
  const [selectedDescriptor, setSelectedDescriptor] = useState<string | null>(null);

  // Selected Pitch Event(s) for Characteristics & Playback
  const [selectedClipEvents, setSelectedClipEvents] = useState<NormalizedEvent[] | null>(null);
  const [activePlayingEvent, setActivePlayingEvent] = useState<NormalizedEvent | null>(null);

  // Pitch Orientation State ('vertical' | 'horizontal')
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const isVertical = orientation === 'vertical';

  // Team Comparison Toggle State (Head to Head)
  const [showTeamComparison, setShowTeamComparison] = useState<boolean>(true);

  // Sync external playing event trigger
  useEffect(() => {
    if (externalPlayingEvent) {
      setActivePlayingEvent(externalPlayingEvent);
      setSelectedClipEvents([externalPlayingEvent]);
    }
  }, [externalPlayingEvent]);

  // Extract distinct Teams list
  const teamsList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      if (evt.team_name) set.add(evt.team_name);
    });
    return Array.from(set).sort();
  }, [events]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>(teamsList);
    if (set.size === 0) {
      set.add('Shabab Al Ordon Club');
    }
    return Array.from(set).sort();
  }, [teamsList]);

  // Auto-detect if active button is configured with 3 zones or other zone type
  useEffect(() => {
    if (activeButton === 'todas') return;
    const foundBtn = buttons.find((b) => b.name === activeButton || b.category === activeButton);
    if (foundBtn) {
      if (foundBtn.pitchRequired === 'zone_3_hitos') {
        setDisplayMode('zones');
        setZoneType('hitos3');
      } else if (foundBtn.pitchRequired === 'zone_bandas_centro') {
        setDisplayMode('zones');
        setZoneType('bandas');
      } else if (foundBtn.pitchRequired === 'zone_remate') {
        setDisplayMode('zones');
        setZoneType('remate');
      }
    }
  }, [activeButton, buttons]);

  // Team Head-to-Head Comparison Data
  const comparisonData = useMemo(() => {
    const teamA = availableTeams[0] || 'Equipo Local';
    const teamB = availableTeams[1] || (teamsList.length > 1 ? teamsList[1] : 'Equipo Visitante');

    const evtsA = events.filter((e) => e.team_name === teamA);
    const evtsB = events.filter((e) => e.team_name === teamB);

    const getSuccessCount = (evList: NormalizedEvent[]) =>
      evList.filter((e) => {
        const out = (e.outcome || '').toLowerCase();
        return (
          out.includes('éxito') ||
          out.includes('exito') ||
          out.includes('ganado') ||
          out.includes('gol') ||
          out.includes('clave')
        );
      }).length;

    const succA = getSuccessCount(evtsA);
    const succB = getSuccessCount(evtsB);

    const effA = evtsA.length > 0 ? Math.round((succA / evtsA.length) * 100) : 0;
    const effB = evtsB.length > 0 ? Math.round((succB / evtsB.length) * 100) : 0;

    const metrics: { label: string; valA: number; valB: number; isPercentage?: boolean }[] = [
      { label: 'ACCIONES TOTALES', valA: evtsA.length, valB: evtsB.length },
      { label: 'EFECTIVIDAD DE ACCIONES (%)', valA: effA, valB: effB, isPercentage: true },
      { label: 'ACCIONES EXITOSAS', valA: succA, valB: succB },
    ];

    const categoriesSet = new Set<string>();
    events.forEach((e) => {
      const name = getEventButtonName(e);
      if (name) categoriesSet.add(name);
    });

    const dashboardConfig = dbStore.getDashboardConfig();
    const selectedCats = (dashboardConfig.selectedH2HCategories || []).map((c) => c.toLowerCase());

    Array.from(categoriesSet).sort().forEach((catName) => {
      const matchCat =
        selectedCats.length === 0 ||
        selectedCats.some((sc) => catName.toLowerCase().includes(sc) || sc.includes(catName.toLowerCase()));
      if (!matchCat) return;

      const countA = evtsA.filter((e) => getEventButtonName(e) === catName).length;
      const countB = evtsB.filter((e) => getEventButtonName(e) === catName).length;
      if (countA > 0 || countB > 0) {
        metrics.push({ label: catName.toUpperCase(), valA: countA, valB: countB });
      }
    });

    return { teamA, teamB, evtsA, evtsB, metrics };
  }, [events, availableTeams, teamsList]);

  // Extract distinct Players list (filtered by selectedTeam if applicable)
  const playersList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      if (selectedTeam !== 'todos' && evt.team_name !== selectedTeam) return;
      if (evt.player_name && evt.player_name !== 'Sin Asignar' && evt.player_name !== 'Sin asignar') {
        set.add(evt.player_name);
      }
    });
    return Array.from(set).sort();
  }, [events, selectedTeam]);

  // Base Events Filtered by Team & Player
  const filteredByTeamAndPlayer = useMemo(() => {
    return events.filter((evt) => {
      const matchTeam = selectedTeam === 'todos' || evt.team_name === selectedTeam;
      const matchPlayer = selectedPlayer === 'todos' || evt.player_name === selectedPlayer;
      return matchTeam && matchPlayer;
    });
  }, [events, selectedTeam, selectedPlayer]);

  // Extract all distinct Button Names present in team/player events with their count and color
  const buttonTabsMap = useMemo(() => {
    const map: Record<string, { count: number; colorHex: string }> = {};
    filteredByTeamAndPlayer.forEach((evt) => {
      const bName = getEventButtonName(evt);
      const bColor = getEventButtonColorHex(evt, buttons);
      if (!map[bName]) {
        map[bName] = { count: 0, colorHex: bColor };
      }
      map[bName].count++;
    });
    return map;
  }, [filteredByTeamAndPlayer, buttons]);

  const buttonNamesList = useMemo(() => {
    return Object.keys(buttonTabsMap).sort();
  }, [buttonTabsMap]);

  // Overall Quick Metrics for Team/Player selection
  const { successCount, failCount, periodCounts } = useMemo(() => {
    let succ = 0;
    let fail = 0;
    const perCounts: Record<number, number> = { 1: 0, 2: 0 };

    filteredByTeamAndPlayer.forEach((evt) => {
      const outcome = (evt.outcome || '').toLowerCase();
      if (
        outcome.includes('éxito') ||
        outcome.includes('exito') ||
        outcome.includes('ganado') ||
        outcome.includes('clave') ||
        outcome.includes('gol')
      ) {
        succ++;
      } else if (
        outcome.includes('fallido') ||
        outcome.includes('perdido') ||
        outcome.includes('pérdida') ||
        outcome.includes('falta')
      ) {
        fail++;
      }

      const p = evt.period || 1;
      perCounts[p] = (perCounts[p] || 0) + 1;
    });

    return {
      successCount: succ,
      failCount: fail,
      periodCounts: perCounts,
    };
  }, [filteredByTeamAndPlayer]);

  const totalOutcomes = successCount + failCount;
  const successPct = totalOutcomes > 0 ? Math.round((successCount / totalOutcomes) * 100) : 0;

  // Filtered Events for the Active Button Tab
  const buttonEvents = useMemo(() => {
    if (activeButton === 'todas') return filteredByTeamAndPlayer;
    return filteredByTeamAndPlayer.filter((e) => getEventButtonName(e) === activeButton);
  }, [filteredByTeamAndPlayer, activeButton]);

  // Events split by Team A and Team B for Dual Pitch view
  const eventsForTeamA = useMemo(() => {
    const teamA = comparisonData.teamA;
    return events.filter((e) => {
      const matchTeam = e.team_name === teamA;
      const matchBtn = activeButton === 'todas' || getEventButtonName(e) === activeButton;
      const matchPlayer = selectedPlayer === 'todos' || e.player_name === selectedPlayer;
      return matchTeam && matchBtn && matchPlayer;
    });
  }, [events, comparisonData.teamA, activeButton, selectedPlayer]);

  const eventsForTeamB = useMemo(() => {
    const teamB = comparisonData.teamB;
    return events.filter((e) => {
      const matchTeam = e.team_name === teamB;
      const matchBtn = activeButton === 'todas' || getEventButtonName(e) === activeButton;
      const matchPlayer = selectedPlayer === 'todos' || e.player_name === selectedPlayer;
      return matchTeam && matchBtn && matchPlayer;
    });
  }, [events, comparisonData.teamB, activeButton, selectedPlayer]);

  // Descriptors Statistics for the Active Button Tab
  const descriptorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalDescCount = 0;

    buttonEvents.forEach((evt) => {
      const descList: string[] = [];

      if (Array.isArray(evt.metadata?.descriptors)) {
        descList.push(...evt.metadata.descriptors);
      } else if (evt.metadata?.descriptor) {
        descList.push(evt.metadata.descriptor);
      }

      if (evt.subcategory) {
        evt.subcategory
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((d) => descList.push(d));
      }

      if (evt.outcome) {
        descList.push(`Resultado: ${evt.outcome}`);
      }

      if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
      if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);

      const uniqueInEvent = Array.from(new Set(descList));
      uniqueInEvent.forEach((desc) => {
        counts[desc] = (counts[desc] || 0) + 1;
        totalDescCount++;
      });
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: buttonEvents.length > 0 ? Math.round((count / buttonEvents.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { list: sorted, total: totalDescCount };
  }, [buttonEvents]);

  // Filter Pitch Events by selected descriptor badge (if active)
  const pitchEvents = useMemo(() => {
    if (!selectedDescriptor) return buttonEvents;
    return buttonEvents.filter((evt) => {
      const descList: string[] = [];
      if (Array.isArray(evt.metadata?.descriptors)) descList.push(...evt.metadata.descriptors);
      if (evt.subcategory) descList.push(...evt.subcategory.split(',').map((s) => s.trim()));
      if (evt.outcome) descList.push(`Resultado: ${evt.outcome}`);
      if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
      if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);
      return descList.includes(selectedDescriptor);
    });
  }, [buttonEvents, selectedDescriptor]);

  // Play Event Video Immediately in the Pop-Up Window
  const playEventNow = (evt: NormalizedEvent) => {
    setActivePlayingEvent(evt);
    if (onSeekToEvent) {
      onSeekToEvent(evt);
    } else {
      openClipPopupWindow({
        event: evt,
        match,
        periodVideoOffsets,
        videoUrl,
      });
    }
  };

  const handleDescriptorClick = (descName: string) => {
    const isSelected = selectedDescriptor === descName;
    const newSelected = isSelected ? null : descName;
    setSelectedDescriptor(newSelected);

    if (newSelected) {
      const matchingEvts = buttonEvents.filter((evt) => {
        const list = getEventDescriptorsList(evt);
        return list.includes(newSelected);
      });

      if (matchingEvts.length > 0) {
        setSelectedClipEvents(matchingEvts);
        const firstEvt = matchingEvts[0];
        playEventNow(firstEvt);
      }
    }
  };

  const handlePlayerClick = (playerName: string) => {
    const matchingEvts = buttonEvents.filter((evt) => evt.player_name === playerName);
    if (matchingEvts.length > 0) {
      setSelectedClipEvents(matchingEvts);
      const firstEvt = matchingEvts[0];
      playEventNow(firstEvt);
    }
  };

  const activeDescriptors = useMemo(() => {
    if (!activePlayingEvent) return [];
    return getEventDescriptorsList(activePlayingEvent);
  }, [activePlayingEvent]);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              ESTADÍSTICAS, CAMPOGRAMA Y FILTROS TÁCTICOS
            </h3>
            <p className="text-[11px] text-slate-400">
              Campograma por equipo, mapa de calor de llegada, flechas y coloreado de zonas con porcentaje
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Single Pitch vs Dual Pitch (1 por Equipo) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPitchLayout('single')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                pitchLayout === 'single'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏟️ 1 Campo</span>
            </button>
            <button
              type="button"
              onClick={() => setPitchLayout('dual_team')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                pitchLayout === 'dual_team'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>👥 2 Campos (Por Equipo)</span>
            </button>
          </div>

          <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black">
            {filteredByTeamAndPlayer.length} / {totalEvents} ACCIONES
          </span>
        </div>
      </div>

      {totalEvents === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800/60">
          Aún no se han anotado acciones en este partido. Al presionar botones en la botonera, los datos y su campograma con colores aparecerán aquí.
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── SELECCIÓN VISUAL POR EQUIPO ── */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-100 uppercase tracking-wider font-black text-[11px]">
                  SELECCIONAR EQUIPO PARA VISUALIZAR CAMPOGRAMA Y ESTADÍSTICAS:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeamComparison(!showTeamComparison)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition flex items-center gap-1.5 cursor-pointer ${
                    showTeamComparison
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>⚔️ {showTeamComparison ? 'Ocultar Comparador H2H' : 'Mostrar Comparador H2H'}</span>
                </button>
                {selectedTeam !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam('todos');
                      setSelectedPlayer('todos');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-black border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Ver Todos los Equipos ({totalEvents})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedTeam('todos');
                  setSelectedPlayer('todos');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedTeam === 'todos'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-normal">🏟️</span>
                <span>Todos los Equipos</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    selectedTeam === 'todos' ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {totalEvents}
                </span>
              </button>

              {availableTeams.map((tName) => {
                const isSelected = selectedTeam === tName;
                const teamEventCount = events.filter((e) => e.team_name === tName).length;
                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(tName);
                      setSelectedPlayer('todos');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50 font-black'
                        : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <TeamLogo teamName={tName} size={22} />
                    <span className="truncate max-w-[170px]">{tName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-slate-950 text-emerald-300 font-bold' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {teamEventCount}
                    </span>
                  </button>
                );
              })}

              {playersList.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-800">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="todos">👤 Todos los jugadores ({playersList.length})</option>
                    {playersList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── COMPARADOR TÁCTICO POR EQUIPOS (BARRAS HORIZONTALES H2H) ── */}
          {showTeamComparison && (
            <div className="space-y-4 bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(comparisonData.teamA)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/60 transition cursor-pointer"
                  title={`Filtrar por ${comparisonData.teamA}`}
                >
                  <TeamLogo teamName={comparisonData.teamA} size={36} />
                  <div className="text-left">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Equipo Local / A</span>
                    <h4 className="font-black text-sm text-white truncate max-w-[180px]">{comparisonData.teamA}</h4>
                    <span className="text-[10px] font-mono font-extrabold text-cyan-300">
                      {comparisonData.evtsA.length} acciones ({totalEvents > 0 ? Math.round((comparisonData.evtsA.length / totalEvents) * 100) : 0}%)
                    </span>
                  </div>
                </button>

                <div className="text-center space-y-0.5">
                  <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs tracking-wider inline-flex items-center gap-1.5 shadow-md">
                    ⚔️ COMPARATIVO DE ACCIONES POR EQUIPO
                  </span>
                  <p className="text-[10px] text-slate-400">Barras horizontales comparativas (Izquierda vs Derecha)</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTeam(comparisonData.teamB)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/60 transition cursor-pointer flex-row-reverse text-right"
                  title={`Filtrar por ${comparisonData.teamB}`}
                >
                  <TeamLogo teamName={comparisonData.teamB} size={36} />
                  <div className="text-right">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Equipo Visitante / B</span>
                    <h4 className="font-black text-sm text-white truncate max-w-[180px]">{comparisonData.teamB}</h4>
                    <span className="text-[10px] font-mono font-extrabold text-amber-300">
                      {comparisonData.evtsB.length} acciones ({totalEvents > 0 ? Math.round((comparisonData.evtsB.length / totalEvents) * 100) : 0}%)
                    </span>
                  </div>
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {comparisonData.metrics.map((m) => {
                  const sum = m.valA + m.valB;
                  const pctA = sum > 0 ? Math.round((m.valA / sum) * 100) : 50;
                  const pctB = sum > 0 ? Math.round((m.valB / sum) * 100) : 50;
                  const isWinnerA = m.valA > m.valB;
                  const isWinnerB = m.valB > m.valA;

                  return (
                    <div key={m.label} className="space-y-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <div className="grid grid-cols-12 items-center text-xs">
                        <div className="col-span-3 text-left font-mono font-black flex items-center gap-1.5">
                          <span className={`text-sm ${isWinnerA ? 'text-cyan-300 font-black scale-105' : 'text-slate-300'}`}>
                            {m.valA} {m.isPercentage ? '%' : ''}
                          </span>
                          {!m.isPercentage && sum > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">({pctA}%)</span>
                          )}
                        </div>

                        <div className="col-span-6 text-center font-extrabold text-slate-200 uppercase tracking-wider text-[11px] truncate px-1">
                          {m.label}
                        </div>

                        <div className="col-span-3 text-right font-mono font-black flex items-center justify-end gap-1.5">
                          {!m.isPercentage && sum > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">({pctB}%)</span>
                          )}
                          <span className={`text-sm ${isWinnerB ? 'text-amber-300 font-black scale-105' : 'text-slate-300'}`}>
                            {m.valB} {m.isPercentage ? '%' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div className="flex justify-end h-full">
                          <div
                            className={`h-full rounded-l-full transition-all duration-500 ${
                              isWinnerA
                                ? 'bg-gradient-to-l from-cyan-400 via-emerald-400 to-emerald-500 shadow-md shadow-cyan-500/40'
                                : 'bg-cyan-600/70'
                            }`}
                            style={{ width: `${sum > 0 ? pctA : 0}%` }}
                          />
                        </div>

                        <div className="flex justify-start h-full">
                          <div
                            className={`h-full rounded-r-full transition-all duration-500 ${
                              isWinnerB
                                ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 shadow-md shadow-amber-500/40'
                                : 'bg-amber-600/70'
                            }`}
                            style={{ width: `${sum > 0 ? pctB : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── QUICK SUMMARY BAR ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Efectividad</div>
                <div className="text-sm font-black text-emerald-400">
                  {successPct}%{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({successCount}/{totalOutcomes})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">1ª Parte</div>
                <div className="text-sm font-black text-blue-300">
                  {periodCounts[1] || 0} <span className="text-[10px] text-slate-500">ev.</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">2ª Parte</div>
                <div className="text-sm font-black text-indigo-300">
                  {periodCounts[2] || 0} <span className="text-[10px] text-slate-500">ev.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── PESTAÑAS ORGANIZADAS POR BOTÓN ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-amber-400" />
                <span>Pestañas por Botón ({buttonNamesList.length + 1})</span>
              </span>
              {activeButton !== 'todas' && (
                <button
                  onClick={() => {
                    setActiveButton('todas');
                    setSelectedDescriptor(null);
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                >
                  Ver Todos los Botones
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              <button
                onClick={() => {
                  setActiveButton('todas');
                  setSelectedDescriptor(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeButton === 'todas'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>📊 Resumen General</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900/60 text-[10px] font-mono">
                  {filteredByTeamAndPlayer.length}
                </span>
              </button>

              {buttonNamesList.map((bName) => {
                const info = buttonTabsMap[bName];
                const isActive = activeButton === bName;
                return (
                  <button
                    key={bName}
                    onClick={() => {
                      setActiveButton(bName);
                      setSelectedDescriptor(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white border-amber-400/80 shadow-lg shadow-amber-500/10 font-black'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: info.colorHex }}
                    />
                    <span>{bName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {info.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── MAIN CONTENT GRID: CAMPOGRAMAS + DESCRIPTORES ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── COLUMNA IZQUIERDA: CAMPOGRAMA(S) TÁCTICO(S) ── */}
            <div className={`${pitchLayout === 'dual_team' ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-4`}>
              {/* DUAL PITCH MODE (1 CAMPOGRAMA POR EQUIPO LADO A LADO) */}
              {pitchLayout === 'dual_team' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campograma Equipo A (Local) */}
                  <TacticalPitchView
                    events={eventsForTeamA}
                    teamName={comparisonData.teamA}
                    title={comparisonData.teamA}
                    subtitle={`Acciones de "${activeButton}": ${eventsForTeamA.length}`}
                    badgeCount={eventsForTeamA.length}
                    buttons={buttons}
                    activeButton={activeButton}
                    activePlayingEvent={activePlayingEvent}
                    onPlayEvent={playEventNow}
                    onSelectCluster={setSelectedClipEvents}
                    orientation={orientation}
                    onToggleOrientation={() => setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')}
                    displayMode={displayMode}
                    onChangeDisplayMode={setDisplayMode}
                    heatmapTarget={heatmapTarget}
                    onChangeHeatmapTarget={setHeatmapTarget}
                    zoneType={zoneType}
                    onChangeZoneType={setZoneType}
                    compact={true}
                  />

                  {/* Campograma Equipo B (Visitante) */}
                  <TacticalPitchView
                    events={eventsForTeamB}
                    teamName={comparisonData.teamB}
                    title={comparisonData.teamB}
                    subtitle={`Acciones de "${activeButton}": ${eventsForTeamB.length}`}
                    badgeCount={eventsForTeamB.length}
                    buttons={buttons}
                    activeButton={activeButton}
                    activePlayingEvent={activePlayingEvent}
                    onPlayEvent={playEventNow}
                    onSelectCluster={setSelectedClipEvents}
                    orientation={orientation}
                    onToggleOrientation={() => setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')}
                    displayMode={displayMode}
                    onChangeDisplayMode={setDisplayMode}
                    heatmapTarget={heatmapTarget}
                    onChangeHeatmapTarget={setHeatmapTarget}
                    zoneType={zoneType}
                    onChangeZoneType={setZoneType}
                    compact={true}
                  />
                </div>
              ) : (
                /* SINGLE PITCH MODE */
                <TacticalPitchView
                  events={pitchEvents}
                  teamName={selectedTeam === 'todos' ? 'Todos los Equipos' : selectedTeam}
                  title={selectedTeam === 'todos' ? 'Campograma General' : `Campograma: ${selectedTeam}`}
                  subtitle={`Botón "${activeButton}" • ${pitchEvents.length} acciones`}
                  badgeCount={pitchEvents.length}
                  buttons={buttons}
                  activeButton={activeButton}
                  activePlayingEvent={activePlayingEvent}
                  onPlayEvent={playEventNow}
                  onSelectCluster={setSelectedClipEvents}
                  orientation={orientation}
                  onToggleOrientation={() => setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')}
                  displayMode={displayMode}
                  onChangeDisplayMode={setDisplayMode}
                  heatmapTarget={heatmapTarget}
                  onChangeHeatmapTarget={setHeatmapTarget}
                  zoneType={zoneType}
                  onChangeZoneType={setZoneType}
                  compact={false}
                />
              )}

              {/* ── CARACTERÍSTICAS AUTOMÁTICAS DE LA ACCIÓN EN REPRODUCCIÓN ── */}
              {activePlayingEvent ? (
                <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl space-y-2.5 animate-fade-in text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 animate-pulse">
                        <Film className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                          <span>REPRODUCIENDO ACCIÓN</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                            {formatTimeStr(activePlayingEvent)}
                          </span>
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playEventNow(activePlayingEvent)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Rebobinar Clip</span>
                      </button>
                      {onClearExternalPlayingEvent && (
                        <button
                          onClick={() => {
                            setActivePlayingEvent(null);
                            onClearExternalPlayingEvent();
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          title="Cerrar detalles de la acción"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multiple Clips Selector Pills if cluster has > 1 */}
                  {selectedClipEvents && selectedClipEvents.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Clips en esta zona ({selectedClipEvents.length}):</span>
                      {selectedClipEvents.map((evt, idx) => {
                        const isCurrent = activePlayingEvent.event_id === evt.event_id;
                        return (
                          <button
                            key={evt.event_id || idx}
                            onClick={() => playEventNow(evt)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-500 text-slate-950 font-black shadow'
                                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                            }`}
                          >
                            <span>Clip {idx + 1} ({formatTimeStr(evt)})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Main Event Metadata / Characteristics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-0.5">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Botón Acción</span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getEventButtonColorHex(activePlayingEvent, buttons) }}
                        />
                        <span className="font-black text-slate-100 truncate">
                          {getEventButtonName(activePlayingEvent)}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Jugador / Equipo</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo teamName={activePlayingEvent.team_name} size={18} />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-100 text-xs truncate leading-tight">{activePlayingEvent.player_name}</p>
                          <p className="text-[10px] text-cyan-300 font-bold truncate leading-tight">{activePlayingEvent.team_name || 'Sin equipo'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Resultado</span>
                      <p className="font-bold text-amber-400 truncate">
                        {activePlayingEvent.outcome || activePlayingEvent.category || 'Registrado'}
                      </p>
                    </div>
                  </div>

                  {/* Descriptores de la acción */}
                  {activeDescriptors.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Descriptores de la Acción:</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeDescriptors.map((d, i) => {
                          const colonIdx = d.indexOf(':');
                          const displayVal = colonIdx !== -1 ? d.slice(colonIdx + 1).trim() : d.trim();
                          return (
                            <span
                              key={i}
                              title={d}
                              className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200"
                            >
                              {displayVal}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center italic">
                  💡 Haz clic en cualquier flecha, punto, mapa de calor o zona: el vídeo saltará al minuto exacto y sus características se mostrarán aquí
                </p>
              )}
            </div>

            {/* ── COLUMNA DERECHA: DESCRIPTORES + TOP JUGADORES ── */}
            <div className={`${pitchLayout === 'dual_team' ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-4`}>
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Descriptores de {activeButton}</span>
                  </h4>

                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    {descriptorStats.list.length} etiquetas
                  </span>
                </div>

                {descriptorStats.list.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No se han registrado descriptores específicos para las acciones de este botón.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {descriptorStats.list.map((desc) => {
                      const isSelected = selectedDescriptor === desc.name;
                      return (
                        <button
                          key={desc.name}
                          onClick={() => handleDescriptorClick(desc.name)}
                          className={`w-full text-left p-2 rounded-xl transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/50'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold truncate pr-2">{desc.name}</span>
                            <span className="font-mono text-[11px] font-extrabold text-emerald-400 shrink-0">
                              {desc.count} <span className="text-slate-400 font-normal">({desc.pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, desc.pct)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Active Players for this Selection */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>Jugadores con {activeButton === 'todas' ? 'acciones' : `botón ${activeButton}`}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {Object.entries(
                    buttonEvents.reduce((acc, evt) => {
                      const p = evt.player_name || 'Sin Asignar';
                      acc[p] = (acc[p] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([pName, count]) => (
                      <button
                        key={pName}
                        onClick={() => handlePlayerClick(pName)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-xs transition cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-200 font-medium">{pName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                          {count}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
