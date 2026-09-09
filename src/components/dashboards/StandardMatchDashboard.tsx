'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Match,
  NormalizedEvent,
  BotoneraTemplate,
  BotoneraButton,
  PitchRequiredType,
  Player,
} from '@/types';
import { TacticalLineupPitch, SubstitutionRecord } from '@/components/pitch/TacticalLineupPitch';
import { BotoneraPitchCanvas, EventPitchMarker } from '@/components/botonera/BotoneraPitchCanvas';
import { getButtonColorHex } from '@/components/botonera/BotoneraPanelEditor';
import { TeamLogo } from '@/components/player/PlayerBadge';
import { dbStore } from '@/lib/store/db-store';
import { calculateEventVideoTime, resolveEventPeriod } from '@/lib/analytics/video-utils';
import {
  BarChart3,
  Calendar,
  Layers,
  X,
  Tag,
  Target,
  User,
  Clock,
  Shield,
  Activity,
  CheckCircle2,
  Eye,
  ChevronRight,
  TrendingUp,
  Play,
  PlayCircle,
  FileText,
  Download,
  Globe,
  MapPin,
} from 'lucide-react';
import { PdfLanguageModal, PdfReportLanguage } from './PdfLanguageModal';
import { downloadPdfTechnicalReport } from '@/lib/services/pdf-report-generator';

interface StandardMatchDashboardProps {
  match: Match;
  events: NormalizedEvent[];
  template?: BotoneraTemplate | null;
}

