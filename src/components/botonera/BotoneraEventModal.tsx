'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BotoneraButton, Player, Match, NormalizedEvent } from '@/types';
import { BotoneraPitchCanvas } from './BotoneraPitchCanvas';
import { BotoneraGoalCanvas } from './BotoneraGoalCanvas';
import { getFormationPositions } from './TeamLineupModal';
import {
  Check,
  X,
  Tag,
  User,
  Users,
  AlertCircle,
  Shield,
  PanelRight,
  Eye,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';

interface ExtendedPlayer extends Player {
  isSubstitutedIn?: boolean;
  subMinute?: number;
  subReplaces?: string;
  replacedBy?: string;
}

interface BotoneraEventModalProps {
  button: BotoneraButton;
  initialGlobalDescriptors: string[]; // Active descriptors from the main UI
  players?: Player[];
  selectedPlayerId?: string | null;
  currentMatch?: Match | null;
  clickTimestamp?: number;
  clickPeriod?: number;
  matchEvents?: NormalizedEvent[];
  initialPitchData?: {
    startX?: number | null;
    startY?: number | null;
    endX?: number | null;
    endY?: number | null;
    selectedZone?: string | null;
    goalX?: number | null;
    goalY?: number | null;
    goalZone?: string | null;
  };
  initialTeamName?: string | null;
  isEditing?: boolean;
  onSave: (
    finalDescriptors: string[],
    pitchData?: any,
    selectedPlayerId?: string | null,
    selectedTeamName?: string | null,
    selectedPlayerObj?: Player | null
  ) => void;
  onCancel: () => void;
}

/**
 * Compact Tactical Pitch Component ("Campograma pequeño")
 * Renders the 11 active on-field players according to the tactical system formation
 * with dorsal circles. Substituted-in players replace outgoing players dynamically.
 */
const MiniTacticalPlayerPitch: React.FC<{
  teamName: string;
  formation: string;
  active11: ExtendedPlayer[];
  teamColor: string;
  selectedPlayerId: string | null;
  onSelectPlayer: (p: Player) => void;
}> = ({ teamName, formation, active11, teamColor, selectedPlayerId, onSelectPlayer }) => {
  const positions = getFormationPositions(formation);

  return (
    <div className="relative w-[215px] sm:w-[230px] mx-auto h-[180px] rounded-xl bg-gradient-to-b from-[#091b12] via-[#0d281a] to-[#07160e] border border-emerald-600/40 shadow-inner overflow-hidden select-none shrink-0">
      {/* Soccer Pitch Markings (SVG) - Spans exact coordinate boundary with preserveAspectRatio="none" */}
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
        {/* Outer pitch boundary */}
        <rect x="4" y="4" width="92" height="112" rx="3" fill="none" stroke="#10b981" strokeWidth="0.9" />
        {/* Halfway line */}
        <line x1="4" y1="60" x2="96" y2="60" stroke="#10b981" strokeWidth="0.9" />
        {/* Center circle */}
        <circle cx="50" cy="60" r="14" fill="none" stroke="#10b981" strokeWidth="0.9" />
        <circle cx="50" cy="60" r="1.5" fill="#10b981" />
        {/* Top penalty area (Opponent / Attack zone) */}
        <rect x="22" y="4" width="56" height="22" fill="none" stroke="#10b981" strokeWidth="0.9" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="#10b981" strokeWidth="0.7" />
        {/* Bottom penalty area (Our Goalkeeper) */}
        <rect x="22" y="94" width="56" height="22" fill="none" stroke="#10b981" strokeWidth="0.9" />
        <rect x="34" y="108" width="32" height="8" fill="none" stroke="#10b981" strokeWidth="0.7" />
      </svg>

      {/* Attack Direction Indicator */}
      <div className="absolute top-1.5 right-2 text-[8px] font-mono font-black text-emerald-400/80 tracking-widest pointer-events-none uppercase">
        Ataque ↑
      </div>

      {/* Formation system badge */}
      <div className="absolute top-1.5 left-2 text-[8.5px] font-mono font-black text-emerald-300/90 tracking-wide pointer-events-none uppercase bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
        {formation}
      </div>

      {/* 11 Players Placed According to Formation System */}
      {positions.map((pos, idx) => {
        const player = active11[idx] || {
          id: `slot_${idx}`,
          name: pos.role,
          number: idx + 1,
          position: pos.role,
          team_name: teamName,
          team_id: 'team',
          isStarter: true,
        };

        const isSelected = selectedPlayerId === player.id;
        const isGK = idx === 0 || pos.role === 'POR';
        const isSub = Boolean(player.isSubstitutedIn);

        return (
          <button
            key={player.id || idx}
            type="button"
            onClick={() => onSelectPlayer(player)}
            title={`#${player.number} ${player.name} (${pos.role})${isSub ? ` - 🔄 Entró en min ${player.subMinute}'` : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 cursor-pointer group z-10 ${
              isSelected ? 'scale-125 z-30' : 'hover:scale-115 hover:z-20'
            }`}
          >
            {/* Dorsal Circle */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] select-none border transition-all shadow-md relative ${
                isSelected
                  ? 'ring-3 ring-amber-400 ring-offset-1 ring-offset-slate-950 text-white font-black'
                  : ''
              }`}
              style={{
                backgroundColor: isSelected
                  ? '#f59e0b'
                  : isGK
                  ? '#eab308'
                  : teamColor,
                color: isGK && !isSelected ? '#0f172a' : '#ffffff',
                borderColor: isSelected ? '#fbbf24' : '#ffffff90',
              }}
            >
              {player.number ?? idx + 1}

              {/* Substituted badge 🔄 */}
              {isSub && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 text-[7px] font-black px-1 rounded-full border border-slate-950 leading-none py-0.5 shadow">
                  🔄
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const BotoneraEventModal: React.FC<BotoneraEventModalProps> = ({
  button,
  initialGlobalDescriptors,
  players = [],
  selectedPlayerId: initialPlayerId = null,
  currentMatch = null,
  clickTimestamp,
  clickPeriod,
  matchEvents = [],
  initialPitchData,
  initialTeamName,
  isEditing = false,
  onSave,
  onCancel,
}) => {
  // Side-docking state (defaults to true so the modal opens docked to the right side without covering the video)
  const [isSideDocked, setIsSideDocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sao_botonera_side_docked');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleSideDocked = () => {
    setIsSideDocked((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sao_botonera_side_docked', String(next));
      }
      return next;
    });
  };

  const homeTeamName = currentMatch?.home_team || 'Shabab Al Ordon';
  const awayTeamName = currentMatch?.away_team || 'Al Ramtha';
  const homeTeamLogo = currentMatch?.home_team_logo;
  const awayTeamLogo = currentMatch?.away_team_logo;

  // Helper: check if a team name is Shabab Al Ordon (always Red)
  const isShabab = (tName?: string | null): boolean => {
    if (!tName) return false;
    const lower = tName.toLowerCase().trim();
    return lower.includes('shabab') || lower.includes('ordon') || lower.includes('sao');
  };

  const isHomeShabab = isShabab(homeTeamName);
  const isAwayShabab = isShabab(awayTeamName);

  const homeFormation =
    currentMatch?.home_lineup?.formation ||
    (currentMatch?.id ? dbStore.getMatchById(currentMatch.id)?.home_lineup?.formation : null) ||
    '4-3-3';
  const awayFormation =
    currentMatch?.away_lineup?.formation ||
    (currentMatch?.id ? dbStore.getMatchById(currentMatch.id)?.away_lineup?.formation : null) ||
    '4-3-3';

  const homeColor =
    currentMatch?.home_lineup?.circleStyle?.primaryColor || (isHomeShabab ? '#ef4444' : '#3b82f6');
  const awayColor =
    currentMatch?.away_lineup?.circleStyle?.primaryColor || (isAwayShabab ? '#ef4444' : '#3b82f6');

  // Extract all substitutions chronologically from matchEvents and currentMatch
  const substitutions = useMemo(() => {
    const list: Array<{
      id: string;
      teamName: string;
      playerOutName: string;
      playerInName: string;
      playerInNumber?: number;
      minute?: number;
      timestamp?: number;
    }> = [];

    (matchEvents || []).forEach((evt) => {
      const isSub =
        evt.event_type === 'Sustitución' ||
        evt.category === 'Cambio' ||
        Boolean(evt.metadata?.player_in);

      if (isSub) {
        const outName = evt.metadata?.player_out || evt.player_name || '';
        const inName = evt.metadata?.player_in || '';
        const inNum = evt.metadata?.player_in_number ?? evt.metadata?.dorsal;
        const tName = evt.team_name || (evt.team_id === 'home_team' ? homeTeamName : awayTeamName);

        if (outName && inName) {
          list.push({
            id: evt.event_id || `sub_${Math.random()}`,
            teamName: tName,
            playerOutName: outName.trim(),
            playerInName: inName.trim(),
            playerInNumber: inNum !== undefined && inNum !== null ? Number(inNum) : undefined,
            minute: evt.minute ?? undefined,
            timestamp: evt.timestamp ?? undefined,
          });
        }
      }
    });

    if (Array.isArray((currentMatch as any)?.substitutions)) {
      (currentMatch as any).substitutions.forEach((s: any, idx: number) => {
        if (s.playerOutName && s.playerInName) {
          const exists = list.some(
            (item) =>
              item.playerOutName.toLowerCase() === s.playerOutName.toLowerCase() &&
              item.playerInName.toLowerCase() === s.playerInName.toLowerCase()
          );
          if (!exists) {
            list.push({
              id: s.id || `match_sub_${idx}`,
              teamName: s.teamName || homeTeamName,
              playerOutName: s.playerOutName.trim(),
              playerInName: s.playerInName.trim(),
              playerInNumber: s.playerInNumber !== undefined ? Number(s.playerInNumber) : undefined,
              minute: s.minute,
              timestamp: s.timestamp,
            });
          }
        }
      });
    }

    return list;
  }, [matchEvents, currentMatch, homeTeamName, awayTeamName]);

  // Build active 11 on the pitch with dynamic substitutions, plus bench & subbed-out players
  const squadData = useMemo(() => {
    const homeLineup =
      currentMatch?.home_lineup ||
      (currentMatch?.id ? dbStore.getMatchById(currentMatch.id)?.home_lineup : null);

    const awayLineup =
      currentMatch?.away_lineup ||
      (currentMatch?.id ? dbStore.getMatchById(currentMatch.id)?.away_lineup : null);

    const buildStarters = (
      lineupStarters: any[] | undefined,
      teamName: string,
      teamId: string,
      prefix: string
    ): ExtendedPlayer[] => {
      const list: ExtendedPlayer[] = [];
      if (lineupStarters && lineupStarters.length > 0) {
        lineupStarters.slice(0, 11).forEach((s, idx) => {
          list.push({
            id: s.id || `${prefix}_st_${s.number || idx + 1}`,
            number: typeof s.number === 'number' ? s.number : parseInt(String(s.number)) || idx + 1,
            name: s.name && s.name.trim() ? s.name.trim() : `Jugador #${s.number || idx + 1}`,
            position: s.position || (idx === 0 ? 'POR' : 'JUG'),
            team_id: teamId,
            team_name: teamName,
            isStarter: true,
          });
        });
      }
      while (list.length < 11) {
        const idx = list.length;
        list.push({
          id: `${prefix}_st_${idx + 1}`,
          number: idx + 1,
          name: `Jugador #${idx + 1}`,
          position: idx === 0 ? 'POR' : 'JUG',
          team_id: teamId,
          team_name: teamName,
          isStarter: true,
        });
      }
      return list;
    };

    const buildSubs = (
      lineupSubs: any[] | undefined,
      teamName: string,
      teamId: string,
      prefix: string
    ): ExtendedPlayer[] => {
      const list: ExtendedPlayer[] = [];
      if (lineupSubs && lineupSubs.length > 0) {
        lineupSubs.forEach((s, idx) => {
          list.push({
            id: s.id || `${prefix}_sub_${s.number || idx + 12}`,
            number: typeof s.number === 'number' ? s.number : parseInt(String(s.number)) || idx + 12,
            name: s.name && s.name.trim() ? s.name.trim() : `Jugador #${s.number || idx + 12}`,
            position: s.position || 'JUG',
            team_id: teamId,
            team_name: teamName,
            isStarter: false,
          });
        });
      }
      return list;
    };

    const initialHomeStarters = buildStarters(homeLineup?.starters, homeTeamName, 'team_home', 'h');
    const initialAwayStarters = buildStarters(awayLineup?.starters, awayTeamName, 'team_away', 'a');

    const homeSubstitutes = buildSubs(homeLineup?.substitutes, homeTeamName, 'team_home', 'h');
    const awaySubstitutes = buildSubs(awayLineup?.substitutes, awayTeamName, 'team_away', 'a');

    const addExtraDbPlayers = (
      targetList: ExtendedPlayer[],
      startersList: ExtendedPlayer[],
      targetTeamName: string,
      isSao: boolean
    ) => {
      const existingIds = new Set([...targetList.map((p) => p.id), ...startersList.map((p) => p.id)]);
      const existingNames = new Set([
        ...targetList.map((p) => p.name.toLowerCase().trim()),
        ...startersList.map((p) => p.name.toLowerCase().trim()),
      ]);

      (players || []).forEach((p) => {
        const t = (p.team_name || '').toLowerCase().trim();
        const match = t === targetTeamName.toLowerCase().trim() || (isSao && isShabab(t));
        if (match && !existingIds.has(p.id) && !existingNames.has(p.name.toLowerCase().trim())) {
          targetList.push({ ...p, team_name: targetTeamName, isStarter: false });
        }
      });
    };

    addExtraDbPlayers(homeSubstitutes, initialHomeStarters, homeTeamName, isHomeShabab);
    addExtraDbPlayers(awaySubstitutes, initialAwayStarters, awayTeamName, isAwayShabab);

    const isHomeSub = (subTeam: string) => {
      const lower = subTeam.toLowerCase().trim();
      return (
        lower === homeTeamName.toLowerCase().trim() ||
        (isHomeShabab && isShabab(lower)) ||
        lower.includes('home')
      );
    };

    // Apply substitutions: player who enters replaces player who leaves in active11
    // The player who leaves is removed from active11 and placed in subbedOut
    const homeActive11: ExtendedPlayer[] = initialHomeStarters.map((p) => ({ ...p }));
    const homeSubbedOut: ExtendedPlayer[] = [];

    const sortedSubs = [...substitutions].sort((a, b) => (a.minute || 0) - (b.minute || 0));

    sortedSubs.forEach((sub) => {
      const isHome = isHomeSub(sub.teamName);
      const target11 = isHome ? homeActive11 : null;
      const targetOutList = isHome ? homeSubbedOut : null;

      if (target11 && targetOutList) {
        const outNorm = sub.playerOutName.toLowerCase().trim();
        const idx = target11.findIndex((p) => {
          const pNorm = p.name.toLowerCase().trim();
          return pNorm === outNorm || pNorm.includes(outNorm) || outNorm.includes(pNorm);
        });

        if (idx !== -1) {
          const oldPlayer = target11[idx];
          targetOutList.push({
            ...oldPlayer,
            subMinute: sub.minute,
            replacedBy: sub.playerInName,
          });

          const subBenchMatch = homeSubstitutes.find(
            (s) =>
              s.name.toLowerCase().trim() === sub.playerInName.toLowerCase().trim() ||
              s.name.toLowerCase().includes(sub.playerInName.toLowerCase()) ||
              sub.playerInName.toLowerCase().includes(s.name.toLowerCase())
          );

          target11[idx] = {
            id: subBenchMatch?.id || `sub_in_${sub.playerInName.replace(/\s+/g, '_')}_${sub.playerInNumber || idx + 1}`,
            name: sub.playerInName,
            number:
              sub.playerInNumber !== undefined
                ? sub.playerInNumber
                : subBenchMatch?.number !== undefined
                ? subBenchMatch.number
                : 99,
            position: oldPlayer.position || 'JUG',
            team_id: 'team_home',
            team_name: homeTeamName,
            isStarter: false,
            isSubstitutedIn: true,
            subMinute: sub.minute,
            subReplaces: oldPlayer.name,
          };
        }
      }
    });

    const awayActive11: ExtendedPlayer[] = initialAwayStarters.map((p) => ({ ...p }));
    const awaySubbedOut: ExtendedPlayer[] = [];

    sortedSubs.forEach((sub) => {
      const isHome = isHomeSub(sub.teamName);
      const target11 = !isHome ? awayActive11 : null;
      const targetOutList = !isHome ? awaySubbedOut : null;

      if (target11 && targetOutList) {
        const outNorm = sub.playerOutName.toLowerCase().trim();
        const idx = target11.findIndex((p) => {
          const pNorm = p.name.toLowerCase().trim();
          return pNorm === outNorm || pNorm.includes(outNorm) || outNorm.includes(pNorm);
        });

        if (idx !== -1) {
          const oldPlayer = target11[idx];
          targetOutList.push({
            ...oldPlayer,
            subMinute: sub.minute,
            replacedBy: sub.playerInName,
          });

          const subBenchMatch = awaySubstitutes.find(
            (s) =>
              s.name.toLowerCase().trim() === sub.playerInName.toLowerCase().trim() ||
              s.name.toLowerCase().includes(sub.playerInName.toLowerCase()) ||
              sub.playerInName.toLowerCase().includes(s.name.toLowerCase())
          );

          target11[idx] = {
            id: subBenchMatch?.id || `sub_in_${sub.playerInName.replace(/\s+/g, '_')}_${sub.playerInNumber || idx + 1}`,
            name: sub.playerInName,
            number:
              sub.playerInNumber !== undefined
                ? sub.playerInNumber
                : subBenchMatch?.number !== undefined
                ? subBenchMatch.number
                : 99,
            position: oldPlayer.position || 'JUG',
            team_id: 'team_away',
            team_name: awayTeamName,
            isStarter: false,
            isSubstitutedIn: true,
            subMinute: sub.minute,
            subReplaces: oldPlayer.name,
          };
        }
      }
    });

    const getUnusedBench = (allSubs: ExtendedPlayer[], active11: ExtendedPlayer[]) => {
      const activeNames = new Set(active11.map((p) => p.name.toLowerCase().trim()));
      return allSubs.filter((s) => !activeNames.has(s.name.toLowerCase().trim()));
    };

    const homeUnusedBench = getUnusedBench(homeSubstitutes, homeActive11);
    const awayUnusedBench = getUnusedBench(awaySubstitutes, awayActive11);

    return {
      homeActive11,
      awayActive11,
      homeSubbedOut,
      awaySubbedOut,
      homeUnusedBench,
      awayUnusedBench,
      homeAll: [...homeActive11, ...homeUnusedBench, ...homeSubbedOut],
      awayAll: [...awayActive11, ...awayUnusedBench, ...awaySubbedOut],
    };
  }, [currentMatch, players, homeTeamName, awayTeamName, isHomeShabab, isAwayShabab, substitutions]);

  // Team selection state
  const [modalTeamName, setModalTeamName] = useState<string | null>(() => {
    if (initialTeamName) return initialTeamName;
    if (initialPlayerId) {
      const initialP =
        squadData.homeAll.find((p) => p.id === initialPlayerId) ||
        squadData.awayAll.find((p) => p.id === initialPlayerId) ||
        players.find((p) => p.id === initialPlayerId);
      if (initialP) {
        const pTeam = (initialP.team_name || '').toLowerCase().trim();
        if (pTeam === homeTeamName.toLowerCase().trim() || isShabab(pTeam)) {
          return homeTeamName;
        } else {
          return awayTeamName;
        }
      }
    }
    // Default to home team for initial view
    return homeTeamName;
  });

  // Player selection state
  const [modalPlayerId, setModalPlayerId] = useState<string | null>(initialPlayerId);

  // Bench expansion toggle
  const [showBench, setShowBench] = useState<boolean>(false);

  // Descriptors state
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([...initialGlobalDescriptors]);

  // Pitch canvas state
  const [startX, setStartX] = useState<number | null>(initialPitchData?.startX ?? null);
  const [startY, setStartY] = useState<number | null>(initialPitchData?.startY ?? null);
  const [endX, setEndX] = useState<number | null>(initialPitchData?.endX ?? null);
  const [endY, setEndY] = useState<number | null>(initialPitchData?.endY ?? null);
  const [selectedZone, setSelectedZone] = useState<string | null>(initialPitchData?.selectedZone ?? null);

  // Goal canvas state
  const [goalX, setGoalX] = useState<number | null>(initialPitchData?.goalX ?? null);
  const [goalY, setGoalY] = useState<number | null>(initialPitchData?.goalY ?? null);
  const [goalZone, setGoalZone] = useState<string | null>(initialPitchData?.goalZone ?? null);

  const hasFlatDescriptors = button.descriptors && button.descriptors.length > 0;
  const hasGroupDescriptors = button.descriptorGroups && button.descriptorGroups.length > 0;
  const hasDescriptors = hasFlatDescriptors || hasGroupDescriptors;

  const isSinglePitch = button.pitchDisplayCount === 1 || (
    button.pitchDisplayCount !== 2 &&
    button.pitchRequired === 'goal_mouth' &&
    !button.secondaryPitchRequired
  );

  const isDualPitch = button.pitchDisplayCount === 2 || (
    !isSinglePitch && Boolean(
      button.pitchRequired === 'pitch_and_goal' ||
      (button.secondaryPitchRequired === 'goal_mouth' && button.pitchRequired && button.pitchRequired !== 'goal_mouth' && button.pitchRequired !== 'none') ||
      (button.goalRequired && button.pitchRequired && button.pitchRequired !== 'goal_mouth' && button.pitchRequired !== 'none')
    )
  );

  const hasGoal = isSinglePitch
    ? button.pitchRequired === 'goal_mouth'
    : Boolean(
        button.pitchRequired === 'goal_mouth' ||
        button.pitchRequired === 'pitch_and_goal' ||
        button.goalRequired ||
        button.secondaryPitchRequired === 'goal_mouth' ||
        button.pitchModes?.includes('goal_mouth')
      );

  const hasFieldPitch = isSinglePitch
    ? Boolean(button.pitchRequired && button.pitchRequired !== 'none' && button.pitchRequired !== 'goal_mouth')
    : Boolean(button.pitchRequired && button.pitchRequired !== 'none' && button.pitchRequired !== 'goal_mouth');

  const hasMultiplePitches = isDualPitch || (!isSinglePitch && hasFieldPitch && hasGoal);
  const hasPitch = hasFieldPitch || hasGoal;

  const isVectorPitch = Boolean(
    button.pitchRequired?.startsWith('vector') ||
    button.pitchRequired === 'vector_arrow'
  );
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
      }
    };
  }, []);

  const [activePitchTab, setActivePitchTab] = useState<'field' | 'goal'>(() => {
    if (button.pitchRequired === 'goal_mouth') return 'goal';
    return 'field';
  });

  const [dualViewMode, setDualViewMode] = useState<'simultaneous' | 'tabs'>(() => {
    return button.dualPitchLayout || (isSideDocked ? 'tabs' : 'simultaneous');
  });
  const showPlayerSelection = button.playerRequiredMode && button.playerRequiredMode !== 'none';
  const isPlayerMandatory = button.playerRequiredMode === 'required';

  const showTeamSelection = button.teamRequiredMode && button.teamRequiredMode !== 'none';
  const isTeamMandatory = button.teamRequiredMode === 'required';

  // Active team currently being viewed in the tactical pitch
  const activeViewTeam = modalTeamName || homeTeamName;
  const isViewHome = activeViewTeam.toLowerCase().trim() === homeTeamName.toLowerCase().trim();

  const currentActive11 = isViewHome ? squadData.homeActive11 : squadData.awayActive11;
  const currentBench = isViewHome ? squadData.homeUnusedBench : squadData.awayUnusedBench;
  const currentSubbedOut = isViewHome ? squadData.homeSubbedOut : squadData.awaySubbedOut;
  const currentFormation = isViewHome ? homeFormation : awayFormation;
  const currentTeamColor = isViewHome ? homeColor : awayColor;

  const selectedPlayer: ExtendedPlayer | null = useMemo(() => {
    if (!modalPlayerId) return null;
    return (
      squadData.homeAll.find((p) => p.id === modalPlayerId) ||
      squadData.awayAll.find((p) => p.id === modalPlayerId) ||
      (players.find((p) => p.id === modalPlayerId) as ExtendedPlayer | undefined) ||
      null
    );
  }, [modalPlayerId, squadData, players]);

  const handleSelectPlayer = (p: Player) => {
    const isSelected = modalPlayerId === p.id;
    if (isSelected) {
      if (!isPlayerMandatory) {
        setModalPlayerId(null);
      }
      return;
    }

    setModalPlayerId(p.id);

    // Auto switch team if clicked player belongs to a specific team
    const isHomeP =
      squadData.homeAll.some((hp) => hp.id === p.id) ||
      (p.team_name || '').toLowerCase().trim() === homeTeamName.toLowerCase().trim();
    const targetTeam = isHomeP ? homeTeamName : awayTeamName;
    if (modalTeamName !== targetTeam) {
      setModalTeamName(targetTeam);
    }
  };

  const normalizeDescText = (txt: string): string => {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[:_\-\s]+/g, ' ')
      .trim();
  };

  const isOptionSelected = (grpType: string, opt: string): boolean => {
    const normOpt = normalizeDescText(opt);
    const normGrp = normalizeDescText(grpType);
    const normCombined = `${normGrp} ${normOpt}`;

    return selectedDescriptors.some((d) => {
      if (!d) return false;
      const normD = normalizeDescText(d);
      if (normD === normOpt || normD === normCombined) return true;

      const colonIdx = d.indexOf(':');
      if (colonIdx !== -1) {
        const dGrp = normalizeDescText(d.slice(0, colonIdx));
        const dVal = normalizeDescText(d.slice(colonIdx + 1));
        if (dVal === normOpt) {
          if (dGrp === normGrp || !dGrp || !normGrp || dGrp.includes(normGrp) || normGrp.includes(dGrp)) {
            return true;
          }
          return true;
        }
      }
      return false;
    });
  };

  const handleToggleGroupOption = (grpType: string, opt: string) => {
    const descKey = `${grpType}: ${opt}`;
    const isCurrentlySelected = isOptionSelected(grpType, opt);
    const grp = button.descriptorGroups?.find((g) => normalizeDescText(g.type) === normalizeDescText(grpType));
    const allowMultiple = grp?.allowMultiple ?? false;

    if (isCurrentlySelected) {
      const normOpt = normalizeDescText(opt);
      const normGrp = normalizeDescText(grpType);
      setSelectedDescriptors(
        selectedDescriptors.filter((d) => {
          const normD = normalizeDescText(d);
          if (normD === normOpt || normD === `${normGrp} ${normOpt}`) return false;
          const colonIdx = d.indexOf(':');
          if (colonIdx !== -1) {
            const dVal = normalizeDescText(d.slice(colonIdx + 1));
            if (dVal === normOpt) return false;
          }
          return true;
        })
      );
    } else {
      let nextDescriptors = selectedDescriptors;
      if (!allowMultiple && grp) {
        const allGrpOptsNorm = grp.options.map(normalizeDescText);
        const normGrp = normalizeDescText(grpType);
        nextDescriptors = selectedDescriptors.filter((d) => {
          const colonIdx = d.indexOf(':');
          if (colonIdx !== -1) {
            const dGrp = normalizeDescText(d.slice(0, colonIdx));
            const dVal = normalizeDescText(d.slice(colonIdx + 1));
            if (dGrp === normGrp || allGrpOptsNorm.includes(dVal)) return false;
          } else {
            if (allGrpOptsNorm.includes(normalizeDescText(d))) return false;
          }
          return true;
        });
      }
      setSelectedDescriptors([...nextDescriptors, descKey]);
    }
  };

  const toggleFlatDescriptor = (desc: string) => {
    const normDesc = normalizeDescText(desc);
    if (selectedDescriptors.some((d) => normalizeDescText(d) === normDesc)) {
      setSelectedDescriptors(selectedDescriptors.filter((d) => normalizeDescText(d) !== normDesc));
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
    if (hasFieldPitch) {
      if (button.pitchRequired?.startsWith('zone')) {
        if (!selectedZone) return false;
      } else if (button.pitchRequired?.startsWith('point') || button.pitchRequired === 'pitch_and_goal') {
        if (startX === null || startY === null) return false;
      } else if (button.pitchRequired?.startsWith('vector')) {
        if (startX === null || startY === null || endX === null || endY === null) return false;
      }
    }
    if (button.pitchRequired === 'goal_mouth' && (goalX === null || goalY === null)) {
      return false;
    }
    return true;
  };

  const isPlayerValid = (): boolean => {
    if (!isPlayerMandatory) return true;
    return !!modalPlayerId;
  };

  const isTeamValid = (): boolean => {
    if (!isTeamMandatory) return true;
    return !!modalTeamName;
  };

  const getMissingRequiredDescriptors = (): string[] => {
    if (!hasGroupDescriptors) return [];
    const missing: string[] = [];
    button.descriptorGroups!.forEach((grp) => {
      if (grp.required) {
        const hasSelection = grp.options.some((opt) => isOptionSelected(grp.type, opt));
        if (!hasSelection) {
          missing.push(grp.type || 'Tipo Descriptor');
        }
      }
    });
    return missing;
  };

  const missingRequiredDescriptors = getMissingRequiredDescriptors();
  const isDescriptorsValid = missingRequiredDescriptors.length === 0;

  const isValid = isPitchValid() && isPlayerValid() && isTeamValid() && isDescriptorsValid;

  const handleSave = () => {
    if (!isValid) return;

    const pitchData = hasPitch
      ? {
          startX,
          startY,
          endX,
          endY,
          selectedZone,
          goalX,
          goalY,
          goalZone,
        }
      : undefined;

    const finalTeam =
      modalTeamName || (selectedPlayer ? selectedPlayer.team_name : null);

    onSave(selectedDescriptors, pitchData, modalPlayerId, finalTeam, selectedPlayer);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        isSideDocked
          ? 'bg-black/25 pointer-events-none flex justify-end items-stretch p-2 sm:p-3'
          : 'bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3'
      }`}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-all duration-300 max-w-[95vw] ${
          isSideDocked
            ? 'w-full sm:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[96vh] h-full ring-1 ring-amber-500/30'
            : 'w-full sm:max-w-3xl lg:max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Header - Compact Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
              style={{ backgroundColor: button.color.startsWith('#') ? button.color : '#10b981' }}
            />
            <h3 className="font-black text-sm sm:text-base text-white truncate flex items-center gap-2">
              {isEditing && (
                <span className="text-amber-300 bg-amber-500/20 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Editar
                </span>
              )}
              <span>{button.name}</span>
            </h3>
            {clickTimestamp !== undefined && (
              <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-400" />
                {(() => {
                  const m = Math.floor(clickTimestamp / 60);
                  const s = Math.floor(clickTimestamp % 60);
                  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                })()}{' '}
                {clickPeriod ? `(P${clickPeriod})` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dock/Center position toggle button */}
            <button
              type="button"
              onClick={toggleSideDocked}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isSideDocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={isSideDocked ? 'Centrar ventana' : 'Alinear a la derecha para no tapar el vídeo'}
            >
              {isSideDocked ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <PanelRight className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSideDocked ? 'Lateral' : 'Centrar'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-slate-800">
          {/* TOP SECTION: Both Campogramas Side-by-Side (Players & Pitch Marking) */}
          <div className="p-3 flex flex-col md:flex-row gap-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 shrink-0 bg-slate-950/40">
            {/* Top-Left: Selección de Equipo & Campograma de Jugadores */}
            <div className={`flex flex-col gap-2 ${hasPitch ? 'md:w-1/2' : 'w-full'}`}>
              {/* 1. SELECCIÓN DE EQUIPO (Escudo y Nombre Completo Siempre Visible) */}
              {showTeamSelection && (
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Equipo del Evento:</span>
                      {isTeamMandatory && <span className="text-red-400 font-black text-xs">*</span>}
                    </div>
                    <span className="text-[10px] text-slate-500">Selecciona el equipo activo</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Local Team */}
                    <button
                      type="button"
                      onClick={() => {
                        setModalTeamName(homeTeamName);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                        activeViewTeam === homeTeamName
                          ? 'bg-red-500/20 border-red-400 text-white ring-2 ring-red-500/50 shadow-md font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-red-500/40 hover:text-white'
                      }`}
                    >
                      {homeTeamLogo ? (
                        <img
                          src={homeTeamLogo}
                          alt={homeTeamName}
                          className="w-5 h-5 object-contain rounded bg-slate-950 p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] bg-red-600/30 border border-red-500/50 text-red-300 shrink-0 font-black">
                          🛡️
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase tracking-wider block font-bold text-red-400 leading-none">
                          Local ({homeFormation})
                        </span>
                        <span className="text-xs font-black text-white block leading-tight whitespace-normal break-words mt-0.5">
                          {homeTeamName}
                        </span>
                      </div>
                      {activeViewTeam === homeTeamName && (
                        <Check className="w-4 h-4 text-red-400 shrink-0 ml-1" />
                      )}
                    </button>

                    {/* Away Team */}
                    <button
                      type="button"
                      onClick={() => {
                        setModalTeamName(awayTeamName);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                        activeViewTeam === awayTeamName
                          ? 'bg-blue-500/20 border-blue-400 text-white ring-2 ring-blue-500/50 shadow-md font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500/40 hover:text-white'
                      }`}
                    >
                      {awayTeamLogo ? (
                        <img
                          src={awayTeamLogo}
                          alt={awayTeamName}
                          className="w-5 h-5 object-contain rounded bg-slate-950 p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] bg-blue-600/30 border border-blue-500/50 text-blue-300 shrink-0 font-black">
                          🛡️
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase tracking-wider block font-bold text-blue-400 leading-none">
                          Visitante ({awayFormation})
                        </span>
                        <span className="text-xs font-black text-white block leading-tight whitespace-normal break-words mt-0.5">
                          {awayTeamName}
                        </span>
                      </div>
                      {activeViewTeam === awayTeamName && (
                        <Check className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. CAMPOGRAMA PEQUEÑO CON SISTEMA Y CÍRCULOS CON DORSAL */}
              {showPlayerSelection && (
                <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 shrink-0 shadow-lg">
                  {/* Section Header */}
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Jugador en Campo ({activeViewTeam}):</span>
                      {isPlayerMandatory ? (
                        <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1 rounded border border-red-500/20">
                          * OBLIGATORIO
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">Opcional</span>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      11 Titulares / Activos
                    </div>
                  </div>

                  {/* Mini Campograma Tactical Pitch with 11 Formation Circles */}
                  <MiniTacticalPlayerPitch
                    teamName={activeViewTeam}
                    formation={currentFormation}
                    active11={currentActive11}
                    teamColor={currentTeamColor}
                    selectedPlayerId={modalPlayerId}
                    onSelectPlayer={handleSelectPlayer}
                  />

                  {/* Selected Player Info Bar & Bench Button */}
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    {selectedPlayer ? (
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-white shrink-0 shadow"
                          style={{
                            backgroundColor:
                              selectedPlayer.team_name === homeTeamName ? homeColor : awayColor,
                          }}
                        >
                          {selectedPlayer.number ?? '-'}
                        </span>
                        <span className="font-extrabold text-white truncate text-xs">
                          {selectedPlayer.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          ({selectedPlayer.position || 'JUG'})
                        </span>
                        {selectedPlayer.isSubstitutedIn && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                            🔄 Entró {selectedPlayer.subMinute ? `${selectedPlayer.subMinute}'` : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-slate-400 italic truncate flex-1">
                        {isPlayerMandatory ? '⚠️ Clic en un dorsal para asignar jugador' : 'Clic en dorsal para elegir jugador (opcional)'}
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {selectedPlayer && !isPlayerMandatory && (
                        <button
                          type="button"
                          onClick={() => setModalPlayerId(null)}
                          className="text-[10px] text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold transition cursor-pointer"
                          title="Quitar jugador asignado"
                        >
                          ✕
                        </button>
                      )}

                      {/* Toggle Banquillo / Cambios */}
                      <button
                        type="button"
                        onClick={() => setShowBench(!showBench)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                          showBench
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                        title="Ver suplentes de banquillo y jugadores que fueron sustituidos"
                      >
                        <Users className="w-3 h-3" />
                        <span>Banquillo ({currentBench.length + currentSubbedOut.length})</span>
                        {showBench ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Optional Expandable Bench & Substituted Players Strip */}
                  {showBench && (
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 max-h-28 overflow-y-auto">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                        Banquillo y Cambios Realizados:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {currentBench.map((p) => {
                          const isSel = modalPlayerId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPlayer(p)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition cursor-pointer ${
                                isSel
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-mono font-bold text-[10px] text-slate-400">#{p.number}</span>
                              <span className="truncate max-w-[95px]">{p.name}</span>
                            </button>
                          );
                        })}

                        {currentSubbedOut.map((p) => {
                          const isSel = modalPlayerId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPlayer(p)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition cursor-pointer opacity-75 hover:opacity-100 ${
                                isSel
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                              title={`Salió en min ${p.subMinute}' (sustituido por ${p.replacedBy})`}
                            >
                              <span className="font-mono font-bold text-[10px] text-red-400">#{p.number}</span>
                              <span className="truncate max-w-[95px] line-through text-slate-400">{p.name}</span>
                              <span className="text-[8.5px] text-red-400 font-bold">🔻{p.subMinute ? `${p.subMinute}'` : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top-Right: Campograma (Campo / Portería / 1 o 2 Campogramas) */}
            {hasPitch && (
              <div className={`p-2 flex flex-col items-center justify-center min-h-[220px] ${hasMultiplePitches && dualViewMode === 'simultaneous' ? 'w-full md:w-3/5' : 'w-full md:w-1/2'}`}>
                {/* Selector de modo de vista si hay 2 campogramas (Simultáneos o Pestañas) */}
                {hasMultiplePitches && (
                  <div className="w-full flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDualViewMode('simultaneous')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          dualViewMode === 'simultaneous'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mostrar los 2 campogramas al mismo tiempo en pantalla"
                      >
                        <span>👥 2 a la vez</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDualViewMode('tabs')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          dualViewMode === 'tabs'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mostrar 1 campograma a la vez por pestañas"
                      >
                        <span>🗂️ Pestañas</span>
                      </button>
                    </div>

                    {dualViewMode === 'tabs' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
                            setActivePitchTab('field');
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                            activePitchTab === 'field'
                              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow ring-1 ring-emerald-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>🏟️ Campo</span>
                          {isVectorPitch ? (
                            startX !== null && endX !== null ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            ) : startX !== null ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Origen fijado, falta destino"></span>
                            ) : null
                          ) : (startX !== null || selectedZone) ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
                            setActivePitchTab('goal');
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                            activePitchTab === 'goal'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 shadow ring-1 ring-amber-500/40'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>🥅 Portería</span>
                          {goalX !== null && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9.5px] text-amber-300 font-mono font-bold flex items-center gap-1">
                        <span>2 Campogramas activos</span>
                      </span>
                    )}
                  </div>
                )}

                {/* MODO SIMULTÁNEO (AMBOS CAMPOGRAMAS A LA VEZ EN PANTALLA) */}
                {hasMultiplePitches && dualViewMode === 'simultaneous' ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 items-start justify-items-center">
                    {/* 1. Campograma de Campo */}
                    <div className="w-full max-w-[240px] flex flex-col items-center">
                      <div className="flex items-center justify-between w-full px-1 text-[10px] font-bold text-emerald-400 mb-1">
                        <span className="flex items-center gap-1">🏟️ 1. Campo</span>
                        {isVectorPitch ? (
                          startX !== null && endX !== null ? (
                            <span className="text-emerald-300 font-mono text-[9.5px]">
                              ({startX}%,{startY}%) → ({endX}%,{endY}%)
                            </span>
                          ) : startX !== null ? (
                            <span className="text-amber-300 font-mono text-[9.5px] animate-pulse">
                              Clic destino...
                            </span>
                          ) : null
                        ) : (startX !== null || selectedZone) ? (
                          <span className="text-emerald-300 font-mono">
                            {startX !== null ? `(${startX}%, ${startY}%)` : selectedZone}
                          </span>
                        ) : null}
                      </div>
                      <BotoneraPitchCanvas
                        startX={startX}
                        startY={startY}
                        endX={endX}
                        endY={endY}
                        onSetCoords={handlePitchCoords}
                        selectedZone={selectedZone}
                        onSelectZone={setSelectedZone}
                        initialMode={button.pitchRequired === 'pitch_and_goal' ? 'point_half' : button.pitchRequired}
                        pitchViewMode={button.pitchRequired === 'pitch_and_goal' ? 'half' : button.pitchViewMode}
                        hideHeader={true}
                        hideFooter={true}
                      />
                    </div>

                    {/* 2. Campograma de Portería */}
                    <div className="w-full max-w-[280px] flex flex-col items-center">
                      <div className="flex items-center justify-between w-full px-1 text-[10px] font-bold text-amber-400 mb-1">
                        <span className="flex items-center gap-1">🥅 2. Portería</span>
                        {goalX !== null && (
                          <span className="text-amber-300 font-mono">
                            ({goalX}%, {goalY}%)
                          </span>
                        )}
                      </div>
                      <BotoneraGoalCanvas
                        goalX={goalX}
                        goalY={goalY}
                        goalZone={goalZone}
                        onSetGoalCoords={(coords, zone) => {
                          setGoalX(coords ? coords.x : null);
                          setGoalY(coords ? coords.y : null);
                          setGoalZone(zone);
                        }}
                        hideHeader={true}
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : (
                  /* MODO INDIVIDUAL O POR PESTAÑAS */
                  <div className="w-full flex flex-col items-center justify-center">
                    {/* Vista de Campo */}
                    {(!hasMultiplePitches || activePitchTab === 'field') && hasFieldPitch && (
                      <div className="w-full max-w-[240px] sm:max-w-[260px] mx-auto flex flex-col items-center justify-center">
                        <BotoneraPitchCanvas
                          startX={startX}
                          startY={startY}
                          endX={endX}
                          endY={endY}
                          onSetCoords={(start, end) => {
                            handlePitchCoords(start, end);
                            if (hasMultiplePitches && dualViewMode === 'tabs' && goalX === null) {
                              if (isVectorPitch) {
                                // Para flechas / vectores: esperar a que se complete el destino de la flecha (end !== null)
                                if (end !== null) {
                                  if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
                                  tabSwitchTimeoutRef.current = setTimeout(() => setActivePitchTab('goal'), 400);
                                }
                              } else if (start !== null) {
                                if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
                                tabSwitchTimeoutRef.current = setTimeout(() => setActivePitchTab('goal'), 350);
                              }
                            }
                          }}
                          selectedZone={selectedZone}
                          onSelectZone={(z) => {
                            setSelectedZone(z);
                            if (hasMultiplePitches && dualViewMode === 'tabs' && z && goalX === null) {
                              if (tabSwitchTimeoutRef.current) clearTimeout(tabSwitchTimeoutRef.current);
                              tabSwitchTimeoutRef.current = setTimeout(() => setActivePitchTab('goal'), 350);
                            }
                          }}
                          initialMode={button.pitchRequired === 'pitch_and_goal' ? 'point_half' : button.pitchRequired}
                          pitchViewMode={button.pitchRequired === 'pitch_and_goal' ? 'half' : button.pitchViewMode}
                          hideHeader={true}
                          hideFooter={true}
                        />
                        {hasMultiplePitches && (
                          <div className="text-[10px] mt-1.5 flex items-center justify-center text-center font-medium">
                            {isVectorPitch ? (
                              startX === null ? (
                                <span className="text-slate-400">Paso 1: Haz clic para fijar el origen de la flecha</span>
                              ) : endX === null ? (
                                <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                                  <span>Paso 1: Ahora haz clic en el final de la flecha 🎯</span>
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span>Paso 1: Flecha completada ✓</span>
                                </span>
                              )
                            ) : button.pitchRequired?.startsWith('zone') ? (
                              selectedZone ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span>Paso 1: Zona seleccionada ({selectedZone}) ✓</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">Paso 1: Selecciona una zona en el campo</span>
                              )
                            ) : (
                              startX !== null ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <span>Paso 1: Ubicación en campo fijada ✓</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">Paso 1: Marca la ubicación en el campo</span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vista de Portería */}
                    {(!hasMultiplePitches || activePitchTab === 'goal') && hasGoal && (
                      <div className="w-full max-w-[280px] sm:max-w-[320px] mx-auto flex flex-col items-center justify-center">
                        <BotoneraGoalCanvas
                          goalX={goalX}
                          goalY={goalY}
                          goalZone={goalZone}
                          onSetGoalCoords={(coords, zone) => {
                            setGoalX(coords ? coords.x : null);
                            setGoalY(coords ? coords.y : null);
                            setGoalZone(zone);
                          }}
                          hideHeader={false}
                          className="w-full"
                        />
                        {hasMultiplePitches && (
                          <div className="text-[10px] mt-1.5 flex items-center justify-center text-center font-medium">
                            {goalX !== null ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <span>Paso 2: Disparo registrado en portería ({goalX}%, {goalY}%) ✓</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">Paso 2: Haz clic en la portería para registrar el disparo</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: Todo el espacio para los Descriptores en Dos Columnas */}
          {hasDescriptors && (
            <div className="p-3 sm:p-4 bg-slate-950/60 flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" /> Descriptores de la Acción
                </h4>
                {missingRequiredDescriptors.length > 0 && (
                  <span className="text-[10px] text-red-400 font-bold animate-pulse">
                    * Falta responder: {missingRequiredDescriptors.join(', ')}
                  </span>
                )}
              </div>

              {/* Structured Descriptor Groups in Two Columns */}
              {hasGroupDescriptors && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {button.descriptorGroups!.map((grp) => {
                    const isGrpMissing =
                      grp.required &&
                      !grp.options.some((opt) => isOptionSelected(grp.type, opt));

                    return (
                      <div
                        key={grp.id}
                        className={`p-2.5 rounded-xl bg-slate-950 border transition-colors space-y-2 ${
                          isGrpMissing ? 'border-red-500/60 bg-red-950/15' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider truncate">
                            {grp.type || 'Descriptor'}:
                          </span>
                          {grp.required ? (
                            <span className="text-[8.5px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                              * Requerido
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500">Opcional</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {grp.options.map((opt) => {
                            const isSelected = isOptionSelected(grp.type, opt);

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleToggleGroupOption(grp.type, opt)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-extrabold shadow-sm shadow-amber-950/40 ring-1 ring-amber-400/50'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
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
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Etiquetas Adicionales:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {button.descriptors!.map((desc) => {
                      const isSelected = selectedDescriptors.some(
                        (d) => normalizeDescText(d) === normalizeDescText(desc)
                      );
                      return (
                        <button
                          key={desc}
                          type="button"
                          onClick={() => toggleFlatDescriptor(desc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {desc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global active descriptors preview */}
              {initialGlobalDescriptors.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 shrink-0">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Etiquetas globales activas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {initialGlobalDescriptors.map((desc) => (
                      <span
                        key={desc}
                        className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9.5px] font-bold"
                      >
                        {desc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer & Validation Status - Always Pinned at Bottom */}
        <div className="px-3 sm:px-5 py-2.5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          {/* Validation Error Alerts */}
          {!isValid ? (
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
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
              <span>Listo para guardar el evento.</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl font-black text-xs transition shadow-lg cursor-pointer ${
                isValid
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Guardar Evento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
