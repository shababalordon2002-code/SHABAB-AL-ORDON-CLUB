'use client';

import React, { use, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { dbStore } from '@/lib/store/db-store';
import { BotoneraTemplate, Match, MatchDashboard, NormalizedEvent } from '@/types';
import { StandardMatchDashboard } from '@/components/dashboards/StandardMatchDashboard';

import { createClient } from '@/lib/supabase/client';

function DashboardDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const dashboardId = resolvedParams.id;

  const [dashboard, setDashboard] = useState<MatchDashboard | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [template, setTemplate] = useState<BotoneraTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const d = dbStore.getDashboards().find((item) => item.id === dashboardId);
      let targetMatchId = '';
      let tmplId: string | null | undefined;

      if (d) {
        setDashboard(d);
        targetMatchId = d.match_id;
        const m = dbStore.getMatchById(d.match_id);
        if (m) {
          setMatch(m);
          tmplId = d.botonera_template_id || m.botonera_template_id;
        }

        // Combine events from analysis (if present) and normalized match events
        const analysisEvs = d.analysis_id ? dbStore.getAnalysisById(d.analysis_id)?.events || [] : [];
        const matchEvs = dbStore.getNormalizedEvents(d.match_id);

        const eventMap = new Map<string, NormalizedEvent>();
        analysisEvs.forEach((e) => eventMap.set(e.event_id, e));
        matchEvs.forEach((e) => eventMap.set(e.event_id, e));

        setEvents(Array.from(eventMap.values()));
      } else {
        // Fallback: search directly by matchId if id is a match id
        targetMatchId = dashboardId;
        const m = dbStore.getMatchById(dashboardId);
        if (m) {
          setMatch(m);
          tmplId = m.botonera_template_id;
          const evs = dbStore.getNormalizedEvents(m.id);
          setEvents(evs);
        }
      }

      if (tmplId) {
        const tmpl = dbStore.getBotoneraTemplates().find((t) => t.id === tmplId);
        if (tmpl) setTemplate(tmpl);
      }

      // Sync latest events & analyses from Supabase if connected
      if (targetMatchId) {
        try {
          await dbStore.syncAnalysesFromSupabase(targetMatchId);
          const freshAnalyses = dbStore.getAnalyses(targetMatchId);
          if (freshAnalyses && freshAnalyses.length > 0) {
            const latestAn = freshAnalyses[0];
            setMatch((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                p1_video_start_time: prev.p1_video_start_time ?? latestAn.p1_video_start_time ?? null,
                p2_video_start_time: prev.p2_video_start_time ?? latestAn.p2_video_start_time ?? null,
                video_url: prev.video_url || latestAn.video_url || null,
              };
            });
          }

          const { getAnalysisEventsFromSupabase } = await import('@/lib/services/botonera-service');
          const remoteEvs = await getAnalysisEventsFromSupabase(targetMatchId);
          if (remoteEvs && remoteEvs.length > 0) {
            setEvents((prev) => {
              const map = new Map<string, NormalizedEvent>();
              prev.forEach((e) => map.set(e.event_id, e));
              remoteEvs.forEach((e) => map.set(e.event_id, e));
              return Array.from(map.values());
            });
          }
        } catch (err) {
          console.warn('Could not sync Supabase events for dashboard:', err);
        }
      }

      setLoading(false);
    }

    loadDashboardData();

    // Auto-refresh fallback
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);

    // Realtime push: when any analyst registers/saves an event or analysis, reload live
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadDashboardData, 300);
    };

    const channel = supabase
      .channel(`dashboard-detail-live-${dashboardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_analyses' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_dashboards' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_events' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_sessions' }, debouncedReload)
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Cargando dashboard del partido...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-12 text-center space-y-4">
        <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-300">Dashboard de partido no encontrado</h2>
        <Link href="/dashboards" className="text-xs text-emerald-400 hover:underline">
          Volver a la lista de dashboards
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <Link
          href="/dashboards"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Listado de Dashboards</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold whitespace-nowrap">
            📊 Dashboard Oficial del Partido
          </span>
        </div>
      </div>

      {/* Main Standard Match Dashboard */}
      <StandardMatchDashboard
        match={match}
        events={events}
        template={template || undefined}
      />
    </div>
  );
}

export default function DashboardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Cargando dashboard del partido...</p>
        </div>
      }
    >
      <DashboardDetailContent params={params} />
    </Suspense>
  );
}