export const StandardMatchDashboard: React.FC<StandardMatchDashboardProps> = ({
  match,
  events,
  template,
}) => {
  // Event detail modal state when clicking any horizontal category bar
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);

  // Player detail modal state when clicking a player on the tactical pitch
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Video playback overlay state when clicking a video event
  const [playingVideoEvt, setPlayingVideoEvt] = useState<NormalizedEvent | null>(null);

  // PDF Export Modal state & language handler
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState<string>('');

  // Refs to the real, on-screen dashboard DOM so the PDF export is a literal
  // screenshot of what the user sees, not a redrawn mockup.
  const summaryCaptureRef = useRef<HTMLDivElement>(null);
  const modalCaptureRef = useRef<HTMLDivElement>(null);

  const waitForRender = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 200)));
    });

  const handleGeneratePdf = async (lang: PdfReportLanguage) => {
    setIsGeneratingPdf(true);
    setPdfProgressMsg('Iniciando exportación de informe PDF...');
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      // Note: allowTaint is intentionally OFF. Team badges are loaded from external
      // URLs without CORS headers; allowTaint would draw them but taint the resulting
      // canvas, which then blocks toDataURL() later and silently kills every page
      // except the cover. useCORS alone just skips images that fail CORS (blank badge)
      // instead of breaking the whole export.
      const captureOpts = { scale: 2, useCORS: true, backgroundColor: '#020617', logging: false };

      // 1. Capture the main summary section exactly as rendered (score, lineups, comparison bars, evolution).
      setPdfProgressMsg('Capturando resumen del partido...');
      await waitForRender();
      const summaryCanvas = summaryCaptureRef.current
        ? await html2canvas(summaryCaptureRef.current, captureOpts)
        : null;

      // 2. Open each event-category modal in turn and capture its real DOM (same view as clicking a bar).
      const categoryCaptures: { name: string; canvas: HTMLCanvasElement }[] = [];
      const categoriesWithEvents = categoryButtons.filter((btn) =>
        allEvents.some((e) => {
          const matched = findMatchingButton(categoryButtons, e);
          return matched?.id === btn.id;
        })
      );

      for (let i = 0; i < categoriesWithEvents.length; i++) {
        const btn = categoriesWithEvents[i];
        setPdfProgressMsg(`Capturando evento ${i + 1} de ${categoriesWithEvents.length}: ${btn.name}...`);
        setSelectedEventName(btn.name);
        await waitForRender();
        if (modalCaptureRef.current) {
          const canvas = await html2canvas(modalCaptureRef.current, captureOpts);
          categoryCaptures.push({ name: btn.name, canvas });
        }
      }
      setSelectedEventName(null);
      await waitForRender();

      setPdfProgressMsg('Componiendo el archivo PDF...');
      await downloadPdfTechnicalReport(
        match,
        allEvents,
        lang,
        (msg) => setPdfProgressMsg(msg),
        { summaryCanvas, categoryCaptures }
      );
    } catch (err) {
      console.error('Error generating PDF report:', err);
      setSelectedEventName(null);
    } finally {
      setIsGeneratingPdf(false);
      setIsPdfModalOpen(false);
      setPdfProgressMsg('');
    }
  };

  // Local events state to support dynamically adding substitution events
  const [allEvents, setAllEvents] = useState<NormalizedEvent[]>(events);
  React.useEffect(() => {
    setAllEvents(events);
  }, [events]);

  // Resolve effective match properties (merging video start offsets & video url from dbStore analyses if present)
  const effectiveMatch = useMemo(() => {
    const analyses = dbStore.getAnalyses(match.id);
    const mainAnalysis = analyses.length > 0 ? analyses[0] : null;

    const p1 =
      match.p1_video_start_time ??
      mainAnalysis?.p1_video_start_time ??
      null;

    const p2 =
      match.p2_video_start_time ??
      mainAnalysis?.p2_video_start_time ??
      null;

    const vUrl =
      match.video_url ||
      mainAnalysis?.video_url ||
      null;

    return {
      ...match,
      p1_video_start_time: p1,
      p2_video_start_time: p2,
      video_url: vUrl,
    };
  }, [match]);

  const homeTeamName = match.home_team || 'Shabab Al Ordon';
  const awayTeamName = match.away_team || 'Al Ramtha';

  // Resolved lineup configs from match or dbStore fallback
  const homeLineupConfig = useMemo(() => {
    if (match?.home_lineup) return match.home_lineup;
    const analyses = dbStore.getAnalyses(match.id);
    if (analyses.length > 0 && analyses[0].home_lineup) return analyses[0].home_lineup;
    return null;
  }, [match]);

  const awayLineupConfig = useMemo(() => {
    if (match?.away_lineup) return match.away_lineup;
    const analyses = dbStore.getAnalyses(match.id);
    if (analyses.length > 0 && analyses[0].away_lineup) return analyses[0].away_lineup;
    return null;
  }, [match]);

  // Resolved team colors & formations from lineup config or defaults
  const homeTeamColor = homeLineupConfig?.circleStyle?.primaryColor || (match as any).home_team_color || '#ef4444';
  const awayTeamColor = awayLineupConfig?.circleStyle?.primaryColor || (match as any).away_team_color || '#3b82f6';
  const homeFormation = (homeLineupConfig?.formation || '4-3-3') as any;
  const awayFormation = (awayLineupConfig?.formation || '4-3-3') as any;

  // Get all registered database players
  const allDbPlayers = useMemo(() => dbStore.getPlayers(), []);

  // Extract unique players registered in events and database for Home Team
  const homePlayers: Player[] = useMemo(() => {
    if (match?.home_lineup?.starters && match.home_lineup.starters.length > 0 && match.home_lineup.starters.some((s) => s.name)) {
      return match.home_lineup.starters.map((s, idx) => ({
        id: s.id || `st_home_${idx}`,
        name: s.name || `Jugador #${Number(s.number) || idx + 1}`,
        number: Number(s.number) || idx + 1,
        position: s.position || (idx === 0 ? 'POR' : 'JUG'),
        team_id: 'home_team',
        team_name: homeTeamName,
      }));
    }

    const map = new Map<string, Player>();

    // 1. Populate from registered players in DB for Home Team
    const dbTeamPlayers = allDbPlayers.filter(
      (p) =>
        p.team_name?.toLowerCase().includes(homeTeamName.toLowerCase()) ||
        homeTeamName.toLowerCase().includes(p.team_name?.toLowerCase() || '')
    );

    dbTeamPlayers.forEach((p) => {
      map.set(p.name.toLowerCase(), p);
    });

    // 2. Override / Add from recorded events in this match
    allEvents.forEach((ev) => {
      const isHome = ev.team_name ? ev.team_name === homeTeamName : ev.team_id !== 'away_team';
      if (isHome && ev.player_name) {
        const key = ev.player_name.toLowerCase();
        const existing = map.get(key);
        const eventNum = ev.metadata?.player_number || ev.metadata?.dorsal || ev.metadata?.player_dorsal;
        if (existing) {
          if (eventNum) existing.number = Number(eventNum);
        } else {
          const dbMatch = allDbPlayers.find(
            (p) => p.name.toLowerCase() === key || key.includes(p.name.toLowerCase())
          );
          map.set(key, {
            id: dbMatch?.id || `p_home_${ev.player_name}`,
            name: dbMatch?.name || ev.player_name,
            number: Number(eventNum || dbMatch?.number || map.size + 1),
            position: dbMatch?.position || 'JUG',
            team_id: 'home_team',
            team_name: homeTeamName,
          });
        }
      }
    });

    if (map.size === 0 && dbTeamPlayers.length > 0) {
      return dbTeamPlayers.slice(0, 11);
    }

    return Array.from(map.values()).slice(0, 11);
  }, [allEvents, homeTeamName, allDbPlayers, match?.home_lineup]);

  // Extract unique players registered in events and database for Away Team
  const awayPlayers: Player[] = useMemo(() => {
    if (match?.away_lineup?.starters && match.away_lineup.starters.length > 0 && match.away_lineup.starters.some((s) => s.name)) {
      return match.away_lineup.starters.map((s, idx) => ({
        id: s.id || `st_away_${idx}`,
        name: s.name || `Jugador #${Number(s.number) || idx + 1}`,
        number: Number(s.number) || idx + 1,
        position: s.position || (idx === 0 ? 'POR' : 'JUG'),
        team_id: 'away_team',
        team_name: awayTeamName,
      }));
    }

    const map = new Map<string, Player>();

    // 1. Populate from registered players in DB for Away Team
    const dbTeamPlayers = allDbPlayers.filter(
      (p) =>
        p.team_name?.toLowerCase().includes(awayTeamName.toLowerCase()) ||
        awayTeamName.toLowerCase().includes(p.team_name?.toLowerCase() || '')
    );

    dbTeamPlayers.forEach((p) => {
      map.set(p.name.toLowerCase(), p);
    });

    // 2. Override / Add from recorded events in this match
    allEvents.forEach((ev) => {
      const isAway = ev.team_name === awayTeamName || ev.team_id === 'away_team';
      if (isAway && ev.player_name) {
        const key = ev.player_name.toLowerCase();
        const existing = map.get(key);
        const eventNum = ev.metadata?.player_number || ev.metadata?.dorsal || ev.metadata?.player_dorsal;
        if (existing) {
          if (eventNum) existing.number = Number(eventNum);
        } else {
          const dbMatch = allDbPlayers.find(
            (p) => p.name.toLowerCase() === key || key.includes(p.name.toLowerCase())
          );
          map.set(key, {
            id: dbMatch?.id || `p_away_${ev.player_name}`,
            name: dbMatch?.name || ev.player_name,
            number: Number(eventNum || dbMatch?.number || map.size + 1),
            position: dbMatch?.position || 'JUG',
            team_id: 'away_team',
            team_name: awayTeamName,
          });
        }
      }
    });

    if (map.size === 0 && dbTeamPlayers.length > 0) {
      return dbTeamPlayers.slice(0, 11);
    }

    return Array.from(map.values()).slice(0, 11);
  }, [allEvents, awayTeamName, allDbPlayers, match?.away_lineup]);

  // Extract recorded substitutions for Home Team
  const homeSubstitutions: SubstitutionRecord[] = useMemo(() => {
    const subs: SubstitutionRecord[] = [];
    allEvents.forEach((ev) => {
      const isHome = ev.team_name ? ev.team_name === homeTeamName : ev.team_id !== 'away_team';
      if (!isHome) return;

      const isSubEvent =
        ev.event_type?.toLowerCase().includes('cambio') ||
        ev.event_type?.toLowerCase().includes('sustitu') ||
        ev.category?.toLowerCase().includes('cambio') ||
        ev.category?.toLowerCase().includes('sustitu') ||
        Boolean(ev.metadata?.player_in);

      if (isSubEvent) {
        const playerOutName = ev.metadata?.player_out || ev.player_name || 'Titular';
        const playerInName = ev.metadata?.player_in || ev.metadata?.substitute || ev.subcategory || 'Sustituto';
        const playerInNumber = ev.metadata?.player_in_number ? Number(ev.metadata.player_in_number) : undefined;
        const minute = ev.minute || (ev.timestamp ? Math.floor(ev.timestamp / 60) : 60);

        subs.push({
          id: ev.event_id,
          playerOutName,
          playerInName,
          playerInNumber,
          minute,
        });
      }
    });
    return subs;
  }, [allEvents, homeTeamName]);

  // Extract recorded substitutions for Away Team
  const awaySubstitutions: SubstitutionRecord[] = useMemo(() => {
    const subs: SubstitutionRecord[] = [];
    allEvents.forEach((ev) => {
      const isAway = ev.team_name === awayTeamName || ev.team_id === 'away_team';
      if (!isAway) return;

      const isSubEvent =
        ev.event_type?.toLowerCase().includes('cambio') ||
        ev.event_type?.toLowerCase().includes('sustitu') ||
        ev.category?.toLowerCase().includes('cambio') ||
        ev.category?.toLowerCase().includes('sustitu') ||
        Boolean(ev.metadata?.player_in);

      if (isSubEvent) {
        const playerOutName = ev.metadata?.player_out || ev.player_name || 'Titular';
        const playerInName = ev.metadata?.player_in || ev.metadata?.substitute || ev.subcategory || 'Sustituto';
        const playerInNumber = ev.metadata?.player_in_number ? Number(ev.metadata.player_in_number) : undefined;
        const minute = ev.minute || (ev.timestamp ? Math.floor(ev.timestamp / 60) : 60);

        subs.push({
          id: ev.event_id,
          playerOutName,
          playerInName,
          playerInNumber,
          minute,
        });
      }
    });
    return subs;
  }, [allEvents, awayTeamName]);

  // Add a new substitution event dynamically
  const handleAddSubstitution = (targetTeamName: string, isHome: boolean, sub: SubstitutionRecord) => {
    const newEvt: NormalizedEvent = {
      event_id: `evt_sub_${Date.now()}`,
      source_event_id: null,
      match_id: match.id,
      team_name: targetTeamName,
      team_id: isHome ? 'home_team' : 'away_team',
      player_id: null,
      player_name: sub.playerOutName,
      event_type: 'Sustitución',
      category: 'Cambio',
      subcategory: null,
      timestamp: sub.minute * 60,
      minute: sub.minute,
      second: 0,
      duration: null,
      period: sub.minute <= 45 ? 1 : 2,
      x: null,
      y: null,
      end_x: null,
      end_y: null,
      outcome: 'Éxito',
      metadata: {
        player_out: sub.playerOutName,
        player_in: sub.playerInName,
        player_in_number: sub.playerInNumber,
        dorsal: sub.playerInNumber,
      },
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dbStore.saveNormalizedEvents([newEvt], false);
    setAllEvents((prev) => [...prev, newEvt]);
  };

// Helper to match an event to a Botonera category button flexibly
function findMatchingButton(buttons: BotoneraButton[], evt: NormalizedEvent): BotoneraButton | undefined {
  const eType = (evt.event_type || '').trim().toLowerCase();
  const eCat = (evt.category || '').trim().toLowerCase();
  const eSub = (evt.subcategory || '').trim().toLowerCase();
  const eBtnId = (evt.metadata?.buttonId || '').toString().trim().toLowerCase();
  const eBtnName = (evt.metadata?.buttonName || '').toString().trim().toLowerCase();

  // 1. Direct ID match
  if (eBtnId) {
    const match = buttons.find((b) => b.id.toLowerCase() === eBtnId);
    if (match) return match;
  }

  // 2. Direct Name / ButtonName match
  const nameToMatch = eBtnName || eType;
  if (nameToMatch) {
    const match = buttons.find((b) => b.name.trim().toLowerCase() === nameToMatch);
    if (match) return match;
  }

  // 3. Category match
  if (eCat) {
    const match = buttons.find(
      (b) =>
        b.name.trim().toLowerCase() === eCat ||
        (b.category && b.category.trim().toLowerCase() === eCat)
    );
    if (match) return match;
  }

  // 4. Fuzzy / includes match
  return buttons.find((b) => {
    const bName = b.name.trim().toLowerCase();
    const bCat = (b.category || '').trim().toLowerCase();
    return (
      (eType && (bName.includes(eType) || eType.includes(bName))) ||
      (eCat && (bName.includes(eCat) || eCat.includes(bName) || bCat.includes(eCat) || eCat.includes(bCat))) ||
      (eSub && (bName.includes(eSub) || eSub.includes(bName)))
    );
  });
}

// Helper to determine whether an event belongs to 1st or 2nd half and its relative minute
function resolveEventTiming(evt: NormalizedEvent): { period: 1 | 2; relMinute: number } {
  const pNum = evt.period !== null && evt.period !== undefined ? Number(evt.period) : null;
  const rawMin =
    evt.minute !== null && evt.minute !== undefined
      ? Number(evt.minute)
      : evt.timestamp !== null && evt.timestamp !== undefined
      ? Math.floor(Number(evt.timestamp) / 60)
      : 0;

  // If period is explicitly 2 or 4 (2ª Parte o 2ª Parte Prórroga)
  if (pNum === 2 || pNum === 4) {
    const relMin = rawMin >= 45 ? rawMin - 45 : rawMin;
    return { period: 2, relMinute: Math.max(0, relMin) };
  }

  // If period is explicitly 1 or 3
  if (pNum === 1 || pNum === 3) {
    // If period is marked as 1 but minute is clearly 2nd half (e.g. >= 48 or timestamp >= 2880) due to XML unassigned period default
    if (rawMin >= 48) {
      return { period: 2, relMinute: rawMin - 45 };
    }
    return { period: 1, relMinute: Math.max(0, rawMin) };
  }

  // If period is null / undefined / 0
  if (rawMin >= 45) {
    return { period: 2, relMinute: rawMin - 45 };
  }
  return { period: 1, relMinute: Math.max(0, rawMin) };
}

  // Extract all category buttons from template (or default categories if template unavailable)
  const categoryButtons: BotoneraButton[] = useMemo(() => {
    if (template?.buttons && template.buttons.length > 0) {
      return template.buttons.filter((b) => b.type === 'category');
    }
    // Fallback buttons if no template
    return [
      { id: 'b_corners', name: 'Corners', category: 'Balón Parado (ABP)', type: 'category', color: 'blue', leadTime: 5, lagTime: 5 },
      { id: 'b_faltas', name: 'Faltas', category: 'Balón Parado (ABP)', type: 'category', color: 'amber', leadTime: 5, lagTime: 5 },
      { id: 'b_sb', name: 'SB en campo rival', category: 'Ataque', type: 'category', color: 'cyan', leadTime: 5, lagTime: 5 },
      { id: 'b_salidas', name: 'Salidas', category: 'Ataque', type: 'category', color: 'emerald', leadTime: 5, lagTime: 5 },
      { id: 'b_presion', name: 'Presiones Altas', category: 'Defensa', type: 'category', color: 'rose', leadTime: 5, lagTime: 5 },
      { id: 'b_recuperaciones', name: 'Recuperaciones', category: 'Defensa', type: 'category', color: 'indigo', leadTime: 5, lagTime: 5 },
      { id: 'b_remates', name: 'Remates/tiros', category: 'Ataque', type: 'category', color: 'purple', leadTime: 5, lagTime: 5 },
    ];
  }, [template]);

  // Compute event counts per button for Home Team vs Away Team
  const horizontalBarData = useMemo(() => {
    return categoryButtons.map((btn) => {
      const homeEvts = events.filter((e) => {
        const isHome = e.team_name ? e.team_name === homeTeamName : e.team_id !== 'away_team';
        if (!isHome) return false;
        const matched = findMatchingButton(categoryButtons, e);
        return matched?.id === btn.id || matched?.name.toLowerCase() === btn.name.toLowerCase();
      });

      const awayEvts = events.filter((e) => {
        const isAway = e.team_name === awayTeamName || e.team_id === 'away_team';
        if (!isAway) return false;
        const matched = findMatchingButton(categoryButtons, e);
        return matched?.id === btn.id || matched?.name.toLowerCase() === btn.name.toLowerCase();
      });

      const colorHex = getButtonColorHex(btn.color || 'emerald');

      return {
        button: btn,
        name: btn.name,
        colorHex,
        homeCount: homeEvts.length,
        awayCount: awayEvts.length,
        total: homeEvts.length + awayEvts.length,
      };
    });
  }, [categoryButtons, events, homeTeamName, awayTeamName]);

  // Evolutionary timeline buckets (10-min intervals for 1st & 2nd half)
  const timelineBuckets = useMemo(() => {
    const p1Intervals = [
      { start: 0, end: 10, label: "0-10'" },
      { start: 10, end: 20, label: "10-20'" },
      { start: 20, end: 30, label: "20-30'" },
      { start: 30, end: 40, label: "30-40'" },
      { start: 40, end: 50, label: "40-50'" },
    ];

    const p2Intervals = [
      { start: 0, end: 10, label: "45-55'" },
      { start: 10, end: 20, label: "55-65'" },
      { start: 20, end: 30, label: "65-75'" },
      { start: 30, end: 40, label: "75-85'" },
      { start: 40, end: 50, label: "85-95'" },
    ];

    const p1Buckets = p1Intervals.map(({ start, end, label }, idx) => {
      const isLast = idx === p1Intervals.length - 1;
      const countPerButton: Record<string, number> = {};
      categoryButtons.forEach((b) => (countPerButton[b.name] = 0));
      let unassignedCount = 0;

      events.forEach((evt) => {
        const { period: p, relMinute: relM } = resolveEventTiming(evt);
        if (p !== 1) return;

        const inRange = isLast ? relM >= start : relM >= start && relM < end;
        if (inRange) {
          const matchBtn = findMatchingButton(categoryButtons, evt);
          if (matchBtn) {
            countPerButton[matchBtn.name] = (countPerButton[matchBtn.name] || 0) + 1;
          } else {
            unassignedCount++;
          }
        }
      });

      const total = Object.values(countPerButton).reduce((a, b) => a + b, 0) + unassignedCount;
      return { label, total, counts: countPerButton };
    });

    const p2Buckets = p2Intervals.map(({ start, end, label }, idx) => {
      const isLast = idx === p2Intervals.length - 1;
      const countPerButton: Record<string, number> = {};
      categoryButtons.forEach((b) => (countPerButton[b.name] = 0));
      let unassignedCount = 0;

      events.forEach((evt) => {
        const { period: p, relMinute: relM } = resolveEventTiming(evt);
        if (p !== 2) return;

        const inRange = isLast ? relM >= start : relM >= start && relM < end;
        if (inRange) {
          const matchBtn = findMatchingButton(categoryButtons, evt);
          if (matchBtn) {
            countPerButton[matchBtn.name] = (countPerButton[matchBtn.name] || 0) + 1;
          } else {
            unassignedCount++;
          }
        }
      });

      const total = Object.values(countPerButton).reduce((a, b) => a + b, 0) + unassignedCount;
      return { label, total, counts: countPerButton };
    });

    return { p1Buckets, p2Buckets };
  }, [events, categoryButtons]);

  // Selected event data for the detail modal
  const selectedEventDetail = useMemo(() => {
    if (!selectedEventName) return null;
    const btn = categoryButtons.find((b) => b.name === selectedEventName);

    const filteredEvents = events.filter((e) => {
      const matched = findMatchingButton(categoryButtons, e);
      return (
        matched?.name.toLowerCase() === selectedEventName.toLowerCase() ||
        (btn && matched?.id === btn.id)
      );
    });

    return {
      button: btn,
      name: selectedEventName,
      events: filteredEvents,
      colorHex: btn ? getButtonColorHex(btn.color) : '#10b981',
    };
  }, [selectedEventName, categoryButtons, events]);

  // Max count in horizontal bars for scaling
  const maxBarVal = useMemo(() => {
    return Math.max(1, ...horizontalBarData.map((d) => Math.max(d.homeCount, d.awayCount)));
  }, [horizontalBarData]);

  // Max total in evolution buckets for scaling
  const maxBucketVal = useMemo(() => {
    const p1Max = Math.max(1, ...timelineBuckets.p1Buckets.map((b) => b.total));
    const p2Max = Math.max(1, ...timelineBuckets.p2Buckets.map((b) => b.total));
    return Math.max(p1Max, p2Max);
  }, [timelineBuckets]);

  return (
    <div className="space-y-6 bg-slate-950 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl text-slate-100 select-none">
      {/* ── 1. BARRA SUPERIOR: FECHA + EXPORTAR PDF (excluida de la captura) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full px-2 pb-3 border-b border-slate-800/80">
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>{match.competition || 'Jordan Pro League'} • {match.date || '04.09.2026'}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsPdfModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-950" />
          <span>EXPORTAR INFORME PDF</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-950/20 text-[10px] font-extrabold text-slate-950">
            🇪🇸 🇬🇧 🇯🇴
          </span>
        </button>
      </div>

      {/* ── CONTENIDO CAPTURABLE PARA EL PDF: idéntico a lo que ve el usuario ── */}
      <div ref={summaryCaptureRef} className="space-y-6 bg-slate-950">
        <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-12 w-full max-w-4xl px-2 py-3 mx-auto">
          {/* Home Team */}
          <div className="flex items-center gap-2 sm:gap-3 text-right flex-1 justify-end min-w-0">
            <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight truncate max-w-[90px] sm:max-w-[220px]">
              {homeTeamName}
            </h2>
            <TeamLogo teamName={homeTeamName} logoUrl={match.home_team_logo} size={48} />
          </div>

          {/* Score Badge */}
          <div className="px-3 sm:px-5 py-2 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 shadow-lg shadow-emerald-950/40 text-center shrink-0">
            <span className="font-mono text-lg sm:text-2xl md:text-3xl font-black text-white tracking-wider">
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2 sm:gap-3 text-left flex-1 justify-start min-w-0">
            <TeamLogo teamName={awayTeamName} logoUrl={match.away_team_logo} size={48} />
            <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight truncate max-w-[90px] sm:max-w-[220px]">
              {awayTeamName}
            </h2>
          </div>
        </div>

      {/* ── 2. SECCIÓN SUPERIOR 3 COLUMNAS (ALINEACIÓN LOCAL - BARRAS EVENTOS - ALINEACIÓN VISITANTE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Columna Izquierda (3/12): Alineación Táctica Local */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <TeamLogo teamName={homeTeamName} logoUrl={match.home_team_logo} size={20} />
              <span className="text-xs font-black text-white truncate">{homeTeamName}</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Formación {homeFormation}
            </span>
          </div>
          <div className="w-full flex-1 flex items-center justify-center">
            <TacticalLineupPitch
              teamName={homeTeamName}
              teamLogo={match.home_team_logo}
              teamColor={homeTeamColor}
              circleStyle={homeLineupConfig?.circleStyle || undefined}
              formation={homeFormation}
              players={homePlayers}
              substitutions={homeSubstitutions}
              isHome={true}
              orientation="vertical"
              onPlayerClick={(player) => setSelectedPlayer(player)}
            />
          </div>
        </div>

        {/* Columna Central (6/12): Gráfica de Barras Horizontales por Evento (Clic para Abrir Detalle) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-slate-100 uppercase tracking-wider">
                Comparativo de Acciones (Clic en cualquier evento para abrir detalle)
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {categoryButtons.length} Botones de Botonera
            </span>
          </div>

          {/* Rows Stream: Each button gets one row in the chart */}
          <div className="space-y-2.5 flex-1 flex flex-col justify-center py-1 overflow-x-auto">
            {horizontalBarData.map((data) => {
              const homePct = (data.homeCount / maxBarVal) * 100;
              const awayPct = (data.awayCount / maxBarVal) * 100;

              return (
                <div
                  key={data.name}
                  onClick={() => setSelectedEventName(data.name)}
                  className="group cursor-pointer bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 rounded-xl p-2 transition-all shadow-sm min-w-[320px]"
                  title={`Haz clic para ver el campograma y gráficas detalladas de "${data.name}"`}
                >
                  <div className="grid grid-cols-12 items-center gap-2 text-xs">
                    {/* Home Bar (Extends from Right to Left) */}
                    <div className="col-span-4 flex items-center justify-end gap-2">
                      <span className="font-mono text-xs font-black text-slate-200 group-hover:text-cyan-300">
                        {data.homeCount}
                      </span>
                      <div className="w-full bg-slate-900 h-3 rounded-l-full overflow-hidden flex justify-end">
                        <div
                          className="h-full rounded-l-full transition-all duration-500"
                          style={{
                            width: `${Math.max(6, homePct)}%`,
                            backgroundColor: data.colorHex,
                          }}
                        />
                      </div>
                    </div>

                    {/* Middle Label: Event Name */}
                    <div className="col-span-4 text-center font-extrabold text-slate-100 text-xs truncate group-hover:text-amber-400 transition-colors flex items-center justify-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: data.colorHex }}
                      />
                      <span className="truncate">{data.name}</span>
                    </div>

                    {/* Away Bar (Extends from Left to Right) */}
                    <div className="col-span-4 flex items-center justify-start gap-2">
                      <div className="w-full bg-slate-900 h-3 rounded-r-full overflow-hidden flex justify-start">
                        <div
                          className="h-full rounded-r-full transition-all duration-500 opacity-90"
                          style={{
                            width: `${Math.max(6, awayPct)}%`,
                            backgroundColor: data.colorHex,
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs font-black text-slate-200 group-hover:text-amber-300">
                        {data.awayCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center italic">
            💡 Haz clic sobre cualquier barra horizontal para ver el campograma y desglose del evento
          </div>
        </div>

        {/* Columna Derecha (3/12): Alineación Táctica Visitante */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <TeamLogo teamName={awayTeamName} logoUrl={match.away_team_logo} size={20} />
              <span className="text-xs font-black text-white truncate">{awayTeamName}</span>
            </div>
            <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Formación {awayFormation}
            </span>
          </div>
          <div className="w-full flex-1 flex items-center justify-center">
            <TacticalLineupPitch
              teamName={awayTeamName}
              teamLogo={match.away_team_logo}
              teamColor={awayTeamColor}
              circleStyle={awayLineupConfig?.circleStyle || undefined}
              formation={awayFormation}
              players={awayPlayers}
              substitutions={awaySubstitutions}
              isHome={false}
              orientation="vertical"
              onPlayerClick={(player) => setSelectedPlayer(player)}
            />
          </div>
        </div>
      </div>

      {/* ── 3. SECCIÓN INFERIOR: EVENTOS EVOLUTIVO EN EL TIEMPO (1ª Y 2ª PARTE) ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">
                Eventos (1ª y 2ª parte)
              </h3>
              <p className="text-xs text-slate-400">
                Evolución de densidad de acciones por intervalo de 10 minutos
              </p>
            </div>
          </div>

          {/* Event Color Legend */}
          <div className="flex flex-wrap items-center gap-2">
            {categoryButtons.map((btn) => (
              <div key={btn.id} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getButtonColorHex(btn.color) }}
                />
                <span>{btn.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2 Evolution Chart Columns (1ª Parte vs 2ª Parte) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* 1ª Parte Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              Evolución 1ª Parte (0&apos; - 50&apos;)
            </h4>
            <div className="h-44 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-end justify-between gap-2 relative">
              {timelineBuckets.p1Buckets.map((bucket) => {
                const heightPct = (bucket.total / maxBucketVal) * 100;
                return (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-300">
                      {bucket.total}
                    </span>
                    <div
                      className="w-full bg-blue-600/80 hover:bg-blue-500 rounded-t-xl transition-all duration-300 relative overflow-hidden"
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                    >
                      {/* Stacked color stripes per button count */}
                      <div className="absolute inset-0 flex flex-col-reverse">
                        {categoryButtons.map((btn) => {
                          const cnt = bucket.counts[btn.name] || 0;
                          if (cnt === 0 || bucket.total === 0) return null;
                          const stripePct = (cnt / bucket.total) * 100;
                          return (
                            <div
                              key={btn.id}
                              style={{
                                height: `${stripePct}%`,
                                backgroundColor: getButtonColorHex(btn.color),
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 text-center font-mono">Minutos de partido (1ª Parte)</p>
          </div>

          {/* 2ª Parte Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              Evolución 2ª Parte (45&apos; - 95&apos;)
            </h4>
            <div className="h-44 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-end justify-between gap-2 relative">
              {timelineBuckets.p2Buckets.map((bucket) => {
                const heightPct = (bucket.total / maxBucketVal) * 100;
                return (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-300">
                      {bucket.total}
                    </span>
                    <div
                      className="w-full bg-blue-600/80 hover:bg-blue-500 rounded-t-xl transition-all duration-300 relative overflow-hidden"
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                    >
                      {/* Stacked color stripes per button count */}
                      <div className="absolute inset-0 flex flex-col-reverse">
                        {categoryButtons.map((btn) => {
                          const cnt = bucket.counts[btn.name] || 0;
                          if (cnt === 0 || bucket.total === 0) return null;
                          const stripePct = (cnt / bucket.total) * 100;
                          return (
                            <div
                              key={btn.id}
                              style={{
                                height: `${stripePct}%`,
                                backgroundColor: getButtonColorHex(btn.color),
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 text-center font-mono">Minutos de partido (2ª Parte)</p>
          </div>
        </div>
      </div>
      </div>
      {/* ── FIN CONTENIDO CAPTURABLE ── */}

      {/* ── 4. MODAL DETALLE DEL EVENTO AL PULSAR CUALQUIER BARRA HORIZONTAL ── */}
      {selectedEventDetail && (
        <EventDetailModal
          eventDetail={selectedEventDetail}
          match={effectiveMatch}
          onClose={() => setSelectedEventName(null)}
          captureRef={modalCaptureRef}
        />
      )}

      {/* ── 5. MODAL DETALLE DE JUGADOR AL PULSAR CUALQUIER FICHA EN EL CAMPOGRAMA ── */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          events={allEvents}
          match={effectiveMatch}
          onClose={() => setSelectedPlayer(null)}
          onSelectVideoEvt={(evt) => setPlayingVideoEvt(evt)}
        />
      )}

      {/* ── 6. MODAL REPRODUCTOR DE VÍDEO EN VENTANA EMERGENTE ── */}
      {playingVideoEvt && (
        <div className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              {(() => {
                const pPeriod = resolveEventPeriod(playingVideoEvt);
                const pPlayer = playingVideoEvt.player_name || playingVideoEvt.metadata?.player_name || null;
                const pDorsal = playingVideoEvt.metadata?.player_number || playingVideoEvt.metadata?.dorsal || playingVideoEvt.metadata?.player_dorsal;
                const pMin = playingVideoEvt.minute !== null && playingVideoEvt.minute !== undefined ? playingVideoEvt.minute : 0;
                const pSec = playingVideoEvt.second !== null && playingVideoEvt.second !== undefined ? playingVideoEvt.second : 0;

                return (
                  <div className="flex items-center gap-2 font-extrabold text-sm min-w-0 flex-wrap">
                    <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 flex items-center gap-1">
                      <PlayCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs uppercase font-black">VÍDEO</span>
                    </div>

                    <span className="text-white flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      {pPlayer ? `${pPlayer}${pDorsal ? ` (#${pDorsal})` : ''}` : 'Sin jugador asignado'}
                    </span>

                    <span className="text-slate-500">•</span>

                    <span className="text-amber-300 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Min. {pMin}'{pSec > 0 ? `${pSec.toString().padStart(2, '0')}"` : ''}
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-black border border-emerald-500/30">
                      {pPeriod === 2 ? '2ª Parte' : '1ª Parte'}
                    </span>
                  </div>
                );
              })()}
              <button
                onClick={() => setPlayingVideoEvt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800">
              {(() => {
                const videoTimeSec = calculateEventVideoTime(playingVideoEvt, effectiveMatch);
                const ytId = extractYouTubeId(effectiveMatch.video_url);

                return ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(videoTimeSec)}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={effectiveMatch.video_url || ''}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    ref={(el) => {
                      if (el) {
                        const applySeek = () => {
                          try { el.currentTime = videoTimeSec; } catch (e) {}
                        };
                        applySeek();
                        el.addEventListener('loadedmetadata', applySeek, { once: true });
                        el.addEventListener('canplay', applySeek, { once: true });
                      }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL SELECCIÓN DE IDIOMA PARA EXPORTACIÓN PDF (🇪🇸 🇬🇧 🇯🇴) ── */}
      {isPdfModalOpen && (
        <PdfLanguageModal
          match={match}
          onClose={() => setIsPdfModalOpen(false)}
          onGeneratePdf={handleGeneratePdf}
          isGenerating={isGeneratingPdf}
          progressMessage={pdfProgressMsg}
        />
      )}
    </div>
  );
};

function extractYouTubeId(url: string | null | undefined): string {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : url;
}

/* ── PLAYER DETAIL MODAL COMPONENT (MUESTRA EVENTOS Y DATOS DEL JUGADOR AL CLICAR) ── */
interface PlayerDetailModalProps {
  player: Player;
  events: NormalizedEvent[];
  match: Match;
  onClose: () => void;
  onSelectVideoEvt: (evt: NormalizedEvent) => void;
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  events,
  match,
  onClose,
  onSelectVideoEvt,
}) => {
  const pName = player.name.toLowerCase().trim();

  // Filter player events
  const playerEvents = useMemo(() => {
    return events.filter((e) => {
      const ePlayer = (e.player_name || '').toLowerCase().trim();
      const subOut = (e.metadata?.player_out || '').toLowerCase().trim();
      const subIn = (e.metadata?.player_in || '').toLowerCase().trim();
      return ePlayer.includes(pName) || pName.includes(ePlayer) || subOut.includes(pName) || subIn.includes(pName);
    });
  }, [events, pName]);

  // Breakdown of categories
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    playerEvents.forEach((e) => {
      const cat = e.category || e.event_type || 'Acción';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: playerEvents.length > 0 ? Math.round((count / playerEvents.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [playerEvents]);

  // Outcome stats
  const outcomeStats = useMemo(() => {
    let success = 0;
    let fail = 0;
    playerEvents.forEach((e) => {
      const out = (e.outcome || '').toLowerCase();
      if (out.includes('éxito') || out.includes('exito') || out.includes('gol') || out.includes('ganado')) {
        success++;
      } else if (out.includes('fallido') || out.includes('perdido') || out.includes('pérdida')) {
        fail++;
      }
    });
    return { success, fail };
  }, [playerEvents]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 font-mono font-black text-sm shadow shrink-0">
              #{player.number}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  {player.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 font-mono text-xs font-bold border border-slate-800 text-amber-400">
                  {player.position || 'JUG'} • {player.team_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {match.home_team} vs {match.away_team} • {playerEvents.length} Acciones registradas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Acciones</span>
              <span className="text-xl font-black text-amber-400 font-mono">{playerEvents.length}</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Exitosas</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{outcomeStats.success}</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categorías Distintas</span>
              <span className="text-xl font-black text-cyan-400 font-mono">{categoryStats.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Campograma (5/12) */}
            <div className="lg:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  📌 Campograma de Acciones de {player.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded">
                  {playerEvents.length} Puntos
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[320px]">
                <BotoneraPitchCanvas
                  startX={playerEvents[0]?.x ?? null}
                  startY={playerEvents[0]?.y ?? null}
                  endX={playerEvents[0]?.end_x ?? null}
                  endY={playerEvents[0]?.end_y ?? null}
                  onSetCoords={() => {}}
                  selectedZone={(playerEvents[0]?.metadata?.zone as string) || null}
                  onSelectZone={() => {}}
                  initialMode="vector_arrow"
                  lockMode={true}
                  pitchViewMode="full"
                />
              </div>

              <div className="text-[10px] text-slate-500 text-center font-mono">
                Ubicaciones de intervención en el terreno de juego
              </div>
            </div>

            {/* Event List & Stats (7/12) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Category Breakdown Bars */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Desglose por Tipo de Evento</span>
                </h4>
                {categoryStats.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">No se registraron acciones para este jugador.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {categoryStats.map((c) => (
                      <div key={c.name} className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">{c.name}</span>
                          <span className="font-mono text-[11px] font-black text-amber-400">
                            {c.count} ({c.pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${c.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Timeline List with Video Play Buttons */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex-1 flex flex-col">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Registro de Acciones del Jugador ({playerEvents.length})</span>
                </h4>

                {playerEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">Sin eventos en este partido.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 flex-1">
                    {playerEvents.map((evt) => (
                      <div
                        key={evt.event_id}
                        className="flex items-center justify-between bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-2.5 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="bg-amber-500/20 text-amber-300 font-mono font-black px-2 py-0.5 rounded border border-amber-500/30 text-[10px] shrink-0">
                            {evt.minute}' {evt.period === 1 ? '1ªP' : evt.period === 3 ? 'ET1' : evt.period === 4 ? 'ET2' : '2ªP'}
                          </span>
                          <div className="truncate">
                            <span className="font-extrabold text-white block truncate">
                              {evt.category || evt.event_type}
                            </span>
                            {evt.subcategory && (
                              <span className="text-[10px] text-slate-400 block truncate">{evt.subcategory}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {evt.outcome && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              evt.outcome.toLowerCase().includes('éxito') || evt.outcome.toLowerCase().includes('exito') || evt.outcome.toLowerCase().includes('gol')
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}>
                              {evt.outcome}
                            </span>
                          )}
                          <button
                            onClick={() => onSelectVideoEvt(evt)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow transition cursor-pointer"
                            title="Ver este evento en vídeo"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>Ver Vídeo</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── EVENT DETAIL MODAL COMPONENT (CAMPOGRAMA Y DESCRIPTORES POR EQUIPO: LOCAL IZQ / VISITANTE DER) ── */
interface EventDetailModalProps {
  eventDetail: {
    button?: BotoneraButton;
    name: string;
    events: NormalizedEvent[];
    colorHex: string;
  };
  match: Match;
  onClose: () => void;
  onSelectVideoEvt?: (evt: NormalizedEvent) => void;
  captureRef?: React.RefObject<HTMLDivElement | null>;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  eventDetail,
  match,
  onClose,
  onSelectVideoEvt,
  captureRef,
}) => {
  const { button, name, events, colorHex } = eventDetail;

  const effectiveMatch = useMemo(() => {
    const analyses = dbStore.getAnalyses(match.id);
    const mainAnalysis = analyses.length > 0 ? analyses[0] : null;

    const p1 = match.p1_video_start_time ?? mainAnalysis?.p1_video_start_time ?? null;
    const p2 = match.p2_video_start_time ?? mainAnalysis?.p2_video_start_time ?? null;
    const vUrl = match.video_url || mainAnalysis?.video_url || null;

    return {
      ...match,
      p1_video_start_time: p1,
      p2_video_start_time: p2,
      video_url: vUrl,
    };
  }, [match]);

  const homeTeamName = effectiveMatch.home_team || 'Equipo Local';
  const awayTeamName = effectiveMatch.away_team || 'Equipo Visitante';

  // Pitch view mode assigned to this event button
  const pitchViewType: PitchRequiredType =
    button?.dashboardConfig?.pitchViewType || button?.pitchRequired || 'vector_arrow';

  // Filter events by team
  const homeEvents = useMemo(() => {
    return events.filter((e) => (e.team_name ? e.team_name === homeTeamName : e.team_id !== 'away_team'));
  }, [events, homeTeamName]);

  const awayEvents = useMemo(() => {
    return events.filter((e) => e.team_name === awayTeamName || e.team_id === 'away_team');
  }, [events, awayTeamName]);

  // Interactive Filter States per team
  const [selectedHomeZone, setSelectedHomeZone] = useState<string | null>(null);
  const [selectedHomeDescriptor, setSelectedHomeDescriptor] = useState<string | null>(null);
  const [selectedHomeEventId, setSelectedHomeEventId] = useState<string | null>(null);

  const [selectedAwayZone, setSelectedAwayZone] = useState<string | null>(null);
  const [selectedAwayDescriptor, setSelectedAwayDescriptor] = useState<string | null>(null);
  const [selectedAwayEventId, setSelectedAwayEventId] = useState<string | null>(null);

  // Floating Pop-up Video State positioned non-obstructively on opposite team side
  const [popupVideoState, setPopupVideoState] = useState<{
    event: NormalizedEvent;
    targetSide: 'left' | 'right';
  } | null>(null);

  const handleOpenVideoPopup = (evt: NormalizedEvent | null, isHomeAction: boolean) => {
    if (!evt) return;
    setPopupVideoState({
      event: evt,
      targetSide: isHomeAction ? 'right' : 'left', // Home action -> Video pops up on RIGHT SIDE over Away team; Away action -> Video pops up on LEFT SIDE over Home team
    });
  };

  // Predefined Zone Definitions for Coordinate Matching
  const ALL_ZONE_DEFINITIONS = useMemo(
    () => [
      // 1. Tactical 9
      { name: 'Ataque Banda Izq', minX: 66, maxX: 100, minY: 0, maxY: 33 },
      { name: 'Área Rival / Z14', minX: 66, maxX: 100, minY: 33, maxY: 66 },
      { name: 'Ataque Banda Der', minX: 66, maxX: 100, minY: 66, maxY: 100 },
      { name: 'Medio Banda Izq', minX: 33, maxX: 66, minY: 0, maxY: 33 },
      { name: 'Medio Campo Central', minX: 33, maxX: 66, minY: 33, maxY: 66 },
      { name: 'Medio Banda Der', minX: 33, maxX: 66, minY: 66, maxY: 100 },
      { name: 'Def. Banda Izq', minX: 0, maxX: 33, minY: 0, maxY: 33 },
      { name: 'Def. Área Propia', minX: 0, maxX: 33, minY: 33, maxY: 66 },
      { name: 'Def. Banda Der', minX: 0, maxX: 33, minY: 66, maxY: 100 },

      // 2. Bandas - Centro
      { name: 'Banda Izquierda', minX: 0, maxX: 100, minY: 0, maxY: 30 },
      { name: 'Pasillo Central', minX: 0, maxX: 100, minY: 30, maxY: 70 },
      { name: 'Centro / Pasillo Central', minX: 0, maxX: 100, minY: 30, maxY: 70 },
      { name: 'Banda Derecha', minX: 0, maxX: 100, minY: 70, maxY: 100 },

      // 3. 3 Hitos
      { name: 'Finalización (Zona Alta)', minX: 66, maxX: 100, minY: 0, maxY: 100 },
      { name: 'Canalización (Zona Media)', minX: 33, maxX: 66, minY: 0, maxY: 100 },
      { name: 'Inicio (Zona Baja)', minX: 0, maxX: 33, minY: 0, maxY: 100 },

      // 4. 4 Zonas Horizontales
      { name: 'Zona 4 (Ataque Profundo)', minX: 75, maxX: 100, minY: 0, maxY: 100 },
      { name: 'Zona 3 (Creación Alta)', minX: 50, maxX: 75, minY: 0, maxY: 100 },
      { name: 'Zona 2 (Creación Baja)', minX: 25, maxX: 50, minY: 0, maxY: 100 },
      { name: 'Zona 1 (Salida / Defensa)', minX: 0, maxX: 25, minY: 0, maxY: 100 },

      // 5. Zonas Remate
      { name: 'Área Pequeña', minX: 92, maxX: 100, minY: 37, maxY: 63 },
      { name: 'Área Grande', minX: 78, maxX: 92, minY: 25, maxY: 75 },
      { name: 'Borde Área', minX: 62, maxX: 78, minY: 25, maxY: 75 },
      { name: 'Lateral Izquierdo', minX: 62, maxX: 100, minY: 0, maxY: 25 },
      { name: 'Lateral Derecho', minX: 62, maxX: 100, minY: 75, maxY: 100 },
    ],
    []
  );

  const normalizeStr = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  // Helper matchers
  const isEventInZone = (evt: NormalizedEvent, targetZoneName: string | null) => {
    if (!targetZoneName) return true;
    const targetClean = normalizeStr(targetZoneName);

    // 1. Text match in metadata or subcategory
    const evtZone = (evt.metadata?.zone || evt.metadata?.zone_name || evt.subcategory || '') as string;
    if (evtZone) {
      const evtClean = normalizeStr(evtZone);
      if (evtClean === targetClean || evtClean.includes(targetClean) || targetClean.includes(evtClean)) {
        return true;
      }
    }

    // 2. Coordinate boundary check if event has x, y coordinates
    const evtX = evt.x ?? (evt.metadata?.x as number);
    const evtY = evt.y ?? (evt.metadata?.y as number);

    if (evtX !== undefined && evtX !== null && evtY !== undefined && evtY !== null) {
      const matchedDef = ALL_ZONE_DEFINITIONS.find((def) => normalizeStr(def.name) === targetClean);
      if (matchedDef) {
        const inA = evtX >= matchedDef.minX && evtX <= matchedDef.maxX && evtY >= matchedDef.minY && evtY <= matchedDef.maxY;
        const inB = evtY >= matchedDef.minX && evtY <= matchedDef.maxX && evtX >= matchedDef.minY && evtX <= matchedDef.maxY;
        if (inA || inB) {
          return true;
        }
      }
    }

    return false;
  };

  const isEventMatchingDescriptor = (evt: NormalizedEvent, descName: string | null) => {
    if (!descName) return true;
    const targetClean = normalizeStr(descName);

    const descList: string[] = [];
    if (Array.isArray(evt.metadata?.descriptors)) descList.push(...evt.metadata.descriptors);
    if (evt.subcategory) descList.push(...evt.subcategory.split(',').map((s) => s.trim()));
    if (evt.outcome) descList.push(evt.outcome, `Resultado: ${evt.outcome}`);
    if (evt.event_type) descList.push(evt.event_type);

    return descList.some((d) => {
      if (!d) return false;
      const dClean = normalizeStr(d);
      return dClean === targetClean || dClean.includes(targetClean) || targetClean.includes(dClean);
    });
  };

  // Home filtered event subsets
  const homeZoneFilteredEvents = useMemo(() => {
    return homeEvents.filter((e) => isEventInZone(e, selectedHomeZone));
  }, [homeEvents, selectedHomeZone]);

  const homeDescFilteredEvents = useMemo(() => {
    return homeEvents.filter((e) => isEventMatchingDescriptor(e, selectedHomeDescriptor));
  }, [homeEvents, selectedHomeDescriptor]);

  const homeActionEvents = useMemo(() => {
    return homeEvents.filter(
      (e) => isEventInZone(e, selectedHomeZone) && isEventMatchingDescriptor(e, selectedHomeDescriptor)
    );
  }, [homeEvents, selectedHomeZone, selectedHomeDescriptor]);

  // Away filtered event subsets
  const awayZoneFilteredEvents = useMemo(() => {
    return awayEvents.filter((e) => isEventInZone(e, selectedAwayZone));
  }, [awayEvents, selectedAwayZone]);

  const awayDescFilteredEvents = useMemo(() => {
    return awayEvents.filter((e) => isEventMatchingDescriptor(e, selectedAwayDescriptor));
  }, [awayEvents, selectedAwayDescriptor]);

  const awayActionEvents = useMemo(() => {
    return awayEvents.filter(
      (e) => isEventInZone(e, selectedAwayZone) && isEventMatchingDescriptor(e, selectedAwayDescriptor)
    );
  }, [awayEvents, selectedAwayZone, selectedAwayDescriptor]);

  // Process data (zones, descriptors, points) for a team using filtered subsets
  const processTeamData = (
    teamEvents: NormalizedEvent[],
    zoneFilteredEvts: NormalizedEvent[],
    descFilteredEvts: NormalizedEvent[]
  ) => {
    const zoneCounts: Record<string, number> = {};
    const totalDescCounts: Record<string, number> = {};
    const zoneDescCounts: Record<string, number> = {};
    const pointsList: EventPitchMarker[] = [];

    // Pitch Canvas zone counts & points from descFilteredEvts
    descFilteredEvts.forEach((evt) => {
      const z = (evt.metadata?.zone as string) || evt.subcategory;
      if (z) {
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
      }

      if (evt.x !== undefined && evt.x !== null && evt.y !== undefined && evt.y !== null) {
        pointsList.push({
          id: evt.event_id,
          startX: evt.x,
          startY: evt.y,
          endX: evt.end_x ?? null,
          endY: evt.end_y ?? null,
        });
      }
    });

    // Calculate Descriptors stats across ALL teamEvents (never disappears!)
    teamEvents.forEach((evt) => {
      const descList: string[] = [];
      if (Array.isArray(evt.metadata?.descriptors)) descList.push(...evt.metadata.descriptors);
      if (evt.subcategory) descList.push(...evt.subcategory.split(',').map((s) => s.trim()));
      if (evt.outcome) descList.push(`Resultado: ${evt.outcome}`);

      Array.from(new Set(descList.filter(Boolean))).forEach((d) => {
        totalDescCounts[d] = (totalDescCounts[d] || 0) + 1;
      });
    });

    // Calculate Descriptors stats specifically within the selected zone
    zoneFilteredEvts.forEach((evt) => {
      const descList: string[] = [];
      if (Array.isArray(evt.metadata?.descriptors)) descList.push(...evt.metadata.descriptors);
      if (evt.subcategory) descList.push(...evt.subcategory.split(',').map((s) => s.trim()));
      if (evt.outcome) descList.push(`Resultado: ${evt.outcome}`);

      Array.from(new Set(descList.filter(Boolean))).forEach((d) => {
        zoneDescCounts[d] = (zoneDescCounts[d] || 0) + 1;
      });
    });

    const descriptorStats = Object.entries(totalDescCounts)
      .map(([dName, totalCount]) => {
        const zoneCount = zoneDescCounts[dName] || 0;
        const totalTeam = teamEvents.length;
        const pct = totalTeam > 0 ? Math.round((totalCount / totalTeam) * 100) : 0;
        const zonePct = zoneFilteredEvts.length > 0 ? Math.round((zoneCount / zoneFilteredEvts.length) * 100) : 0;
        return {
          name: dName,
          totalCount,
          zoneCount,
          pct,
          zonePct,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount);

    // Group descriptors by Category Prefix (e.g. "Lanzamiento: Cerrado" -> Category "Lanzamiento", "Tipo: Directa" -> Category "Tipo")
    const groupMap: Record<string, Record<string, { totalCount: number; zoneCount: number; fullName: string }>> = {};

    Object.entries(totalDescCounts).forEach(([dName, totalCount]) => {
      const zoneCount = zoneDescCounts[dName] || 0;
      let categoryName = 'Acción / General';
      let valueName = dName;

      if (dName.includes(':')) {
        const parts = dName.split(':');
        categoryName = parts[0].trim();
        valueName = parts.slice(1).join(':').trim();
      }

      if (!groupMap[categoryName]) {
        groupMap[categoryName] = {};
      }
      groupMap[categoryName][valueName] = { totalCount, zoneCount, fullName: dName };
    });

    const descriptorGroups = Object.entries(groupMap).map(([catName, valObj]) => {
      const items = Object.entries(valObj).map(([vName, data]) => {
        return {
          name: data.fullName,
          valueName: vName,
          totalCount: data.totalCount,
          zoneCount: data.zoneCount,
        };
      });

      const catTotalEvents = items.reduce((sum, item) => sum + item.totalCount, 0);

      const itemsWithPct = items.map((item) => ({
        ...item,
        pct: catTotalEvents > 0 ? Math.round((item.totalCount / catTotalEvents) * 100) : 0,
        pctOfAll: teamEvents.length > 0 ? Math.round((item.totalCount / teamEvents.length) * 100) : 0,
      })).sort((a, b) => b.totalCount - a.totalCount);

      return {
        categoryName: catName,
        catTotalEvents,
        items: itemsWithPct,
      };
    });

    return { zoneCounts, descriptorStats, descriptorGroups, pointsList };
  };

  const homeData = useMemo(
    () => processTeamData(homeEvents, homeZoneFilteredEvents, homeDescFilteredEvents),
    [homeEvents, homeZoneFilteredEvents, homeDescFilteredEvents]
  );

  const awayData = useMemo(
    () => processTeamData(awayEvents, awayZoneFilteredEvents, awayDescFilteredEvents),
    [awayEvents, awayZoneFilteredEvents, awayDescFilteredEvents]
  );

  // Render separate SVG Donut / Pie Charts per descriptor category (Sin barras de desplazamiento)
  const renderGroupedPieCharts = (
    groups: ReturnType<typeof processTeamData>['descriptorGroups'],
    selectedDescriptor: string | null,
    onSelectDescriptor: (desc: string | null) => void
  ) => {
    const colors = ['#34d399', '#38bdf8', '#fbbf24', '#f43f5e', '#c084fc', '#fb923c'];

    if (groups.length === 0) return null;

    return (
      <div className="space-y-2 shrink-0">
        {groups.map((grp, grpIdx) => {
          const total = grp.catTotalEvents;
          if (total === 0 || grp.items.length === 0) return null;

          const R = 30;
          const C = 2 * Math.PI * R;
          let cumulativePercent = 0;
          const groupColorOffset = grpIdx * 2;

          return (
            <div
              key={grp.categoryName}
              className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 space-y-2 shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 font-mono text-[9px] font-black text-amber-400 uppercase tracking-wider">
                <span className="flex items-center gap-1 truncate">
                  <span>🍕 Gráfica:</span>
                  <span className="text-white font-extrabold truncate">{grp.categoryName}</span>
                </span>
                <span className="text-slate-400 font-semibold shrink-0 ml-1">{grp.items.length} Opciones</span>
              </div>

              <div className="flex items-center gap-3">
                {/* SVG Donut / Pie Chart for this specific descriptor category */}
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r={R} fill="none" stroke="#0f172a" strokeWidth="16" />
                    {grp.items.map((s, idx) => {
                      const pct = s.totalCount / total;
                      const dashLength = pct * C;
                      const strokeOffset = -cumulativePercent * C;
                      cumulativePercent += pct;
                      const color = colors[(idx + groupColorOffset) % colors.length];
                      const isSelected = selectedDescriptor?.toLowerCase().trim() === s.name.toLowerCase().trim();

                      return (
                        <circle
                          key={s.name}
                          cx="50"
                          cy="50"
                          r={R}
                          fill="none"
                          stroke={color}
                          strokeWidth={isSelected ? "20" : "16"}
                          strokeDasharray={`${dashLength} ${C - dashLength}`}
                          strokeDashoffset={strokeOffset}
                          className="transition-all duration-300 cursor-pointer hover:opacity-90"
                          onClick={() => onSelectDescriptor(isSelected ? null : s.name)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="font-mono text-[11px] font-black text-white leading-none">{total}</span>
                    <span className="text-[6px] text-slate-400 uppercase font-bold tracking-tight mt-0.5">Acc.</span>
                  </div>
                </div>

                {/* FULL LEGEND WITHOUT ANY INNER SCROLLBARS! */}
                <div className="flex-1 space-y-1 min-w-0">
                  {grp.items.map((s, idx) => {
                    const color = colors[(idx + groupColorOffset) % colors.length];
                    const isSelected = selectedDescriptor?.toLowerCase().trim() === s.name.toLowerCase().trim();

                    return (
                      <div
                        key={s.name}
                        onClick={() => onSelectDescriptor(isSelected ? null : s.name)}
                        className={`flex items-center justify-between text-[10px] px-2 py-0.5 rounded-lg cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                            : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                          <span className="font-bold truncate">{s.valueName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1 font-mono">
                          <span className="text-[9px] font-extrabold text-slate-400">{s.totalCount} acc</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                            {s.pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTeamStats = (
    teamName: string,
    teamLogoUrl: string | null | undefined,
    allEventsList: NormalizedEvent[],
    actionEventsList: NormalizedEvent[],
    teamData: ReturnType<typeof processTeamData>,
    selectedZone: string | null,
    selectedDescriptor: string | null,
    selectedEventId: string | null,
    onSelectZone: (zone: string | null) => void,
    onSelectDescriptor: (descriptor: string | null) => void,
    onSelectEventId: (eventId: string | null) => void,
    isHome: boolean
  ) => (
    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 flex flex-col h-full overflow-hidden justify-between">
      {/* Team Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-3 truncate">
          <TeamLogo teamName={teamName} logoUrl={teamLogoUrl} size={36} />
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-black text-white truncate">{teamName}</h4>
            <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block truncate">
              {isHome ? 'EQUIPO LOCAL' : 'EQUIPO VISITANTE'}
            </span>
          </div>
        </div>
        <span className="px-2 py-1 rounded-xl bg-slate-900 font-mono text-[10px] font-bold border border-slate-800 text-amber-400 shrink-0">
          {actionEventsList.length} / {allEventsList.length} acc.
        </span>
      </div>

      {/* Active Zone Filter Badge */}
      {selectedZone && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between shrink-0">
          <span className="truncate">📍 Zona: "{selectedZone}"</span>
          <button
            onClick={() => onSelectZone(null)}
            className="p-0.5 hover:bg-emerald-500/20 rounded text-emerald-400 cursor-pointer ml-1"
            title="Quitar filtro de zona"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Gráficas de Pizza Separadas por Categoría de Descriptor (Sin barras de desplazamiento internas) */}
      {renderGroupedPieCharts(teamData.descriptorGroups, selectedDescriptor, onSelectDescriptor)}

      {/* Gráfica de Descriptores Moderna (Ocupa todo el espacio de arriba a abajo flex-1) */}
      <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-2.5 flex-1 flex flex-col min-h-0 shadow-inner backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <h5 className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
              Descriptores ({teamData.descriptorStats.length})
            </h5>
          </div>
          <span className="text-[9px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            Total & %
          </span>
        </div>

        {teamData.descriptorStats.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic py-4 text-center">Sin descriptores registrados.</p>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-0">
            {teamData.descriptorStats.map((desc) => {
              const isSelected = selectedDescriptor?.toLowerCase().trim() === desc.name.toLowerCase().trim();
              const hasZoneFilter = Boolean(selectedZone);
              const isDescriptorInZone = hasZoneFilter && desc.zoneCount > 0;

              // Choose icon based on descriptor text
              const dLower = desc.name.toLowerCase();
              const IconComponent = dLower.includes('remate') || dLower.includes('disparo') || dLower.includes('gol')
                ? Target
                : dLower.includes('parada') || dLower.includes('defens') || dLower.includes('falta')
                ? Shield
                : dLower.includes('lanzamiento') || dLower.includes('pase') || dLower.includes('centro')
                ? Activity
                : Tag;

              return (
                <div
                  key={desc.name}
                  onClick={() => onSelectDescriptor(isSelected ? null : desc.name)}
                  className={`relative overflow-hidden p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-slate-950 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/50 scale-[1.01]'
                      : isDescriptorInZone
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border-amber-500/60 text-amber-200'
                      : hasZoneFilter && desc.zoneCount === 0
                      ? 'bg-slate-950/60 border-slate-800/60 opacity-40 hover:opacity-80'
                      : 'bg-slate-950/90 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  title="Haz clic para filtrar el campograma por este descriptor"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-emerald-400' : isDescriptorInZone ? 'text-amber-400' : 'text-cyan-400'
                      }`} />
                      <span className={`font-bold truncate ${
                        isSelected ? 'text-emerald-300' : isDescriptorInZone ? 'text-amber-200' : 'text-slate-200'
                      }`}>
                        {isSelected ? '✓ ' : ''}{desc.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1.5 font-mono">
                      {hasZoneFilter && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                          desc.zoneCount > 0
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                          📍 {desc.zoneCount} en zona
                        </span>
                      )}

                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                          : 'bg-slate-900 text-cyan-300 border-slate-800'
                      }`}>
                        {desc.totalCount} acc. <span className="text-slate-400 font-medium">({desc.pct}%)</span>
                      </span>
                    </div>
                  </div>

                  {/* Modern Animated Gradient Gauge Bar */}
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800/80 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                          : isDescriptorInZone
                          ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                          : 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 opacity-80'
                      }`}
                      style={{
                        width: `${Math.max(4, Math.min(100, desc.pct))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Acciones del Equipo */}
      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2 shrink-0 max-h-44 flex flex-col min-h-0">
        <h5 className="text-[11px] font-black text-slate-200 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-1.5 shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Acciones ({actionEventsList.length})</span>
          </span>
          {(selectedZone || selectedDescriptor || selectedEventId) && (
            <button
              onClick={() => {
                onSelectZone(null);
                onSelectDescriptor(null);
                onSelectEventId(null);
              }}
              className="text-[9px] text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
            >
              Reset
            </button>
          )}
        </h5>

        {actionEventsList.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic py-2 text-center">Sin acciones que coincidan.</p>
        ) : (
          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 scrollbar-thin min-h-0">
            {actionEventsList.map((evt) => {
              const isEvtSelected = selectedEventId === evt.event_id;

              return (
                <div
                  key={evt.event_id}
                  onClick={() => onSelectEventId(isEvtSelected ? null : evt.event_id)}
                  className={`flex items-center justify-between border rounded-lg p-1.5 transition text-[11px] cursor-pointer select-none ${
                    isEvtSelected
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200 ring-2 ring-rose-400 shadow-lg shadow-rose-950/40'
                      : 'bg-slate-950 border-slate-800 hover:border-rose-500/50'
                  }`}
                  title="Haz clic para seleccionar y resaltar su flecha en el campograma"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`font-mono font-black px-1 py-0.5 rounded border text-[9px] shrink-0 ${
                      isEvtSelected
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {evt.minute}' {evt.period === 1 ? '1ªP' : '2ªP'}
                    </span>
                    <span className={`font-bold truncate ${isEvtSelected ? 'text-rose-300' : 'text-white'}`}>
                      {isEvtSelected ? '📍 ' : ''}{evt.player_name || name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {evt.outcome && (
                      <span
                        className={`text-[9px] font-bold px-1 py-0.5 rounded border ${
                          evt.outcome.toLowerCase().includes('éxito') ||
                          evt.outcome.toLowerCase().includes('exito') ||
                          evt.outcome.toLowerCase().includes('gol')
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        {evt.outcome}
                      </span>
                    )}
                    {onSelectVideoEvt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVideoEvt(evt);
                        }}
                        className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] flex items-center gap-0.5 shadow transition cursor-pointer"
                        title="Ver vídeo"
                      >
                        <Play className="w-2.5 h-2.5 fill-slate-950" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderTeamPitch = (
    teamName: string,
    allEventsList: NormalizedEvent[],
    descFilteredEvents: NormalizedEvent[],
    teamData: ReturnType<typeof processTeamData>,
    selectedZone: string | null,
    selectedDescriptor: string | null,
    selectedEventId: string | null,
    onSelectZone: (zone: string | null) => void,
    onSelectDescriptor: (descriptor: string | null) => void,
    onSelectEventId: (eventId: string | null) => void,
    isHome: boolean
  ) => {
    const isZoneMode = pitchViewType.startsWith('zone_') || pitchViewType === 'zone';

    const pointsListWithSelection = useMemo(() => {
      return teamData.pointsList.map((pt) => ({
        ...pt,
        isSelected: selectedEventId ? pt.id === selectedEventId : false,
      }));
    }, [teamData.pointsList, selectedEventId]);

    return (
      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between h-full">
        {/* Team Shield Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <TeamLogo teamName={teamName} size={36} />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-white truncate leading-tight">
                {teamName}
              </h4>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 block truncate">
                {isHome ? 'CAMPOGRAMA LOCAL' : 'CAMPOGRAMA VISITANTE'}
              </span>
            </div>
          </div>

          <span className="text-[9px] font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-xl border border-emerald-500/30 shrink-0">
            {pointsListWithSelection.length} {pointsListWithSelection.length === 1 ? 'Acción' : 'Acciones'}
          </span>
        </div>

        {/* Active Descriptor Filter Badge */}
        {selectedDescriptor && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between shrink-0">
            <span className="truncate">🏷️ Descriptor: "{selectedDescriptor}" ({descFilteredEvents.length} acc.)</span>
            <button
              onClick={() => onSelectDescriptor(null)}
              className="p-0.5 hover:bg-amber-500/20 rounded text-amber-400 cursor-pointer ml-1"
              title="Quitar filtro de descriptor"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Active Marker Selection Indicator */}
        {selectedEventId && (() => {
          const selEvt = allEventsList.find((e) => e.event_id === selectedEventId);
          const selPlayer = selEvt?.player_name || selEvt?.metadata?.player_name || null;
          const selDorsal = selEvt?.metadata?.player_number || selEvt?.metadata?.dorsal || selEvt?.metadata?.player_dorsal;
          const selMin = selEvt?.minute !== null && selEvt?.minute !== undefined ? selEvt.minute : 0;
          const selSec = selEvt?.second !== null && selEvt?.second !== undefined ? selEvt.second : 0;
          const selPeriod = selEvt ? resolveEventPeriod(selEvt) : 1;

          return (
            <div className="bg-amber-500/20 border border-amber-400 text-amber-300 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center justify-between shrink-0 animate-fade-in">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <span className="text-amber-300 font-extrabold truncate">
                  👤 {selPlayer ? `${selPlayer}${selDorsal ? ` (#${selDorsal})` : ''}` : 'Sin jugador'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-300 font-bold">
                  Min. {selMin}'{selSec > 0 ? `${selSec.toString().padStart(2, '0')}"` : ''}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black">
                  {selPeriod === 2 ? '2ªP' : '1ªP'}
                </span>
              </div>
              <button
                onClick={() => onSelectEventId(null)}
                className="p-0.5 hover:bg-amber-500/30 rounded text-amber-300 cursor-pointer ml-1 shrink-0"
                title="Deseleccionar acción"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

        <div className="flex-1 flex items-start justify-center pt-0 pb-1">
          <BotoneraPitchCanvas
            hideHeader={true}
            startX={null}
            startY={null}
            endX={null}
            endY={null}
            onSetCoords={() => {}}
            selectedZone={selectedZone}
            onSelectZone={(zName) => onSelectZone(zName === selectedZone ? null : zName)}
            onSelectMarker={(mId) => onSelectEventId(mId === selectedEventId ? null : mId)}
            initialMode={pitchViewType}
            lockMode={true}
            pitchViewMode="full"
            zoneCounts={teamData.zoneCounts}
            pointsList={pointsListWithSelection}
          />
        </div>

        <div className="text-[9px] text-slate-500 text-center font-mono truncate">
          {selectedEventId ? (
            <span className="text-amber-400 font-bold">🎯 Flecha / Acción resaltada</span>
          ) : selectedZone ? (
            <span className="text-emerald-400 font-bold">Zona seleccionada: {selectedZone}</span>
          ) : (
            `Haz clic en una zona o flecha para seleccionarla`
          )}
        </div>
      </div>
    );
  };

  const renderFloatingVideoPopup = () => {
    if (!popupVideoState) return null;
    const { event: evt, targetSide } = popupVideoState;

    const isHome = evt.team_name ? evt.team_name === homeTeamName : evt.team_id !== 'away_team';
    const teamName = isHome ? homeTeamName : awayTeamName;

    const evtPeriod = resolveEventPeriod(evt);
    const playerName = evt.player_name || evt.metadata?.player_name || evt.metadata?.player || null;
    const playerDorsal = evt.metadata?.player_number || evt.metadata?.dorsal || evt.metadata?.player_dorsal || null;
    const minVal = evt.minute !== null && evt.minute !== undefined ? evt.minute : (evt.timestamp ? Math.floor(evt.timestamp / 60) : 0);
    const secVal = evt.second !== null && evt.second !== undefined ? evt.second : (evt.timestamp ? evt.timestamp % 60 : 0);

    const positionClass =
      targetSide === 'right'
        ? 'right-4 sm:right-10 top-20 sm:top-24'
        : 'left-4 sm:left-10 top-20 sm:top-24';

    return (
      <div
        className={`fixed ${positionClass} z-[180] w-80 sm:w-96 bg-slate-950/95 border-2 border-amber-400 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl p-3.5 space-y-3 animate-fade-in transition-all duration-300 select-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 truncate min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black shrink-0 flex items-center gap-1 shadow">
              <Play className="w-3.5 h-3.5 fill-amber-300" />
              <span>VÍDEO</span>
            </div>
            <div className="truncate min-w-0">
              <h4 className="text-xs font-extrabold text-white truncate flex items-center gap-1">
                <span>👤 {playerName ? `${playerName}${playerDorsal ? ` (#${playerDorsal})` : ''}` : 'Sin jugador asignado'}</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                <span className="text-amber-400 font-bold">{teamName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-300 font-bold">Min. {minVal}'{secVal > 0 ? `${secVal.toString().padStart(2, '0')}"` : ''}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">
                  {evtPeriod === 2 ? '2ªP' : '1ªP'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPopupVideoState(null)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition cursor-pointer shrink-0"
            title="Cerrar ventana de vídeo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Box */}
        {(() => {
          const videoUrl = evt.metadata?.video_url || (evt as any).video_url || effectiveMatch.video_url;
          const ytId = extractYouTubeId(videoUrl);
          const startSec = calculateEventVideoTime(evt, effectiveMatch);

          return (
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center group">
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(startSec)}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  ref={(el) => {
                    if (el) {
                      const applySeek = () => {
                        try { el.currentTime = startSec; } catch (e) {}
                      };
                      applySeek();
                      el.addEventListener('loadedmetadata', applySeek, { once: true });
                      el.addEventListener('canplay', applySeek, { once: true });
                    }
                  }}
                />
              ) : (
                <div className="relative w-full h-full bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-emerald-950/40 to-slate-950 p-4 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3.5 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 animate-pulse shadow-lg">
                    <Play className="w-6 h-6 fill-amber-300 ml-0.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-100">Clip Táctico ({minVal}')</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {evt.subcategory || evt.event_type || 'Acción Registrada'}
                    </p>
                  </div>
                  <div className="w-full max-w-[80%] bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 h-full w-3/4 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Detailed Footer Card with Jugador, Minuto y Parte */}
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-200">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <User className="w-3 h-3 text-amber-400" /> Jugador:
            </span>
            <span className="font-extrabold text-amber-300 truncate max-w-[170px]">
              {playerName ? `${playerName}${playerDorsal ? ` (#${playerDorsal})` : ''}` : 'Sin jugador asignado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-200 border-t border-slate-800/80 pt-1">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Minuto y Parte:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {evtPeriod === 2 ? '2ª Parte' : '1ª Parte'}
              </span>
              <span className="font-black text-amber-300">
                Min. {minVal}'{secVal > 0 ? `${secVal.toString().padStart(2, '0')}"` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-200 border-t border-slate-800/80 pt-1">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> Acción / Zona:
            </span>
            <span className="font-bold text-cyan-300 truncate max-w-[170px]">
              {evt.metadata?.zone || evt.subcategory || evt.event_type || `(${evt.x || 0}%, ${evt.y || 0}%)`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div ref={captureRef} className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-[98vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2 rounded-xl border flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: `${colorHex}30`, borderColor: colorHex }}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  Detalle del Evento: {name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 font-mono text-xs font-bold border border-slate-800" style={{ color: colorHex }}>
                  {events.length} acciones totales ({homeEvents.length} {homeTeamName} vs {awayEvents.length} {awayTeamName})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {homeTeamName} (Izq) vs {awayTeamName} (Der) • Clic en flechas o zonas para resaltarlas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 4 Full Width Columns */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 text-slate-200 relative">
          {/* Non-obstructive Floating Video Window */}
          {renderFloatingVideoPopup()}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 items-stretch h-full">
            {/* Col 1 (3/12): Far Left - Home Team Descriptores & Actions */}
            <div className="lg:col-span-3 flex flex-col">
              {renderTeamStats(
                homeTeamName,
                match.home_team_logo,
                homeEvents,
                homeActionEvents,
                homeData,
                selectedHomeZone,
                selectedHomeDescriptor,
                selectedHomeEventId,
                (z) => {
                  setSelectedHomeZone(z);
                  if (z) {
                    const matchEvt = homeEvents.find((e) => isEventInZone(e, z));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                (d) => {
                  setSelectedHomeDescriptor(d);
                  if (d) {
                    const matchEvt = homeEvents.find((e) => isEventMatchingDescriptor(e, d));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                (id) => {
                  setSelectedHomeEventId(id);
                  if (id) {
                    const matchEvt = homeEvents.find((e) => e.event_id === id);
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                true
              )}
            </div>

            {/* Col 2 (3/12): Center-Left - Home Team Pitch Canvas */}
            <div className="lg:col-span-3 flex flex-col">
              {renderTeamPitch(
                homeTeamName,
                homeEvents,
                homeDescFilteredEvents,
                homeData,
                selectedHomeZone,
                selectedHomeDescriptor,
                selectedHomeEventId,
                (z) => {
                  setSelectedHomeZone(z);
                  if (z) {
                    const matchEvt = homeEvents.find((e) => isEventInZone(e, z));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                (d) => {
                  setSelectedHomeDescriptor(d);
                  if (d) {
                    const matchEvt = homeEvents.find((e) => isEventMatchingDescriptor(e, d));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                (id) => {
                  setSelectedHomeEventId(id);
                  if (id) {
                    const matchEvt = homeEvents.find((e) => e.event_id === id);
                    if (matchEvt) handleOpenVideoPopup(matchEvt, true);
                  }
                },
                true
              )}
            </div>

            {/* Col 3 (3/12): Center-Right - Away Team Pitch Canvas */}
            <div className="lg:col-span-3 flex flex-col">
              {renderTeamPitch(
                awayTeamName,
                awayEvents,
                awayDescFilteredEvents,
                awayData,
                selectedAwayZone,
                selectedAwayDescriptor,
                selectedAwayEventId,
                (z) => {
                  setSelectedAwayZone(z);
                  if (z) {
                    const matchEvt = awayEvents.find((e) => isEventInZone(e, z));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                (d) => {
                  setSelectedAwayDescriptor(d);
                  if (d) {
                    const matchEvt = awayEvents.find((e) => isEventMatchingDescriptor(e, d));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                (id) => {
                  setSelectedAwayEventId(id);
                  if (id) {
                    const matchEvt = awayEvents.find((e) => e.event_id === id);
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                false
              )}
            </div>

            {/* Col 4 (3/12): Far Right - Away Team Descriptores & Actions */}
            <div className="lg:col-span-3 flex flex-col">
              {renderTeamStats(
                awayTeamName,
                match.away_team_logo,
                awayEvents,
                awayActionEvents,
                awayData,
                selectedAwayZone,
                selectedAwayDescriptor,
                selectedAwayEventId,
                (z) => {
                  setSelectedAwayZone(z);
                  if (z) {
                    const matchEvt = awayEvents.find((e) => isEventInZone(e, z));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                (d) => {
                  setSelectedAwayDescriptor(d);
                  if (d) {
                    const matchEvt = awayEvents.find((e) => isEventMatchingDescriptor(e, d));
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                (id) => {
                  setSelectedAwayEventId(id);
                  if (id) {
                    const matchEvt = awayEvents.find((e) => e.event_id === id);
                    if (matchEvt) handleOpenVideoPopup(matchEvt, false);
                  }
                },
                false
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
