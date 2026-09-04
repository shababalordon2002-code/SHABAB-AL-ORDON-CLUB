'use client';

import React, { useState } from 'react';
import { BotoneraButton, PitchRequiredType } from '@/types';
import { BotoneraPitchCanvas } from './BotoneraPitchCanvas';
import { Check, X, Tag } from 'lucide-react';

interface BotoneraEventModalProps {
  button: BotoneraButton;
  initialGlobalDescriptors: string[]; // Active descriptors from the main UI
  onSave: (finalDescriptors: string[], pitchData?: any) => void;
  onCancel: () => void;
}

export const BotoneraEventModal: React.FC<BotoneraEventModalProps> = ({
  button,
  initialGlobalDescriptors,
  onSave,
  onCancel,
}) => {
  // We keep track of all selected descriptors (global + button specific)
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([...initialGlobalDescriptors]);

  // Pitch state
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [endX, setEndX] = useState<number | null>(null);
  const [endY, setEndY] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const hasDescriptors = button.descriptors && button.descriptors.length > 0;
  const hasPitch = button.pitchRequired && button.pitchRequired !== 'none';

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

  const handleSave = () => {
    const pitchData = hasPitch
      ? {
          startX,
          startY,
          endX,
          endY,
          selectedZone,
        }
      : undefined;

    onSave(selectedDescriptors, pitchData);
  };

  const isPitchValid = () => {
    if (!hasPitch) return true;
    if (button.pitchRequired === 'zone') return !!selectedZone;
    if (button.pitchRequired === 'point') return startX !== null && startY !== null;
    if (button.pitchRequired === 'vector') return startX !== null && startY !== null && endX !== null && endY !== null;
    return true;
  };

  const getPitchMode = (): 'arrows' | 'zones' | 'point' => {
    if (button.pitchRequired === 'zone') return 'zones';
    if (button.pitchRequired === 'point') return 'point';
    return 'arrows';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `var(--tw-colors-${button.color}-500)` }} />
              Registrando: {button.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Completa la información del evento antes de guardarlo.</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Split or Full width depending on requirements */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Descriptors */}
          {hasDescriptors && (
            <div className={`p-6 border-slate-800 flex flex-col gap-4 ${hasPitch ? 'md:w-1/3 md:border-r overflow-y-auto' : 'w-full'}`}>
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-emerald-400" /> Etiquetas / Descriptores
                </h4>
                <div className="flex flex-wrap gap-2">
                  {button.descriptors!.map((desc) => {
                    const isSelected = selectedDescriptors.includes(desc);
                    return (
                      <button
                        key={desc}
                        onClick={() => toggleDescriptor(desc)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {desc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show global active descriptors as read-only or togglable */}
              {initialGlobalDescriptors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <h4 className="text-[11px] font-semibold text-slate-500 mb-2">Etiquetas globales activas:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {initialGlobalDescriptors.map(desc => (
                      <span key={desc} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {desc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column: Pitch Canvas */}
          {hasPitch && (
            <div className={`p-6 bg-slate-950 flex flex-col items-center justify-center ${hasDescriptors ? 'md:w-2/3' : 'w-full'}`}>
              <div className="w-full max-w-sm">
                <h4 className="text-sm font-bold text-slate-200 mb-4 text-center">
                  Ubicación: {button.pitchRequired === 'zone' ? 'Zona Táctica' : button.pitchRequired === 'point' ? 'Punto Exacto' : 'Vector (Origen y Destino)'}
                </h4>
                <BotoneraPitchCanvas
                  startX={startX}
                  startY={startY}
                  endX={endX}
                  endY={endY}
                  onSetCoords={handlePitchCoords}
                  selectedZone={selectedZone}
                  onSelectZone={setSelectedZone}
                  initialMode={getPitchMode()}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isPitchValid()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition shadow-lg ${
              isPitchValid()
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
  );
};
