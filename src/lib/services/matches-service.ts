import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { Match, TeamLineupConfig } from '@/types';
import { isLiveLineupLocked, isValidLineup } from '@/lib/live-lineups';
import { isMatchOnOrAfterSept2026 } from '@/lib/utils/date-utils';
import { getAnalysisVideosMapFromSupabase, upsertAnalysisVideoToSupabase } from './botonera-service';

// Fetch matches from Supabase 'matches' table
export async function getMatchesFromSupabase(): Promise<Match[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Supabase fetch matches error:', error.message);
      return [];
    }

    const rawList = (data || []).map((row: any) => {
      const parsedHome = typeof row.home_lineup === 'string' ? JSON.parse(row.home_lineup) : (row.home_lineup || null);
      const parsedAway = typeof row.away_lineup === 'string' ? JSON.parse(row.away_lineup) : (row.away_lineup || null);
      const periodAdj = typeof row.period_adjustments === 'string'
        ? JSON.parse(row.period_adjustments)
        : (row.period_adjustments || parsedHome?._period_adjustments || null);

      return {
        ...row,
        home_lineup: isValidLineup(parsedHome) ? parsedHome : null,
        away_lineup: isValidLineup(parsedAway) ? parsedAway : null,
        period_adjustments: periodAdj,
      };
    }) as Match[];

    const filtered = rawList.filter(m => isMatchOnOrAfterSept2026(m.date));

    // Overlay single-source-of-truth from analysis_videos if available
    try {
      const videoMap = await getAnalysisVideosMapFromSupabase();
      if (videoMap && videoMap.size > 0) {
        filtered.forEach((m) => {
          const v = videoMap.get(m.id);
          if (v) {
            if (v.videoUrl) {
              m.video_url = v.videoUrl;
              m.video_type = v.videoType;
              m.video_source_name = v.videoSourceName;
            }
            if (v.p1VideoStartSeconds != null) m.p1_video_start_time = v.p1VideoStartSeconds;
            if (v.p2VideoStartSeconds != null) m.p2_video_start_time = v.p2VideoStartSeconds;
            if (v.periodAdjustments) m.period_adjustments = v.periodAdjustments;
          }
        });
      }
    } catch {
      // Non-blocking fallback
    }

    return filtered;
  } catch (err: any) {
    console.warn('Could not load matches from Supabase:', err.message);
    return [];
  }
}

// Columnas opcionales/recientes del partido (vídeo, sincronización y alineaciones)
// Viven en las migraciones 0001, 0009 y 0014; mientras no estén aplicadas,
// PostgREST responde "Could not find the 'X' column" y guardamos el
// resto del partido sin ellas en lugar de perder el upsert entero.
const OPTIONAL_MATCH_COLUMNS = [
  'video_type',
  'video_url',
  'video_source_name',
  'p1_video_start_time',
  'p2_video_start_time',
  'period_adjustments',
  'botonera_template_id',
  'home_lineup',
  'away_lineup',
] as const;

// Guards against out-of-order concurrent saves for the same match: several callers
// fire this fire-and-forget in parallel, and a slower call finishing after a newer
// one would overwrite fresh data (e.g. a just-edited period offset) with stale data.
const _matchSaveSeq: Record<string, number> = {};

