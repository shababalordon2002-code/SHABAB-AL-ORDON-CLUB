import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { MatchAnalysis } from '@/types';

// Fetch all Match Analyses (or filtered by matchId) from Supabase
export async function getAnalysesFromSupabase(matchId?: string): Promise<MatchAnalysis[]> {
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
      }
      return [];
    }

    return (data || []).map((row: any) => ({
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
      botonera_template_id: row.botonera_template_id || null,
      home_lineup: typeof row.home_lineup === 'string' ? JSON.parse(row.home_lineup) : (row.home_lineup || null),
      away_lineup: typeof row.away_lineup === 'string' ? JSON.parse(row.away_lineup) : (row.away_lineup || null),
      events: typeof row.events === 'string' ? JSON.parse(row.events) : (row.events || []),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err: any) {
    console.warn('Could not load match_analyses from Supabase:', err.message);
    return [];
  }
}

// Save/Upsert a Match Analysis to Supabase
export async function saveAnalysisToSupabase(analysis: MatchAnalysis): Promise<boolean> {
  if (!analysis || !analysis.id || !analysis.match_id) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const targetId = analysis.id && analysis.id.startsWith('analysis_') ? analysis.id : `analysis_${analysis.match_id}`;

    // "A Fuego" protection: query existing match_analyses and matches in Supabase so existing video
    // and period start times are never overwritten with null/empty values.
    let existingAn: any = null;
    let existingMatch: any = null;
    try {
      const { data: exA } = await supabase
        .from('match_analyses')
        .select('*')
        .or(`id.eq.${targetId},match_id.eq.${analysis.match_id}`);
      if (exA && exA.length > 0) existingAn = exA[0];

      const { data: exM } = await supabase
        .from('matches')
        .select('*')
        .eq('id', analysis.match_id);
      if (exM && exM.length > 0) existingMatch = exM[0];
    } catch (err) {
      console.warn('Could not query existing analysis/match for video preservation:', err);
    }

    const resolvedVideoUrl = (analysis.video_url && analysis.video_url.trim()) || existingAn?.video_url || existingMatch?.video_url || null;
    const resolvedVideoType = analysis.video_type || existingAn?.video_type || existingMatch?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
    const resolvedVideoSourceName = analysis.video_source_name || existingAn?.video_source_name || existingMatch?.video_source_name || null;
    const resolvedP1 = analysis.p1_video_start_time != null ? analysis.p1_video_start_time : (existingAn?.p1_video_start_time ?? existingMatch?.p1_video_start_time ?? null);
    const resolvedP2 = analysis.p2_video_start_time != null ? analysis.p2_video_start_time : (existingAn?.p2_video_start_time ?? existingMatch?.p2_video_start_time ?? null);
    const resolvedTemplateId = analysis.botonera_template_id || existingAn?.botonera_template_id || existingMatch?.botonera_template_id || null;
    const resolvedHomeLineup = analysis.home_lineup || existingAn?.home_lineup || existingMatch?.home_lineup || null;
    const resolvedAwayLineup = analysis.away_lineup || existingAn?.away_lineup || existingMatch?.away_lineup || null;

    // Collaborative Event Safety: Merge all events from existingAn, analysis_events table, and incoming analysis
    const existingEvents: any[] = (existingAn?.events && Array.isArray(existingAn.events)) ? existingAn.events : [];
    const incomingEvents: any[] = (analysis.events && Array.isArray(analysis.events)) ? analysis.events : [];

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
    existingEvents.forEach((e: any) => {
      if (e && e.event_id) eventMap.set(e.event_id, e);
    });
    tableEvents.forEach((r: any) => {
      if (r && r.event_id) {
        const prev = eventMap.get(r.event_id);
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
        if (!prev || new Date(r.updated_at || 0).getTime() >= new Date(prev.updated_at || 0).getTime()) {
          eventMap.set(r.event_id, rNorm);
        }
      }
    });
    incomingEvents.forEach((e: any) => {
      if (e && e.event_id) {
        const prev = eventMap.get(e.event_id);
        if (!prev || new Date(e.updated_at || 0).getTime() >= new Date(prev.updated_at || 0).getTime()) {
          eventMap.set(e.event_id, e);
        }
      }
    });

    const consolidatedEvents = Array.from(eventMap.values());

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
      botonera_template_id: resolvedTemplateId,
      home_lineup: resolvedHomeLineup,
      away_lineup: resolvedAwayLineup,
      events: consolidatedEvents,
      updated_at: new Date().toISOString(),
    };

    // Ensure analysis_events table in Supabase has every event saved row-by-row
    if (consolidatedEvents.length > 0) {
      const rowsToUpsert = consolidatedEvents.map((e: any) => {
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

    let { error } = await supabase
      .from('match_analyses')
      .upsert([row], { onConflict: 'match_id' });

    if (error && error.message.includes('onConflict')) {
      ({ error } = await supabase.from('match_analyses').upsert([row], { onConflict: 'id' }));
    }

    if (error && /Could not find the '.+' column/.test(error.message)) {
      console.warn(
        `La tabla 'match_analyses' de Supabase no tiene las columnas de alineación (${error.message}). ` +
        'Ejecuta supabase/migrations/0009_add_lineups_to_matches_and_analyses.sql en el SQL Editor.'
      );
      const fallbackRow = { ...row };
      delete fallbackRow.home_lineup;
      delete fallbackRow.away_lineup;
      ({ error } = await supabase.from('match_analyses').upsert([fallbackRow], { onConflict: 'match_id' }));
      if (error) {
        ({ error } = await supabase.from('match_analyses').upsert([fallbackRow], { onConflict: 'id' }));
      }
    }

    // Also synchronize video & period offset data to the associated match in Supabase
    if (resolvedVideoUrl || resolvedP1 != null || resolvedP2 != null) {
      try {
        await supabase
          .from('matches')
          .update({
            video_url: resolvedVideoUrl,
            video_type: resolvedVideoType,
            video_source_name: resolvedVideoSourceName,
            p1_video_start_time: resolvedP1,
            p2_video_start_time: resolvedP2,
            botonera_template_id: resolvedTemplateId,
            home_lineup: resolvedHomeLineup,
            away_lineup: resolvedAwayLineup,
            updated_at: new Date().toISOString(),
          })
          .eq('id', analysis.match_id);
      } catch (syncErr) {
        console.warn('Could not sync video settings to matches table in Supabase:', syncErr);
      }
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

// Delete a Match Analysis from Supabase
export async function deleteAnalysisFromSupabase(analysisId: string): Promise<boolean> {
  if (!analysisId) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase
      .from('match_analyses')
      .delete()
      .eq('id', analysisId);

    if (error) {
      console.error('Error deleting match_analysis from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting match_analysis from Supabase:', err.message);
    return false;
  }
}
