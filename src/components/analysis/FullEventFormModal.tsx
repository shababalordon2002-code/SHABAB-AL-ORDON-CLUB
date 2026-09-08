'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Plus, Target, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Match, NormalizedEvent, Player, BotoneraButton } from '@/types';
import { BotoneraPitchCanvas } from '@/components/botonera/BotoneraPitchCanvas';
import { getButtonColorHex } from '@/components/botonera/BotoneraPanelEditor';
import { PlayerAvatar, NumberBadge, TeamLogo } from '@/components/player/PlayerBadge';

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
  buttons?: BotoneraButton[];
  onSave: (savedEvent: NormalizedEvent) => void;
  onClose: () => void;
  title?: string;
}

export const FullEventFormModal: React.FC<FullEventFormModalProps> = ({
  initialEvent,
  match,
  players = [],
  buttons = [],
  onSave,
  onClose,
  title = 'Editar Evento Completo',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find original button definition matching this event
  const matchedButton = React.useMemo(() => {
    if (!buttons || buttons.length === 0 || !initialEvent) return null;
    const btnName = initialEvent.metadata?.buttonName || initialEvent.event_type;
    return (
      buttons.find((b) => b.name.toLowerCase() === btnName.toLowerCase()) ||
      buttons.find((b) => b.name.toLowerCase() === initialEvent.category.toLowerCase()) ||
      buttons.find((b) => b.category.toLowerCase() === initialEvent.category.toLowerCase()) ||
      null
    );
  }, [buttons, initialEvent]);

  const isOriginalVector = React.useMemo(() => {
    if (initialEvent?.end_x !== null && initialEvent?.end_x !== undefined) return true;
    if (initialEvent?.metadata?.pitchRequired === 'vector_arrow' || initialEvent?.metadata?.pitchRequired === 'vector') return true;
    if (matchedButton?.pitchRequired === 'vector_arrow' || matchedButton?.pitchRequired === 'vector') return true;
    return false;
  }, [initialEvent, matchedButton]);

  const buttonColorHex = matchedButton ? getButtonColorHex(matchedButton.color) : '#f59e0b';
  const homeTeam = match?.home_team || initialEvent?.team_name || 'Shabab Al Ordon Club';
  const awayTeam = match?.away_team || 'Rival SC';

  // Extract initial descriptors across all possible event metadata & subcategory fields
  const getInitialDescriptors = (evt?: NormalizedEvent): string[] => {
    if (!evt) return [];
    const fromMetaDescs = Array.isArray(evt.metadata?.descriptors) ? evt.metadata.descriptors : [];
    const fromMetaTags = Array.isArray(evt.metadata?.tags) ? evt.metadata.tags : [];
    const fromSubcat = evt.subcategory ? evt.subcategory.split(',').map((s) => s.trim()) : [];
    const fromOutcome = evt.outcome ? [evt.outcome.trim()] : [];

    return Array.from(new Set([...fromMetaDescs, ...fromMetaTags, ...fromSubcat, ...fromOutcome])).filter(Boolean);
  };

  const [eventType, setEventType] = useState(initialEvent?.event_type || 'Pase Clave');
  const [category, setCategory] = useState(initialEvent?.category || 'Ataque');
  const [teamName, setTeamName] = useState(initialEvent?.team_name || homeTeam);
  const [playerName, setPlayerName] = useState(initialEvent?.player_name || 'Jugador no asignado');
  const [period, setPeriod] = useState<number>(initialEvent?.period || 1);
  const totalSec = initialEvent?.timestamp ?? 0;
  const initialMin = initialEvent?.minute ?? (totalSec > 0 ? Math.floor(totalSec / 60) : 0);
  const initialSec = initialEvent?.second ?? (totalSec > 0 ? Math.floor(totalSec % 60) : 0);

  const [minute, setMinute] = useState<number>(initialMin);
  const [second, setSecond] = useState<number>(initialSec);
  const [duration, setDuration] = useState<number>(initialEvent?.duration ?? 5);
  const [outcome, setOutcome] = useState(initialEvent?.outcome || '');
  const [showGeneralPresets, setShowGeneralPresets] = useState(false);

  const [descriptors, setDescriptors] = useState<string[]>(() => getInitialDescriptors(initialEvent));
  const [customDescriptorInput, setCustomDescriptorInput] = useState('');

  // Coordinates & Pitch
  const [x, setX] = useState<number | null>(initialEvent?.x ?? null);
  const [y, setY] = useState<number | null>(initialEvent?.y ?? null);
  const [endX, setEndX] = useState<number | null>(initialEvent?.end_x ?? null);
  const [endY, setEndY] = useState<number | null>(initialEvent?.end_y ?? null);
  const [selectedZone, setSelectedZone] = useState<string | null>(
    (initialEvent?.metadata?.zone as string) || null
  );

  // Keep state synchronized whenever initialEvent changes
  useEffect(() => {
    if (initialEvent) {
      const initialD = getInitialDescriptors(initialEvent);
      setDescriptors(initialD);
      setOutcome(initialEvent.outcome || '');
      setEventType(initialEvent.event_type || 'Pase Clave');
      setCategory(initialEvent.category || 'Ataque');
      setTeamName(initialEvent.team_name || homeTeam);
      setPlayerName(initialEvent.player_name || 'Jugador no asignado');
      setPeriod(initialEvent.period || 1);
      const tSec = initialEvent.timestamp ?? 0;
      setMinute(initialEvent.minute ?? (tSec > 0 ? Math.floor(tSec / 60) : 0));
      setSecond(initialEvent.second ?? (tSec > 0 ? Math.floor(tSec % 60) : 0));
      setDuration(initialEvent.duration ?? 5);
      setX(initialEvent.x ?? null);
      setY(initialEvent.y ?? null);
      setEndX(initialEvent.end_x ?? null);
      setEndY(initialEvent.end_y ?? null);
      setSelectedZone((initialEvent.metadata?.zone as string) || null);
    }
  }, [initialEvent, homeTeam]);

  // Check if a descriptor or option is active on the event
  const isDescriptorSelected = (opt: string, groupType?: string): boolean => {
    const cleanOpt = opt.trim().toLowerCase();
    if (!cleanOpt) return false;

    if (outcome && outcome.trim().toLowerCase() === cleanOpt) return true;

    return descriptors.some((d) => {
      const cleanD = d.trim().toLowerCase();
      if (cleanD === cleanOpt) return true;
      if (cleanD.endsWith(`: ${cleanOpt}`) || cleanD.endsWith(`:${cleanOpt}`)) return true;
      if (groupType && cleanD === `${groupType.trim().toLowerCase()}: ${cleanOpt}`) return true;
      return false;
    });
  };

  const toggleDescriptorOption = (opt: string, groupType?: string) => {
    const cleanOpt = opt.trim();
    const isCurrentlySelected = isDescriptorSelected(cleanOpt, groupType);
    const cleanOptLower = cleanOpt.toLowerCase();

    let nextDescs: string[];
    if (isCurrentlySelected) {
      nextDescs = descriptors.filter((d) => {
        const cleanD = d.trim().toLowerCase();
        if (cleanD === cleanOptLower) return false;
        if (cleanD.endsWith(`: ${cleanOptLower}`) || cleanD.endsWith(`:${cleanOptLower}`)) return false;
        if (groupType && cleanD === `${groupType.trim().toLowerCase()}: ${cleanOptLower}`) return false;
        return true;
      });
      if (outcome && outcome.trim().toLowerCase() === cleanOptLower) {
        setOutcome('');
      }
    } else {
      nextDescs = Array.from(new Set([...descriptors, cleanOpt]));
      if (OUTCOME_PRESETS.map((o) => o.toLowerCase()).includes(cleanOptLower)) {
        setOutcome(cleanOpt);
      }
    }
    setDescriptors(nextDescs);
  };

  const toggleDescriptor = (desc: string) => {
    toggleDescriptorOption(desc);
  };

  const addCustomDescriptor = () => {
    const trimmed = customDescriptorInput.trim();
    if (trimmed && !isDescriptorSelected(trimmed)) {
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
        buttonColor: matchedButton?.color || initialEvent?.metadata?.buttonColor,
        buttonName: matchedButton?.name || initialEvent?.metadata?.buttonName || eventType,
      },
      source: initialEvent?.source || 'manual',
      created_at: initialEvent?.created_at || now,
      updated_at: now,
    };

    onSave(saved);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none flex justify-end">
      {/* Light non-blocking background so video on left stays 100% visible */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-auto cursor-pointer"
      />

      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-xl md:max-w-2xl lg:max-w-[650px] h-full bg-slate-900 border-l border-amber-500/40 shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-slide-left"
        style={{ borderColor: buttonColorHex }}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: `${buttonColorHex}20`,
                borderColor: `${buttonColorHex}40`,
                color: buttonColorHex,
              }}
            >
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base tracking-tight">{title}</h3>
                {matchedButton && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-slate-950"
                    style={{ backgroundColor: buttonColorHex }}
                  >
                    Botón: {matchedButton.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Edita campograma, flechas, zonas, tiempos, jugador y descriptores de la jugada.
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

        {/* Modal Body - Vertical Scroll */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs font-sans text-slate-200">
          {/* 1. ORIGINAL BUTTON DESCRIPTORS AND GROUPS (If matched button exists) */}
          {matchedButton ? (
            <div
              className="p-3.5 rounded-xl border space-y-3"
              style={{
                backgroundColor: `${buttonColorHex}12`,
                borderColor: `${buttonColorHex}40`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: buttonColorHex }} />
                  <span className="font-extrabold text-white text-xs tracking-tight">
                    ⭐ Descriptores y Opciones del Botón &quot;{matchedButton.name}&quot;
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${buttonColorHex}30`, color: '#fff' }}
                >
                  {matchedButton.category}
                </span>
              </div>

              {/* Dynamic Descriptor Groups */}
              {matchedButton.descriptorGroups && matchedButton.descriptorGroups.length > 0 && (
                <div className="space-y-2 pt-1">
                  {matchedButton.descriptorGroups.map((group) => (
                    <div key={group.id} className="space-y-1 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                        Grupo: {group.type} {group.required ? <span className="text-rose-400">*</span> : ''}
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {group.options.map((opt) => {
                          const isSelected = isDescriptorSelected(opt, group.type);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleDescriptorOption(opt, group.type)}
                              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-1 ring-emerald-300'
                                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700/60'
                              }`}
                            >
                              {isSelected ? '✓ ' : ''}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Flat Descriptors of original button */}
              {matchedButton.descriptors && matchedButton.descriptors.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                    Descriptores Predeterminados del Botón:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedButton.descriptors.map((desc) => {
                      const isSelected = isDescriptorSelected(desc);
                      return (
                        <button
                          key={desc}
                          type="button"
                          onClick={() => toggleDescriptorOption(desc)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-1 ring-emerald-300'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}
                          {desc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Editando acción libre (<strong className="text-white">{eventType}</strong>). Puedes usar las opciones y etiquetas de abajo.
              </span>
            </div>
          )}

          <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                <Target className="w-4 h-4" />
                <span>Campograma Táctico</span>
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

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex justify-center items-center overflow-hidden min-h-[280px]">
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
                initialMode={isOriginalVector ? 'vector_arrow' : endX !== null ? 'vector_arrow' : 'point'}
                lockMode={isOriginalVector}
                pitchViewMode="full"
              />
            </div>

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

          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
              Nombre del Evento / Acción
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  Equipo
                </label>
                <TeamLogo teamName={teamName} size={20} />
              </div>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set([homeTeam, awayTeam, 'Shabab Al Ordon Club'].filter(Boolean))).map((tName) => (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => setTeamName(tName)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all truncate max-w-[140px] ${
                      teamName === tName
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TeamLogo teamName={tName} size={13} />
                    <span className="truncate">{tName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                Jugador Asignado
              </label>

              {/* Selected Player Banner */}
              {(() => {
                const pObj = players.find((p) => p.name === playerName);
                if (pObj) {
                  return (
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 mb-2">
                      <NumberBadge number={pObj.number} size={30} selected={true} />
                      <PlayerAvatar photoUrl={pObj.photo_url} name={pObj.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-white block truncate">{pObj.name}</span>
                        <span className="text-[10px] text-emerald-400 font-bold block">{pObj.position}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <select
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-medium text-xs mb-2"
              >
                <option value="Jugador no asignado">Jugador no asignado</option>
                {players.map((p) => (
                  <option key={p.id} value={p.name}>
                    #{p.number} {p.name} ({p.position})
                  </option>
                ))}
              </select>

              {/* Quick Player Photo Cards */}
              {players.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                  {players.map((p) => {
                    const isSelected = playerName === p.name;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlayerName(isSelected ? 'Jugador no asignado' : p.name)}
                        className={`flex items-center gap-1.5 p-1 rounded-lg border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/40 font-bold'
                            : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <NumberBadge number={p.number} size={22} selected={isSelected} />
                        <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={22} />
                        <span className="text-[10px] font-bold truncate max-w-[90px]">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

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

          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                Añadir Descriptor Personalizado ({descriptors.length} activos)
              </label>
              <button
                type="button"
                onClick={() => setShowGeneralPresets(!showGeneralPresets)}
                className="text-[10px] font-bold text-cyan-400 hover:underline"
              >
                {showGeneralPresets ? 'Ocultar catálogo general ▲' : 'Ver catálogo general ▼'}
              </button>
            </div>

            {showGeneralPresets && (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-900 border border-slate-800">
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
                      {isSelected ? '✓ ' : ''}
                      {desc}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={customDescriptorInput}
                onChange={(e) => setCustomDescriptorInput(e.target.value)}
                placeholder="Añadir descriptor libre (ej. Presión Alta)..."
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

            {descriptors.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tags Activos en el Evento:</span>
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
              className="px-5 py-2 rounded-xl text-slate-950 text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5"
              style={{ backgroundColor: buttonColorHex }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};
