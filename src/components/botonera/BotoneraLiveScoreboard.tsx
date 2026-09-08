'use client';

import React, { useState } from 'react';
import { Match, NormalizedEvent, TeamLineupConfig, Player } from '@/types';
import { Shield, Trophy, CheckCircle, Flame, Users, Settings, Edit3 } from 'lucide-react';
import { TeamLineupModal, TeamCircleIcon, getFormationPositions } from './TeamLineupModal';

export function MiniCampogramaWidget({
  config,
  onClick,
}: {
  config: TeamLineupConfig;
  onClick: () => void;
}) {
  const positions = getFormationPositions(config.formation || '4-3-3');
  const starters = config.starters || [];

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-12 h-16 sm:w-14 sm:h-20 rounded-xl border border-emerald-500/60 bg-emerald-950/90 overflow-hidden shadow-md hover:border-amber-400 hover:scale-105 transition cursor-pointer shrink-0 group select-none"
      title={`Campograma Táctico (${config.formation || '4-3-3'}). Haz clic para ver y editar.`}
    >
      {/* Mini Checkered Grass Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, #064e3b, #064e3b 8px, #047857 8px, #047857 16px),
            repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2) 6px, transparent 6px, transparent 12px)
          `,
        }}
      />

      {/* Field outline & center line */}
      <div className="absolute inset-1 border border-emerald-400/40 rounded-sm pointer-events-none" />
      <div className="absolute top-1/2 left-1 right-1 h-[1px] bg-emerald-400/40 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-5 h-5 border border-emerald-400/40 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* 11 Micro Circle Tokens with Dorsals */}
      {starters.slice(0, 11).map((player, idx) => {
        const presetPos = positions[idx] || { x: 50, y: 50, role: 'JUG' };
        const activePos = (config.customPositions && config.customPositions[player.id]) || {
          x: player.x ?? presetPos.x,
          y: player.y ?? presetPos.y,
        };

        return (
          <div
            key={player.id || idx}
            style={{
              left: `${activePos.x}%`,
              top: `${activePos.y}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <TeamCircleIcon style={config.circleStyle} number={player.number || idx + 1} size={11} />
          </div>
        );
      })}
    </button>
  );
}

interface BotoneraLiveScoreboardProps {
  match?: Match | null;
  events: NormalizedEvent[];
  timerSeconds?: number;
  period?: number;
  onUpdateLineup?: (team: 'home' | 'away', config: TeamLineupConfig, updatedPlayers: Player[]) => void;
}

export function isGoalEvent(evt: NormalizedEvent): boolean {
  const outcomeStr = (evt.outcome || '').toLowerCase();
  const catStr = (evt.category || '').toLowerCase();
  const typeStr = (evt.event_type || '').toLowerCase();
  const subcatStr = (evt.subcategory || '').toLowerCase();
  const metaDescriptors = evt.metadata?.descriptors || [];

  const isOutcomeGol = outcomeStr === 'gol';
  const isTypeGol = typeStr.includes('gol') && !typeStr.includes('fallido') && !typeStr.includes('no gol');
  const isCatGol = catStr.includes('gol') && !catStr.includes('fallido') && !catStr.includes('no gol');
  const hasGolDesc =
    metaDescriptors.some(
      (d: string) => d.toLowerCase() === 'gol' || d.toLowerCase().includes('resultado: gol')
    ) || subcatStr.includes('gol');

  return isOutcomeGol || isTypeGol || isCatGol || hasGolDesc;
}

export const BotoneraLiveScoreboard: React.FC<BotoneraLiveScoreboardProps> = ({
  match,
  events,
  timerSeconds = 0,
  period = 1,
  onUpdateLineup,
}) => {
  const homeTeamName = match?.home_team || 'Shabab Al Ordon Club';
  const awayTeamName = match?.away_team || 'Al-Faisaly SC';
  const homeLogo = match?.home_team_logo;
  const awayLogo = match?.away_team_logo;

  // Lineup & Circle Kit State
  const [homeLineup, setHomeLineup] = useState<TeamLineupConfig>({
    formation: '4-3-3',
    circleStyle: { primaryColor: '#ef4444', secondaryColor: '#ffffff', pattern: 'solid' },
    starters: Array.from({ length: 11 }, (_, i) => ({
      id: `h_st_${i + 1}`,
      number: i + 1,
      name: '',
      position: i === 0 ? 'POR' : 'JUG',
      isStarter: true,
    })),
    substitutes: [],
  });

  const [awayLineup, setAwayLineup] = useState<TeamLineupConfig>({
    formation: '4-3-3',
    circleStyle: { primaryColor: '#3b82f6', secondaryColor: '#ffffff', pattern: 'solid' },
    starters: Array.from({ length: 11 }, (_, i) => ({
      id: `a_st_${i + 1}`,
      number: i + 1,
      name: '',
      position: i === 0 ? 'POR' : 'JUG',
      isStarter: true,
    })),
    substitutes: [],
  });

  const [editingLineupTeam, setEditingLineupTeam] = useState<'home' | 'away' | null>(null);

  // Filter goal events
  const goalEvents = events.filter(isGoalEvent);

  // Group goals by team
  const homeGoalEvents = goalEvents.filter((e) => {
    if (!e.team_name) return true;
    return e.team_name.toLowerCase().trim() === homeTeamName.toLowerCase().trim();
  });

  const awayGoalEvents = goalEvents.filter((e) => {
    if (!e.team_name) return false;
    return e.team_name.toLowerCase().trim() === awayTeamName.toLowerCase().trim();
  });

  // Live session score starts at 0-0 and counts live tagged goals
  const homeScore = homeGoalEvents.length;
  const awayScore = awayGoalEvents.length;

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const convertLineupToPlayers = (cfg: TeamLineupConfig, tName: string, tId: string): Player[] => {
    const allItems = [...cfg.starters, ...cfg.substitutes];
    return allItems.map((item, idx) => ({
      id: item.id || `p_${tId}_${idx}`,
      name: item.name.trim() || `Jugador #${item.number}`,
      number: typeof item.number === 'number' ? item.number : parseInt(String(item.number)) || idx + 1,
      position: item.position || (idx === 0 ? 'POR' : 'JUG'),
      team_id: tId,
      team_name: tName,
    }));
  };

  return (
    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-24 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        {/* ── HOME TEAM (LOCAL) ── */}
        <div className="flex items-center gap-3 flex-1 justify-start w-full md:w-auto">
          {/* Home Shield */}
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shadow-lg shrink-0 group hover:border-amber-400 transition">
            {homeLogo ? (
              <img src={homeLogo} alt={homeTeamName} className="w-full h-full object-contain filter drop-shadow" />
            ) : (
              <Shield className="w-7 h-7 text-amber-400" />
            )}
          </div>

          {/* Mini Campograma Widget (Local) */}
          <MiniCampogramaWidget
            config={homeLineup}
            onClick={() => setEditingLineupTeam('home')}
          />

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">LOCAL</span>
              <span className="text-[10px] font-bold text-amber-300/80 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
                {homeLineup.formation}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-white tracking-tight line-clamp-1">
                {homeTeamName}
              </h2>
              {/* Circle Badge Preview */}
              <TeamCircleIcon style={homeLineup.circleStyle} number="10" size={20} />
            </div>

            {/* Lineup & Kit Editor Button */}
            <button
              type="button"
              onClick={() => setEditingLineupTeam('home')}
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition w-fit"
              title="Editar formación táctica, dorsales, jugadores y color de círculos"
            >
              <Users className="w-3 h-3 text-amber-400" />
              <span>Alineación ({homeLineup.formation})</span>
            </button>

            {/* Goal Scorer Chips */}
            {homeGoalEvents.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {homeGoalEvents.map((g) => (
                  <span
                    key={g.event_id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-md"
                  >
                    ⚽ {g.player_name !== 'Jugador Sin Asignar' ? g.player_name : 'Gol'} ({formatMinSec(g.timestamp ?? 0)})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTRAL SCOREBOARD ── */}
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-6 py-2.5 shadow-xl shrink-0 ring-1 ring-amber-500/20">
          {/* Home Score */}
          <span className="text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
            {homeScore}
          </span>

          <div className="flex flex-col items-center justify-center px-2 border-x border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">VS</span>
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-0.5">
              {period === 1 ? '1ª PARTE' : period === 2 ? '2ª PARTE' : `ET ${period - 2}`}
            </span>
          </div>

          {/* Away Score */}
          <span className="text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
            {awayScore}
          </span>
        </div>

        {/* ── AWAY TEAM (VISITANTE) ── */}
        <div className="flex items-center gap-3 flex-1 justify-end w-full md:w-auto text-right">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-cyan-300/80 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20 font-mono">
                {awayLineup.formation}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">VISITANTE</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Circle Badge Preview */}
              <TeamCircleIcon style={awayLineup.circleStyle} number="9" size={20} />
              <h2 className="text-base md:text-lg font-black text-white tracking-tight line-clamp-1">
                {awayTeamName}
              </h2>
            </div>

            {/* Lineup & Kit Editor Button */}
            <button
              type="button"
              onClick={() => setEditingLineupTeam('away')}
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-lg transition w-fit"
              title="Editar formación táctica, dorsales, jugadores y color de círculos"
            >
              <Users className="w-3 h-3 text-cyan-400" />
              <span>Alineación ({awayLineup.formation})</span>
            </button>

            {/* Goal Scorer Chips */}
            {awayGoalEvents.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 justify-end">
                {awayGoalEvents.map((g) => (
                  <span
                    key={g.event_id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded-md"
                  >
                    ⚽ {g.player_name !== 'Jugador Sin Asignar' ? g.player_name : 'Gol'} ({formatMinSec(g.timestamp ?? 0)})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mini Campograma Widget (Visitante) */}
          <MiniCampogramaWidget
            config={awayLineup}
            onClick={() => setEditingLineupTeam('away')}
          />

          {/* Away Shield */}
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shadow-lg shrink-0 group hover:border-cyan-400 transition">
            {awayLogo ? (
              <img src={awayLogo} alt={awayTeamName} className="w-full h-full object-contain filter drop-shadow" />
            ) : (
              <Shield className="w-7 h-7 text-cyan-400" />
            )}
          </div>
        </div>
      </div>

      {/* ── LINEUP & CIRCLE KIT MODAL ── */}
      {editingLineupTeam === 'home' && (
        <TeamLineupModal
          teamName={homeTeamName}
          teamLogo={homeLogo}
          isHomeTeam={true}
          initialConfig={homeLineup}
          onSave={(cfg) => {
            setHomeLineup(cfg);
            setEditingLineupTeam(null);
            onUpdateLineup?.('home', cfg, convertLineupToPlayers(cfg, homeTeamName, 'team_home'));
          }}
          onCancel={() => setEditingLineupTeam(null)}
        />
      )}

      {editingLineupTeam === 'away' && (
        <TeamLineupModal
          teamName={awayTeamName}
          teamLogo={awayLogo}
          isHomeTeam={false}
          initialConfig={awayLineup}
          onSave={(cfg) => {
            setAwayLineup(cfg);
            setEditingLineupTeam(null);
            onUpdateLineup?.('away', cfg, convertLineupToPlayers(cfg, awayTeamName, 'team_away'));
          }}
          onCancel={() => setEditingLineupTeam(null)}
        />
      )}
    </div>
  );
};

