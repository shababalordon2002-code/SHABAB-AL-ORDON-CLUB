'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Player, TeamCircleStyle } from '@/types';
import { Shield, RefreshCw, Plus, X, ArrowRightLeft, ArrowUp } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { TeamCircleIcon } from '@/components/botonera/TeamLineupModal';

export interface SubstitutionRecord {
  id?: string;
  playerOutName: string;
  playerInName: string;
  playerInNumber?: number;
  minute: number;
  period?: number; // 1: 1ªP, 2: 2ªP, 3: ET1, 4: ET2
}

interface TacticalLineupPitchProps {
  teamName: string;
  teamLogo?: string;
  teamColor?: string; // Hex or color key (e.g. #10b981, #ef4444, #3b82f6)
  circleStyle?: TeamCircleStyle;
  formation?: '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';
  players?: Player[];
  substitutions?: SubstitutionRecord[];
  isHome?: boolean;
  orientation?: 'vertical' | 'horizontal';
  onAddSubstitution?: (sub: SubstitutionRecord) => void;
  onPlayerClick?: (player: Player) => void;
}

// Vertical Pitch Formations (X: 0-100% left-to-right, Y: 0-100% top-to-bottom)
const VERTICAL_FORMATIONS: Record<string, Array<{ x: number; y: number; role: string }>> = {
  '4-3-3': [
    { x: 50, y: 88, role: 'POR' },
    { x: 18, y: 72, role: 'LI' },
    { x: 38, y: 75, role: 'DFC' },
    { x: 62, y: 75, role: 'DFC' },
    { x: 82, y: 72, role: 'LD' },
    { x: 50, y: 52, role: 'MC' },
    { x: 30, y: 48, role: 'Interior' },
    { x: 70, y: 48, role: 'Interior' },
    { x: 22, y: 22, role: 'EI' },
    { x: 50, y: 18, role: 'DC' },
    { x: 78, y: 22, role: 'ED' },
  ],
  '4-2-3-1': [
    { x: 50, y: 88, role: 'POR' },
    { x: 18, y: 72, role: 'LI' },
    { x: 38, y: 75, role: 'DFC' },
    { x: 62, y: 75, role: 'DFC' },
    { x: 82, y: 72, role: 'LD' },
    { x: 35, y: 56, role: 'PIV' },
    { x: 65, y: 56, role: 'PIV' },
    { x: 22, y: 35, role: 'MI' },
    { x: 50, y: 35, role: 'MCO' },
    { x: 78, y: 35, role: 'MD' },
    { x: 50, y: 18, role: 'DC' },
  ],
  '4-4-2': [
    { x: 50, y: 88, role: 'POR' },
    { x: 18, y: 72, role: 'LI' },
    { x: 38, y: 75, role: 'DFC' },
    { x: 62, y: 75, role: 'DFC' },
    { x: 82, y: 72, role: 'LD' },
    { x: 18, y: 48, role: 'MI' },
    { x: 38, y: 50, role: 'MC' },
    { x: 62, y: 50, role: 'MC' },
    { x: 82, y: 48, role: 'MD' },
    { x: 38, y: 20, role: 'DC' },
    { x: 62, y: 20, role: 'DC' },
  ],
  '3-5-2': [
    { x: 50, y: 88, role: 'POR' },
    { x: 25, y: 75, role: 'DFC' },
    { x: 50, y: 77, role: 'DFC' },
    { x: 75, y: 75, role: 'DFC' },
    { x: 15, y: 50, role: 'CAD' },
    { x: 35, y: 52, role: 'MC' },
    { x: 50, y: 55, role: 'PIV' },
    { x: 65, y: 52, role: 'MC' },
    { x: 85, y: 50, role: 'CAD' },
    { x: 38, y: 20, role: 'DC' },
    { x: 62, y: 20, role: 'DC' },
  ],
};

