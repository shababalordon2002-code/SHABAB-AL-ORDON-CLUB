'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Match, NormalizedEvent, TeamLineupConfig, Player } from '@/types';
import { Shield, Trophy, CheckCircle, Flame, Users, Settings, Edit3, RefreshCw, ArrowRightLeft, X } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
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
  onAddEvent?: (evt: NormalizedEvent) => void;
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
  onAddEvent,
}) => {
  const homeTeamName = match?.home_team || 'Shabab Al Ordon Club';
  const awayTeamName = match?.away_team || 'Al-Faisaly SC';
  const homeLogo = match?.home_team_logo;
  const awayLogo = match?.away_team_logo;

  // Lineup & Circle Kit State
  const [homeLineup, setHomeLineup] = useState<TeamLineupConfig>(() => {
    if (match?.home_lineup) return match.home_lineup;
    if (match?.id) {
      const dbm = dbStore.getMatchById(match.id);
      if (dbm?.home_lineup) return dbm.home_lineup;
    }
    return {
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
    };
  });

  const [awayLineup, setAwayLineup] = useState<TeamLineupConfig>(() => {
    if (match?.away_lineup) return match.away_lineup;
    if (match?.id) {
      const dbm = dbStore.getMatchById(match.id);
      if (dbm?.away_lineup) return dbm.away_lineup;
    }
    return {
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
    };
  });

  useEffect(() => {
    if (match?.home_lineup) {
      setHomeLineup(match.home_lineup);
    } else if (match?.id) {
      const dbm = dbStore.getMatchById(match.id);
      if (dbm?.home_lineup) setHomeLineup(dbm.home_lineup);
    }
    if (match?.away_lineup) {
      setAwayLineup(match.away_lineup);
    } else if (match?.id) {
      const dbm = dbStore.getMatchById(match.id);
      if (dbm?.away_lineup) setAwayLineup(dbm.away_lineup);
    }
  }, [match?.id, match?.home_lineup, match?.away_lineup]);

  const [editingLineupTeam, setEditingLineupTeam] = useState<'home' | 'away' | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Substitution Modal State
  const [addSubTeam, setAddSubTeam] = useState<'home' | 'away' | null>(null);
  const [subPlayerOut, setSubPlayerOut] = useState('');
  const [subPlayerIn, setSubPlayerIn] = useState('');
  const [subPlayerInNum, setSubPlayerInNum] = useState<number | ''>('');
  const [subMinute, setSubMinute] = useState<number | ''>(Math.floor(timerSeconds / 60) || 1);
  const [subPeriod, setSubPeriod] = useState<number>(period || 1);

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

            {/* Lineup & Kit Editor Button + Substitution Button */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => setEditingLineupTeam('home')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition w-fit cursor-pointer"
                title="Editar formación táctica, dorsales, jugadores y color de círculos"
              >
                <Users className="w-3 h-3 text-amber-400" />
                <span>Alineación ({homeLineup.formation})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddSubTeam('home');
                  setSubMinute(Math.floor(timerSeconds / 60) || 1);
                  setSubPeriod(period || 1);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/50 px-2 py-0.5 rounded-lg transition w-fit cursor-pointer shadow-sm"
                title="Registrar Sustitución / Cambio en directo"
              >
                <RefreshCw className="w-3 h-3 text-amber-400" />
                <span>+ Cambio</span>
              </button>
            </div>

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
        <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 sm:px-6 py-2.5 shadow-xl shrink-0 ring-1 ring-amber-500/20">
          {/* Home Score */}
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
            {homeScore}
          </span>

          <div className="flex flex-col items-center justify-center px-2 border-x border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">VS</span>
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-0.5">
              {period === 1 ? '1ª PARTE' : period === 2 ? '2ª PARTE' : `ET ${period - 2}`}
            </span>
          </div>

          {/* Away Score */}
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
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

            {/* Lineup & Kit Editor Button + Substitution Button */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => setEditingLineupTeam('away')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-lg transition w-fit cursor-pointer"
                title="Editar formación táctica, dorsales, jugadores y color de círculos"
              >
                <Users className="w-3 h-3 text-cyan-400" />
                <span>Alineación ({awayLineup.formation})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddSubTeam('away');
                  setSubMinute(Math.floor(timerSeconds / 60) || 1);
                  setSubPeriod(period || 1);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-500/50 px-2 py-0.5 rounded-lg transition w-fit cursor-pointer shadow-sm"
                title="Registrar Sustitución / Cambio en directo"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>+ Cambio</span>
              </button>
            </div>

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
            const updatedPlayers = convertLineupToPlayers(cfg, homeTeamName, 'team_home');
            if (match?.id) {
              const existing = dbStore.getMatchById(match.id);
              if (existing) {
                dbStore.saveMatch({ ...existing, home_lineup: cfg });
              }
              updatedPlayers.forEach((p) => dbStore.savePlayer(p));
            }
            onUpdateLineup?.('home', cfg, updatedPlayers);
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
            const updatedPlayers = convertLineupToPlayers(cfg, awayTeamName, 'team_away');
            if (match?.id) {
              const existing = dbStore.getMatchById(match.id);
              if (existing) {
                dbStore.saveMatch({ ...existing, away_lineup: cfg });
              }
              updatedPlayers.forEach((p) => dbStore.savePlayer(p));
            }
            onUpdateLineup?.('away', cfg, updatedPlayers);
          }}
          onCancel={() => setEditingLineupTeam(null)}
        />
      )}
      {/* Substitution Modal for Botonera Live Header (Rendered via React Portal at Root with z-[99999]) */}
      {addSubTeam && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!subPlayerOut || !subPlayerIn) return;
              const targetTeam = addSubTeam === 'home' ? homeTeamName : awayTeamName;
              const minVal = subMinute !== '' ? Number(subMinute) : Math.floor(timerSeconds / 60) || 1;
              const periodVal = Number(subPeriod) || period || 1;

              const newEvt: NormalizedEvent = {
                event_id: `evt_sub_${Date.now()}`,
                source_event_id: null,
                match_id: match?.id || 'free_session',
                team_name: targetTeam,
                team_id: addSubTeam === 'home' ? 'home_team' : 'away_team',
                player_id: null,
                player_name: subPlayerOut,
                event_type: 'Sustitución',
                category: 'Cambio',
                subcategory: null,
                timestamp: timerSeconds,
                minute: minVal,
                second: timerSeconds % 60,
                duration: null,
                period: periodVal,
                x: null,
                y: null,
                end_x: null,
                end_y: null,
                outcome: 'Éxito',
                metadata: {
                  player_out: subPlayerOut,
                  player_in: subPlayerIn,
                  player_in_number: subPlayerInNum !== '' ? Number(subPlayerInNum) : undefined,
                  dorsal: subPlayerInNum !== '' ? Number(subPlayerInNum) : undefined,
                },
                source: 'manual',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              dbStore.saveNormalizedEvents([newEvt], false);
              if (onAddEvent) {
                onAddEvent(newEvt);
              }

              setAddSubTeam(null);
              setSubPlayerOut('');
              setSubPlayerIn('');
              setSubPlayerInNum('');
            }}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-100">
                  Registrar Cambio en {addSubTeam === 'home' ? homeTeamName : awayTeamName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddSubTeam(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>🔴 Jugador Sustituido (Sale del campo):</span>
                  <span className="text-[10px] text-amber-400 font-mono">Titulares en campo</span>
                </label>
                <select
                  required
                  value={subPlayerOut}
                  onChange={(e) => setSubPlayerOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="">Selecciona el titular que sale...</option>
                  {(addSubTeam === 'home' ? homeLineup : awayLineup).starters.map((p, idx) => (
                    <option key={p.id || idx} value={p.name || `Jugador #${p.number || idx + 1}`}>
                      #{p.number || idx + 1} - {p.name || `Jugador #${p.number || idx + 1}`} ({p.position || 'JUG'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Roster Quick Selector for Player IN */}
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>🟢 Jugador Sustituto (Entra al campo):</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Selección rápida plantilla</span>
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    if (!selectedName) return;
                    setSubPlayerIn(selectedName);
                    const targetTeam = addSubTeam === 'home' ? homeTeamName : awayTeamName;
                    const dbMatch = dbStore.getPlayers().find(
                      (p) => p.name === selectedName || (p.team_name?.includes(targetTeam) && p.name === selectedName)
                    );
                    if (dbMatch?.number) setSubPlayerInNum(dbMatch.number);
                  }}
                  className="w-full bg-slate-950 border border-emerald-500/40 text-emerald-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 font-medium mb-2"
                >
                  <option value="">Elije un suplente registrado en la plantilla...</option>
                  {dbStore.getPlayers()
                    .filter((p) => {
                      const tName = addSubTeam === 'home' ? homeTeamName : awayTeamName;
                      return p.team_name?.toLowerCase().includes(tName.toLowerCase()) || tName.toLowerCase().includes(p.team_name?.toLowerCase() || '');
                    })
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        #{p.number} - {p.name} ({p.position})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Dorsal del que entra:</label>
                  <input
                    type="number"
                    placeholder="Ej: 19"
                    value={subPlayerInNum}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setSubPlayerInNum('');
                        return;
                      }
                      const num = Number(valStr);
                      setSubPlayerInNum(num);

                      // Auto-find player name by entered dorsal for this team
                      const targetTeam = addSubTeam === 'home' ? homeTeamName : awayTeamName;
                      const matchedP = dbStore.getPlayers().find(
                        (p) => p.number === num && (p.team_name?.toLowerCase().includes(targetTeam.toLowerCase()) || targetTeam.toLowerCase().includes(p.team_name?.toLowerCase() || ''))
                      );
                      if (matchedP) {
                        setSubPlayerIn(matchedP.name);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nombre del que entra:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del jugador..."
                    value={subPlayerIn}
                    onChange={(e) => setSubPlayerIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Minuto del cambio:</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="Ej: 65"
                    value={subMinute}
                    onChange={(e) => setSubMinute(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Parte / Periodo:</label>
                  <select
                    value={subPeriod}
                    onChange={(e) => setSubPeriod(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value={1}>1ª Parte</option>
                    <option value={2}>2ª Parte</option>
                    <option value={3}>1ª Prórroga (ET1)</option>
                    <option value={4}>2ª Prórroga (ET2)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAddSubTeam(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
              >
                Guardar Cambio
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

