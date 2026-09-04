'use client';

import React from 'react';
import { BarChart3, PieChart, Activity, User, Flame, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { NormalizedEvent } from '@/types';

interface BotoneraLiveStatsProps {
  events: NormalizedEvent[];
}

export const BotoneraLiveStats: React.FC<BotoneraLiveStatsProps> = ({ events }) => {
  const totalEvents = events.length;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  let successCount = 0;
  let failCount = 0;
  const playerCounts: Record<string, number> = {};
  const periodCounts: Record<number, number> = { 1: 0, 2: 0 };

  events.forEach((evt) => {
    // Category frequency
    const cat = evt.category || 'Otros';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Outcome (Éxito vs Fallido)
    const outcome = evt.outcome ? evt.outcome.toLowerCase() : '';
    if (outcome.includes('éxito') || outcome.includes('exito') || outcome.includes('ganado') || outcome.includes('clave') || outcome.includes('gol')) {
      successCount++;
    } else if (outcome.includes('fallido') || outcome.includes('perdido') || outcome.includes('pérdida') || outcome.includes('falta')) {
      failCount++;
    }

    // Player activity
    const pName = evt.player_name || 'Sin Asignar';
    playerCounts[pName] = (playerCounts[pName] || 0) + 1;

    // Period distribution
    const p = evt.period || 1;
    periodCounts[p] = (periodCounts[p] || 0) + 1;
  });

  // Top categories sorted by count
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  // Top players sorted by count (excl. 'Sin Asignar' if others exist)
  const sortedPlayers = Object.entries(playerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Success rate percentage
  const totalOutcomes = successCount + failCount;
  const successPct = totalOutcomes > 0 ? Math.round((successCount / totalOutcomes) * 100) : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              ESTADÍSTICAS PROVISIONALES
            </h3>
            <p className="text-[11px] text-slate-400">
              Resumen en directo de eventos registrados ({totalEvents})
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
          {totalEvents} ACCIONES
        </span>
      </div>

      {totalEvents === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800/60">
          Aún no se han anotado acciones en este partido. Las métricas en vivo aparecerán aquí a medida que utilices la botonera.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics Bar: Success Rate & Periods */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Efectividad</div>
                <div className="text-sm font-black text-emerald-400">{successPct}% <span className="text-[10px] text-slate-400 font-normal">({successCount}/{totalOutcomes})</span></div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">1ª Parte</div>
                <div className="text-sm font-black text-blue-300">{periodCounts[1] || 0} <span className="text-[10px] text-slate-500">ev.</span></div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">2ª Parte</div>
                <div className="text-sm font-black text-indigo-300">{periodCounts[2] || 0} <span className="text-[10px] text-slate-500">ev.</span></div>
              </div>
            </div>
          </div>

          {/* Breakdown by Event Category */}
          <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              <span>Distribución por Categoría de Evento</span>
            </h4>

            <div className="space-y-2 pt-1">
              {sortedCategories.slice(0, 6).map(([cat, count]) => {
                const pct = Math.round((count / totalEvents) * 100);
                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold">{cat}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        <strong>{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Active Players */}
          {sortedPlayers.length > 0 && (
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jugadores con Más Registros</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedPlayers.map(([pName, count]) => (
                  <div
                    key={pName}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-200 font-medium">{pName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                      {count} act.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
