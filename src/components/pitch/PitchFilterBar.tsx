'use client';

import React from 'react';
import { Filter, RotateCcw, Users, Shield, Layers, Clock } from 'lucide-react';

export interface FilterState {
  team: string;
  player: string;
  category: string;
  period: 'todos' | '1' | '2';
  minMinute: number;
  maxMinute: number;
}

interface PitchFilterBarProps {
  filters: FilterState;
  teams: string[];
  players: string[];
  categories: string[];
  onChangeFilter: (newFilters: FilterState) => void;
  onReset: () => void;
}

export const PitchFilterBar: React.FC<PitchFilterBarProps> = ({
  filters,
  teams,
  players,
  categories,
  onChangeFilter,
  onReset,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Filtros en Tiempo Real</span>
        </div>

        <button
          onClick={onReset}
          className="text-slate-400 hover:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Filter 1: Equipo */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-500" /> Equipo
          </label>
          <select
            value={filters.team}
            onChange={(e) => onChangeFilter({ ...filters, team: e.target.value })}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos los equipos</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Filter 2: Jugador */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" /> Jugador
          </label>
          <select
            value={filters.player}
            onChange={(e) => onChangeFilter({ ...filters, player: e.target.value })}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos los jugadores</option>
            {players.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Filter 3: Tipo de Evento */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" /> Tipo de Evento
          </label>
          <select
            value={filters.category}
            onChange={(e) => onChangeFilter({ ...filters, category: e.target.value })}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Filter 4: Periodo */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" /> Periodo
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onChangeFilter({ ...filters, period: 'todos' })}
              className={`py-1 rounded text-[10px] font-bold ${
                filters.period === 'todos' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onChangeFilter({ ...filters, period: '1' })}
              className={`py-1 rounded text-[10px] font-bold ${
                filters.period === '1' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1ª Parte
            </button>
            <button
              onClick={() => onChangeFilter({ ...filters, period: '2' })}
              className={`py-1 rounded text-[10px] font-bold ${
                filters.period === '2' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2ª Parte
            </button>
          </div>
        </div>

        {/* Filter 5: Minuto Range */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
            <span>Intervalo</span>
            <span className="text-emerald-400 font-mono font-bold">{filters.minMinute}' - {filters.maxMinute}' min</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="range"
              min="0"
              max="90"
              value={filters.maxMinute}
              onChange={(e) => onChangeFilter({ ...filters, maxMinute: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 bg-slate-950"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
