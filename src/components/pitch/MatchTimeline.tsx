'use client';

import React from 'react';
import { NormalizedEvent } from '@/types';
import { Clock } from 'lucide-react';

interface MatchTimelineProps {
  events: NormalizedEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: NormalizedEvent) => void;
  maxMinute?: number;
}

export const MatchTimeline: React.FC<MatchTimelineProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  maxMinute = 90,
}) => {
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Ticks at 0, 15, 30, 45, 60, 75, 90
  const ticks = [0, 15, 30, 45, 60, 75, 90];

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg select-none">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Timeline del Partido ({sortedEvents.length} eventos)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">0' a 90'+ minutos</span>
      </div>

      {/* TIMELINE AXIS & EVENT NODES */}
      <div className="relative pt-6 pb-4 px-4">
        {/* Horizontal Track */}
        <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-800/80 relative">
          <div className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-full w-full"></div>
        </div>

        {/* Minute Ticks & Labels */}
        {ticks.map((tick) => {
          const leftPercent = (tick / maxMinute) * 100;
          return (
            <div
              key={tick}
              className="absolute top-0 flex flex-col items-center transform -translate-x-1/2"
              style={{ left: `calc(${leftPercent}% + ${16 - leftPercent * 0.32}px)` }}
            >
              <span className="text-[10px] font-mono font-bold text-slate-500">{tick}'</span>
              <div className="w-0.5 h-3 bg-slate-800 mt-1"></div>
            </div>
          );
        })}

        {/* EVENT NODES ALONG THE TIMELINE */}
        {sortedEvents.map((evt) => {
          const minute = evt.minute !== null ? evt.minute : Math.floor((evt.timestamp || 0) / 60);
          const leftPercent = Math.min(100, Math.max(0, (minute / maxMinute) * 100));
          const isSelected = selectedEventId === evt.event_id;

          const isPass = evt.category.toLowerCase().includes('pase') || evt.category.toLowerCase().includes('centro');
          const isShot = evt.category.toLowerCase().includes('tiro') || evt.category.toLowerCase().includes('remate') || evt.category.toLowerCase().includes('gol');
          const isRecovery = evt.category.toLowerCase().includes('recuperacion') || evt.category.toLowerCase().includes('intercepcion');

          let dotColor = 'bg-slate-400 border-slate-600';
          if (isPass) dotColor = 'bg-emerald-500 border-emerald-400';
          else if (isShot) dotColor = 'bg-amber-500 border-amber-400';
          else if (isRecovery) dotColor = 'bg-blue-500 border-blue-400';

          return (
            <button
              key={evt.event_id}
              onClick={() => onSelectEvent(evt)}
              className={`absolute top-[22px] transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 z-10 ${
                isSelected ? 'scale-150 z-20' : ''
              }`}
              style={{ left: `calc(${leftPercent}% + ${16 - leftPercent * 0.32}px)` }}
              title={`${evt.minute}' ${evt.player_name} - ${evt.category}`}
            >
              <div
                className={`w-3 h-3 rounded-full border shadow-md transition-all ${dotColor} ${
                  isSelected ? 'ring-4 ring-emerald-400/50 shadow-emerald-500/50' : ''
                }`}
              ></div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
