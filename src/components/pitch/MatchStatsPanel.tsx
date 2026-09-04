'use client';

import React from 'react';
import { NormalizedEvent } from '@/types';
import { BarChart2, Activity, Target, ShieldCheck, AlertOctagon, AlertTriangle, Trophy } from 'lucide-react';

interface MatchStatsPanelProps {
  events: NormalizedEvent[];
}

export const MatchStatsPanel: React.FC<MatchStatsPanelProps> = ({ events }) => {
  // Compute counts dynamically from the given events dataset
  const totalEvents = events.length;

  const countPases = events.filter(
    (e) => e.category.toLowerCase().includes('pase') || e.category.toLowerCase().includes('centro')
  ).length;

  const countTiros = events.filter(
    (e) => e.category.toLowerCase().includes('tiro') || e.category.toLowerCase().includes('remate')
  ).length;

  const countRecuperaciones = events.filter(
    (e) => e.category.toLowerCase().includes('recuperacion') || e.category.toLowerCase().includes('intercepcion')
  ).length;

  const countPerdidas = events.filter(
    (e) => e.category.toLowerCase().includes('perdida') || e.category.toLowerCase().includes('pérdida')
  ).length;

  const countFaltas = events.filter(
    (e) => e.category.toLowerCase().includes('falta')
  ).length;

  const countGoles = events.filter(
    (e) => e.category.toLowerCase().includes('gol') || e.outcome?.toLowerCase() === 'gol'
  ).length;

  // Build stat list dynamically
  const statItems = [
    { label: 'Número de eventos', count: totalEvents, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Pases', count: countPases, icon: BarChart2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Tiros', count: countTiros, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Recuperaciones', count: countRecuperaciones, icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Pérdidas', count: countPerdidas, icon: AlertOctagon, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Faltas', count: countFaltas, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Goles', count: countGoles, icon: Trophy, color: 'text-emerald-300', bg: 'bg-emerald-400/20 border-emerald-400/30' },
  ];

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl select-none">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Estadísticas Básicas</span>
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Calculadas automáticamente a partir de eventos filtrados</p>
      </div>

      <div className="space-y-2.5">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${item.bg}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs font-semibold text-slate-200">{item.label}</span>
              </div>

              <span className={`font-mono text-base font-black ${item.color}`}>
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
