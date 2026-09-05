'use client';

import React, { useState } from 'react';
import { Edit3, Plus, Target, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Match, NormalizedEvent, Player } from '@/types';
import { BotoneraPitchCanvas } from '@/components/botonera/BotoneraPitchCanvas';

// Comprehensive presets for quick tagging
const EVENT_TYPE_PRESETS = [
  'Pase Clave',
  'Tiro',
  'Recuperación',
  'Falta',
  'Regate',
  'Pérdida',
  'Centro',
  'Intercepción',
  'Despeje',
  'Duelo Aéreo',
  'Parada',
  'Asistencia',
  'Tarjeta',
];

const CATEGORY_PRESETS = ['Ataque', 'Defensa', 'Transición', 'Balón Parado (ABP)', 'Portería'];

const OUTCOME_PRESETS = ['Éxito', 'Fallido', 'Gol', 'A puerta', 'Fuera', 'Interceptado', 'Bloqueado'];

const DESCRIPTOR_PRESETS = [
  'Pierna Izquierda',
  'Pierna Derecha',
  'Cabeza',
  'Primer Toque',
  'Desde Fuera del Área',
  'Dentro del Área',
  'Área Pequeña',
  'Banda Izquierda',
  'Banda Derecha',
  'Contraataque',
  'Presión Alta',
  'Ataque Organizado',
  'Transición Rápida',
  'Recuperación Alta',
  'Pérdida Crítica',
  'Córner',
  'Falta Directa',
  'Falta Lateral',
  'Penalti',
  'Saque de Banda',
  'Pase Filtrado',
  'Centro al Área',
  'Mano a Mano',
  'Rechace',
  'Disparo Lejano',
];

export interface FullEventFormModalProps {
  initialEvent?: NormalizedEvent;
  match?: Match | null;
  players?: Player[];
  onSave: (savedEvent: NormalizedEvent) => void;
  onClose: () => void;
  title?: string;
}

