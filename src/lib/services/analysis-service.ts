import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { MatchAnalysis, NormalizedEvent } from '@/types';
import { isLiveLineupLocked, isValidLineup } from '@/lib/live-lineups';
import { ANALYSIS_PRESERVE_COLUMNS, MATCH_PRESERVE_COLUMNS, isNoOpUpdate, selectWithFallback } from '@/lib/supabase/egress';
import { rowToNormalizedEvent, getAnalysisVideosMapFromSupabase, getAnalysisVideoFromSupabase, upsertAnalysisVideoToSupabase } from '@/lib/services/botonera-service';

// Status of the tombstone row a deleted analysis leaves behind in match_analyses.
export const ANALYSIS_DELETED_STATUS = 'deleted';
// Fired on window when a save is refused because the analysis was deleted meanwhile.
export const ANALYSIS_DELETED_EVENT = 'sao:analysis-deleted';

// Fetch all Match Analyses (or filtered by matchId) from Supabase with full events reconciliation
export async function getAnalysesFromSupabase(matchId?: string): Promise<MatchAnalysis[]> {
  return (await fetchAnalysesFromSupabase(matchId)) ?? [];
}

// Same as getAnalysesFromSupabase, but returns null when Supabase could not be read, so callers
// can tell "this analysis no longer exists" (deleted) from "we don't know" (offline / error).
// Also returns the set of match_ids that are currently marked as deleted (tombstoned).
export async function fetchAnalysesAndTombstonesFromSupabase(matchId?: string): Promise<{
  analyses: MatchAnalysis[];
  deletedMatchIds: Set<string>;
} | null> {
  try {
    const supabase = createClient();
    let query = supabase.from('match_analyses').select('*').order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;
    if (error) {
      if (!error.message.includes('relation "public.match_analyses" does not exist')) {
        console.warn('Supabase fetch match_analyses error:', error.message);
        return null;
      }
    }

    // Single source of truth: Also fetch all analysis_events rows from Supabase
    let eventsByMatch = new Map<string, NormalizedEvent[]>();
    try {
      let evQuery = supabase.from('analysis_events').select('*').order('timestamp', { ascending: true });
      if (matchId) {
        evQuery = evQuery.eq('match_id', matchId);
      }
      const { data: evRows, error: evErr } = await evQuery;
      if (!evErr && evRows && evRows.length > 0) {
        evRows.forEach((r: any) => {
          const normEvt = rowToNormalizedEvent(r);
          if (normEvt && normEvt.match_id) {
            const list = eventsByMatch.get(normEvt.match_id) || [];
            list.push(normEvt);
            eventsByMatch.set(normEvt.match_id, list);
          }
        });
      }
    } catch (evFetchErr) {
      console.warn('Non-blocking warning fetching analysis_events for analyses:', evFetchErr);
    }

    const processedMatchIds = new Set<string>();

    // A deleted analysis leaves a tombstone row (status 'deleted', see deleteAnalysisFromSupabase):
    // it is not shown, and stray analysis_events rows of that match must not bring it back either.
    const tombstones = (data || []).filter((row: any) => row.status === ANALYSIS_DELETED_STATUS);
    const deletedMatchIds = new Set<string>(tombstones.map((row: any) => row.match_id).filter(Boolean));
    deletedMatchIds.forEach((mId) => processedMatchIds.add(mId));

    const analyses: MatchAnalysis[] = (data || []).filter((row: any) => row.status !== ANALYSIS_DELETED_STATUS).map((row: any) => {
      processedMatchIds.add(row.match_id);
      const parsedRowEvents: NormalizedEvent[] = typeof row.events === 'string'
        ? JSON.parse(row.events)
        : (Array.isArray(row.events) ? row.events : []);

      const tblEvents = eventsByMatch.get(row.match_id) || [];

      // Single source of truth: tblEvents (analysis_events table) is authoritative. The
      // match_analyses.events copy is only a fallback for legacy analyses with no rows there:
      // merging it in brought back events already deleted from analysis_events whenever a
      // stale copy had been written to match_analyses.
      const eventMap = new Map<string, NormalizedEvent>();
      (tblEvents.length > 0 ? tblEvents : parsedRowEvents).forEach((e) => {
        if (e && e.event_id) eventMap.set(e.event_id, e);
      });

      const reconciledEvents = Array.from(eventMap.values()).sort((a, b) => {
        const pa = a.period ?? 1;
        const pb = b.period ?? 1;
        if (pa !== pb) return pa - pb;
        const ta = a.timestamp ?? 0;
        const tb = b.timestamp ?? 0;
        return ta - tb;
      });

      const parsedHome = typeof row.home_lineup === 'string' ? JSON.parse(row.home_lineup) : (row.home_lineup || null);
      const parsedAway = typeof row.away_lineup === 'string' ? JSON.parse(row.away_lineup) : (row.away_lineup || null);

      return {
        id: row.id,
        match_id: row.match_id,
        title: row.title || 'Análisis de Partido',
        analyst_name: row.analyst_name || 'Analista SAO',
        status: row.status || 'completed',
        video_type: row.video_type || null,
        video_url: row.video_url || null,
        video_source_name: row.video_source_name || null,
        p1_video_start_time: row.p1_video_start_time ?? null,
        p2_video_start_time: row.p2_video_start_time ?? null,
        period_adjustments: typeof row.period_adjustments === 'string'
          ? JSON.parse(row.period_adjustments)
          : (row.period_adjustments || parsedHome?._period_adjustments || null),
        botonera_template_id: row.botonera_template_id || null,
        home_lineup: isValidLineup(parsedHome) ? parsedHome : null,
        away_lineup: isValidLineup(parsedAway) ? parsedAway : null,
        events: reconciledEvents,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    // Also synthesize analyses for matches that have rows in analysis_events but no row in match_analyses
    eventsByMatch.forEach((evList, mId) => {
      if (!processedMatchIds.has(mId) && (!matchId || matchId === mId)) {
        processedMatchIds.add(mId);
        analyses.push({
          id: `analysis_${mId}`,
          match_id: mId,
          title: `Análisis de Partido`,
          analyst_name: 'Analista SAO',
          status: 'completed',
          video_type: null,
          video_url: null,
          video_source_name: null,
          p1_video_start_time: null,
          p2_video_start_time: null,
          period_adjustments: null,
          botonera_template_id: null,
          home_lineup: null,
          away_lineup: null,
          events: evList.sort((a, b) => {
            const pa = a.period ?? 1;
            const pb = b.period ?? 1;
            if (pa !== pb) return pa - pb;
            return (a.timestamp ?? 0) - (b.timestamp ?? 0);
          }),
          created_at: evList[0]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    // Overlay video config from the single-source-of-truth analysis_videos table.
    // This table is authoritative when a row exists; otherwise the analysis keeps
    // whatever it already resolved above from match_analyses (legacy fallback), so
    // analyses saved before this table existed still show their video.
    try {
      const videoMap = await getAnalysisVideosMapFromSupabase(matchId);
      if (videoMap.size > 0) {
        analyses.forEach((an) => {
          const v = videoMap.get(an.match_id);
          if (!v) return;
          if (v.videoUrl) {
            an.video_type = v.videoType;
            an.video_url = v.videoUrl;
            an.video_source_name = v.videoSourceName;
          }
          if (v.p1VideoStartSeconds != null) an.p1_video_start_time = v.p1VideoStartSeconds;
          if (v.p2VideoStartSeconds != null) an.p2_video_start_time = v.p2VideoStartSeconds;
          if (v.periodAdjustments) an.period_adjustments = v.periodAdjustments;
        });
      }
    } catch (videoErr) {
      console.warn('Non-blocking warning overlaying analysis_videos:', videoErr);
    }

    return { analyses, deletedMatchIds };
  } catch (err: any) {
    console.warn('Could not load match_analyses from Supabase:', err.message);
    return null;
  }
}

export async function fetchAnalysesFromSupabase(matchId?: string): Promise<MatchAnalysis[] | null> {
  const result = await fetchAnalysesAndTombstonesFromSupabase(matchId);
  return result ? result.analyses : null;
}

// Guards against out-of-order concurrent saves for the same match: several callers
// fire this fire-and-forget in parallel, and a slower call finishing after a newer
// one would overwrite fresh data (e.g. a just-edited period offset) with stale data.
const _analysisSaveSeq: Record<string, number> = {};

// Save/Upsert a Match Analysis to Supabase
export async function saveAnalysisToSupabase(
  analysis: MatchAnalysis,
  options?: { skipEventsTableSync?: boolean; explicitClear?: boolean; allowResurrect?: boolean }
): Promise<boolean> {
  if (!analysis || !analysis.id || !analysis.match_id) return false;

  const mySeq = (_analysisSaveSeq[analysis.match_id] || 0) + 1;
  _analysisSaveSeq[analysis.match_id] = mySeq;
  // While a live session is open here the lineups come from its lineup-change events: don't push them (see live-lineups).
  const lineupLocked = isLiveLineupLocked(analysis.match_id);

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const targetId = analysis.id && analysis.id.startsWith('analysis_') ? analysis.id : `analysis_${analysis.match_id}`;

    // "A Fuego" protection: query existing match_analyses/matches AND the single-source-of-truth
    // analysis_videos table so existing video and period start times are never overwritten with
    // null/empty values. analysis_videos wins over the legacy tables when it has a value.
    let existingAn: any = null;
    let existingMatch: any = null;
    let existingVideo: Awaited<ReturnType<typeof getAnalysisVideoFromSupabase>> = null;
    try {
      const { data: exA } = await selectWithFallback(
        (cols) => supabase.from('match_analyses').select(cols).or(`id.eq.${targetId},match_id.eq.${analysis.match_id}`),
        ANALYSIS_PRESERVE_COLUMNS
      );
      if (exA && exA.length > 0) existingAn = exA[0];

      const { data: exM } = await selectWithFallback(
        (cols) => supabase.from('matches').select(cols).eq('id', analysis.match_id),
        MATCH_PRESERVE_COLUMNS
      );
      if (exM && exM.length > 0) existingMatch = exM[0];

      existingVideo = await getAnalysisVideoFromSupabase(analysis.match_id);
    } catch (err) {
      console.warn('Could not query existing analysis/match for video preservation:', err);
    }



    const resolvedVideoUrl = (analysis.video_url && analysis.video_url.trim()) || existingVideo?.videoUrl || existingAn?.video_url || existingMatch?.video_url || null;
    const resolvedVideoType = analysis.video_type || existingVideo?.videoType || existingAn?.video_type || existingMatch?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
    const resolvedVideoSourceName = analysis.video_source_name || existingVideo?.videoSourceName || existingAn?.video_source_name || existingMatch?.video_source_name || null;
    // `undefined` means "field not touched" -> preserve existing value (a fuego).
    // Explicit `null` means the caller intentionally cleared the period start -> persist the clear.
    const resolvedP1 = analysis.p1_video_start_time !== undefined ? analysis.p1_video_start_time : (existingVideo?.p1VideoStartSeconds ?? existingAn?.p1_video_start_time ?? existingMatch?.p1_video_start_time ?? null);
    const resolvedP2 = analysis.p2_video_start_time !== undefined ? analysis.p2_video_start_time : (existingVideo?.p2VideoStartSeconds ?? existingAn?.p2_video_start_time ?? existingMatch?.p2_video_start_time ?? null);
    const resolvedAdjustments = analysis.period_adjustments !== undefined
      ? analysis.period_adjustments
      : (existingVideo?.periodAdjustments ?? existingAn?.period_adjustments ?? existingMatch?.period_adjustments ?? existingAn?.home_lineup?._period_adjustments ?? existingMatch?.home_lineup?._period_adjustments ?? null);
    const resolvedTemplateId = analysis.botonera_template_id || existingAn?.botonera_template_id || existingMatch?.botonera_template_id || null;
    const validHomeLineup = isValidLineup(analysis.home_lineup)
      ? analysis.home_lineup
      : (isValidLineup(existingAn?.home_lineup) ? existingAn.home_lineup : (isValidLineup(existingMatch?.home_lineup) ? existingMatch.home_lineup : null));
    const validAwayLineup = isValidLineup(analysis.away_lineup)
      ? analysis.away_lineup
      : (isValidLineup(existingAn?.away_lineup) ? existingAn.away_lineup : (isValidLineup(existingMatch?.away_lineup) ? existingMatch.away_lineup : null));

    // Dual protection: ensure _period_adjustments is preserved inside home_lineup JSONB as a 100% resilient fallback
    const safeHomeLineup = validHomeLineup
      ? { ...validHomeLineup, ...(resolvedAdjustments ? { _period_adjustments: resolvedAdjustments } : {}) }
      : (resolvedAdjustments ? { _period_adjustments: resolvedAdjustments } : null);
    const safeAwayLineup = validAwayLineup;

    // Events safety: ONLY delete from analysis_events table if explicitClear is intentionally requested by user action
    const isExplicitClear = options?.explicitClear === true;

    let consolidatedEvents: any[] = [];
    if (isExplicitClear) {
      // User explicitly requested to clear all events
      try {
        await supabase.from('analysis_events').delete().eq('match_id', analysis.match_id);
      } catch (clearErr) {
        console.warn('Warning clearing analysis_events table in Supabase:', clearErr);
      }
      consolidatedEvents = [];
    } else if (options?.skipEventsTableSync) {
      // Fast-path: individual events are already maintained in real time via insert/update/deleteAnalysisEventToSupabase
      consolidatedEvents = (analysis.events && Array.isArray(analysis.events))
        ? analysis.events.filter((e: any) => e && e.event_id)
        : [];
    } else {
      const incomingEvents: any[] = (analysis.events && Array.isArray(analysis.events))
        ? analysis.events.filter((e: any) => e && e.event_id)
        : [];
      let tableEvents: any[] = [];
      try {
        const { data: tblEvts } = await supabase
          .from('analysis_events')
          .select('*')
          .eq('match_id', analysis.match_id);
        if (tblEvts && tblEvts.length > 0) {
          tableEvents = tblEvts;
        }
      } catch (tblErr) {
        // Non-blocking
      }

      const eventMap = new Map<string, any>();
      if (tableEvents.length > 0) {
        tableEvents.forEach((r: any) => {
          if (r && r.event_id) {
            const parsedMeta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {});
            const rNorm = {
              event_id: r.event_id,
              source_event_id: r.source_event_id ?? null,
              match_id: r.match_id,
              team_id: r.team_id ?? null,
              team_name: r.team_name ?? null,
              player_id: r.player_id ?? null,
              player_name: r.player_name,
              event_type: r.event_type,
              category: r.category,
              subcategory: r.subcategory ?? null,
              timestamp: r.timestamp ?? null,
              minute: r.minute ?? null,
              second: r.second ?? null,
              duration: r.duration ?? null,
              period: r.period ?? null,
              x: r.x ?? null,
              y: r.y ?? null,
              end_x: r.end_x ?? null,
              end_y: r.end_y ?? null,
              goal_x: r.goal_x ?? parsedMeta?.goal_x ?? null,
              goal_y: r.goal_y ?? parsedMeta?.goal_y ?? null,
              goal_zone: r.goal_zone ?? parsedMeta?.goal_zone ?? null,
              outcome: r.outcome ?? null,
              metadata: parsedMeta,
              source: r.source,
              created_by: r.created_by ?? null,
              created_by_name: r.created_by_name ?? null,
              created_at: r.created_at,
              updated_at: r.updated_at,
            };
            eventMap.set(r.event_id, rNorm);
          }
        });
      }

      // Apply incoming active events
      incomingEvents.forEach((e: any) => {
        if (e && e.event_id) {
          const prev = eventMap.get(e.event_id);
          if (!prev || new Date(e.updated_at || 0).getTime() >= new Date(prev.updated_at || 0).getTime()) {
            eventMap.set(e.event_id, e);
          }
        }
      });

      consolidatedEvents = Array.from(eventMap.values());
    }

    // Cleanly combine analyst names
    const rawAnalystList = [existingAn?.analyst_name, analysis.analyst_name].filter(Boolean);
    const combinedAnalystNames = Array.from(
      new Set(
        rawAnalystList
          .flatMap((n: string) => n.split(','))
          .map((n: string) => n.trim())
          .filter(Boolean)
      )
    ).join(', ') || analysis.analyst_name || 'Analista SAO';

    const cleanFinalEvents = consolidatedEvents.filter((e: any) => e && e.event_id);

    const row: Record<string, any> = {
      id: targetId,
      match_id: analysis.match_id,
      title: analysis.title,
      analyst_name: combinedAnalystNames,
      status: analysis.status || 'completed',
      video_type: resolvedVideoType,
      video_url: resolvedVideoUrl,
      video_source_name: resolvedVideoSourceName,
      p1_video_start_time: resolvedP1,
      p2_video_start_time: resolvedP2,
      period_adjustments: resolvedAdjustments,
      botonera_template_id: resolvedTemplateId,
      home_lineup: safeHomeLineup,
      away_lineup: safeAwayLineup,
      events: cleanFinalEvents,
      updated_at: new Date().toISOString(),
    };
    if (lineupLocked) {
      delete row.home_lineup;
      delete row.away_lineup;
    }

    // Ensure analysis_events table in Supabase has every event saved row-by-row
    if (!options?.skipEventsTableSync && cleanFinalEvents.length > 0) {
      const rowsToUpsert = cleanFinalEvents.map((e: any) => {
        const metaWithGoal = {
          ...(e.metadata || {}),
          goal_x: e.goal_x ?? e.metadata?.goal_x ?? null,
          goal_y: e.goal_y ?? e.metadata?.goal_y ?? null,
          goal_zone: e.goal_zone ?? e.metadata?.goal_zone ?? null,
        };

        return {
          event_id: e.event_id,
          match_id: analysis.match_id,
          source_event_id: e.source_event_id ?? null,
          team_id: e.team_id ?? null,
          team_name: e.team_name ?? null,
          player_id: e.player_id ?? null,
          player_name: e.player_name,
          event_type: e.event_type || e.category || 'Evento',
          category: e.category || null,
          subcategory: e.subcategory ?? null,
          timestamp: e.timestamp ?? null,
          minute: e.minute ?? null,
          second: e.second ?? null,
          duration: e.duration ?? null,
          period: e.period ?? null,
          x: e.x ?? null,
          y: e.y ?? null,
          end_x: e.end_x ?? null,
          end_y: e.end_y ?? null,
          outcome: e.outcome ?? null,
          metadata: metaWithGoal,
          source: e.source || 'manual',
          created_by: e.created_by ?? null,
          created_by_name: e.created_by_name ?? null,
          created_at: e.created_at || new Date().toISOString(),
          updated_at: e.updated_at || new Date().toISOString(),
        };
      });

      for (let i = 0; i < rowsToUpsert.length; i += 50) {
        try {
          const { error: batchErr } = await supabase
            .from('analysis_events')
            .upsert(rowsToUpsert.slice(i, i + 50), { onConflict: 'event_id' });
          if (batchErr) {
            console.warn('Warning upserting analysis_events batch:', batchErr.message);
          }
        } catch (eventUpsertErr) {
          console.warn('Non-blocking error upserting analysis_events batch:', eventUpsertErr);
        }
      }
    }

    // A newer save for this same match started while we were reading/resolving above:
    // abandon this write so it can't land after (and overwrite) the newer one with stale data.
    if (_analysisSaveSeq[analysis.match_id] !== mySeq) {
      return true;
    }

    let { error } = await supabase
      .from('match_analyses')
      .upsert([row], { onConflict: 'match_id' });

    if (error && error.message.includes('onConflict')) {
      ({ error } = await supabase.from('match_analyses').upsert([row], { onConflict: 'id' }));
    }

    if (error && /Could not find the '.+' column/.test(error.message)) {
      console.warn(
        `La tabla 'match_analyses' de Supabase no tiene todas las columnas requeridas (${error.message}). ` +
        'Guardando con fallback de columnas mientras se aplica supabase/migrations/0014_add_period_adjustments.sql.'
      );
      const fallbackRow = { ...row };
      if (error.message.includes('period_adjustments')) delete fallbackRow.period_adjustments;
      if (error.message.includes('home_lineup')) delete fallbackRow.home_lineup;
      if (error.message.includes('away_lineup')) delete fallbackRow.away_lineup;
      ({ error } = await supabase.from('match_analyses').upsert([fallbackRow], { onConflict: 'match_id' }));
      if (error) {
        ({ error } = await supabase.from('match_analyses').upsert([fallbackRow], { onConflict: 'id' }));
      }
    }

    // Also synchronize video & period offset data to the associated match in Supabase
    if (resolvedVideoUrl || resolvedP1 != null || resolvedP2 != null || resolvedAdjustments != null) {
      try {
        const matchUpdatePayload: Record<string, any> = {
          video_url: resolvedVideoUrl,
          video_type: resolvedVideoType,
          video_source_name: resolvedVideoSourceName,
          p1_video_start_time: resolvedP1,
          p2_video_start_time: resolvedP2,
          period_adjustments: resolvedAdjustments,
          botonera_template_id: resolvedTemplateId,
          home_lineup: safeHomeLineup,
          away_lineup: safeAwayLineup,
          updated_at: new Date().toISOString(),
        };
        // Skip the write when the match already holds these exact values: a no-op update
        // would still broadcast via Realtime and make every open client re-sync.
        if (!isNoOpUpdate(existingMatch, matchUpdatePayload)) {
          let { error: mUpdateErr } = await supabase
            .from('matches')
            .update(matchUpdatePayload)
            .eq('id', analysis.match_id);

          if (mUpdateErr && mUpdateErr.message.includes('period_adjustments')) {
            delete matchUpdatePayload.period_adjustments;
            await supabase.from('matches').update(matchUpdatePayload).eq('id', analysis.match_id);
          }
        }
      } catch (syncErr) {
        console.warn('Could not sync video settings to matches table in Supabase:', syncErr);
      }
    }

    // Write the resolved video/timing config to the single-source-of-truth table too,
    // so every analysis ends up readable from one consistent place regardless of which
    // legacy table this particular save happened to touch.
    if (resolvedVideoUrl || resolvedP1 != null || resolvedP2 != null || resolvedAdjustments != null) {
      upsertAnalysisVideoToSupabase(
        analysis.match_id,
        {
          videoType: resolvedVideoType,
          videoUrl: resolvedVideoUrl,
          videoSourceName: resolvedVideoSourceName,
          p1VideoStartSeconds: resolvedP1,
          p2VideoStartSeconds: resolvedP2,
          periodAdjustments: resolvedAdjustments,
        }
      ).catch((videoErr) => console.warn('Could not sync analysis_videos table in Supabase:', videoErr));
    }

    if (error) {
      if (!error.message.includes('relation "public.match_analyses" does not exist')) {
        console.error('Error upserting match_analysis to Supabase:', error.message);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving match_analysis to Supabase:', err.message);
    return false;
  }
}

// Delete a Match Analysis from Supabase. The row is replaced by a tombstone (status 'deleted')
// instead of disappearing: otherwise any analyst with the match still open (or any stale copy)
// re-created it on its next autosave and the analysis came back a few seconds later.
// `rowOnly` just removes that one row (duplicate cleanup), leaving the match's analysis alone.
export async function deleteAnalysisFromSupabase(
  analysisId: string,
  options?: { matchId?: string; rowOnly?: boolean }
): Promise<boolean> {
  if (!analysisId) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    if (options?.rowOnly) {
      const { error } = await supabase.from('match_analyses').delete().eq('id', analysisId);
      if (error) {
        console.error('Error deleting match_analysis from Supabase:', error.message);
        return false;
      }
      return true;
    }

    const matchId = options?.matchId || (analysisId.startsWith('analysis_') ? analysisId.replace('analysis_', '') : analysisId);

    if (!matchId) {
      const { error } = await supabase.from('match_analyses').delete().eq('id', analysisId);
      if (error) {
        console.error('Error deleting match_analysis from Supabase:', error.message);
        return false;
      }
      return true;
    }

    const now = new Date().toISOString();

    // 1. Delete all existing events for this match in Supabase
    try {
      await supabase.from('analysis_events').delete().eq('match_id', matchId);
    } catch (evErr) {
      console.warn('Non-blocking error deleting analysis_events in Supabase:', evErr);
    }

    // 2. Delete all existing sessions for this match in Supabase
    try {
      await supabase.from('analysis_sessions').delete().eq('match_id', matchId);
    } catch (sessErr) {
      console.warn('Non-blocking error deleting analysis_sessions in Supabase:', sessErr);
    }

    // 3. Delete all video configs for this match in Supabase
    try {
      await supabase.from('analysis_videos').delete().eq('match_id', matchId);
    } catch (vidErr) {
      console.warn('Non-blocking error deleting analysis_videos in Supabase:', vidErr);
    }

    // 4. Reset event_count and video fields on matches table in Supabase
    try {
      await supabase.from('matches').update({
        event_count: 0,
        p1_video_start_time: null,
        p2_video_start_time: null,
        period_adjustments: null,
        video_url: null,
        video_type: null,
        video_source_name: null,
        updated_at: now,
      }).eq('id', matchId);
    } catch (mErr) {
      console.warn('Non-blocking error updating matches table in Supabase:', mErr);
    }

    // 5. Delete all old analysis rows for this match or ID
    try {
      await supabase.from('match_analyses').delete().or(`match_id.eq.${matchId},id.eq.${analysisId}`);
    } catch (delErr) {
      console.warn('Non-blocking error deleting match_analyses rows in Supabase:', delErr);
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting match_analysis from Supabase:', err.message);
    return false;
  }
}
