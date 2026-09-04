'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Shield, Check, X, Edit3 } from 'lucide-react';
import { Player } from '@/types';

interface BotoneraPlayerSelectorProps {
  players: Player[];
  selectedPlayerId: string | null;
  onSelectPlayer: (player: Player | null) => void;
  onAddPlayer: (player: Player) => void;
  homeTeamName: string;
  awayTeamName: string;
}

export const BotoneraPlayerSelector: React.FC<BotoneraPlayerSelectorProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  onAddPlayer,
  homeTeamName,
  awayTeamName,
}) => {
  const [activeTeamTab, setActiveTeamTab] = useState<'home' | 'away'>('home');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerNumber, setNewPlayerNumber] = useState<string>('');
  const [newPlayerPosition, setNewPlayerPosition] = useState<string>('Centrocampista');

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newP: Player = {
      id: `ply_${Date.now()}`,
      name: newPlayerName.trim(),
      number: parseInt(newPlayerNumber) || Math.floor(Math.random() * 80) + 1,
      position: newPlayerPosition,
      team_id: activeTeamTab === 'home' ? 'team_shabab_al_ordon' : 'team_rival',
      team_name: activeTeamTab === 'home' ? homeTeamName : awayTeamName,
    };

    onAddPlayer(newP);
    onSelectPlayer(newP);
    setNewPlayerName('');
    setNewPlayerNumber('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
      {/* Header & Team Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-200 text-xs tracking-wide">
            JUGADOR ASOCIADO
          </span>
        </div>

        {/* Team Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTeamTab('home')}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTeamTab === 'home'
                ? 'bg-emerald-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{homeTeamName}</span>
          </button>
          <button
            onClick={() => setActiveTeamTab('away')}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTeamTab === 'away'
                ? 'bg-emerald-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>{awayTeamName}</span>
          </button>
        </div>
      </div>

      {/* Active Selected Player Banner */}
      <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          {selectedPlayer ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow">
                #{selectedPlayer.number}
              </div>
              <div>
                <p className="font-bold text-slate-100 text-xs leading-tight">
                  {selectedPlayer.name}
                </p>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {selectedPlayer.position} • {selectedPlayer.team_name}
                </p>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400 font-medium italic">
              Ningún jugador seleccionado (Evento colectivo o general)
            </span>
          )}
        </div>

        {selectedPlayer && (
          <button
            onClick={() => onSelectPlayer(null)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition text-xs"
            title="Deseleccionar Jugador"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Players Quick Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
        {players.map((p) => {
          const isSelected = selectedPlayerId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlayer(isSelected ? null : p)}
              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                isSelected
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                #{p.number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[11px] truncate leading-tight">{p.name}</p>
                <p className="text-[9px] text-slate-500 truncate">{p.position}</p>
              </div>
            </button>
          );
        })}

        {/* Add Player Quick Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-400 bg-slate-950/40 transition text-xs font-semibold"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Añadir Jugador</span>
        </button>
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Nuevo Jugador
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlayer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre del Jugador:
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Ej: Tareq Khattab"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Dorsal #:
                  </label>
                  <input
                    type="number"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Posición:
                  </label>
                  <select
                    value={newPlayerPosition}
                    onChange={(e) => setNewPlayerPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Portero">Portero</option>
                    <option value="Defensa Central">Defensa Central</option>
                    <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                    <option value="Lateral Derecho">Lateral Derecho</option>
                    <option value="Pivot Defensivo">Pivot Defensivo</option>
                    <option value="Centrocampista">Centrocampista</option>
                    <option value="Extremo Izquierdo">Extremo Izquierdo</option>
                    <option value="Extremo Derecho">Extremo Derecho</option>
                    <option value="Delantero Centro">Delantero Centro</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow"
                >
                  Guardar Jugador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
