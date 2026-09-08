'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TeamLineupConfig, TeamCircleStyle, LineupPlayerItem } from '@/types';
import { dbStore } from '@/lib/store/db-store';
import { X, Check, Shield, Users, Palette, Sparkles, Plus, Trash2, Layout, User } from 'lucide-react';

export const FORMATION_PRESETS = [
  '4-3-3',
  '4-4-2',
  '4-2-3-1',
  '3-5-2',
  '5-3-2',
  '4-1-4-1',
  '3-4-3',
  '4-5-1',
  'Personalizado',
];

export const COLOR_PRESETS = [
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Verde Esmeralda', hex: '#10b981' },
  { name: 'Azul Táctico', hex: '#3b82f6' },
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Negro Carbón', hex: '#18181b' },
  { name: 'Amarillo Neón', hex: '#eab308' },
  { name: 'Naranja Fuego', hex: '#f97316' },
  { name: 'Cian Neón', hex: '#06b6d4' },
  { name: 'Púrpura', hex: '#a855f7' },
  { name: 'Rosa Neón', hex: '#ec4899' },
];

export interface FormationPosition {
  x: number; // percentage from left
  y: number; // percentage from top
  role: string;
}

export function getFormationPositions(formation: string): FormationPosition[] {
  switch (formation) {
    case '4-4-2':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 16, y: 70, role: 'LD' },
        { x: 38, y: 74, role: 'DFC' },
        { x: 62, y: 74, role: 'DFC' },
        { x: 84, y: 70, role: 'LI' },
        { x: 16, y: 46, role: 'MD' },
        { x: 38, y: 50, role: 'MC' },
        { x: 62, y: 50, role: 'MC' },
        { x: 84, y: 46, role: 'MI' },
        { x: 38, y: 22, role: 'DC' },
        { x: 62, y: 22, role: 'DC' },
      ];
    case '4-2-3-1':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 16, y: 70, role: 'LD' },
        { x: 38, y: 74, role: 'DFC' },
        { x: 62, y: 74, role: 'DFC' },
        { x: 84, y: 70, role: 'LI' },
        { x: 38, y: 56, role: 'MCD' },
        { x: 62, y: 56, role: 'MCD' },
        { x: 20, y: 36, role: 'ED' },
        { x: 50, y: 36, role: 'MCO' },
        { x: 80, y: 36, role: 'EI' },
        { x: 50, y: 18, role: 'DC' },
      ];
    case '3-5-2':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 25, y: 73, role: 'DFC' },
        { x: 50, y: 76, role: 'DFC' },
        { x: 75, y: 73, role: 'DFC' },
        { x: 12, y: 48, role: 'CAD' },
        { x: 35, y: 52, role: 'MC' },
        { x: 50, y: 56, role: 'MC' },
        { x: 65, y: 52, role: 'MC' },
        { x: 88, y: 48, role: 'CAI' },
        { x: 38, y: 20, role: 'DC' },
        { x: 62, y: 20, role: 'DC' },
      ];
    case '5-3-2':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 12, y: 66, role: 'CAD' },
        { x: 30, y: 73, role: 'DFC' },
        { x: 50, y: 76, role: 'DFC' },
        { x: 70, y: 73, role: 'DFC' },
        { x: 88, y: 66, role: 'CAI' },
        { x: 30, y: 48, role: 'MC' },
        { x: 50, y: 52, role: 'MC' },
        { x: 70, y: 48, role: 'MC' },
        { x: 38, y: 20, role: 'DC' },
        { x: 62, y: 20, role: 'DC' },
      ];
    case '4-1-4-1':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 16, y: 70, role: 'LD' },
        { x: 38, y: 74, role: 'DFC' },
        { x: 62, y: 74, role: 'DFC' },
        { x: 84, y: 70, role: 'LI' },
        { x: 50, y: 58, role: 'MCD' },
        { x: 16, y: 38, role: 'MD' },
        { x: 38, y: 40, role: 'MC' },
        { x: 62, y: 40, role: 'MC' },
        { x: 84, y: 38, role: 'MI' },
        { x: 50, y: 18, role: 'DC' },
      ];
    case '3-4-3':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 25, y: 73, role: 'DFC' },
        { x: 50, y: 76, role: 'DFC' },
        { x: 75, y: 73, role: 'DFC' },
        { x: 16, y: 48, role: 'MD' },
        { x: 38, y: 50, role: 'MC' },
        { x: 62, y: 50, role: 'MC' },
        { x: 84, y: 48, role: 'MI' },
        { x: 20, y: 22, role: 'ED' },
        { x: 50, y: 18, role: 'DC' },
        { x: 80, y: 22, role: 'EI' },
      ];
    case '4-5-1':
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 16, y: 70, role: 'LD' },
        { x: 38, y: 74, role: 'DFC' },
        { x: 62, y: 74, role: 'DFC' },
        { x: 84, y: 70, role: 'LI' },
        { x: 16, y: 46, role: 'MD' },
        { x: 32, y: 48, role: 'MC' },
        { x: 50, y: 52, role: 'MC' },
        { x: 68, y: 48, role: 'MC' },
        { x: 84, y: 46, role: 'MI' },
        { x: 50, y: 18, role: 'DC' },
      ];
    case '4-3-3':
    default:
      return [
        { x: 50, y: 88, role: 'POR' },
        { x: 16, y: 70, role: 'LD' },
        { x: 38, y: 74, role: 'DFC' },
        { x: 62, y: 74, role: 'DFC' },
        { x: 84, y: 70, role: 'LI' },
        { x: 30, y: 48, role: 'MC' },
        { x: 50, y: 52, role: 'MC' },
        { x: 70, y: 48, role: 'MC' },
        { x: 20, y: 22, role: 'ED' },
        { x: 50, y: 18, role: 'DC' },
        { x: 80, y: 22, role: 'EI' },
      ];
  }
}