export const FullEventFormModal: React.FC<FullEventFormModalProps> = ({
  initialEvent,
  match,
  players = [],
  onSave,
  onClose,
  title = 'Editar Evento Completo',
}) => {
  const homeTeam = match?.home_team || initialEvent?.team_name || 'Shabab Al Ordon Club';
  const awayTeam = match?.away_team || 'Rival SC';

  const [eventType, setEventType] = useState(initialEvent?.event_type || 'Pase Clave');
  const [category, setCategory] = useState(initialEvent?.category || 'Ataque');
  const [teamName, setTeamName] = useState(initialEvent?.team_name || homeTeam);
  const [playerName, setPlayerName] = useState(initialEvent?.player_name || 'Jugador no asignado');
  const [period, setPeriod] = useState<number>(initialEvent?.period || 1);
  const [minute, setMinute] = useState<number>(initialEvent?.minute ?? 0);
  const [second, setSecond] = useState<number>(initialEvent?.second ?? 0);
  const [duration, setDuration] = useState<number>(initialEvent?.duration ?? 5);
  const [outcome, setOutcome] = useState(initialEvent?.outcome || '');

  // Extract initial descriptors
  const initialDescs: string[] = Array.from(
    new Set([
      ...((initialEvent?.metadata?.descriptors as string[]) || []),
      ...(initialEvent?.subcategory ? initialEvent.subcategory.split(',').map((s) => s.trim()) : []),
    ])
  ).filter(Boolean);

  const [descriptors, setDescriptors] = useState<string[]>(initialDescs);
  const [customDescriptorInput, setCustomDescriptorInput] = useState('');

  // Coordinates & Pitch
  const [x, setX] = useState<number | null>(initialEvent?.x ?? null);
  const [y, setY] = useState<number | null>(initialEvent?.y ?? null);
  const [endX, setEndX] = useState<number | null>(initialEvent?.end_x ?? null);
  const [endY, setEndY] = useState<number | null>(initialEvent?.end_y ?? null);
  const [selectedZone, setSelectedZone] = useState<string | null>(
    (initialEvent?.metadata?.zone as string) || null
  );

  const toggleDescriptor = (desc: string) => {
    if (descriptors.includes(desc)) {
      setDescriptors(descriptors.filter((d) => d !== desc));
    } else {
      setDescriptors([...descriptors, desc]);
    }
  };

  const addCustomDescriptor = () => {
    const trimmed = customDescriptorInput.trim();
    if (trimmed && !descriptors.includes(trimmed)) {
      setDescriptors([...descriptors, trimmed]);
      setCustomDescriptorInput('');
    }
  };

  const handleClearPitch = () => {
    setX(null);
    setY(null);
    setEndX(null);
    setEndY(null);
    setSelectedZone(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPlayerObj = players.find((p) => p.name === playerName);
    const cleanedDescriptors = Array.from(new Set(descriptors.map((d) => d.trim()).filter(Boolean)));

    const now = new Date().toISOString();

    const saved: NormalizedEvent = {
      event_id: initialEvent?.event_id || `evt_manual_${Date.now()}`,
      source_event_id: initialEvent?.source_event_id || null,
      match_id: match?.id || initialEvent?.match_id || 'free_session',
      team_id: initialEvent?.team_id || (teamName === homeTeam ? 'home_team' : 'away_team'),
      team_name: teamName,
      player_id: selectedPlayerObj ? selectedPlayerObj.id : (initialEvent?.player_id || null),
      player_name: playerName,
      event_type: eventType,
      category,
      subcategory: cleanedDescriptors.join(', ') || null,
      timestamp: (minute || 0) * 60 + (second || 0),
      minute: Number(minute),
      second: Number(second),
      duration: Number(duration),
      period: Number(period),
      x: x !== null && !isNaN(Number(x)) ? Number(x) : null,
      y: y !== null && !isNaN(Number(y)) ? Number(y) : null,
      end_x: endX !== null && !isNaN(Number(endX)) ? Number(endX) : null,
      end_y: endY !== null && !isNaN(Number(endY)) ? Number(endY) : null,
      outcome: outcome || null,
      metadata: {
        ...(initialEvent?.metadata || {}),
        descriptors: cleanedDescriptors,
        tags: cleanedDescriptors,
        zone: selectedZone || null,
      },
      source: initialEvent?.source || 'manual',
      created_at: initialEvent?.created_at || now,
      updated_at: now,
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400">
                Edita todos los datos del evento: campograma, flechas, zonas, descriptores, tiempos y jugador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs font-sans text-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Meta, Timing, Descriptors */}
            <div className="lg:col-span-7 space-y-5">
              {/* Event Type & Presets */}
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  1. Nombre del Evento / Acción
                </label>
                <input
                  type="text"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-amber-500"
                  required
                  placeholder="Ej: Pase Clave, Tiro, Recuperación..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {EVENT_TYPE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEventType(preset)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        eventType === preset
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Outcome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                    Resultado / Main Outcome
                  </label>
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="Ej: Éxito, Fallido, Gol..."
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {OUTCOME_PRESETS.map((out) => (
                      <button
                        key={out}
                        type="button"
                        onClick={() => setOutcome(out)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                          outcome === out
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {out}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team & Player */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                    Equipo
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium mb-1.5"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[homeTeam, awayTeam, 'Shabab Al Ordon Club'].filter(Boolean).map((tName) => (
                      <button
                        key={tName}
                        type="button"
                        onClick={() => setTeamName(tName)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-all truncate max-w-[140px] ${
                          teamName === tName
                            ? 'bg-sky-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                    Jugador Asignado
                  </label>
                  <select
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium"
                  >
                    <option value="Jugador no asignado">Jugador no asignado</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.name}>
                        #{p.number} {p.name} ({p.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timing & Period */}
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  Tiempos del Vídeo y Período
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Período</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-bold"
                    >
                      <option value={1}>1ª Parte</option>
                      <option value={2}>2ª Parte</option>
                      <option value={3}>Prórroga 1</option>
                      <option value={4}>Prórroga 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Minuto</label>
                    <input
                      type="number"
                      value={minute}
                      onChange={(e) => setMinute(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold"
                      min={0}
                      max={130}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Segundo</label>
                    <input
                      type="number"
                      value={second}
                      onChange={(e) => setSecond(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold"
                      min={0}
                      max={59}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Duración (seg)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold"
                      min={1}
                      max={60}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Descriptors & Tag Chips Manager */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                    Descriptores y Etiquetas ({descriptors.length})
                  </label>
                  <span className="text-[10px] text-slate-400 italic">Haz clic para activar/desactivar</span>
                </div>

                {/* Predefined Tag Buttons */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-lg bg-slate-900/80 border border-slate-800">
                  {DESCRIPTOR_PRESETS.map((desc) => {
                    const isSelected = descriptors.includes(desc);
                    return (
                      <button
                        key={desc}
                        type="button"
                        onClick={() => toggleDescriptor(desc)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{desc}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Descriptor */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDescriptorInput}
                    onChange={(e) => setCustomDescriptorInput(e.target.value)}
                    placeholder="Añadir descriptor personalizado..."
                    className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomDescriptor();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomDescriptor}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Tag</span>
                  </button>
                </div>

                {/* Active Descriptors Badge List */}
                {descriptors.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tags Activos:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {descriptors.map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <span>{d}</span>
                          <button
                            type="button"
                            onClick={() => toggleDescriptor(d)}
                            className="hover:text-rose-400 font-bold ml-1 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Campograma Interactivo (Pitch Canvas) */}
            <div className="lg:col-span-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  <Target className="w-4 h-4" />
                  <span>Campograma Interactivo</span>
                </div>
                {selectedZone && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                    {selectedZone}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Haz clic en el campo para fijar el origen (X, Y) y opcionalmente el destino (Vector).
              </p>

              {/* Pitch Canvas Container */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex justify-center items-center overflow-hidden min-h-[300px]">
                <BotoneraPitchCanvas
                  startX={x}
                  startY={y}
                  endX={endX}
                  endY={endY}
                  onSetCoords={(start, end) => {
                    setX(start ? start.x : null);
                    setY(start ? start.y : null);
                    setEndX(end ? end.x : null);
                    setEndY(end ? end.y : null);
                  }}
                  selectedZone={selectedZone}
                  onSelectZone={(zone) => setSelectedZone(zone)}
                  initialMode={endX !== null ? 'vector_arrow' : 'point'}
                  pitchViewMode="full"
                />
              </div>

              {/* Active Coordinates Display & Manual Overrides */}
              <div className="space-y-2 pt-1">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
                  <div>
                    <span className="text-slate-500 font-semibold">Origen: </span>
                    <span className="text-emerald-400 font-bold">
                      {x !== null && y !== null ? `(${x}%, ${y}%)` : 'Sin asignar'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Destino: </span>
                    <span className="text-amber-400 font-bold">
                      {endX !== null && endY !== null ? `(${endX}%, ${endY}%)` : 'Sin asignar'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-mono">X (%)</label>
                    <input
                      type="number"
                      value={x ?? ''}
                      onChange={(e) => setX(e.target.value !== '' ? Number(e.target.value) : null)}
                      placeholder="0-100"
                      className="w-full p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-mono">Y (%)</label>
                    <input
                      type="number"
                      value={y ?? ''}
                      onChange={(e) => setY(e.target.value !== '' ? Number(e.target.value) : null)}
                      placeholder="0-100"
                      className="w-full p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-mono">EndX (%)</label>
                    <input
                      type="number"
                      value={endX ?? ''}
                      onChange={(e) => setEndX(e.target.value !== '' ? Number(e.target.value) : null)}
                      placeholder="0-100"
                      className="w-full p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5 font-mono">EndY (%)</label>
                    <input
                      type="number"
                      value={endY ?? ''}
                      onChange={(e) => setEndY(e.target.value !== '' ? Number(e.target.value) : null)}
                      placeholder="0-100"
                      className="w-full p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleClearPitch}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Campo</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
