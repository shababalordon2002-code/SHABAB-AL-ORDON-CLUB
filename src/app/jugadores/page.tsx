'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Link as LinkIcon,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Tag
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { Player, PlayerMapping } from '@/types';

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for new mapping
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setPlayers(dbStore.getPlayers());
    setMappings(dbStore.getPlayerMappings());
  }, []);

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !aliasInput.trim()) return;

    const newMapping: PlayerMapping = {
      id: `map_${Date.now()}`,
      longomatch_name: aliasInput.trim(),
      player_id: selectedPlayer.id,
      team_id: selectedPlayer.team_id,
      created_at: new Date().toISOString()
    };

    dbStore.savePlayerMapping(newMapping);
    setMappings(dbStore.getPlayerMappings());
    setIsModalOpen(false);
    setAliasInput('');
    setSelectedPlayer(null);
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Plantilla de Jugadores & Mapeo LongoMatch</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Mapeo inteligente para resolver variantes de nombres en archivos XML de LongoMatch (ej. "Ahmad Ali" ↔ "Ahmed Ali").
          </p>
        </div>
      </div>

      {/* Mappings Summary Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Sistema de Mapeo de Alias Activo</h3>
            <p className="text-slate-400 text-[11px]">
              Actualmente hay <strong className="text-emerald-400">{mappings.length} alias</strong> mapeados a jugadores oficiales de Shabab Al Ordon.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {mappings.map(m => (
            <span key={m.id} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
              <span className="text-slate-500">"{m.longomatch_name}"</span>
              <span className="text-emerald-400">➔</span>
              <span className="text-slate-200 font-bold font-sans">
                {players.find(p => p.id === m.player_id)?.name || m.player_id}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por jugador o posición..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Players Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Dorsal</th>
                <th className="py-3 px-4">Nombre Oficial</th>
                <th className="py-3 px-4">Posición</th>
                <th className="py-3 px-4">Equipo</th>
                <th className="py-3 px-4">Alias LongoMatch Mapeados</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPlayers.map((p) => {
                const playerMappings = mappings.filter(m => m.player_id === p.id);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-400 text-sm">
                      #{p.number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.is_demo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{p.position}</td>
                    <td className="py-3 px-4 text-slate-400">{p.team_name}</td>
                    <td className="py-3 px-4">
                      {playerMappings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {playerMappings.map(pm => (
                            <span key={pm.id} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
                              "{pm.longomatch_name}"
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">Sin alias asignados</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPlayer(p);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Añadir Alias</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Alias Modal */}
      {isModalOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveMapping} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Asociar Alias LongoMatch a {selectedPlayer.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-300 font-semibold">
                Variante del nombre en archivo XML de LongoMatch:
              </label>
              <input
                type="text"
                placeholder="Ejemplo: Ahmed Ali o M. Ali"
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Cualquier evento de LongoMatch con esta cadena de texto será mapeado automáticamente a ID: <code className="text-emerald-400">{selectedPlayer.id}</code>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Guardar Mapeo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