export function TeamCircleIcon({
  style,
  number,
  size = 28,
}: {
  style?: TeamCircleStyle;
  number?: number | string;
  size?: number;
}) {
  const primary = style?.primaryColor || '#10b981';
  const secondary = style?.secondaryColor || '#ffffff';
  const pattern = style?.pattern || 'solid';

  if (pattern === 'striped') {
    return (
      <div
        className="rounded-full flex items-center justify-center font-black text-white shadow-md border border-slate-700/80 overflow-hidden shrink-0 relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `repeating-linear-gradient(45deg, ${primary}, ${primary} 5px, ${secondary} 5px, ${secondary} 10px)`,
          fontSize: `${Math.max(10, size * 0.42)}px`,
        }}
      >
        {number != null && <span className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] text-white font-mono">{number}</span>}
      </div>
    );
  }

  if (pattern === 'split') {
    return (
      <div
        className="rounded-full flex items-center justify-center font-black text-white shadow-md border border-slate-700/80 overflow-hidden shrink-0 relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `linear-gradient(90deg, ${primary} 50%, ${secondary} 50%)`,
          fontSize: `${Math.max(10, size * 0.42)}px`,
        }}
      >
        {number != null && <span className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] text-white font-mono">{number}</span>}
      </div>
    );
  }

  if (pattern === 'ring') {
    return (
      <div
        className="rounded-full flex items-center justify-center font-black text-white shadow-md overflow-hidden shrink-0 relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: primary,
          border: `3px solid ${secondary}`,
          fontSize: `${Math.max(10, size * 0.42)}px`,
        }}
      >
        {number != null && <span className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] text-white font-mono">{number}</span>}
      </div>
    );
  }

  // Solid (default)
  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white shadow-md border border-slate-700/80 overflow-hidden shrink-0 relative"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: primary,
        fontSize: `${Math.max(10, size * 0.42)}px`,
      }}
    >
      {number != null && <span className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] text-white font-mono">{number}</span>}
    </div>
  );
}

interface TeamLineupModalProps {
  teamName: string;
  teamLogo?: string;
  isHomeTeam: boolean;
  initialConfig?: TeamLineupConfig;
  onSave: (config: TeamLineupConfig) => void;
  onCancel: () => void;
}

