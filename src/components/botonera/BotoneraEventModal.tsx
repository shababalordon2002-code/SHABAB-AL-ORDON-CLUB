'use client';

import React, { useState } from 'react';
import { BotoneraButton, Player } from '@/types';
import { BotoneraPitchCanvas } from './BotoneraPitchCanvas';
import { Check, X, Tag, User, AlertCircle } from 'lucide-react';

interface BotoneraEventModalProps {
  button: BotoneraButton;
  initialGlobalDescriptors: string[]; // Active descriptors from the main UI
  players?: Player[];
  selectedPlayerId?: string | null;
  onSave: (finalDescriptors: string[], pitchData?: any, selectedPlayerId?: string | null) => void;
  onCancel: () => void;
}

export const BotoneraEventModal: React.FC<BotoneraEventModalProps> = ({
  button,
  initialGlobalDescriptors,
  players = [],
  selectedPlayerId: initialPlayerId = null,
  onSave,
  onCancel,
}) => {
  // Descriptors state
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([...initialGlobalDescriptors]);

  // Player selection state
  const [modalPlayerId, setModalPlayerId] = useState<string | null>(initialPlayerId);

  // Pitch state
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [endX, setEndX] = useState<number | null>(null);
  const [endY, setEndY] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const hasFlatDescriptors = button.descriptors && button.descriptors.length > 0;
  const hasGroupDescriptors = button.descriptorGroups && button.descriptorGroups.length > 0;
  const hasDescriptors = hasFlatDescriptors || hasGroupDescriptors;
  const hasPitch = button.pitchRequired && button.pitchRequired !== 'none';
  const showPlayerSelection = button.playerRequiredMode && button.playerRequiredMode !== 'none';
  const isPlayerMandatory = button.playerRequiredMode === 'required';

  const toggleDescriptor = (desc: string) => {
    if (selectedDescriptors.includes(desc)) {
      setSelectedDescriptors(selectedDescriptors.filter((d) => d !== desc));
    } else {
      setSelectedDescriptors([...selectedDescriptors, desc]);
    }
  };

  const handlePitchCoords = (start: { x: number; y: number } | null, end: { x: number; y: number } | null) => {
    setStartX(start?.x ?? null);
    setStartY(start?.y ?? null);
    setEndX(end?.x ?? null);
    setEndY(end?.y ?? null);
  };

  // Validation functions
  const isPitchValid = (): boolean => {
    if (!hasPitch) return true;
    if (button.pitchRequired?.startsWith('zone')) return !!selectedZone;
    if (button.pitchRequired?.startsWith('point')) return startX !== null && startY !== null;
    if (button.pitchRequired?.startsWith('vector')) return startX !== null && startY !== null && endX !== null && endY !== null;
    return true;
  };

  const isPlayerValid = (): boolean => {
    if (!isPlayerMandatory) return true;
    return !!modalPlayerId;
  };

  const getMissingRequiredDescriptors = (): string[] => {
    if (!hasGroupDescriptors) return [];
    const missing: string[] = [];
    button.descriptorGroups!.forEach((grp) => {
      if (grp.required) {
        const hasSelection = grp.options.some((opt) => {
          const descKey = `${grp.type}: ${opt}`;
          return selectedDescriptors.includes(descKey) || selectedDescriptors.includes(opt);
        });
        if (!hasSelection) {
          missing.push(grp.type || 'Tipo Descriptor');
        }
      }
    });
    return missing;
  };

  const missingRequiredDescriptors = getMissingRequiredDescriptors();
  const isDescriptorsValid = missingRequiredDescriptors.length === 0;

  const isValid = isPitchValid() && isPlayerValid() && isDescriptorsValid;

  const handleSave = () => {
    if (!isValid) return;

    const pitchData = hasPitch
      ? {
          startX,
          startY,
          endX,
          endY,
          selectedZone,
        }
      : undefined;

    onSave(selectedDescriptors, pitchData, modalPlayerId);
  };

  const selectedPlayer = players.find((p) => p.id === modalPlayerId);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: button.color.startsWith('#') ? button.color : undefined }} />
              Registrando: {button.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Completa los datos del evento antes de guardarlo en el registro táctico.</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* Left Column: Player Selection & Descriptors */}
          <div className={`p-6 flex flex-col gap-5 overflow-y-auto ${hasPitch ? 'md:w-1/2' : 'w-full'}`}>
            
            {/* 1. SELECCIÓN DE JUGADOR */}
            {showPlayerSelection && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Jugador del Evento:
                  </label>
                  {isPlayerMandatory ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                      ⚠️ OBLIGATORIO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-900">
                      ⚪ Opcional
                    </span>
                  )}
                </div>

                {/* Selected Player Banner */}
                {selectedPlayer ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        #{selectedPlayer.number}
                      </div>
                      <span className="text-xs font-bold text-slate-100">{selectedPlayer.name}</span>
                    </div>
                    {!isPlayerMandatory && (
                      <button
                        onClick={() => setModalPlayerId(null)}
                        className="text-[10px] text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {isPlayerMandatory ? 'Selecciona obligatoriamente un jugador de la plantilla:' : 'Sin jugador seleccionado.'}
                  </p>
                )}

                {/* Player Quick Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {players.map((p) => {
                    const isSelected = modalPlayerId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setModalPlayerId(isSelected && !isPlayerMandatory ? null : p.id)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition ${
                          isSelected
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                          #{p.number}
                        </span>
                        <span className="text-[11px] truncate leading-tight">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. DESCRIPTORES DEL EVENTO */}
            {hasDescriptors && (
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-emerald-400" /> Descriptores del Evento
                </h4>

                {/* Structured Descriptor Groups */}
                {hasGroupDescriptors && (
                  <div className="space-y-3">
                    {button.descriptorGroups!.map((grp) => {
                      const isGrpMissing = grp.required && !grp.options.some((opt) => {
                        const descKey = `${grp.type}: ${opt}`;
                        return selectedDescriptors.includes(descKey) || selectedDescriptors.includes(opt);
                      });

                      return (
                        <div
                          key={grp.id}
                          className={`p-3 rounded-xl bg-slate-950 border transition-colors space-y-2 ${
                            isGrpMissing ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-amber-400 block uppercase tracking-wider text-[11px]">
                              {grp.type || 'Descriptor'}:
                            </label>
                            {grp.required ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> OBLIGATORIO
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Opcional</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {grp.options.map((opt) => {
                              const descKey = `${grp.type}: ${opt}`;
                              const isSelected = selectedDescriptors.includes(descKey) || selectedDescriptors.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleDescriptor(descKey)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-left ${
                                    isSelected
                                      ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-md shadow-amber-950/40'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Legacy Flat Descriptors */}
                {hasFlatDescriptors && (
                  <div className="mt-3">
                    <h5 className="text-xs font-bold text-slate-400 mb-2">Etiquetas adicionales:</h5>
                    <div className="flex flex-wrap gap-2">
                      {button.descriptors!.map((desc) => {
                        const isSelected = selectedDescriptors.includes(desc);
                        return (
                          <button
                            key={desc}
                            type="button"
                            onClick={() => toggleDescriptor(desc)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {desc}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show global active descriptors */}
            {initialGlobalDescriptors.length > 0 && (
              <div className="mt-1 pt-3 border-t border-slate-800/50">
                <h4 className="text-[11px] font-semibold text-slate-500 mb-2">Etiquetas globales activas:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {initialGlobalDescriptors.map((desc) => (
                    <span key={desc} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                      {desc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pitch Canvas */}
          {hasPitch && (
            <div className={`p-6 bg-slate-950 flex flex-col items-center justify-center ${hasDescriptors || showPlayerSelection ? 'md:w-1/2' : 'w-full'}`}>
              <div className="w-full">
                <BotoneraPitchCanvas
                  startX={startX}
                  startY={startY}
                  endX={endX}
                  endY={endY}
                  onSetCoords={handlePitchCoords}
                  selectedZone={selectedZone}
                  onSelectZone={setSelectedZone}
                  initialMode={button.pitchRequired}
                  pitchViewMode={button.pitchViewMode}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer & Validation Status */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Validation Error Alerts */}
          {!isValid ? (
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {!isPlayerValid()
                  ? 'Falta seleccionar el jugador obligatorio.'
                  : missingRequiredDescriptors.length > 0
                  ? `Falta responder el descriptor obligatorio: "${missingRequiredDescriptors[0]}"`
                  : 'Falta marcar la posición en el campo.'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Todos los datos requeridos listos.</span>
            </div>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition shadow-lg ${
                isValid
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <Check className="w-4 h-4" />
              Guardar Evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
