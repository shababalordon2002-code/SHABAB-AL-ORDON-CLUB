'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Player } from '@/types';
import { PlayerAvatar } from '@/components/player/PlayerBadge';

export interface PlayerPickerOption {
  key: string;
  name: string;
  number?: number | string;
  position?: string;
  photoUrl?: string;
  /** Section title in the list, e.g. "Banquillo" or "Plantilla" */
  group?: string;
}

export function squadPlayerOption(p: Player, group?: string): PlayerPickerOption {
  return { key: `db:${p.id}`, name: p.name, number: p.number, position: p.position, photoUrl: p.photo_url, group };
}

/** Option for a lineup entry, enriched with its squad data (photo, position) when known */
export function lineupPlayerOption(
  item: { id?: string; name?: string; number?: number | string; position?: string },
  key: string,
  squadPlayer?: Player,
  group?: string
): PlayerPickerOption {
  return {
    key,
    name: item.name || `Jugador #${item.number ?? ''}`,
    number: item.number,
    position: squadPlayer?.position || (item.position && !['JUG', 'SUPL'].includes(item.position) ? item.position : undefined),
    photoUrl: squadPlayer?.photo_url,
    group,
  };
}

type Accent = 'amber' | 'emerald' | 'red';

const ACCENTS: Record<Accent, { border: string; ring: string; text: string; selected: string }> = {
  amber: { border: 'border-amber-500/40', ring: 'ring-amber-400/40', text: 'text-amber-300', selected: 'bg-amber-500/15 border-amber-500/50' },
  emerald: { border: 'border-emerald-500/40', ring: 'ring-emerald-400/40', text: 'text-emerald-300', selected: 'bg-emerald-500/15 border-emerald-500/50' },
  red: { border: 'border-red-500/40', ring: 'ring-red-400/40', text: 'text-red-300', selected: 'bg-red-500/15 border-red-500/50' },
};

function Dorsal({ number }: { number?: number | string }) {
  const shown = number !== undefined && number !== '' && Number(number) !== 0 ? number : '–';
  return (
    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center font-black italic text-amber-400 text-[12px] shrink-0 shadow-inner">
      {shown}
    </span>
  );
}

function OptionRow({ option, selected }: { option: PlayerPickerOption; selected?: boolean }) {
  return (
    <>
      <Dorsal number={option.number} />
      <PlayerAvatar photoUrl={option.photoUrl} name={option.name} size={30} />
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[12px] font-bold text-slate-100 truncate">{option.name}</span>
        {option.position && <span className="block text-[10px] text-slate-400 truncate">{option.position}</span>}
      </span>
      {selected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
    </>
  );
}

/**
 * Player list with photo, number, name and position. Expands inline (no floating layer) so it
 * is never clipped inside scrollable modals.
 */
export function PlayerPicker({
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar jugador...',
  accent = 'amber',
  emptyText = 'No hay jugadores disponibles',
}: {
  options: PlayerPickerOption[];
  value?: string;
  onSelect: (option: PlayerPickerOption) => void;
  placeholder?: string;
  accent?: Accent;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const colors = ACCENTS[accent];
  const selected = options.find((o) => o.key === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? options.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            String(o.number ?? '').startsWith(q) ||
            (o.position || '').toLowerCase().includes(q)
        )
      : options;
    const map = new Map<string, PlayerPickerOption[]>();
    filtered.forEach((o) => {
      const g = o.group || '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    });
    return Array.from(map.entries());
  }, [options, query]);

  return (
    <div ref={rootRef} className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-950 border ${colors.border} hover:bg-slate-900 transition cursor-pointer ${
          open ? `ring-2 ${colors.ring}` : ''
        }`}
      >
        {selected ? (
          <OptionRow option={selected} />
        ) : (
          <span className={`flex-1 text-left text-xs font-semibold ${colors.text} py-1.5 px-1`}>{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-800 bg-slate-900/60">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, dorsal o posición..."
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {groups.length === 0 && <p className="text-[11px] text-slate-500 italic text-center py-4">{emptyText}</p>}
            {groups.map(([group, items]) => (
              <div key={group || 'all'} className="space-y-1">
                {group && (
                  <div className="px-1.5 pt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {group} · {items.length}
                  </div>
                )}
                {items.map((o) => {
                  const isSelected = o.key === value;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => {
                        onSelect(o);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                        isSelected ? colors.selected : 'border-transparent hover:bg-slate-800/70'
                      }`}
                    >
                      <OptionRow option={o} selected={isSelected} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
