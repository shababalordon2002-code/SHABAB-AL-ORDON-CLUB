'use client';

import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Match, NormalizedEvent, DashboardWidget } from '@/types';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { aggregate, EngineContext, calculateMatchScoresFromEvents } from '@/lib/analytics/dashboard-engine';
import { CategoryChart } from '@/components/dashboards/viz/CategoryChart';

interface MatchResultHeaderProps {
  match: Match;
  events: NormalizedEvent[];
  ctx: EngineContext;
}

const COMPARISON_WIDGET: DashboardWidget = {
  id: 'w_h2h_comparison',
  type: 'bar',
  title: 'Comparativa por equipo',
  x: 0,
  y: 0,
  w: 12,
  h: 8,
  dimension: 'event_type',
  breakdown: 'team_name',
  measure: 'count',
  filters: [],
  limit: 10,
  sort: 'value_desc',
  showValues: true,
  showLegend: true,
};

export const MatchResultHeader: React.FC<MatchResultHeaderProps> = ({ match, events, ctx }) => {
  const result = useMemo(() => aggregate(events, COMPARISON_WIDGET, ctx), [events, ctx]);

  // Dynamically calculate score from events (Remates/Tiros con Gol, etc.)
  const { homeScore, awayScore } = useMemo(() => {
    return calculateMatchScoresFromEvents(
      events,
      match.home_team,
      match.away_team,
      match.home_score ?? 0,
      match.away_score ?? 0
    );
  }, [events, match.home_team, match.away_team, match.home_score, match.away_score]);

  const isWin = homeScore !== awayScore;
  const homeWon = homeScore > awayScore;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Resultado + Escudos */}
      <div className="p-6 sm:p-8 flex flex-col items-center gap-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-400/80 font-extrabold">
          <Trophy className="w-3.5 h-3.5" />
          <span>{match.competition}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 normal-case tracking-normal">{match.date}</span>
        </div>

        <div className="flex items-center justify-center gap-6 sm:gap-12 w-full">
          <div className="flex flex-col items-center gap-2 flex-1 max-w-[180px]">
            <TeamLogo teamName={match.home_team} match={match} size={64} />
            <span className={`text-sm font-extrabold text-center leading-tight ${!isWin || homeWon ? 'text-white' : 'text-slate-400'}`}>
              {match.home_team}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <span className={`text-4xl sm:text-6xl font-black tabular-nums ${!isWin || homeWon ? 'text-emerald-400' : 'text-slate-300'}`}>
              {homeScore}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-600">-</span>
            <span className={`text-4xl sm:text-6xl font-black tabular-nums ${!isWin || !homeWon ? 'text-emerald-400' : 'text-slate-300'}`}>
              {awayScore}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 max-w-[180px]">
            <TeamLogo teamName={match.away_team} match={match} size={64} />
            <span className={`text-sm font-extrabold text-center leading-tight ${!isWin || !homeWon ? 'text-white' : 'text-slate-400'}`}>
              {match.away_team}
            </span>
          </div>
        </div>
      </div>

      {/* Comparativa de métricas: barras horizontales */}
      <div className="p-4 sm:p-6">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
          Comparativa de métricas
        </h3>
        <div className="h-[320px]">
          {result.labels.length > 0 ? (
            <CategoryChart result={result} measure="count" orientation="horizontal" showValues showLegend />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sin eventos registrados todavía para este partido.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