// Upsert matches into Supabase 'matches' table
export async function saveMatchesToSupabase(matches: Match[]): Promise<boolean> {
  const filteredMatches = (matches || []).filter(m => isMatchOnOrAfterSept2026(m.date));
  if (filteredMatches.length === 0) return true;
  matches = filteredMatches;

  // Checked before any await: matches whose lineups are driven by an open live session
  // (see live-lineups) are saved without their lineup columns.
  const lineupLockedIds = new Set(matches.filter((m) => isLiveLineupLocked(m.id)).map((m) => m.id));

  const mySeqs = new Map<string, number>();
  matches.forEach((m) => {
    const seq = (_matchSaveSeq[m.id] || 0) + 1;
    _matchSaveSeq[m.id] = seq;
    mySeqs.set(m.id, seq);
  });

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    // "A Fuego" protection: fetch existing matches and analyses to ensure existing
    // video_url, video_type, video_source_name, p1_video_start_time, p2_video_start_time, period_adjustments
    // are never overwritten with null/empty values by scrapers, crons or partial updates.
    const matchIds = matches.map((m) => m.id);
    let existingMap = new Map<string, any>();
    let analysisMap = new Map<string, any>();

    try {
      const { data: exMatches } = await supabase
        .from('matches')
        .select('*')
        .in('id', matchIds);
      if (exMatches) {
        exMatches.forEach((row: any) => existingMap.set(row.id, row));
      }

      const { data: exAnalyses } = await supabase
        .from('match_analyses')
        .select('*')
        .in('match_id', matchIds);
      if (exAnalyses) {
        exAnalyses.forEach((row: any) => analysisMap.set(row.match_id, row));
      }
    } catch (err) {
      console.warn('Could not query existing matches/analyses for video preservation:', err);
    }

    const rows = matches.map(m => {
      const ex = existingMap.get(m.id);
      const an = analysisMap.get(m.id);

      const resolvedVideoUrl = (m.video_url && m.video_url.trim()) || ex?.video_url || an?.video_url || null;
      const resolvedVideoType = m.video_type || ex?.video_type || an?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
      const resolvedVideoSourceName = m.video_source_name || ex?.video_source_name || an?.video_source_name || null;
      // `undefined` means "field not touched" -> preserve existing value (a fuego).
      // Explicit `null` means the caller intentionally cleared the period start -> persist the clear.
      const resolvedP1 = m.p1_video_start_time !== undefined ? m.p1_video_start_time : (ex?.p1_video_start_time ?? an?.p1_video_start_time ?? null);
      const resolvedP2 = m.p2_video_start_time !== undefined ? m.p2_video_start_time : (ex?.p2_video_start_time ?? an?.p2_video_start_time ?? null);
      const resolvedAdjustments = m.period_adjustments !== undefined
        ? m.period_adjustments
        : (ex?.period_adjustments ?? an?.period_adjustments ?? ex?.home_lineup?._period_adjustments ?? an?.home_lineup?._period_adjustments ?? null);
      const resolvedTemplateId = m.botonera_template_id || ex?.botonera_template_id || an?.botonera_template_id || null;
      const validHomeLineup = isValidLineup(m.home_lineup)
        ? m.home_lineup
        : (isValidLineup(ex?.home_lineup) ? ex.home_lineup : (isValidLineup(an?.home_lineup) ? an.home_lineup : null));
      const validAwayLineup = isValidLineup(m.away_lineup)
        ? m.away_lineup
        : (isValidLineup(ex?.away_lineup) ? ex.away_lineup : (isValidLineup(an?.away_lineup) ? an.away_lineup : null));

      // Ensure _period_adjustments is preserved inside home_lineup as robust fallback
      const safeHomeLineup = validHomeLineup
        ? { ...validHomeLineup, ...(resolvedAdjustments ? { _period_adjustments: resolvedAdjustments } : {}) }
        : (resolvedAdjustments ? { _period_adjustments: resolvedAdjustments } : null);

      return {
        id: m.id,
        date: m.date,
        time: m.time || '17:00',
        competition: m.competition || 'Jordan Pro League',
        round: m.round || '',
        season: m.season || '2026/2027',
        home_team: m.home_team,
        home_team_logo: m.home_team_logo || null,
        away_team: m.away_team,
        away_team_logo: m.away_team_logo || null,
        home_score: m.home_score ?? (ex?.home_score ?? 0),
        away_score: m.away_score ?? (ex?.away_score ?? 0),
        status: m.status || (ex?.status ?? 'Programado'),
        event_count: m.event_count || (ex?.event_count ?? 0),
        import_status: m.import_status || (ex?.import_status ?? 'Pendiente'),
        flashscore_url: m.flashscore_url || null,
        flashscore_mid: m.flashscore_mid || null,
        video_type: resolvedVideoType,
        video_url: resolvedVideoUrl,
        video_source_name: resolvedVideoSourceName,
        p1_video_start_time: resolvedP1,
        p2_video_start_time: resolvedP2,
        period_adjustments: resolvedAdjustments,
        botonera_template_id: resolvedTemplateId,
        home_lineup: safeHomeLineup,
        away_lineup: validAwayLineup,
        updated_at: new Date().toISOString()
      };
    });

    // Drop rows for which a newer save started while we were reading/resolving above,
    // so this slower call can't land after (and overwrite) the newer one with stale data.
    const freshRows = rows.filter((row) => _matchSaveSeq[row.id] === mySeqs.get(row.id));
    if (freshRows.length === 0) return true;

    const upsertMatchRows = async (batch: Record<string, any>[]) => {
      if (batch.length === 0) return null;
      let { error } = await supabase
        .from('matches')
        .upsert(batch, { onConflict: 'id' });

      // Esquema antiguo sin las columnas de vídeo/botonera/alineaciones → reintento sin ellas
      if (error && /Could not find the '.+' column/.test(error.message)) {
        console.warn(
          `La tabla 'matches' de Supabase no tiene las columnas requeridas (${error.message}). ` +
          'Ejecuta supabase/migrations/0009_add_lineups_to_matches_and_analyses.sql en el SQL Editor. ' +
          'Mientras tanto se guarda el partido omitiendo las columnas no encontradas.'
        );

        const strippedRows = batch.map((row) => {
          const copy: Record<string, any> = { ...row };
          OPTIONAL_MATCH_COLUMNS.forEach((col) => delete copy[col]);
          return copy;
        });

        ({ error } = await supabase.from('matches').upsert(strippedRows, { onConflict: 'id' }));
      }
      return error;
    };

    // Rows without lineups go in their own upsert: in a mixed batch PostgREST would write
    // the missing columns as NULL instead of leaving them untouched.
    const lockedRows = freshRows
      .filter((row) => lineupLockedIds.has(row.id))
      .map((row) => {
        const copy: Record<string, any> = { ...row };
        delete copy.home_lineup;
        delete copy.away_lineup;
        return copy;
      });
    const error =
      (await upsertMatchRows(freshRows.filter((row) => !lineupLockedIds.has(row.id)))) ||
      (await upsertMatchRows(lockedRows));

    if (error) {
      console.error('Error upserting matches to Supabase:', error.message);
      return false;
    }

    // Sync video and timings to analysis_videos table as well
    freshRows.forEach((row) => {
      if (row.video_url || row.p1_video_start_time != null || row.p2_video_start_time != null || row.period_adjustments != null) {
        upsertAnalysisVideoToSupabase(row.id, {
          videoType: row.video_type,
          videoUrl: row.video_url,
          videoSourceName: row.video_source_name,
          p1VideoStartSeconds: row.p1_video_start_time,
          p2VideoStartSeconds: row.p2_video_start_time,
          periodAdjustments: row.period_adjustments,
        }).catch(() => {});
      }
    });

    return true;
  } catch (err: any) {
    console.error('Error saving matches to Supabase:', err.message);
    return false;
  }
}