export const TacticalLineupPitch: React.FC<TacticalLineupPitchProps> = ({
  teamName,
  teamLogo,
  teamColor,
  circleStyle,
  formation = '4-3-3',
  players = [],
  substitutions = [],
  isHome = true,
  onAddSubstitution,
  onPlayerClick,
}) => {
  const coords = VERTICAL_FORMATIONS[formation] || VERTICAL_FORMATIONS['4-3-3'];
  const starters = players.slice(0, 11);
  const primaryColor = circleStyle?.primaryColor || teamColor || (isHome ? '#ef4444' : '#3b82f6');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Local state for recording a substitution directly from pitch header
  const [showSubModal, setShowSubModal] = useState(false);
  const [playerOut, setPlayerOut] = useState('');
  const [playerIn, setPlayerIn] = useState('');
  const [playerInNum, setPlayerInNum] = useState<number | ''>('');
  const [subMinute, setSubMinute] = useState<number | ''>(60);
  const [subPeriod, setSubPeriod] = useState<number>(2);

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerOut || !playerIn || !onAddSubstitution) return;

    onAddSubstitution({
      id: `sub_${Date.now()}`,
      playerOutName: playerOut,
      playerInName: playerIn,
      playerInNumber: playerInNum !== '' ? Number(playerInNum) : undefined,
      minute: subMinute !== '' ? Number(subMinute) : 60,
      period: Number(subPeriod) || 2,
    });

    setShowSubModal(false);
    setPlayerOut('');
    setPlayerIn('');
    setPlayerInNum('');
  };

  return (
    <div className="space-y-3 w-full">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-5 h-5 object-contain rounded bg-slate-950 p-0.5" />
          ) : (
            <Shield className="w-4 h-4" style={{ color: primaryColor }} />
          )}
          <span className="font-extrabold text-xs text-white truncate max-w-[110px] sm:max-w-[150px]">
            {teamName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Add Substitution Button */}
          {onAddSubstitution && (
            <button
              onClick={() => setShowSubModal(true)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition cursor-pointer"
              title="Registrar Sustitución / Cambio"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>+ Cambio</span>
            </button>
          )}

          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
            style={{
              backgroundColor: `${primaryColor}20`,
              borderColor: `${primaryColor}50`,
              color: primaryColor,
            }}
          >
            {formation}
          </span>
        </div>
      </div>

      {/* Vertical Pitch Canvas */}
      <div className="relative w-full aspect-[3/4] min-h-[380px] rounded-2xl bg-gradient-to-b from-[#091a12] via-[#0d2419] to-[#08170f] border border-emerald-800/40 shadow-2xl overflow-hidden select-none flex flex-row">
        <div className="relative flex-1 p-3">
        
        {/* SVG Pitch Markings */}
        <svg viewBox="0 0 100 130" className="absolute inset-0 w-full h-full pointer-events-none">
          <rect x="5" y="5" width="90" height="120" rx="3" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="5" y1="65" x2="95" y2="65" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <circle cx="50" cy="65" r="16" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <circle cx="50" cy="65" r="1.5" fill="#10b981" fillOpacity="0.4" />
          <rect x="24" y="5" width="52" height="22" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <rect x="36" y="5" width="28" height="8" fill="none" stroke="#10b981" strokeWidth="0.6" strokeOpacity="0.25" />
          <path d="M 38 27 A 14 14 0 0 0 62 27" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <rect x="24" y="103" width="52" height="22" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
          <rect x="36" y="117" width="28" height="8" fill="none" stroke="#10b981" strokeWidth="0.6" strokeOpacity="0.25" />
          <path d="M 38 103 A 14 14 0 0 1 62 103" fill="none" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.35" />
        </svg>

        {/* Players Placed on Vertical Pitch */}
        {coords.map((pos, idx) => {
          const starterPly = starters[idx] || {
            id: `empty_${idx}`,
            name: `${pos.role}`,
            number: idx + 1,
          };

          // Find if this starter was substituted
          const sub = substitutions.find((s) => {
            const outName = s.playerOutName.toLowerCase().trim();
            const starterName = starterPly.name.toLowerCase().trim();
            return outName.includes(starterName) || starterName.includes(outName);
          });

          // Displayed number & name (If sub exists, show player in, else starter)
          const displayNum = sub?.playerInNumber || starterPly.number || idx + 1;
          const displayInName = sub ? sub.playerInName : starterPly.name;
          const displayOutName = sub ? starterPly.name : null;

          return (
            <div
              key={starterPly.id || idx}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => {
                if (onPlayerClick) {
                  onPlayerClick({
                    id: starterPly.id || `p_${idx}`,
                    name: displayInName,
                    number: Number(displayNum) || idx + 1,
                    position: starterPly.position || pos.role || 'JUG',
                    team_name: teamName,
                    team_id: isHome ? 'home_team' : 'away_team',
                  });
                }
              }}
              title={`Haz clic para ver todos los eventos y acciones de ${displayInName}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300 hover:z-20 hover:scale-110"
            >
              {/* Jersey Circle Icon with configured team colors & patterns */}
              <div className="relative">
                <TeamCircleIcon
                  style={
                    sub
                      ? { primaryColor: '#f59e0b', secondaryColor: '#ffffff', pattern: 'solid' }
                      : circleStyle || { primaryColor, secondaryColor: '#ffffff', pattern: 'solid' }
                  }
                  number={displayNum}
                  size={30}
                />

                {/* Substitution Badge Icon (🔄 Minute') */}
                {sub && (
                  <span className="absolute -top-2 -right-3 bg-amber-500 text-slate-950 text-[7.5px] font-black px-1 py-0.5 rounded-full border border-slate-950 flex items-center gap-0.5 shadow-md z-20">
                    <RefreshCw className="w-2 h-2 stroke-[3]" />
                    <span>{sub.minute}'</span>
                  </span>
                )}
              </div>

              {/* Player Name Tag (Single-line to prevent pitch clutter and overlapping) */}
              <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 flex items-center shadow max-w-[90px] truncate">
                {sub ? (
                  <span
                    className="text-[9px] font-extrabold text-amber-300 flex items-center gap-1 truncate"
                    title={`Cambio (${sub.minute}' ${sub.period === 1 ? '1ªP' : '2ªP'}): Entra ${displayInName} por ${displayOutName}`}
                  >
                    <span className="text-[8px] text-emerald-400 font-mono">🟢</span>
                    <span className="truncate">{displayInName.split(' ').slice(-1)[0]}</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-200 group-hover:text-white truncate">
                    {displayInName.split(' ').slice(-1)[0]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {/* Lateral Attack Strip */}
        <div className="w-6 bg-slate-950/90 border-l border-emerald-800/60 flex flex-col items-center justify-center py-4 gap-2 text-emerald-400 select-none pointer-events-none shrink-0 z-20">
          <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 [writing-mode:vertical-rl] rotate-180">
            ATAQUE
          </span>
        </div>
      </div>

      {/* Dedicated Substitutions Panel below Pitch (Clean, Non-Overlapping List) */}
      {substitutions.length > 0 && (
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-2.5 space-y-1.5 shadow-md">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span>Cambios del Partido ({substitutions.length})</span>
          </div>
          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {substitutions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-[10px] gap-2"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="bg-amber-500/20 text-amber-300 font-mono font-extrabold px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px] shrink-0">
                    {s.minute}' {s.period === 1 ? '1ªP' : s.period === 3 ? 'ET1' : s.period === 4 ? 'ET2' : '2ªP'}
                  </span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1 truncate">
                    <span className="text-[8px] text-emerald-500 font-mono">ENTRA:</span>
                    <span>#{s.playerInNumber ? s.playerInNumber + ' ' : ''}{s.playerInName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-400/80 line-through text-[9px] font-medium shrink-0">
                  <span className="text-[8px] text-red-500/90 font-mono">SALE:</span>
                  <span>{s.playerOutName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal to Add Substitution Directly (Rendered at Root via React Portal with z-[99999]) */}
      {showSubModal && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSub}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-100">
                  Registrar Cambio en {teamName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>🔴 Jugador Sustituido (Sale del campo):</span>
                  <span className="text-[10px] text-amber-400 font-mono">Titulares en campo</span>
                </label>
                <select
                  required
                  value={playerOut}
                  onChange={(e) => setPlayerOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="">Selecciona el titular que sale...</option>
                  {starters.map((p, idx) => (
                    <option key={p.id || idx} value={p.name}>
                      #{p.number || idx + 1} - {p.name} ({p.position || 'JUG'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Substitute Selection from DB Squad */}
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>🟢 Jugador Sustituto (Entra al campo):</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Selección rápida plantilla</span>
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    if (!selectedName) return;
                    setPlayerIn(selectedName);
                    const dbMatch = dbStore.getPlayers().find(
                      (p) => p.name === selectedName || (p.team_name?.includes(teamName) && p.name === selectedName)
                    );
                    if (dbMatch?.number) setPlayerInNum(dbMatch.number);
                  }}
                  className="w-full bg-slate-950 border border-emerald-500/40 text-emerald-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 font-medium mb-2"
                >
                  <option value="">Elije un suplente registrado en la plantilla...</option>
                  {dbStore.getPlayers()
                    .filter((p) => p.team_name?.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(p.team_name?.toLowerCase() || ''))
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        #{p.number} - {p.name} ({p.position})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Dorsal del que entra:</label>
                  <input
                    type="number"
                    placeholder="Ej: 19"
                    value={playerInNum}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setPlayerInNum('');
                        return;
                      }
                      const num = Number(valStr);
                      setPlayerInNum(num);

                      // Auto-find player name by entered dorsal for this team
                      const matchedP = dbStore.getPlayers().find(
                        (p) => p.number === num && (p.team_name?.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(p.team_name?.toLowerCase() || ''))
                      );
                      if (matchedP) {
                        setPlayerIn(matchedP.name);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nombre del que entra:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del jugador..."
                    value={playerIn}
                    onChange={(e) => setPlayerIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Minuto del cambio:</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="Ej: 65"
                    value={subMinute}
                    onChange={(e) => setSubMinute(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Parte / Periodo:</label>
                  <select
                    value={subPeriod}
                    onChange={(e) => setSubPeriod(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value={1}>1ª Parte</option>
                    <option value={2}>2ª Parte</option>
                    <option value={3}>1ª Prórroga (ET1)</option>
                    <option value={4}>2ª Prórroga (ET2)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
              >
                Guardar Cambio
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
