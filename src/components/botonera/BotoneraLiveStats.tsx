'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Activity,
  User,
  Flame,
  CheckCircle2,
  Trophy,
  Video,
  Play,
  Filter,
  Tag,
  Sparkles,
  X,
  Film,
  Grid,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { NormalizedEvent, BotoneraButton } from '@/types';
import { getButtonColorHex } from './BotoneraPanelEditor';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { dbStore } from '@/lib/store/db-store';

interface BotoneraLiveStatsProps {
  events: NormalizedEvent[];
  videoUrl?: string | null;
  onSeekVideoToTime?: (time: number) => void;
  onSeekToEvent?: (event: NormalizedEvent) => void;
  buttons?: BotoneraButton[];
}

/** Helper to resolve the button name for a given event */
export const getEventButtonName = (evt: NormalizedEvent): string => {
  return evt.event_type || evt.metadata?.buttonName || evt.category || 'Acción General';
};

/** Helper to resolve the exact hex color of the button that created an event */
export const getEventButtonColorHex = (
  evt: NormalizedEvent,
  buttonsList: BotoneraButton[] = []
): string => {
  if (typeof evt.metadata?.buttonColor === 'string' && evt.metadata.buttonColor) {
    return getButtonColorHex(evt.metadata.buttonColor);
  }

  const btnName = getEventButtonName(evt);
  const matchedBtn = buttonsList.find(
    (b) => b.name === btnName || b.name === evt.event_type || b.category === evt.category
  );

  if (matchedBtn?.color) {
    return getButtonColorHex(matchedBtn.color);
  }

  const cat = (evt.category || '').toLowerCase();
  if (cat.includes('gol') || cat.includes('éxito')) return '#10b981';
  if (cat.includes('tiro') || cat.includes('remate')) return '#f59e0b';
  if (cat.includes('pase') || cat.includes('centro')) return '#3b82f6';
  if (cat.includes('recuperacion') || cat.includes('robo')) return '#06b6d4';
  if (cat.includes('falta') || cat.includes('tarjeta')) return '#ef4444';
  if (cat.includes('perdida')) return '#f43f5e';

  return '#38bdf8';
};

