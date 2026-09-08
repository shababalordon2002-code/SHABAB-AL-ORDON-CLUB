'use client';

import React from 'react';
import { Player } from '@/types';
import { Shield, User } from 'lucide-react';

interface TacticalLineupPitchProps {
  teamName: string;
  teamLogo?: string;
  formation?: '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';
  players: Player[];
  isHome?: boolean;
}

// Preset X, Y positions (% of pitch width/height) for formations
const FORMATIONS_MAP: Record<string, Array<{ x: number; y: number; role: string }>> = {
  '4-3-3': [
    { x: 10, y: 50, role: 'POR' },
    { x: 28, y: 18, role: 'LI' },
    { x: 25, y: 38, role: 'DFC' },
    { x: 25, y: 62, role: 'DFC' },
    { x: 28, y: 82, role: 'LD' },
    { x: 50, y: 50, role: 'MC' },
    { x: 55, y: 30, role: 'interior' },
    { x: 55, y: 70, role: 'interior' },
    { x: 82, y: 22, role: 'EI' },
    { x: 85, y: 50, role: 'DC' },
    { x: 82, y: 78, role: 'ED' },
  ],
  '4-2-3-1': [
    { x: 10, y: 50, role: 'POR' },
    { x: 28, y: 18, role: 'LI' },
    { x: 25, y: 38, role: 'DFC' },
    { x: 25, y: 62, role: 'DFC' },
    { x: 28, y: 82, role: 'LD' },
    { x: 45, y: 35, role: 'PIV' },
    { x: 45, y: 65, role: 'PIV' },
    { x: 68, y: 22, role: 'MI' },
    { x: 68, y: 50, role: 'MCO' },
    { x: 68, y: 78, role: 'MD' },
    { x: 86, y: 50, role: 'DC' },
  ],
  '4-4-2': [
    { x: 10, y: 50, role: 'POR' },
    { x: 28, y: 18, role: 'LI' },
    { x: 25, y: 38, role: 'DFC' },
    { x: 25, y: 62, role: 'DFC' },
    { x: 28, y: 82, role: 'LD' },
    { x: 52, y: 18, role: 'MI' },
    { x: 50, y: 38, role: 'MC' },
    { x: 50, y: 62, role: 'MC' },
    { x: 52, y: 82, role: 'MD' },
    { x: 82, y: 38, role: 'DC' },
    { x: 82, y: 62, role: 'DC' },
  ],
  '3-5-2': [
    { x: 10, y: 50, role: 'POR' },
    { x: 25, y: 25, role: 'DFC' },
    { x: 23, y: 50, role: 'DFC' },
    { x: 25, y: 75, role: 'DFC' },
    { x: 48, y: 15, role: 'CAD' },
    { x: 48, y: 35, role: 'MC' },
    { x: 45, y: 50, role: 'PIV' },
    { x: 48, y: 65, role: 'MC' },
    { x: 48, y: 85, role: 'CAD' },
    { x: 82, y: 38, role: 'DC' },
    { x: 82, y: 62, role: 'DC' },
  ],
};

export const TacticalLineupPitch: React.FC<TacticalLineupPitchProps> = ({
  teamName,
  teamLogo,
  formation = '4-3-3',
  players,
}) => {
  const coords = FORMATIONS_MAP[formation] || FORMATIONS_MAP['4-3-3'];
  const starters = players.slice(0, 11);

  return (
    <div className="space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-5 h-5 object-contain rounded bg-slate-950 p-0.5" />
          ) : (
            <Shield className="w-4 h-4 text-amber-400" />
          )}
          <span className="font-extrabold text-xs text-white">{teamName}</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Formación {formation}
        </span>
      </div>

      {/* Pitch Canvas */}
      <div className="relative w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 border border-emerald-700/50 p-3 shadow-inner overflow-hidden select-none">
        {/* Grass Pitch markings */}
        <div className="absolute inset-2 border-2 border-emerald-500/30 rounded-lg pointer-events-none" />
        <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-0.5 border-r-2 border-dashed border-emerald-500/30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-emerald-500/30 rounded-full pointer-events-none" />

        {/* Penalty Area Left */}
        <div className="absolute top-1/4 bottom-1/4 left-2 w-1/6 border-2 border-l-0 border-emerald-500/30 pointer-events-none" />

        {/* Players Placed on Pitch */}
        {coords.map((pos, idx) => {
          const ply = starters[idx] || {
            id: `empty_${idx}`,
            name: `Jugador ${idx + 1}`,
            number: idx + 1,
          };

          return (
            <div
              key={ply.id || idx}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
            >
              {/* Jersey Pill */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs sm:text-xs flex items-center justify-center shadow-lg border border-amber-300 ring-2 ring-slate-950 group-hover:scale-110 transition-transform">
                {ply.number || idx + 1}
              </div>
              {/* Player Name Tag */}
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 text-[9px] font-bold text-slate-200 border border-slate-800 whitespace-nowrap shadow max-w-[80px] truncate group-hover:text-amber-300">
                {ply.name.split(' ').slice(-1)[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
