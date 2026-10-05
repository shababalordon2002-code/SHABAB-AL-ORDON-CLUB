'use client';

import React, { useState, useMemo } from 'react';
import { NormalizedEvent } from '@/types';
import { ArrowUp, ArrowRight, Flame, Percent, Shield, Layers, Tag } from 'lucide-react';
import { TeamLogo } from '@/components/player/PlayerBadge';
import {
  HITOS_3_ZONES,
  BANDAS_3_ZONES,
  TACTICAL_9_ZONES,
  REMATE_ZONES,
  PitchZoneDef,
  PitchDisplayMode,
  HeatmapTarget,
  ZoneTypeSelection,
  getEventDescriptorsList,
  formatTimeStr,
} from '@/components/botonera/BotoneraLiveStats';

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
  const [displayMode, setDisplayMode] = useState<PitchDisplayMode>('vectors');
  const [heatmapTarget, setHeatmapTarget] = useState<HeatmapTarget>('destination');
  const [zoneType, setZoneType] = useState<ZoneTypeSelection>('hitos3');
  const [selectedTeam, setSelectedTeam] = useState<string>('todos');

  const [hoveredEvent, setHoveredEvent] = useState<NormalizedEvent | null>(null);
  const [hoveredZone, setHoveredZone] = useState<{ name: string; pct: number; count: number } | null>(null);
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ pct: number; count: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isVertical = orientation === 'vertical';

  // SVG dimensions
  const width = isVertical ? 680 : 1050;
  const height = isVertical ? 1050 : 680;
  const margin = 30;

  // Extract distinct Teams list
  const teamsList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      if (evt.team_name) set.add(evt.team_name);
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedTeam === 'todos') return events;
    return events.filter((e) => e.team_name === selectedTeam);
  }, [events, selectedTeam]);

  const activeZoneList: PitchZoneDef[] = useMemo(() => {
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

  const getSvgCoords = (x: number | null, y: number | null) => {
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;

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

  const getSvgRect = (minX: number, maxX: number, minY: number, maxY: number) => {
    if (isVertical) {
      const svgX = margin + (minY / 100) * (width - 2 * margin);
      const svgW = ((maxY - minY) / 100) * (width - 2 * margin);
      const svgY = margin + ((100 - maxX) / 100) * (height - 2 * margin);
      const svgH = ((maxX - minX) / 100) * (height - 2 * margin);
      return { x: svgX, y: svgY, width: svgW, height: svgH };
    } else {
      const svgX = margin + (minX / 100) * (width - 2 * margin);
      const svgW = ((maxX - minX) / 100) * (width - 2 * margin);
      const svgY = margin + (minY / 100) * (height - 2 * margin);
      const svgH = ((maxY - minY) / 100) * (height - 2 * margin);
      return { x: svgX, y: svgY, width: svgW, height: svgH };
    }
  };

  // Zone Stats Calculation
  const zoneStats = useMemo(() => {
    const counts: Record<string, NormalizedEvent[]> = {};
    activeZoneList.forEach((z) => {
      counts[z.id] = [];
    });

    filteredEvents.forEach((evt) => {
      const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? 50;
      const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? 50;
      const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
      const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

      const evalX = heatmapTarget === 'destination' && endX !== null ? endX : startX;
      const evalY = heatmapTarget === 'destination' && endY !== null ? endY : startY;

      let matched = activeZoneList.find((z) => z.name === evt.metadata?.zone);
      if (!matched) {
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

    const total = filteredEvents.length;
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
  }, [filteredEvents, activeZoneList, heatmapTarget]);

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

    filteredEvents.forEach((evt) => {
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
    const total = filteredEvents.length;

    return grid.map((c) => ({
      ...c,
      count: c.events.length,
      pct: total > 0 ? Math.round((c.events.length / total) * 100) : 0,
      intensity: c.events.length / maxCount,
    }));
  }, [filteredEvents, heatmapTarget]);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, evt: NormalizedEvent) => {
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

  return (
    <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
      {/* ── HEADER CONTROLS ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
        {/* Team Selector Filter */}
        {teamsList.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedTeam('todos')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                selectedTeam === 'todos'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850'
              }`}
            >
              <span>🏟️ Todos ({events.length})</span>
            </button>
            {teamsList.map((t) => {
              const isSel = selectedTeam === t;
              const count = events.filter((e) => e.team_name === t).length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTeam(t)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    isSel
                      ? 'bg-emerald-600 text-slate-950 border-emerald-400 font-black shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <TeamLogo teamName={t} size={16} />
                  <span className="truncate max-w-[120px]">{t}</span>
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* View Mode & Orientation Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Main Visual Mode Pills */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode('vectors')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'vectors'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏹 Flechas</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('heatmap')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'heatmap'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Mapa Calor</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('zones')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'zones'
                  ? 'bg-indigo-500 text-white font-black shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent className="w-3 h-3" />
              <span>Zonas (%)</span>
            </button>
          </div>

          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                isVertical ? 'bg-emerald-600 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ↕️ Vert.
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                !isVertical ? 'bg-emerald-600 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ↔️ Horiz.
            </button>
          </div>
        </div>
      </div>

      {/* Sub-selectors for Heatmap or Zones */}
      {displayMode === 'heatmap' && (
        <div className="flex items-center justify-between text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/20">
          <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Configuración Mapa de Calor:</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => setHeatmapTarget('destination')}
              className={`px-2 py-0.5 rounded transition ${
                heatmapTarget === 'destination' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300'
              }`}
            >
              🎯 Fin de Flecha / Llegada
            </button>
            <button
              type="button"
              onClick={() => setHeatmapTarget('origin')}
              className={`px-2 py-0.5 rounded transition ${
                heatmapTarget === 'origin' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300'
              }`}
            >
              📍 Origen / Inicio
            </button>
          </div>
        </div>
      )}

      {displayMode === 'zones' && (
        <div className="flex items-center justify-between text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-indigo-500/20">
          <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-indigo-400" />
            <span>División de Zonas (%):</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => setZoneType('hitos3')}
              className={`px-2 py-0.5 rounded transition ${
                zoneType === 'hitos3' ? 'bg-indigo-500 text-white font-black' : 'text-slate-300'
              }`}
            >
              3 Hitos (Inicio/Medio/Fin)
            </button>
            <button
              type="button"
              onClick={() => setZoneType('bandas')}
              className={`px-2 py-0.5 rounded transition ${
                zoneType === 'bandas' ? 'bg-indigo-500 text-white font-black' : 'text-slate-300'
              }`}
            >
              3 Pasillos (Bandas/Centro)
            </button>
            <button
              type="button"
              onClick={() => setZoneType('tactical9')}
              className={`px-2 py-0.5 rounded transition ${
                zoneType === 'tactical9' ? 'bg-indigo-500 text-white font-black' : 'text-slate-300'
              }`}
            >
              9 Zonas
            </button>
          </div>
        </div>
      )}

      {/* Main Pitch Container */}
      <div
        className={`relative w-full mx-auto bg-emerald-950 rounded-2xl border-2 border-emerald-800/80 shadow-2xl select-none group flex ${
          isVertical ? 'flex-row max-w-md max-h-[580px]' : 'flex-col'
        }`}
      >
        <div className={`relative flex-1 ${isVertical ? 'aspect-[68/105]' : 'aspect-[105/68]'}`}>
          {/* Tactical Grass Stripes Overlay */}
          <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90" />
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full block relative z-10"
            onMouseLeave={() => {
              setHoveredEvent(null);
              setHoveredZone(null);
              setHoveredHeatCell(null);
            }}
          >
            {/* PITCH MARKINGS */}
            <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
              <rect x={margin} y={margin} width={width - 2 * margin} height={height - 2 * margin} rx="4" />
              {isVertical ? (
                <line x1={margin} y1={height / 2} x2={width - margin} y2={height / 2} />
              ) : (
                <line x1={width / 2} y1={margin} x2={width / 2} y2={height - margin} />
              )}
              <circle cx={width / 2} cy={height / 2} r="91.5" />
              <circle cx={width / 2} cy={height / 2} r="3.5" fill="rgba(255, 255, 255, 0.9)" />

              {/* Penalty Areas */}
              {isVertical ? (
                <>
                  <rect x={width / 2 - 165} y={margin} width="330" height="165" />
                  <rect x={width / 2 - 73} y={margin} width="146" height="55" />
                  <circle cx={width / 2} cy={margin + 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
                  <rect x={width / 2 - 165} y={height - margin - 165} width="330" height="165" />
                  <rect x={width / 2 - 73} y={height - margin - 55} width="146" height="55" />
                  <circle cx={width / 2} cy={height - margin - 110} r="3" fill="rgba(255, 255, 255, 0.9)" />
                </>
              ) : (
                <>
                  <rect x={margin} y={height / 2 - 165} width="165" height="330" />
                  <rect x={margin} y={height / 2 - 73} width="55" height="146" />
                  <circle cx={margin + 110} cy={height / 2} r="3" fill="rgba(255, 255, 255, 0.9)" />
                  <rect x={width - margin - 165} y={height / 2 - 165} width="165" height="330" />
                  <rect x={width - margin - 55} y={height / 2 - 73} width="55" height="146" />
                  <circle cx={width - margin - 110} cy={height / 2} r="3" fill="rgba(255, 255, 255, 0.9)" />
                </>
              )}
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

            {/* MODE: ZONAS CON PORCENTAJES COLOREADOS */}
            {displayMode === 'zones' && (
              <g className="animate-fade-in">
                {zoneStats.map((z) => {
                  const r = getSvgRect(z.minX, z.maxX, z.minY, z.maxY);

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
                      onClick={() => {
                        if (z.events.length > 0) onSelectEvent(z.events[0]);
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

                      <g className="pointer-events-none select-none">
                        <rect
                          x={centerX - 55}
                          y={centerY - 25}
                          width={110}
                          height={50}
                          rx={10}
                          fill="rgba(2, 6, 23, 0.85)"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          className="shadow-2xl"
                        />
                        <text x={centerX} y={centerY - 10} fill="#94a3b8" fontSize={9} fontWeight="800" textAnchor="middle" className="uppercase tracking-wider">
                          {z.shortName}
                        </text>
                        <text
                          x={centerX}
                          y={centerY + 12}
                          fill={z.pct >= 45 ? '#34d399' : z.pct >= 25 ? '#fbbf24' : z.pct > 0 ? '#60a5fa' : '#64748b'}
                          fontSize={17}
                          fontWeight="900"
                          textAnchor="middle"
                          className="font-mono tracking-tight"
                        >
                          {z.pct}%
                        </text>
                        <text x={centerX} y={centerY + 21} fill="#cbd5e1" fontSize={8} fontWeight="600" textAnchor="middle">
                          {z.count} {z.count === 1 ? 'acción' : 'acciones'}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* MODE: MAPA DE CALOR (HEATMAP) */}
            {displayMode === 'heatmap' && (
              <g className="animate-fade-in">
                {heatmapData.map((cell) => {
                  if (cell.count === 0) return null;
                  const r = getSvgRect(cell.minX, cell.maxX, cell.minY, cell.maxY);

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
                      onClick={() => {
                        if (cell.events.length > 0) onSelectEvent(cell.events[0]);
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
                      {cell.pct >= 5 && (
                        <g className="pointer-events-none select-none">
                          <text x={centerX} y={centerY + 2} fill="#ffffff" fontSize={13} fontWeight="900" textAnchor="middle" className="font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {cell.pct}%
                          </text>
                          <text x={centerX} y={centerY + 14} fill="rgba(255, 255, 255, 0.85)" fontSize={8} fontWeight="800" textAnchor="middle">
                            ({cell.count})
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* MODE: FLECHAS Y PUNTOS */}
            {displayMode === 'vectors' && (
              <g className="animate-fade-in">
                {filteredEvents.map((evt) => {
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
                      {isArrow && endCoords && (
                        <g>
                          <line
                            x1={startCoords.x}
                            y1={startCoords.y}
                            x2={endCoords.x}
                            y2={endCoords.y}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? '5' : '3.5'}
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

                      {!isArrow && (
                        <g>
                          {isSelected && (
                            <circle cx={startCoords.x} cy={startCoords.y} r="14" fill="rgba(245, 158, 11, 0.4)" className="animate-ping" />
                          )}
                          <circle
                            cx={startCoords.x}
                            cy={startCoords.y}
                            r={isSelected ? 8 : 6.5}
                            fill={evt.outcome === 'Gol' || catLower.includes('gol') ? '#10b981' : isShot ? '#f59e0b' : isRecovery ? '#38bdf8' : '#cbd5e1'}
                            stroke="#022c22"
                            strokeWidth="2"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {/* HOVER TOOLTIP */}
          {hoveredEvent && (
            <div
              className="absolute z-[150] pointer-events-none p-3.5 rounded-2xl bg-slate-950/95 border border-emerald-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-44 text-slate-100 animate-fade-in"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                <span className="font-bold text-emerald-400">{hoveredEvent.category || hoveredEvent.event_type}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {formatTimeStr(hoveredEvent)}
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

              {getEventDescriptorsList(hoveredEvent).length > 0 && (
                <div className="pt-1 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Descriptores:</span>
                  <div className="flex flex-wrap gap-1">
                    {getEventDescriptorsList(hoveredEvent).map((d, i) => {
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
              )}
            </div>
          )}

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
    </div>
  );
};