export const TeamLineupModal: React.FC<TeamLineupModalProps> = ({
  teamName,
  teamLogo,
  isHomeTeam,
  initialConfig,
  onSave,
  onCancel,
}) => {
  const [formation, setFormation] = useState<string>(initialConfig?.formation || '4-3-3');

  // Circle style
  const [primaryColor, setPrimaryColor] = useState<string>(
    initialConfig?.circleStyle?.primaryColor || (isHomeTeam ? '#ef4444' : '#3b82f6')
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    initialConfig?.circleStyle?.secondaryColor || '#ffffff'
  );
  const [pattern, setPattern] = useState<'solid' | 'striped' | 'split' | 'ring'>(
    initialConfig?.circleStyle?.pattern || 'solid'
  );

  // Starters & Substitutes
  const [starters, setStarters] = useState<LineupPlayerItem[]>(
    initialConfig?.starters ||
      Array.from({ length: 11 }, (_, i) => ({
        id: `starter_${i + 1}`,
        number: i + 1,
        name: '',
        position: i === 0 ? 'POR' : 'JUG',
        isStarter: true,
      }))
  );

  const [substitutes, setSubstitutes] = useState<LineupPlayerItem[]>(
    initialConfig?.substitutes || []
  );

  // Selected player on campograma for quick edit
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Active tab: 'campograma' | 'list' | 'kit'
  const [activeTab, setActiveTab] = useState<'campograma' | 'list' | 'kit'>('campograma');

  // Custom position coordinates per player ID for drag and drop
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (initialConfig?.customPositions) return initialConfig.customPositions;
    const initialMap: Record<string, { x: number; y: number }> = {};
    if (initialConfig?.starters) {
      initialConfig.starters.forEach((p) => {
        if (p.x != null && p.y != null) {
          initialMap[p.id] = { x: p.x, y: p.y };
        }
      });
    }
    return initialMap;
  });
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const pitchRef = React.useRef<HTMLDivElement>(null);

  // Compute tactical formation string from player positions
  const computeDetectedFormation = (
    currentStarters: LineupPlayerItem[],
    customs: Record<string, { x: number; y: number }>,
    presets: FormationPosition[]
  ) => {
    if (currentStarters.length < 11) return 'Personalizado';

    const coords = currentStarters.slice(0, 11).map((player, idx) => {
      return customs[player.id] || presets[idx] || { x: 50, y: 50, role: 'JUG' };
    });

    const sorted = [...coords].sort((a, b) => b.y - a.y);
    const outfielders = sorted.slice(1);

    let def = 0;
    let mid = 0;
    let fwd = 0;

    outfielders.forEach((p) => {
      if (p.y >= 62) def++;
      else if (p.y >= 36) mid++;
      else fwd++;
    });

    return `${def}-${mid}-${fwd}`;
  };

  // Pointer event handlers for dragging player circle tokens across the pitch
  const handlePointerDown = (e: React.PointerEvent, playerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlayerId(playerId);
    setDraggingPlayerId(playerId);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingPlayerId || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100));

    const updatedCustoms = {
      ...customPositions,
      [draggingPlayerId]: { x: Math.round(x), y: Math.round(y) },
    };
    setCustomPositions(updatedCustoms);

    const positions = getFormationPositions(formation);
    const detected = computeDetectedFormation(starters, updatedCustoms, positions);
    setFormation(detected);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingPlayerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingPlayerId(null);
    }
  };

  // Handle system selection: automatically creates and inserts 11 starter circles on the pitch
  const handleSelectSystem = (fmt: string) => {
    setFormation(fmt);
    if (fmt !== 'Personalizado') {
      setCustomPositions({});
    }
    
    if (starters.length < 11) {
      const filled: LineupPlayerItem[] = Array.from({ length: 11 }, (_, i) => {
        const existing = starters[i];
        if (existing) return existing;
        return {
          id: `starter_${Date.now()}_${i + 1}`,
          number: i + 1,
          name: '',
          position: i === 0 ? 'POR' : 'JUG',
          isStarter: true,
        };
      });
      setStarters(filled);
      setSelectedPlayerId(filled[0].id);
    } else if (!selectedPlayerId && starters.length > 0) {
      setSelectedPlayerId(starters[0].id);
    }
  };

  // Clear pitch empty state handler
  const handleClearPitch = () => {
    setFormation('');
    setStarters([]);
    setCustomPositions({});
    setSelectedPlayerId(null);
  };

  // Load players from database (Página Jugadores)
  const handleLoadFromDatabase = () => {
    const allDbPlayers = dbStore.getPlayers();
    
    // Filter by team name or match team
    const teamDbPlayers = allDbPlayers.filter((p) => {
      if (!p.team_name) return true;
      return (
        p.team_name.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(p.team_name.toLowerCase())
      );
    });

    const targetList = teamDbPlayers.length > 0 ? teamDbPlayers : allDbPlayers;

    if (targetList.length === 0) {
      alert('No se encontraron jugadores guardados en la Base de Datos. Puedes añadirlos manualmente.');
      return;
    }

    const loadedStarters: LineupPlayerItem[] = targetList.slice(0, 11).map((p, idx) => ({
      id: p.id || `st_${idx}`,
      number: p.number || idx + 1,
      name: p.name,
      position: p.position || (idx === 0 ? 'POR' : 'JUG'),
      isStarter: true,
    }));

    // Fill up to 11 if less than 11
    while (loadedStarters.length < 11) {
      const idx = loadedStarters.length;
      loadedStarters.push({
        id: `st_fill_${idx}`,
        number: idx + 1,
        name: '',
        position: idx === 0 ? 'POR' : 'JUG',
        isStarter: true,
      });
    }

    const loadedSubs: LineupPlayerItem[] = targetList.slice(11).map((p, idx) => ({
      id: p.id || `sub_${idx}`,
      number: p.number || idx + 12,
      name: p.name,
      position: p.position || 'SUPL',
      isStarter: false,
    }));

    setStarters(loadedStarters);
    setSubstitutes(loadedSubs);
  };

  const handleAddSubstitute = () => {
    const nextNum = starters.length + substitutes.length + 1;
    setSubstitutes([
      ...substitutes,
      {
        id: `sub_${Date.now()}`,
        number: nextNum,
        name: '',
        position: 'SUPL',
        isStarter: false,
      },
    ]);
  };

  const handleSave = () => {
    const updatedStarters = starters.map((player, idx) => {
      const custom = customPositions[player.id];
      return {
        ...player,
        x: custom ? custom.x : player.x,
        y: custom ? custom.y : player.y,
      };
    });

    const config: TeamLineupConfig = {
      formation,
      circleStyle: {
        primaryColor,
        secondaryColor,
        pattern,
      },
      starters: updatedStarters,
      substitutes,
      customPositions,
    };
    onSave(config);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const circleStyle: TeamCircleStyle = {
    primaryColor,
    secondaryColor,
    pattern,
  };

  const positions = getFormationPositions(formation);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[999999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto animate-fade-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 p-1.5 flex items-center justify-center shrink-0">
              {teamLogo ? (
                <img src={teamLogo} alt={teamName} className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-white flex items-center gap-2">
                Alineación y Campograma: <span className="text-amber-300">{teamName}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pizarra táctica interactiva, formación ({formation}), dorsales y estilo de los círculos en directo.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Formation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('campograma')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'campograma'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Campograma Táctico</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Plantilla y Banquillo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'kit'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Círculos y Colores</span>
            </button>
          </div>

          {/* Quick Auto-load DB & Circle Preview */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadFromDatabase}
              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Carga los jugadores guardados en la BD (Página Jugadores)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Cargar de BD</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold">Círculo:</span>
              <TeamCircleIcon style={circleStyle} number={10} size={22} />
            </div>
          </div>

        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: CAMPOGRAMA TÁCTICO INTERACTIVO */}
          {activeTab === 'campograma' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Pitch Canvas (8 cols on LG) */}
              <div className="lg:col-span-8 flex flex-col items-center">
                
                {/* Selector de Sistema / Formación en el Campograma */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Sistema Táctico:</span>
                    <div className="flex flex-wrap gap-1">
                      {FORMATION_PRESETS.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleSelectSystem(fmt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                            formation === fmt
                              ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/40 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {starters.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPitch}
                      className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold transition flex items-center gap-1"
                      title="Vaciar los círculos del campo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Vaciar Campo</span>
                    </button>
                  )}
                </div>

                {/* THE SOCCER FIELD (CAMPOGRAMA VERTICAL CUADRICULADO) */}
                <div
                  ref={pitchRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative w-full max-w-[420px] aspect-[3/4] sm:aspect-[9/13] max-h-[540px] mx-auto rounded-2xl border-2 border-emerald-500/60 overflow-hidden shadow-2xl bg-emerald-950 select-none touch-none"
                >
                  
                  {/* Checkered Stadium Lawn Grid Pattern (Cuadriculado) */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(90deg, #064e3b, #064e3b 50px, #047857 50px, #047857 100px),
                        repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2) 40px, transparent 40px, transparent 80px)
                      `
                    }}
                  />

                  {/* Outer pitch line */}
                  <div className="absolute inset-3 border-2 border-emerald-400/50 rounded-sm pointer-events-none" />

                  {/* Center Line & Circle */}
                  <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-emerald-400/50 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-emerald-400/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-emerald-400/70 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                  {/* Bottom Penalty Area (Home/Defense Goal Area) */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[60%] h-[18%] border-2 border-emerald-400/50 border-b-0 pointer-events-none" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[30%] h-[8%] border-2 border-emerald-400/50 border-b-0 pointer-events-none" />
                  <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400/70 rounded-full pointer-events-none" />

                  {/* Top Penalty Area (Opponent Goal Area) */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[60%] h-[18%] border-2 border-emerald-400/50 border-t-0 pointer-events-none" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[30%] h-[8%] border-2 border-emerald-400/50 border-t-0 pointer-events-none" />
                  <div className="absolute top-[13%] left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400/70 rounded-full pointer-events-none" />

                  {/* Empty Pitch Overlay Prompt */}
                  {starters.length === 0 && (
                    <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                      <div className="bg-slate-900/95 border border-slate-700/90 rounded-2xl p-5 max-w-sm shadow-2xl space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner">
                          <Layout className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-white text-sm">El Campograma está Vacío</h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Haz clic en cualquier <strong className="text-amber-300">Sistema Táctico</strong> arriba (4-3-3, 4-4-2...) para insertar automáticamente los círculos en el campo.
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                          {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'].map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => handleSelectSystem(fmt)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow-md shadow-amber-950/40 cursor-pointer"
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 11 Starter Circle Tokens */}
                  {starters.slice(0, 11).map((player, idx) => {
                    const presetPos = positions[idx] || { x: 50, y: 50, role: 'JUG' };
                    const activePos = customPositions[player.id] || presetPos;
                    const isSelected = selectedPlayerId === player.id;
                    const isDragging = draggingPlayerId === player.id;

                    return (
                      <div
                        key={player.id || idx}
                        style={{
                          left: `${activePos.x}%`,
                          top: `${activePos.y}%`,
                        }}
                        onPointerDown={(e) => handlePointerDown(e, player.id)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-10 group ${
                          isDragging ? 'scale-125 z-40' : isSelected ? 'scale-120 z-30' : 'hover:scale-110'
                        }`}
                      >
                        {/* Token Circle with Dorsal */}
                        <div className={`p-0.5 rounded-full transition ${isSelected ? 'ring-4 ring-amber-400 shadow-xl scale-105' : 'hover:ring-2 hover:ring-white/60'}`}>
                          <TeamCircleIcon style={circleStyle} number={player.number || idx + 1} size={36} />
                        </div>

                        {/* Player Name / Position Tag on Pitch */}
                        <div
                          className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-center whitespace-nowrap shadow-md max-w-[105px] truncate transition ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-300'
                              : 'bg-slate-950/90 text-slate-100 border border-slate-700/80 group-hover:bg-slate-900'
                          }`}
                        >
                          {player.name || `Jugador #${player.number || idx + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Player Quick Editor Panel (4 cols on LG) */}
              <div className="lg:col-span-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <User className="w-4 h-4 text-amber-400" /> Edición del Círculo
                  </h4>
                  <span className="text-[10px] text-slate-400">Clic en un círculo</span>
                </div>

                {/* Edit Form for Selected Player */}
                {(() => {
                  const activeIdx = starters.findIndex((p) => p.id === selectedPlayerId);
                  const activePlayer = starters[activeIdx] || starters[0];
                  const allDbPlayers = dbStore.getPlayers();

                  if (!activePlayer) return null;

                  return (
                    <div className="space-y-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-2">
                        <TeamCircleIcon style={circleStyle} number={activePlayer.number || 1} size={34} />
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase">
                            Posición: {positions[activeIdx]?.role || 'Titular'}
                          </span>
                          <h5 className="text-xs font-bold text-white truncate max-w-[170px]">
                            {activePlayer.name || `Jugador #${activePlayer.number}`}
                          </h5>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {/* Selector desde la BD */}
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Elegir de la BD (Jugadores):
                          </label>
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedDbId = e.target.value;
                              if (!selectedDbId) return;
                              const dbPlayer = allDbPlayers.find((p) => p.id === selectedDbId);
                              if (dbPlayer) {
                                const updated = [...starters];
                                const targetIdx = activeIdx >= 0 ? activeIdx : 0;
                                updated[targetIdx] = {
                                  ...updated[targetIdx],
                                  name: dbPlayer.name,
                                  number: dbPlayer.number || updated[targetIdx].number,
                                };
                                setStarters(updated);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value="">-- Seleccionar Jugador de BD --</option>
                            {allDbPlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                #{p.number} {p.name} ({p.position || 'Jugador'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Entrada Manual */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">Dorsal:</label>
                            <input
                              type="text"
                              value={activePlayer.number}
                              onChange={(e) => {
                                const updated = [...starters];
                                const targetIdx = activeIdx >= 0 ? activeIdx : 0;
                                updated[targetIdx] = { ...updated[targetIdx], number: e.target.value };
                                setStarters(updated);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">Nombre Manual:</label>
                            <input
                              type="text"
                              placeholder="Nombre opcional"
                              value={activePlayer.name}
                              onChange={(e) => {
                                const updated = [...starters];
                                const targetIdx = activeIdx >= 0 ? activeIdx : 0;
                                updated[targetIdx] = { ...updated[targetIdx], name: e.target.value };
                                setStarters(updated);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick List of 11 Starters */}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  <span className="text-[11px] font-bold text-slate-400 block">Lista de Titulares:</span>
                  {starters.slice(0, 11).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${
                        selectedPlayerId === p.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-transparent'
                      }`}
                    >
                      <TeamCircleIcon style={circleStyle} number={p.number || idx + 1} size={20} />
                      <span className="w-8 font-mono text-[10px] text-slate-400">#{p.number || idx + 1}</span>
                      <span className="flex-1 truncate">{p.name || `Jugador #${p.number || idx + 1}`}</span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: LISTA COMPLETA Y BANQUILLO */}
          {activeTab === 'list' && (
            <div className="space-y-5">
              
              {/* Titulares */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <User className="w-3.5 h-3.5 text-amber-400" /> Titulares (11 Jugadores) — Formación {formation}
                  </h4>
                  <span className="text-[10px] text-slate-500">Formato editable rápido</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {starters.map((player, idx) => (
                    <div key={player.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <TeamCircleIcon style={circleStyle} number={player.number || idx + 1} size={26} />
                      
                      <input
                        type="text"
                        placeholder="Dorsal"
                        value={player.number}
                        onChange={(e) => {
                          const updated = [...starters];
                          updated[idx].number = e.target.value;
                          setStarters(updated);
                        }}
                        className="w-12 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold font-mono text-center focus:outline-none focus:border-amber-400"
                      />

                      <input
                        type="text"
                        placeholder="Nombre del Jugador (opcional)"
                        value={player.name}
                        onChange={(e) => {
                          const updated = [...starters];
                          updated[idx].name = e.target.value;
                          setStarters(updated);
                        }}
                        className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Suplentes */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Banquillo / Suplentes ({substitutes.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSubstitute}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 text-[11px] font-bold hover:bg-slate-700 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> + Añadir Suplente
                  </button>
                </div>

                {substitutes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {substitutes.map((player, idx) => (
                      <div key={player.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <TeamCircleIcon style={circleStyle} number={player.number || idx + 12} size={26} />
                        
                        <input
                          type="text"
                          placeholder="Dorsal"
                          value={player.number}
                          onChange={(e) => {
                            const updated = [...substitutes];
                            updated[idx].number = e.target.value;
                            setSubstitutes(updated);
                          }}
                          className="w-12 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold font-mono text-center focus:outline-none focus:border-amber-400"
                        />

                        <input
                          type="text"
                          placeholder="Nombre Suplente"
                          value={player.name}
                          onChange={(e) => {
                            const updated = [...substitutes];
                            updated[idx].name = e.target.value;
                            setSubstitutes(updated);
                          }}
                          className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setSubstitutes(substitutes.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
                          title="Eliminar suplente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic p-3 bg-slate-950 rounded-xl text-center">
                    No hay suplentes registrados. Pulsa &quot;+ Añadir Suplente&quot; para agregarlos al banquillo.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: DISEÑO DE CÍRCULOS Y COLORES DE EQUIPACIÓN */}
          {activeTab === 'kit' && (
            <div className="space-y-5">
              
              {/* Pattern Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">Estilo y Patrón Visual de los Círculos:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setPattern('solid')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                      pattern === 'solid'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TeamCircleIcon style={{ primaryColor, pattern: 'solid' }} number={7} size={32} />
                    <span className="text-xs font-bold">Liso / Unicolor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('striped')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                      pattern === 'striped'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TeamCircleIcon style={{ primaryColor, secondaryColor, pattern: 'striped' }} number={7} size={32} />
                    <span className="text-xs font-bold">A Rayas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('split')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                      pattern === 'split'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TeamCircleIcon style={{ primaryColor, secondaryColor, pattern: 'split' }} number={7} size={32} />
                    <span className="text-xs font-bold">Dos Colores (Mitad)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPattern('ring')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                      pattern === 'ring'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TeamCircleIcon style={{ primaryColor, secondaryColor, pattern: 'ring' }} number={7} size={32} />
                    <span className="text-xs font-bold">Aro Exterior</span>
                  </button>
                </div>
              </div>

              {/* Primary Color */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">Color Principal:</label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      className={`w-9 h-9 rounded-xl border transition shadow flex items-center justify-center ${
                        primaryColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-amber-400 scale-110 border-white'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {primaryColor.toLowerCase() === c.hex.toLowerCase() && <Check className="w-4 h-4 text-black drop-shadow" />}
                    </button>
                  ))}
                  
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[11px] text-slate-400 font-mono">Personalizado:</span>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-xl bg-transparent border border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              {pattern !== 'solid' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
                  <label className="block text-xs font-bold text-slate-200">Color Secundario (Rayas / Segunda Mitad / Aro):</label>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSecondaryColor(c.hex)}
                        className={`w-9 h-9 rounded-xl border transition shadow flex items-center justify-center ${
                          secondaryColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-amber-400 scale-110 border-white'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {secondaryColor.toLowerCase() === c.hex.toLowerCase() && <Check className="w-4 h-4 text-black drop-shadow" />}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[11px] text-slate-400 font-mono">Personalizado:</span>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-9 h-9 rounded-xl bg-transparent border border-slate-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <TeamCircleIcon style={circleStyle} number={10} size={28} />
            <span className="text-xs text-slate-300 font-bold">
              Formación: <strong className="text-amber-300">{formation}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Alineación</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