// Delete match from Supabase 'matches' table
export async function deleteMatchFromSupabase(matchId: string): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      console.error('Error deleting match from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting match from Supabase:', err.message);
    return false;
  }
}

// Saves only the given teams' lineups (the ones an analyst touched in a live session) to
// matches and match_analyses, leaving the other team as it is. Keys starting with "_" stored
// inside home_lineup (period adjustments / analyst fallbacks) are kept.
export async function saveTeamLineupsToSupabase(
  matchId: string,
  lineups: { home_lineup?: TeamLineupConfig | null; away_lineup?: TeamLineupConfig | null }
): Promise<boolean> {
  const keys = (['home_lineup', 'away_lineup'] as const).filter((k) => k in lineups);
  if (!matchId || keys.length === 0) return true;
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const metaOf = (prev: any) =>
      prev && typeof prev === 'object'
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k.startsWith('_')))
        : {};

    let ok = true;
    for (const [table, idColumn] of [['matches', 'id'], ['match_analyses', 'match_id']] as const) {
      const { data: rows } = await supabase.from(table).select(`${idColumn}, home_lineup, away_lineup`).eq(idColumn, matchId);
      const existing = rows && rows.length > 0 ? rows[0] : null;
      if (!existing) continue;
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      keys.forEach((k) => {
        const lineup = lineups[k];
        payload[k] = lineup ? { ...metaOf(existing[k]), ...lineup } : (Object.keys(metaOf(existing[k])).length > 0 ? metaOf(existing[k]) : null);
      });
      const { error } = await supabase.from(table).update(payload).eq(idColumn, matchId);
      if (error) {
        console.warn(`Could not save team lineups to ${table}:`, error.message);
        ok = false;
      }
    }
    return ok;
  } catch (err: any) {
    console.warn('Could not save team lineups to Supabase:', err?.message || err);
    return false;
  }
}