export const BotoneraLiveStats: React.FC<BotoneraLiveStatsProps> = ({
  events = [],
  videoUrl,
  onSeekVideoToTime,
  onSeekToEvent,
  buttons = [],
}) => {
  const totalEvents = events.length;

  // Team & Player Selectors State
  const [selectedTeam, setSelectedTeam] = useState<string>('todos');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('todos');

  // Active Button Tab ('todas' or specific button name string)
  const [activeButton, setActiveButton] = useState<string>('todas');

  // Filter by selected descriptor badge
  const [selectedDescriptor, setSelectedDescriptor] = useState<string | null>(null);

  // Selected Pitch Event(s) for Characteristics & Playback
  const [selectedClipEvents, setSelectedClipEvents] = useState<NormalizedEvent[] | null>(null);
  const [activePlayingEvent, setActivePlayingEvent] = useState<NormalizedEvent | null>(null);

  // Hover Tooltip State for Hovering over Pitch Arrow, Point, or Zone
  const [hoveredEvent, setHoveredEvent] = useState<NormalizedEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pitch Orientation State ('vertical' | 'horizontal')
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const isVertical = orientation === 'vertical';

  // Team Comparison Toggle State (Head to Head)
  const [showTeamComparison, setShowTeamComparison] = useState<boolean>(true);

  // SVG dimensions for Pitch
  const pitchWidth = isVertical ? 500 : 800;
  const pitchHeight = isVertical ? 800 : 500;
  const margin = 24;

  // Extract distinct Teams list
  const teamsList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      if (evt.team_name) set.add(evt.team_name);
    });
    return Array.from(set).sort();
  }, [events]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>(teamsList);
    if (set.size === 0) {
      set.add('Shabab Al Ordon Club');
    }
    return Array.from(set).sort();
  }, [teamsList]);

  // Team Head-to-Head Comparison Data
  const comparisonData = useMemo(() => {
    const teamA = availableTeams[0] || 'Equipo Local';
    const teamB = availableTeams[1] || (teamsList.length > 1 ? teamsList[1] : 'Equipo Visitante');

    const evtsA = events.filter((e) => e.team_name === teamA);
    const evtsB = events.filter((e) => e.team_name === teamB);

    const getSuccessCount = (evList: NormalizedEvent[]) =>
      evList.filter((e) => {
        const out = (e.outcome || '').toLowerCase();
        return (
          out.includes('éxito') ||
          out.includes('exito') ||
          out.includes('ganado') ||
          out.includes('gol') ||
          out.includes('clave')
        );
      }).length;

    const succA = getSuccessCount(evtsA);
    const succB = getSuccessCount(evtsB);

    const effA = evtsA.length > 0 ? Math.round((succA / evtsA.length) * 100) : 0;
    const effB = evtsB.length > 0 ? Math.round((succB / evtsB.length) * 100) : 0;

    const metrics: { label: string; valA: number; valB: number; isPercentage?: boolean }[] = [
      { label: 'ACCIONES TOTALES', valA: evtsA.length, valB: evtsB.length },
      { label: 'EFECTIVIDAD DE ACCIONES (%)', valA: effA, valB: effB, isPercentage: true },
      { label: 'ACCIONES EXITOSAS', valA: succA, valB: succB },
    ];

    // Collect and filter all unique button / action category names according to dashboard config
    const categoriesSet = new Set<string>();
    events.forEach((e) => {
      const name = getEventButtonName(e);
      if (name) categoriesSet.add(name);
    });

    const dashboardConfig = dbStore.getDashboardConfig();
    const selectedCats = (dashboardConfig.selectedH2HCategories || []).map((c) => c.toLowerCase());

    Array.from(categoriesSet).sort().forEach((catName) => {
      const matchCat = selectedCats.length === 0 || selectedCats.some((sc) => catName.toLowerCase().includes(sc) || sc.includes(catName.toLowerCase()));
      if (!matchCat) return;

      const countA = evtsA.filter((e) => getEventButtonName(e) === catName).length;
      const countB = evtsB.filter((e) => getEventButtonName(e) === catName).length;
      if (countA > 0 || countB > 0) {
        metrics.push({ label: catName.toUpperCase(), valA: countA, valB: countB });
      }
    });

    return { teamA, teamB, evtsA, evtsB, metrics };
  }, [events, availableTeams, teamsList]);

  // Extract distinct Players list (filtered by selectedTeam if applicable)
  const playersList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((evt) => {
      if (selectedTeam !== 'todos' && evt.team_name !== selectedTeam) return;
      if (evt.player_name && evt.player_name !== 'Sin Asignar' && evt.player_name !== 'Sin asignar') {
        set.add(evt.player_name);
      }
    });
    return Array.from(set).sort();
  }, [events, selectedTeam]);

  // Base Events Filtered by Team & Player
  const filteredByTeamAndPlayer = useMemo(() => {
    return events.filter((evt) => {
      const matchTeam = selectedTeam === 'todos' || evt.team_name === selectedTeam;
      const matchPlayer = selectedPlayer === 'todos' || evt.player_name === selectedPlayer;
      return matchTeam && matchPlayer;
    });
  }, [events, selectedTeam, selectedPlayer]);

  // Extract all distinct Button Names present in team/player events with their count and color
  const buttonTabsMap = useMemo(() => {
    const map: Record<string, { count: number; colorHex: string }> = {};
    filteredByTeamAndPlayer.forEach((evt) => {
      const bName = getEventButtonName(evt);
      const bColor = getEventButtonColorHex(evt, buttons);
      if (!map[bName]) {
        map[bName] = { count: 0, colorHex: bColor };
      }
      map[bName].count++;
    });
    return map;
  }, [filteredByTeamAndPlayer, buttons]);

  const buttonNamesList = useMemo(() => {
    return Object.keys(buttonTabsMap).sort();
  }, [buttonTabsMap]);

  // Overall Quick Metrics for Team/Player selection
  const { successCount, failCount, periodCounts } = useMemo(() => {
    let succ = 0;
    let fail = 0;
    const perCounts: Record<number, number> = { 1: 0, 2: 0 };

    filteredByTeamAndPlayer.forEach((evt) => {
      const outcome = (evt.outcome || '').toLowerCase();
      if (
        outcome.includes('éxito') ||
        outcome.includes('exito') ||
        outcome.includes('ganado') ||
        outcome.includes('clave') ||
        outcome.includes('gol')
      ) {
        succ++;
      } else if (
        outcome.includes('fallido') ||
        outcome.includes('perdido') ||
        outcome.includes('pérdida') ||
        outcome.includes('falta')
      ) {
        fail++;
      }

      const p = evt.period || 1;
      perCounts[p] = (perCounts[p] || 0) + 1;
    });

    return {
      successCount: succ,
      failCount: fail,
      periodCounts: perCounts,
    };
  }, [filteredByTeamAndPlayer]);

  const totalOutcomes = successCount + failCount;
  const successPct = totalOutcomes > 0 ? Math.round((successCount / totalOutcomes) * 100) : 0;

  // Filtered Events for the Active Button Tab
  const buttonEvents = useMemo(() => {
    if (activeButton === 'todas') return filteredByTeamAndPlayer;
    return filteredByTeamAndPlayer.filter((e) => getEventButtonName(e) === activeButton);
  }, [filteredByTeamAndPlayer, activeButton]);

  // Unique Color Hexes used across active events (for dynamic SVG markers)
  const uniqueColorHexes = useMemo(() => {
    const set = new Set<string>();
    buttonEvents.forEach((evt) => {
      set.add(getEventButtonColorHex(evt, buttons));
    });
    return Array.from(set);
  }, [buttonEvents, buttons]);

  // Descriptors Statistics for the Active Button Tab
  const descriptorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalDescCount = 0;

    buttonEvents.forEach((evt) => {
      const descList: string[] = [];

      if (Array.isArray(evt.metadata?.descriptors)) {
        descList.push(...evt.metadata.descriptors);
      } else if (evt.metadata?.descriptor) {
        descList.push(evt.metadata.descriptor);
      }

      if (evt.subcategory) {
        evt.subcategory
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((d) => descList.push(d));
      }

      if (evt.outcome) {
        descList.push(`Resultado: ${evt.outcome}`);
      }

      if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
      if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);

      const uniqueInEvent = Array.from(new Set(descList));
      uniqueInEvent.forEach((desc) => {
        counts[desc] = (counts[desc] || 0) + 1;
        totalDescCount++;
      });
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: buttonEvents.length > 0 ? Math.round((count / buttonEvents.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { list: sorted, total: totalDescCount };
  }, [buttonEvents]);

  // Filter Pitch Events by selected descriptor badge (if active)
  const pitchEvents = useMemo(() => {
    if (!selectedDescriptor) return buttonEvents;
    return buttonEvents.filter((evt) => {
      const descList: string[] = [];
      if (Array.isArray(evt.metadata?.descriptors)) descList.push(...evt.metadata.descriptors);
      if (evt.subcategory) descList.push(...evt.subcategory.split(',').map((s) => s.trim()));
      if (evt.outcome) descList.push(`Resultado: ${evt.outcome}`);
      if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
      if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);
      return descList.includes(selectedDescriptor);
    });
  }, [buttonEvents, selectedDescriptor]);

  // Convert normalized 0-100 coordinates to pitch SVG coordinates
  const getSvgCoords = (x: number | null, y: number | null) => {
    if (x === null || y === null) return null;
    if (isVertical) {
      const svgX = margin + (y / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + ((100 - x) / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY };
    } else {
      const svgX = margin + (x / 100) * (pitchWidth - 2 * margin);
      const svgY = margin + (y / 100) * (pitchHeight - 2 * margin);
      return { x: svgX, y: svgY };
    }
  };

  // Track Mouse Movement over pitch items to position the Hover Tooltip
  const handleMouseMoveItem = (e: React.MouseEvent<SVGElement>, evt: NormalizedEvent) => {
    const rect = e.currentTarget.ownerSVGElement
      ? e.currentTarget.ownerSVGElement.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();

    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredEvent(evt);
  };

  // Play Event Video Immediately & Update Active Event Characteristics
  const playEventNow = (evt: NormalizedEvent) => {
    setActivePlayingEvent(evt);
    if (onSeekToEvent) {
      onSeekToEvent(evt);
    } else if (onSeekVideoToTime) {
      const timeSec = evt.timestamp ?? (evt.minute !== null ? evt.minute * 60 + (evt.second || 0) : 0);
      onSeekVideoToTime(Math.max(0, timeSec - 5));
    }
  };

  // Handle clicking an arrow, point, or zone on the pitch canvas
  const handlePitchEventClick = (clickedEvt: NormalizedEvent) => {
    const cx = clickedEvt.x ?? 50;
    const cy = clickedEvt.y ?? 50;

    const nearbyEvents = pitchEvents.filter((e) => {
      const ex = e.x ?? 50;
      const ey = e.y ?? 50;
      return Math.hypot(ex - cx, ey - cy) <= 8;
    });

    const cluster = nearbyEvents.length > 0 ? nearbyEvents : [clickedEvt];
    setSelectedClipEvents(cluster);

    // AUTOMATICALLY REPRODUCE VIDEO FOR THE CLICKED ACTION
    playEventNow(clickedEvt);
  };

  const formatTimeStr = (evt: NormalizedEvent) => {
    if (evt.minute !== null && evt.minute !== undefined) {
      const m = evt.minute;
      const s = evt.second ?? 0;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    if (evt.timestamp !== null && evt.timestamp !== undefined) {
      const m = Math.floor(evt.timestamp / 60);
      const s = Math.floor(evt.timestamp % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return '--:--';
  };

  // Helper to extract descriptors of an event
  const getEventDescriptorsList = (evt: NormalizedEvent): string[] => {
    const descList: string[] = [];
    if (Array.isArray(evt.metadata?.descriptors)) {
      descList.push(...evt.metadata.descriptors);
    } else if (evt.metadata?.descriptor) {
      descList.push(evt.metadata.descriptor);
    }
    if (evt.subcategory) {
      evt.subcategory
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((d) => descList.push(d));
    }
    if (evt.metadata?.bodyPart) descList.push(`Parte: ${evt.metadata.bodyPart}`);
    if (evt.metadata?.result) descList.push(`Efecto: ${evt.metadata.result}`);
    return Array.from(new Set(descList));
  };

  // Helper to extract descriptors of active playing event
  const activeDescriptors = useMemo(() => {
    if (!activePlayingEvent) return [];
    return getEventDescriptorsList(activePlayingEvent);
  }, [activePlayingEvent]);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              ESTADÍSTICAS, CAMPOGRAMA Y FILTROS TÁCTICOS
            </h3>
            <p className="text-[11px] text-slate-400">
              Pasa el ratón sobre cualquier flecha o punto para ver sus descriptores; haz clic para reproducir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black">
            {filteredByTeamAndPlayer.length} / {totalEvents} ACCIONES
          </span>
        </div>
      </div>

      {totalEvents === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800/60">
          Aún no se han anotado acciones en este partido. Al presionar botones en la botonera, los datos y su campograma con colores aparecerán aquí.
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── SELECCIÓN VISUAL POR EQUIPO (CON ESCUDOS DE CADA EQUIPO) ── */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-100 uppercase tracking-wider font-black text-[11px]">
                  SELECCIONAR EQUIPO PARA VISUALIZAR CAMPOGRAMA Y ESTADÍSTICAS:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeamComparison(!showTeamComparison)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition flex items-center gap-1.5 cursor-pointer ${
                    showTeamComparison
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>⚔️ {showTeamComparison ? 'Ocultar Comparador H2H' : 'Mostrar Comparador H2H'}</span>
                </button>
                {selectedTeam !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam('todos');
                      setSelectedPlayer('todos');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-black border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Ver Todos los Equipos ({totalEvents})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Botón: TODOS LOS EQUIPOS */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTeam('todos');
                  setSelectedPlayer('todos');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedTeam === 'todos'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-normal">🏟️</span>
                <span>Todos los Equipos</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    selectedTeam === 'todos' ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {totalEvents}
                </span>
              </button>

              {/* Botones por Equipo con su Escudo (TeamLogo) */}
              {availableTeams.map((tName) => {
                const isSelected = selectedTeam === tName;
                const teamEventCount = events.filter((e) => e.team_name === tName).length;
                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(tName);
                      setSelectedPlayer('todos');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50 font-black'
                        : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <TeamLogo teamName={tName} size={22} />
                    <span className="truncate max-w-[170px]">{tName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-slate-950 text-emerald-300 font-bold' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {teamEventCount}
                    </span>
                  </button>
                );
              })}

              {/* Selector de Jugador Filtro Secundario */}
              {playersList.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-800">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="todos">👤 Todos los jugadores ({playersList.length})</option>
                    {playersList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── COMPARADOR TÁCTICO POR EQUIPOS (BARRAS HORIZONTALES H2H) ── */}
          {showTeamComparison && (
            <div className="space-y-4 bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl animate-fade-in">
              {/* Comparador Header: Escudo Equipo A (Izquierda) vs Escudo Equipo B (Derecha) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
                {/* Equipo A Header */}
                <button
                  type="button"
                  onClick={() => setSelectedTeam(comparisonData.teamA)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/60 transition cursor-pointer"
                  title={`Filtrar campograma por ${comparisonData.teamA}`}
                >
                  <TeamLogo teamName={comparisonData.teamA} size={36} />
                  <div className="text-left">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Equipo Local / A</span>
                    <h4 className="font-black text-sm text-white truncate max-w-[180px]">{comparisonData.teamA}</h4>
                    <span className="text-[10px] font-mono font-extrabold text-cyan-300">
                      {comparisonData.evtsA.length} acciones ({totalEvents > 0 ? Math.round((comparisonData.evtsA.length / totalEvents) * 100) : 0}%)
                    </span>
                  </div>
                </button>

                {/* Badge Central VS */}
                <div className="text-center space-y-0.5">
                  <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs tracking-wider inline-flex items-center gap-1.5 shadow-md">
                    ⚔️ COMPARATIVO DE ACCIONES POR EQUIPO
                  </span>
                  <p className="text-[10px] text-slate-400">Barras horizontales comparativas (Izquierda vs Derecha)</p>
                </div>

                {/* Equipo B Header */}
                <button
                  type="button"
                  onClick={() => setSelectedTeam(comparisonData.teamB)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/60 transition cursor-pointer flex-row-reverse text-right"
                  title={`Filtrar campograma por ${comparisonData.teamB}`}
                >
                  <TeamLogo teamName={comparisonData.teamB} size={36} />
                  <div className="text-right">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Equipo Visitante / B</span>
                    <h4 className="font-black text-sm text-white truncate max-w-[180px]">{comparisonData.teamB}</h4>
                    <span className="text-[10px] font-mono font-extrabold text-amber-300">
                      {comparisonData.evtsB.length} acciones ({totalEvents > 0 ? Math.round((comparisonData.evtsB.length / totalEvents) * 100) : 0}%)
                    </span>
                  </div>
                </button>
              </div>

              {/* Metrics Rows Comparison Stream */}
              <div className="space-y-3 pt-1">
                {comparisonData.metrics.map((m) => {
                  const sum = m.valA + m.valB;
                  const pctA = sum > 0 ? Math.round((m.valA / sum) * 100) : 50;
                  const pctB = sum > 0 ? Math.round((m.valB / sum) * 100) : 50;
                  const isWinnerA = m.valA > m.valB;
                  const isWinnerB = m.valB > m.valA;

                  return (
                    <div key={m.label} className="space-y-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      {/* Metric Label and Values */}
                      <div className="grid grid-cols-12 items-center text-xs">
                        {/* Valor Equipo A (Izquierda) */}
                        <div className="col-span-3 text-left font-mono font-black flex items-center gap-1.5">
                          <span className={`text-sm ${isWinnerA ? 'text-cyan-300 font-black scale-105' : 'text-slate-300'}`}>
                            {m.valA} {m.isPercentage ? '%' : ''}
                          </span>
                          {!m.isPercentage && sum > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">({pctA}%)</span>
                          )}
                        </div>

                        {/* Nombre de la Métrica / Botón (Centro) */}
                        <div className="col-span-6 text-center font-extrabold text-slate-200 uppercase tracking-wider text-[11px] truncate px-1">
                          {m.label}
                        </div>

                        {/* Valor Equipo B (Derecha) */}
                        <div className="col-span-3 text-right font-mono font-black flex items-center justify-end gap-1.5">
                          {!m.isPercentage && sum > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">({pctB}%)</span>
                          )}
                          <span className={`text-sm ${isWinnerB ? 'text-amber-300 font-black scale-105' : 'text-slate-300'}`}>
                            {m.valB} {m.isPercentage ? '%' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Horizontal Bar: Left Team A vs Right Team B */}
                      <div className="grid grid-cols-2 gap-1 h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        {/* Team A Bar (Extends from center to left) */}
                        <div className="flex justify-end h-full">
                          <div
                            className={`h-full rounded-l-full transition-all duration-500 ${
                              isWinnerA
                                ? 'bg-gradient-to-l from-cyan-400 via-emerald-400 to-emerald-500 shadow-md shadow-cyan-500/40'
                                : 'bg-cyan-600/70'
                            }`}
                            style={{ width: `${sum > 0 ? pctA : 0}%` }}
                          />
                        </div>

                        {/* Team B Bar (Extends from center to right) */}
                        <div className="flex justify-start h-full">
                          <div
                            className={`h-full rounded-r-full transition-all duration-500 ${
                              isWinnerB
                                ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 shadow-md shadow-amber-500/40'
                                : 'bg-amber-600/70'
                            }`}
                            style={{ width: `${sum > 0 ? pctB : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── QUICK SUMMARY BAR ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Efectividad</div>
                <div className="text-sm font-black text-emerald-400">
                  {successPct}%{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({successCount}/{totalOutcomes})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">1ª Parte</div>
                <div className="text-sm font-black text-blue-300">
                  {periodCounts[1] || 0} <span className="text-[10px] text-slate-500">ev.</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">2ª Parte</div>
                <div className="text-sm font-black text-indigo-300">
                  {periodCounts[2] || 0} <span className="text-[10px] text-slate-500">ev.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── PESTAÑAS ORGANIZADAS POR BOTÓN ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-amber-400" />
                <span>Pestañas por Botón ({buttonNamesList.length + 1})</span>
              </span>
              {activeButton !== 'todas' && (
                <button
                  onClick={() => {
                    setActiveButton('todas');
                    setSelectedDescriptor(null);
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-bold"
                >
                  Ver Todos los Botones
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              <button
                onClick={() => {
                  setActiveButton('todas');
                  setSelectedDescriptor(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  activeButton === 'todas'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>📊 Resumen General</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900/60 text-[10px] font-mono">
                  {filteredByTeamAndPlayer.length}
                </span>
              </button>

              {buttonNamesList.map((bName) => {
                const info = buttonTabsMap[bName];
                const isActive = activeButton === bName;
                return (
                  <button
                    key={bName}
                    onClick={() => {
                      setActiveButton(bName);
                      setSelectedDescriptor(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                      isActive
                        ? 'bg-slate-800 text-white border-amber-400/80 shadow-lg shadow-amber-500/10 font-black'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: info.colorHex }}
                    />
                    <span>{bName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {info.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── MAIN CONTENT GRID: CAMPOGRAMA + ESTADÍSTICA DE DESCRIPTORES ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── COLUMNA IZQUIERDA (7/12): CAMPOGRAMA TÁCTICO + CARACTERÍSTICAS DE LA ACCIÓN SELECCIONADA ── */}
            <div className="lg:col-span-7 space-y-3.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              {/* Pitch Controls Header */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200 truncate">
                    Botón: <span className="text-amber-400 font-extrabold">{activeButton}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">({pitchEvents.length} acciones)</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDescriptor && (
                    <button
                      onClick={() => setSelectedDescriptor(null)}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30"
                    >
                      <span>Filtro: {selectedDescriptor}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Orientation Switcher */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setOrientation('vertical')}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        isVertical ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ↕️ Vertical
                    </button>
                    <button
                      onClick={() => setOrientation('horizontal')}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        !isVertical ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ↔️ Horiz.
                    </button>
                  </div>
                </div>
              </div>

              {/* SVG Pitch Canvas */}
              <div
                className={`relative w-full mx-auto bg-emerald-950 rounded-2xl border-2 border-emerald-800/80 shadow-2xl select-none ${
                  isVertical ? 'max-w-xs sm:max-w-sm aspect-[5/8]' : 'aspect-[8/5]'
                }`}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {/* Grass Stripes Pattern (Clipped in inner wrapper) */}
                <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#022c22_0%,#064e3b_10%,#022c22_20%,#064e3b_30%,#022c22_40%,#064e3b_50%,#022c22_60%,#064e3b_70%,#022c22_80%,#064e3b_90%,#022c22_100%)] opacity-90" />
                </div>

                <svg viewBox={`0 0 ${pitchWidth} ${pitchHeight}`} className="w-full h-full block relative z-10">
                  {/* PITCH MARKINGS */}
                  <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="2.5" fill="none">
                    <rect x={margin} y={margin} width={pitchWidth - 2 * margin} height={pitchHeight - 2 * margin} rx="4" />
                    {isVertical ? (
                      <line x1={margin} y1={pitchHeight / 2} x2={pitchWidth - margin} y2={pitchHeight / 2} />
                    ) : (
                      <line x1={pitchWidth / 2} y1={margin} x2={pitchWidth / 2} y2={pitchHeight - margin} />
                    )}
                    <circle cx={pitchWidth / 2} cy={pitchHeight / 2} r="65" />
                    <circle cx={pitchWidth / 2} cy={pitchHeight / 2} r="3" fill="white" />

                    {/* Penalty Areas */}
                    {isVertical ? (
                      <>
                        <rect x={pitchWidth / 2 - 120} y={margin} width="240" height="120" />
                        <rect x={pitchWidth / 2 - 50} y={margin} width="100" height="40" />
                        <rect x={pitchWidth / 2 - 120} y={pitchHeight - margin - 120} width="240" height="120" />
                        <rect x={pitchWidth / 2 - 50} y={pitchHeight - margin - 40} width="100" height="40" />
                      </>
                    ) : (
                      <>
                        <rect x={margin} y={pitchHeight / 2 - 120} width="120" height="240" />
                        <rect x={margin} y={pitchHeight / 2 - 50} width="40" height="100" />
                        <rect x={pitchWidth - margin - 120} y={pitchHeight / 2 - 120} width="120" height="240" />
                        <rect x={pitchWidth - margin - 40} y={pitchHeight / 2 - 50} width="40" height="100" />
                      </>
                    )}
                  </g>

                  {/* DYNAMIC SVG ARROWHEAD MARKERS IN EXACT BUTTON COLORS */}
                  <defs>
                    {uniqueColorHexes.map((colorHex) => {
                      const markerId = `arrow-head-${colorHex.replace('#', '')}`;
                      return (
                        <marker
                          key={markerId}
                          id={markerId}
                          viewBox="0 0 10 10"
                          refX="7"
                          refY="5"
                          markerWidth="7"
                          markerHeight="7"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill={colorHex} />
                        </marker>
                      );
                    })}
                  </defs>

                  {/* EVENTS / ARROWS / POINTS DRAWN IN THE EXACT COLOR OF EACH BUTTON */}
                  {pitchEvents.map((evt) => {
                    const startX = evt.x ?? evt.metadata?.x ?? evt.metadata?.startX ?? null;
                    const startY = evt.y ?? evt.metadata?.y ?? evt.metadata?.startY ?? null;
                    const endX = evt.end_x ?? evt.metadata?.end_x ?? evt.metadata?.endX ?? null;
                    const endY = evt.end_y ?? evt.metadata?.end_y ?? evt.metadata?.endY ?? null;

                    const startCoords = getSvgCoords(startX, startY);
                    if (!startCoords) return null;

                    const buttonColorHex = getEventButtonColorHex(evt, buttons);
                    const markerId = `arrow-head-${buttonColorHex.replace('#', '')}`;
                    const isSelected = activePlayingEvent?.event_id === evt.event_id;

                    const catLower = (evt.category || '').toLowerCase();
                    const isPassCategory =
                      catLower.includes('pase') ||
                      catLower.includes('centro') ||
                      catLower.includes('transicion') ||
                      catLower.includes('desmarque');

                    const hasEndCoords =
                      endX !== null && endY !== null && (endX !== startX || endY !== startY);
                    const isArrow = hasEndCoords || isPassCategory;

                    let endCoords = getSvgCoords(endX, endY);
                    if (!endCoords && isPassCategory) {
                      endCoords = isVertical
                        ? { x: startCoords.x + 15, y: startCoords.y - 45 }
                        : { x: startCoords.x + 45, y: startCoords.y - 15 };
                    }

                    return (
                      <g
                        key={evt.event_id}
                        className="cursor-pointer group/node"
                        onClick={() => handlePitchEventClick(evt)}
                        onMouseMove={(e) => handleMouseMoveItem(e, evt)}
                      >
                        {/* ARROW VECTOR WITH THE BUTTON'S COLOR */}
                        {isArrow && endCoords && (
                          <g>
                            {isSelected && (
                              <line
                                x1={startCoords.x}
                                y1={startCoords.y}
                                x2={endCoords.x}
                                y2={endCoords.y}
                                stroke="#f59e0b"
                                strokeWidth="7"
                                strokeOpacity="0.5"
                                className="animate-pulse"
                              />
                            )}
                            <line
                              x1={startCoords.x}
                              y1={startCoords.y}
                              x2={endCoords.x}
                              y2={endCoords.y}
                              stroke={isSelected ? '#f59e0b' : buttonColorHex}
                              strokeWidth={isSelected ? '5' : '3.5'}
                              strokeOpacity="0.95"
                              markerEnd={`url(#${markerId})`}
                              className="group-hover/node:stroke-amber-300 group-hover/node:stroke-[5] transition-all"
                            />
                            {/* Start Point Dot */}
                            <circle
                              cx={startCoords.x}
                              cy={startCoords.y}
                              r={isSelected ? 6 : 5}
                              fill={buttonColorHex}
                              stroke={isSelected ? '#f59e0b' : '#022c22'}
                              strokeWidth="2"
                            />
                          </g>
                        )}

                        {/* SINGLE POINT ACTION WITH THE BUTTON'S COLOR */}
                        {!isArrow && (
                          <g>
                            <circle
                              cx={startCoords.x}
                              cy={startCoords.y}
                              r={isSelected ? 14 : 10}
                              fill={isSelected ? 'rgba(245, 158, 11, 0.5)' : `${buttonColorHex}40`}
                              className="animate-pulse"
                            />
                            <circle
                              cx={startCoords.x}
                              cy={startCoords.y}
                              r={isSelected ? 8.5 : 7}
                              fill={isSelected ? '#f59e0b' : buttonColorHex}
                              stroke="#022c22"
                              strokeWidth="2"
                              className="group-hover/node:r-9 transition-all"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* ── HOVER TOOLTIP POPUP (DESCRIPTORES AL PASAR EL RATÓN POR ENCIMA DE FLECHA / PUNTO / ZONA) ── */}
                {hoveredEvent && (
                  <div
                    className="absolute z-[150] pointer-events-none p-3.5 rounded-2xl bg-slate-950/95 border border-amber-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md min-w-56 text-slate-100 animate-fade-in"
                    style={{
                      left: `${tooltipPos.x}px`,
                      top: `${tooltipPos.y}px`,
                    }}
                  >
                    {/* Header: Button Name & Time */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: getEventButtonColorHex(hoveredEvent, buttons) }}
                        />
                        <span className="text-white">{getEventButtonName(hoveredEvent)}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {formatTimeStr(hoveredEvent)}
                      </span>
                    </div>

                    {/* Player & Team with Escudo */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <TeamLogo teamName={hoveredEvent.team_name} size={22} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-100 text-xs truncate">{hoveredEvent.player_name}</p>
                        <p className="text-[10px] text-cyan-300 font-extrabold truncate">{hoveredEvent.team_name || 'Sin equipo'}</p>
                      </div>
                    </div>

                    {/* Outcome */}
                    {hoveredEvent.outcome && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold">Resultado:</span>
                        <span className="font-extrabold text-amber-400">{hoveredEvent.outcome}</span>
                      </div>
                    )}

                    {/* DESCRIPTORES DE LA FLECHA / PUNTO / ZONA */}
                    {getEventDescriptorsList(hoveredEvent).length > 0 && (
                      <div className="pt-1 border-t border-slate-800/80 space-y-1">
                        <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>Descriptores:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {getEventDescriptorsList(hoveredEvent).map((desc, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-200"
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

              {/* ── CARACTERÍSTICAS AUTOMÁTICAS DE LA ACCIÓN EN REPRODUCCIÓN ── */}
              {activePlayingEvent ? (
                <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl space-y-2.5 animate-fade-in text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 animate-pulse">
                        <Film className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                          <span>REPRODUCIENDO ACCIÓN</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                            {formatTimeStr(activePlayingEvent)}
                          </span>
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playEventNow(activePlayingEvent)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Rebobinar Clip</span>
                      </button>
                    </div>
                  </div>

                  {/* Multiple Clips Selector Pills if cluster has > 1 */}
                  {selectedClipEvents && selectedClipEvents.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Clips en esta zona:</span>
                      {selectedClipEvents.map((evt, idx) => {
                        const isCurrent = activePlayingEvent.event_id === evt.event_id;
                        return (
                          <button
                            key={evt.event_id || idx}
                            onClick={() => playEventNow(evt)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 ${
                              isCurrent
                                ? 'bg-emerald-500 text-slate-950 font-black shadow'
                                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                            }`}
                          >
                            <span>Clip {idx + 1} ({formatTimeStr(evt)})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Main Event Metadata / Characteristics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-0.5">
                    {/* Botón Presionado */}
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Botón Acción</span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getEventButtonColorHex(activePlayingEvent, buttons) }}
                        />
                        <span className="font-black text-slate-100 truncate">
                          {getEventButtonName(activePlayingEvent)}
                        </span>
                      </div>
                    </div>

                    {/* Jugador & Equipo con Escudo */}
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Jugador / Equipo</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo teamName={activePlayingEvent.team_name} size={18} />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-100 text-xs truncate leading-tight">{activePlayingEvent.player_name}</p>
                          <p className="text-[10px] text-cyan-300 font-bold truncate leading-tight">{activePlayingEvent.team_name || 'Sin equipo'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Resultado / Outcome */}
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Resultado</span>
                      <p className="font-bold text-amber-400 truncate">
                        {activePlayingEvent.outcome || activePlayingEvent.category || 'Registrado'}
                      </p>
                    </div>
                  </div>

                  {/* Descriptores de la acción */}
                  {activeDescriptors.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Descriptores de la Acción:</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeDescriptors.map((d, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center italic">
                  💡 Haz clic en cualquier flecha o punto: el vídeo saltará al minuto exacto y sus características se mostrarán aquí abajo
                </p>
              )}
            </div>

            {/* ── COLUMNA DERECHA (5/12): ESTADÍSTICA DE LOS DESCRIPTORES PARA ESTE BOTÓN ── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Descriptores de {activeButton}</span>
                  </h4>

                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    {descriptorStats.list.length} etiquetas
                  </span>
                </div>

                {descriptorStats.list.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No se han registrado descriptores específicos para las acciones de este botón.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {descriptorStats.list.map((desc) => {
                      const isSelected = selectedDescriptor === desc.name;
                      return (
                        <button
                          key={desc.name}
                          onClick={() => setSelectedDescriptor(isSelected ? null : desc.name)}
                          className={`w-full text-left p-2 rounded-xl transition-all border ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold truncate pr-2">{desc.name}</span>
                            <span className="font-mono text-[11px] font-extrabold text-emerald-400 shrink-0">
                              {desc.count} <span className="text-slate-400 font-normal">({desc.pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, desc.pct)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Active Players for this Selection */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>Jugadores con {activeButton === 'todas' ? 'acciones' : `botón ${activeButton}`}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {Object.entries(
                    buttonEvents.reduce((acc, evt) => {
                      const p = evt.player_name || 'Sin Asignar';
                      acc[p] = (acc[p] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([pName, count]) => (
                      <div
                        key={pName}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-200 font-medium">{pName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
