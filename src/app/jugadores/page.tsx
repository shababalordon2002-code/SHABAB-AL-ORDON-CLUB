'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Link as LinkIcon,
  Globe,
  Edit2,
  Trash2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  UserPlus,
  Hash,
  MapPin,
  Cake,
  Flag as FlagIcon
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { getPlayersFromSupabase } from '@/lib/services/players-service';
import { Player, PlayerMapping } from '@/types';

const SPANISH_POSITIONS = [
  'Portero',
  'Defensa Central',
  'Lateral Izquierdo',
  'Lateral Derecho',
  'Pivote Defensivo',
  'Mediocentro',
  'Mediocentro Ofensivo',
  'Interior Izquierdo',
  'Interior Derecho',
  'Extremo Izquierdo',
  'Extremo Derecho',
  'Segundo Delantero',
  'Delantero Centro',
  'Delantero'
];

function PlayerAvatar({ photoUrl, name, size = 40 }: { photoUrl?: string; name: string; size?: number }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  let cleanUrl = (photoUrl || '').trim();
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'J';

  if (!cleanUrl || hasError) {
    return (
      <div
        className="rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow font-bold text-xs text-amber-400"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className="rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <img
        src={cleanUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function NumberBadge({ number, size = 40 }: { number: number; size?: number }) {
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <span
        className="font-black italic text-amber-400 leading-none select-none"
        style={{ fontSize: `${size * 0.5}px`, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
      >
        {number}
      </span>
    </div>
  );
}

function PlayerProfileModal({
  player,
  mappings,
  onClose
}: {
  player: Player;
  mappings: PlayerMapping[];
  onClose: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  let cleanUrl = (player.photo_url || '').trim();
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  const initials = player.name
    ? player.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'J';

  const playerMappings = mappings.filter(m => m.player_id === player.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 animate-[fadeIn_0.15s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white transition-colors cursor-pointer backdrop-blur"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero */}
        <div className="relative h-56 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-600/10 blur-3xl" />

          {!hasError && cleanUrl ? (
            <>
              <img
                src={cleanUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
              />
              <img
                src={cleanUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="relative z-[1] h-full w-auto max-w-full object-contain"
                onError={() => setHasError(true)}
              />
            </>
          ) : (
            <div className="relative z-[1] w-32 h-32 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center font-extrabold text-3xl text-amber-400 shadow-xl">
              {initials}
            </div>
          )}

          <div className="absolute top-3 left-3">
            <NumberBadge number={player.number} size={52} />
          </div>
        </div>

        {/* Info */}
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-white leading-tight">{player.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{player.team_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-slate-500 text-[10px] uppercase tracking-wide">Posición</div>
                <div className="text-slate-200 font-semibold">{player.position}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <Cake className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-slate-500 text-[10px] uppercase tracking-wide">Edad</div>
                <div className="text-slate-200 font-semibold">{player.age ? `${player.age} años` : '-'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 col-span-2">
              {player.flag_url ? (
                <img
                  src={player.flag_url.startsWith('//') ? `https:${player.flag_url}` : player.flag_url}
                  alt={player.nationality || 'Bandera'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <FlagIcon className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-slate-500 text-[10px] uppercase tracking-wide">Nacionalidad</div>
                <div className="text-slate-200 font-semibold">{player.nationality || 'Jordania'}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wide mb-1.5">
              <Hash className="w-3 h-3" />
              <span>Alias vinculados en XML</span>
            </div>
            {playerMappings.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {playerMappings.map(pm => (
                  <span key={pm.id} className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-mono">
                    "{pm.longomatch_name}"
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px] italic">Sin alias vinculados</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Edit / Add Player Modal State
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState<number>(10);
  const [formPosition, setFormPosition] = useState<string>('Mediocentro');
  const [formAge, setFormAge] = useState<number | undefined>(undefined);
  const [formNationality, setFormNationality] = useState<string>('Jordania');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');

  // Add Alias Mapping Modal State
  const [selectedPlayerForAlias, setSelectedPlayerForAlias] = useState<Player | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

  // Player Profile Modal State
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<Player | null>(null);

  const loadData = async () => {
    let localPlayers = dbStore.getPlayers();
    setPlayers(localPlayers);
    try {
      const synced = await dbStore.syncPlayersFromSupabase();
      if (synced && synced.length > 0) {
        localPlayers = synced;
      }
    } catch (e) {
      console.warn("Supabase load error:", e);
    }
    setPlayers(localPlayers);
    setMappings(dbStore.getPlayerMappings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScrapeTransfermarkt = async () => {
    setIsScraping(true);
    setMessage('Conectando con Transfermarkt y obteniendo plantilla actualizada de Shabab Al Ordon...');

    try {
      const res = await fetch('/api/scrape-players', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.players)) {
        data.players.forEach((scrapedPlayer: Player) => {
          dbStore.savePlayer(scrapedPlayer);
        });

        loadData();
        setMessage(`¡Éxito! Se han importado y actualizado ${data.players.length} jugadores desde Transfermarkt.`);
      } else {
        setMessage(`Error: ${data.error || 'No se pudieron descargar los jugadores'}`);
      }
    } catch (err: any) {
      console.error('Error scraping Transfermarkt:', err);
      setMessage(`Error en el scraping: ${err.message || err}`);
    } finally {
      setIsScraping(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  const handleOpenEditModal = (player?: Player) => {
    if (player) {
      setEditingPlayer(player);
      setFormName(player.name);
      setFormNumber(player.number);
      setFormPosition(player.position);
      setFormAge(player.age);
      setFormNationality(player.nationality || 'Jordania');
      setFormPhotoUrl(player.photo_url || '');
    } else {
      setEditingPlayer(null);
      setFormName('');
      setFormNumber(players.length + 1);
      setFormPosition('Mediocentro');
      setFormAge(22);
      setFormNationality('Jordania');
      setFormPhotoUrl('');
    }
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const playerToSave: Player = {
      id: editingPlayer ? editingPlayer.id : `ply_custom_${Date.now()}`,
      name: formName.trim(),
      number: Number(formNumber) || 10,
      position: formPosition,
      team_id: 'team_shabab_al_ordon',
      team_name: 'Shabab Al Ordon Club',
      age: formAge ? Number(formAge) : undefined,
      nationality: formNationality.trim() || 'Jordania',
      photo_url: formPhotoUrl.trim() || undefined,
      flag_url: editingPlayer?.flag_url || 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711',
    };

    dbStore.savePlayer(playerToSave);
    loadData();
    setIsPlayerModalOpen(false);
    setMessage(`Jugador ${playerToSave.name} guardado correctamente.`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDeletePlayer = (playerId: string, playerName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${playerName}?`)) {
      dbStore.deletePlayer(playerId);
      loadData();
      setMessage(`Jugador ${playerName} eliminado.`);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleSaveAliasMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerForAlias || !aliasInput.trim()) return;

    const newMapping: PlayerMapping = {
      id: `map_${Date.now()}`,
      longomatch_name: aliasInput.trim(),
      player_id: selectedPlayerForAlias.id,
      team_id: selectedPlayerForAlias.team_id,
      created_at: new Date().toISOString()
    };

    dbStore.savePlayerMapping(newMapping);
    loadData();
    setIsAliasModalOpen(false);
    setAliasInput('');
    setSelectedPlayerForAlias(null);
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.nationality && p.nationality.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Plantilla de Jugadores y Datos Oficiales</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión de plantilla, edición de datos, sincronización con Transfermarkt y mapeo de alias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScrapeTransfermarkt}
            disabled={isScraping}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-950/40 transition-all cursor-pointer"
          >
            <Globe className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Sincronizando de Transfermarkt...' : 'Sincronizar Transfermarkt'}</span>
          </button>

          <button
            onClick={() => handleOpenEditModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-red-950/40 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nuevo Jugador</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
          message.includes('Error') 
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' 
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {message.includes('Error') ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mappings Summary Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Sistema de Mapeo de Nombres Activo</h3>
            <p className="text-slate-400 text-[11px]">
              Actualmente hay <strong className="text-amber-400">{mappings.length} alias</strong> vinculados a los jugadores oficiales de Shabab Al Ordon.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {mappings.map(m => (
            <span key={m.id} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
              <span className="text-slate-500">"{m.longomatch_name}"</span>
              <span className="text-amber-400">➔</span>
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
          placeholder="Buscar por nombre, posición o país..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Players Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Dorsal</th>
                <th className="py-3.5 px-4 font-bold">Jugador</th>
                <th className="py-3.5 px-4 font-bold">Posición</th>
                <th className="py-3.5 px-4 font-bold">Edad</th>
                <th className="py-3.5 px-4 font-bold">Nacionalidad</th>
                <th className="py-3.5 px-4 font-bold">Alias Vinculados</th>
                <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPlayers.map((p) => {
                const playerMappings = mappings.filter(m => m.player_id === p.id);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Dorsal */}
                    <td className="py-3.5 px-4">
                      <NumberBadge number={p.number} size={36} />
                    </td>

                    {/* Foto & Nombre */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedProfilePlayer(p)}
                        className="flex items-center gap-3 text-left group cursor-pointer"
                        title="Ver perfil del jugador"
                      >
                        <div className="ring-0 group-hover:ring-2 ring-amber-500/50 rounded-full transition-all">
                          <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={40} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 group-hover:text-amber-300 flex items-center gap-1.5 transition-colors">
                            <span>{p.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {p.team_name}
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* Posición en español */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-amber-300 border border-amber-500/20">
                        {p.position}
                      </span>
                    </td>

                    {/* Edad */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {p.age ? `${p.age} años` : '-'}
                    </td>

                    {/* Nacionalidad + Banderita */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {p.flag_url ? (
                          <img
                            src={p.flag_url.startsWith('//') ? `https:${p.flag_url}` : p.flag_url}
                            alt={p.nationality || 'Bandera'}
                            referrerPolicy="no-referrer"
                            className="w-4 h-3 object-cover rounded-sm shrink-0"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : null}
                        <span className="text-slate-300 font-medium">{p.nationality || 'Jordania'}</span>
                      </div>
                    </td>

                    {/* Alias Mapeados */}
                    <td className="py-3.5 px-4">
                      {playerMappings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {playerMappings.map(pm => (
                            <span key={pm.id} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
                              "{pm.longomatch_name}"
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">Sin alias</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPlayerForAlias(p);
                            setIsAliasModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors cursor-pointer"
                          title="Añadir Alias XML"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                          title="Editar datos del jugador"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeletePlayer(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Eliminar jugador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Player Modal */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSavePlayer} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  {editingPlayer ? `Editar Jugador: ${editingPlayer.name}` : 'Crear Nuevo Jugador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dorsal / Número *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={99}
                  value={formNumber}
                  onChange={e => setFormNumber(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Posición (Español) *</label>
                <select
                  value={formPosition}
                  onChange={e => setFormPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {SPANISH_POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Edad</label>
                <input
                  type="number"
                  min={15}
                  max={45}
                  value={formAge || ''}
                  onChange={e => setFormAge(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-300 font-medium mb-1">Nacionalidad</label>
                <input
                  type="text"
                  value={formNationality}
                  onChange={e => setFormNationality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-300 font-medium mb-1">URL de la Foto</label>
                <input
                  type="url"
                  placeholder="https://img.transfermarkt.technology/..."
                  value={formPhotoUrl}
                  onChange={e => setFormPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
              >
                Guardar Jugador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Alias Modal */}
      {isAliasModalOpen && selectedPlayerForAlias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveAliasMapping} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Asociar Alias a {selectedPlayerForAlias.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAliasModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-300 font-semibold">
                Variante del nombre en archivo XML:
              </label>
              <input
                type="text"
                placeholder="Ejemplo: Ahmed Ali o M. Ali"
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAliasModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-bold text-xs"
              >
                Guardar Mapeo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedProfilePlayer && (
        <PlayerProfileModal
          player={selectedProfilePlayer}
          mappings={mappings}
          onClose={() => setSelectedProfilePlayer(null)}
        />
      )}
    </div>
  );
}
