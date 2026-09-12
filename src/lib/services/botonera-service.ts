import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { BotoneraTemplate, ActiveBotoneraSession, NormalizedEvent } from '@/types';

// ==================== BOTONERA TEMPLATES IN SUPABASE ====================

// Fetch all Botonera templates from Supabase 'botonera_templates' table
export async function getBotoneraTemplatesFromSupabase(): Promise<BotoneraTemplate[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('botonera_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (!error.message.includes('relation "public.botonera_templates" does not exist')) {
        console.warn('Supabase fetch botonera_templates error:', error.message);
      }
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      isDefault: row.is_default || false,
      gridCols: row.grid_cols || 4,
      buttons: typeof row.buttons === 'string' ? JSON.parse(row.buttons) : (row.buttons || []),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err: any) {
    console.warn('Could not load botonera templates from Supabase:', err.message);
    return [];
  }
}

// Save/Upsert a Botonera template to Supabase 'botonera_templates' table
export async function saveBotoneraTemplateToSupabase(template: BotoneraTemplate): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const row = {
      id: template.id,
      name: template.name,
      description: template.description || '',
      is_default: template.isDefault || false,
      grid_cols: template.gridCols || 4,
      buttons: template.buttons,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('botonera_templates')
      .upsert([row], { onConflict: 'id' });

    if (error) {
      console.error('Error upserting botonera_template to Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving botonera_template to Supabase:', err.message);
    return false;
  }
}

// Delete a Botonera template from Supabase 'botonera_templates' table
export async function deleteBotoneraTemplateFromSupabase(templateId: string): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase
      .from('botonera_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting botonera_template from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting botonera_template from Supabase:', err.message);
    return false;
  }
}

// ==================== ONGOING ANALYSIS SESSIONS IN SUPABASE ====================

// Fetch active analysis session for a match (or latest active session) from Supabase
export async function getAnalysisSessionFromSupabase(matchId?: string): Promise<ActiveBotoneraSession | null> {
  try {
    const supabase = createClient();
    let query = supabase.from('analysis_sessions').select('*');

    if (matchId) {
      query = query.eq('match_id', matchId);
    } else {
      query = query.order('updated_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (error && !error.message.includes('relation "public.analysis_sessions" does not exist')) {
        console.warn('Supabase fetch analysis_sessions warning:', error.message);
      }
      return null;
    }

    const row = data[0];
    return {
      selectedMatchId: row.match_id,
      period: row.period || 1,
      timerSeconds: row.timer_seconds || 0,
      isTimerRunning: row.is_timer_running || false,
      startTimestamp: row.start_timestamp ? Number(row.start_timestamp) : null,
      lastUpdatedTimestamp: row.last_updated_timestamp ? Number(row.last_updated_timestamp) : Date.now(),
      events: typeof row.events === 'string' ? JSON.parse(row.events) : (row.events || []),
      isConfigured: row.is_configured ?? true,
      videoType: row.video_type || null,
      videoSourceName: row.video_source_name || null,
      videoUrl: row.video_url || null,
      p1VideoStartSeconds: row.p1_video_start_seconds ?? null,
      p2VideoStartSeconds: row.p2_video_start_seconds ?? null,
      botoneraTemplateId: row.botonera_template_id || null,
      home_lineup: typeof row.home_lineup === 'string' ? JSON.parse(row.home_lineup) : (row.home_lineup || null),
      away_lineup: typeof row.away_lineup === 'string' ? JSON.parse(row.away_lineup) : (row.away_lineup || null),
    };
  } catch (err: any) {
    console.warn('Could not fetch analysis session from Supabase:', err.message);
    return null;
  }
}

// Fetch all active analysis sessions from Supabase (to display "Análisis en marcha" status across matches)
export async function getAllActiveSessionsFromSupabase(): Promise<Record<string, ActiveBotoneraSession>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) return {};

    const result: Record<string, ActiveBotoneraSession> = {};
    for (const row of data) {
      result[row.match_id] = {
        selectedMatchId: row.match_id,
        period: row.period || 1,
        timerSeconds: row.timer_seconds || 0,
        isTimerRunning: row.is_timer_running || false,
        startTimestamp: row.start_timestamp ? Number(row.start_timestamp) : null,
        lastUpdatedTimestamp: row.last_updated_timestamp ? Number(row.last_updated_timestamp) : Date.now(),
        events: typeof row.events === 'string' ? JSON.parse(row.events) : (row.events || []),
        isConfigured: row.is_configured ?? true,
        videoType: row.video_type || null,
        videoSourceName: row.video_source_name || null,
        videoUrl: row.video_url || null,
        p1VideoStartSeconds: row.p1_video_start_seconds ?? null,
        p2VideoStartSeconds: row.p2_video_start_seconds ?? null,
        botoneraTemplateId: row.botonera_template_id || null,
        home_lineup: typeof row.home_lineup === 'string' ? JSON.parse(row.home_lineup) : (row.home_lineup || null),
        away_lineup: typeof row.away_lineup === 'string' ? JSON.parse(row.away_lineup) : (row.away_lineup || null),
      };
    }
    return result;
  } catch (err: any) {
    return {};
  }
}

// Save/Upsert Active Analysis Session to Supabase
export async function saveAnalysisSessionToSupabase(session: ActiveBotoneraSession): Promise<boolean> {
  if (!session || !session.selectedMatchId) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    // "A Fuego" protection: fetch existing session and match in Supabase so empty/null values
    // do not wipe existing video_url or period offsets.
    let existingSess: any = null;
    let existingMatch: any = null;
    try {
      const { data: exS } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('match_id', session.selectedMatchId);
      if (exS && exS.length > 0) existingSess = exS[0];

      const { data: exM } = await supabase
        .from('matches')
        .select('*')
        .eq('id', session.selectedMatchId);
      if (exM && exM.length > 0) existingMatch = exM[0];
    } catch (err) {
      console.warn('Could not query existing session/match for video preservation:', err);
    }

    const resolvedVideoUrl = (session.videoUrl && session.videoUrl.trim()) || existingSess?.video_url || existingMatch?.video_url || null;
    const resolvedVideoType = session.videoType || existingSess?.video_type || existingMatch?.video_type || (resolvedVideoUrl ? (resolvedVideoUrl.includes('http') ? 'link' : 'local') : null);
    const resolvedVideoSourceName = session.videoSourceName || existingSess?.video_source_name || existingMatch?.video_source_name || null;
    const resolvedP1 = session.p1VideoStartSeconds != null ? session.p1VideoStartSeconds : (existingSess?.p1_video_start_seconds ?? existingMatch?.p1_video_start_time ?? null);
    const resolvedP2 = session.p2VideoStartSeconds != null ? session.p2VideoStartSeconds : (existingSess?.p2_video_start_seconds ?? existingMatch?.p2_video_start_time ?? null);
    const resolvedTemplateId = session.botoneraTemplateId || existingSess?.botonera_template_id || existingMatch?.botonera_template_id || null;
    const resolvedHomeLineup = session.home_lineup || existingSess?.home_lineup || existingMatch?.home_lineup || null;
    const resolvedAwayLineup = session.away_lineup || existingSess?.away_lineup || existingMatch?.away_lineup || null;

    const row: Record<string, any> = {
      match_id: session.selectedMatchId,
      period: session.period,
      timer_seconds: session.timerSeconds,
      is_timer_running: session.isTimerRunning,
      start_timestamp: session.startTimestamp,
      last_updated_timestamp: session.lastUpdatedTimestamp || Date.now(),
      events: session.events || [],
      is_configured: session.isConfigured ?? true,
      video_type: resolvedVideoType,
      video_source_name: resolvedVideoSourceName,
      video_url: resolvedVideoUrl,
      p1_video_start_seconds: resolvedP1,
      p2_video_start_seconds: resolvedP2,
      botonera_template_id: resolvedTemplateId,
      home_lineup: resolvedHomeLineup,
      away_lineup: resolvedAwayLineup,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('analysis_sessions')
      .upsert([row], { onConflict: 'match_id' });

    if (error && /Could not find the '.+' column/.test(error.message)) {
      console.warn(
        `La tabla 'analysis_sessions' de Supabase no tiene las columnas de alineación (${error.message}). ` +
        'Ejecuta supabase/migrations/0009_add_lineups_to_matches_and_analyses.sql en el SQL Editor.'
      );
      const fallbackRow = { ...row };
      delete fallbackRow.home_lineup;
      delete fallbackRow.away_lineup;
      ({ error } = await supabase.from('analysis_sessions').upsert([fallbackRow], { onConflict: 'match_id' }));
    }

    // Also update matches table in Supabase so match records permanently hold video & offset
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
          .eq('id', session.selectedMatchId);
      } catch (mErr) {
        console.warn('Could not sync session video settings to matches table in Supabase:', mErr);
      }
    }

    if (error) {
      if (!error.message.includes('relation "public.analysis_sessions" does not exist')) {
        console.error('Error upserting analysis session to Supabase:', error.message);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving analysis session to Supabase:', err.message);
    return false;
  }
}

// ==================== ANALYSIS EVENTS (collaborative live tagging) IN SUPABASE ====================
// One row per event (instead of a single overwritten jsonb array) so multiple analysts can
// register events on the same match at the same time without clobbering each other's work.

export function rowToNormalizedEvent(row: any): NormalizedEvent {
  try {
    const metaObj = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
    return {
      event_id: row.event_id,
      source_event_id: row.source_event_id ?? null,
      match_id: row.match_id,
      team_id: row.team_id ?? null,
      team_name: row.team_name ?? null,
      player_id: row.player_id ?? null,
      player_name: row.player_name,
      event_type: row.event_type,
      category: row.category,
      subcategory: row.subcategory ?? null,
      timestamp: row.timestamp ?? null,
      minute: row.minute ?? null,
      second: row.second ?? null,
      duration: row.duration ?? null,
      period: row.period ?? null,
      x: row.x ?? null,
      y: row.y ?? null,
      end_x: row.end_x ?? null,
      end_y: row.end_y ?? null,
      goal_x: row.goal_x ?? metaObj.goal_x ?? null,
      goal_y: row.goal_y ?? metaObj.goal_y ?? null,
      goal_zone: row.goal_zone ?? metaObj.goal_zone ?? null,
      outcome: row.outcome ?? null,
      metadata: metaObj,
      source: row.source,
      created_by: row.created_by ?? null,
      created_by_name: row.created_by_name ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch {
    return null as any;
  }
}

export function normalizedEventToRow(matchId: string, event: NormalizedEvent) {
  const meta = {
    ...(event.metadata || {}),
    goal_x: event.goal_x ?? event.metadata?.goal_x ?? null,
    goal_y: event.goal_y ?? event.metadata?.goal_y ?? null,
    goal_zone: event.goal_zone ?? event.metadata?.goal_zone ?? null,
  };

  return {
    event_id: event.event_id,
    match_id: matchId,
    source_event_id: event.source_event_id ?? null,
    team_id: event.team_id ?? null,
    team_name: event.team_name ?? null,
    player_id: event.player_id ?? null,
    player_name: event.player_name,
    event_type: event.event_type,
    category: event.category,
    subcategory: event.subcategory ?? null,
    timestamp: event.timestamp ?? null,
    minute: event.minute ?? null,
    second: event.second ?? null,
    duration: event.duration ?? null,
    period: event.period ?? null,
    x: event.x ?? null,
    y: event.y ?? null,
    end_x: event.end_x ?? null,
    end_y: event.end_y ?? null,
    outcome: event.outcome ?? null,
    metadata: meta,
    source: event.source,
    created_by: event.created_by ?? null,
    created_by_name: event.created_by_name ?? null,
    updated_at: new Date().toISOString(),
  };
}

// Fetch all live events registered so far for a match
export async function getAnalysisEventsFromSupabase(matchId: string): Promise<NormalizedEvent[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('analysis_events')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) {
      if (!error.message.includes('relation "public.analysis_events" does not exist')) {
        console.warn('Supabase fetch analysis_events warning:', error.message);
      }
      return [];
    }

    return (data || []).map(rowToNormalizedEvent);
  } catch (err: any) {
    console.warn('Could not fetch analysis events from Supabase:', err.message);
    return [];
  }
}

// Insert a single new event (does NOT overwrite other analysts' events)
export async function insertAnalysisEventToSupabase(matchId: string, event: NormalizedEvent): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }
    const row = { ...normalizedEventToRow(matchId, event), created_at: event.created_at || new Date().toISOString() };

    const { error } = await supabase.from('analysis_events').insert([row]);
    if (error) {
      console.error('Error inserting analysis_event to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error inserting analysis_event to Supabase:', err.message);
    return false;
  }
}

// Update a single event in place (does NOT touch other analysts' events)
export async function updateAnalysisEventInSupabase(matchId: string, event: NormalizedEvent): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }
    const row = normalizedEventToRow(matchId, event);

    const { error } = await supabase
      .from('analysis_events')
      .update(row)
      .eq('event_id', event.event_id);

    if (error) {
      console.error('Error updating analysis_event in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error updating analysis_event in Supabase:', err.message);
    return false;
  }
}

// Delete a single event with safety backup (never lost in oblivion)
export async function deleteAnalysisEventFromSupabase(eventId: string, deletedByName?: string): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    // Safety backup to analysis_events_trash before deleting
    try {
      const { data: eventRow } = await supabase
        .from('analysis_events')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (eventRow) {
        await supabase
          .from('analysis_events_trash')
          .insert([{
            event_id: eventId,
            match_id: eventRow.match_id,
            event_data: eventRow,
            deleted_by: deletedByName || eventRow.created_by_name || 'Analista',
            deleted_at: new Date().toISOString()
          }])
          .catch(() => {});
      }
    } catch {
      // Non-blocking
    }

    const { error } = await supabase.from('analysis_events').delete().eq('event_id', eventId);
    if (error) {
      console.error('Error deleting analysis_event from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error deleting analysis_event from Supabase:', err.message);
    return false;
  }
}

// Clear all live events for a match (e.g. once saved into match_analyses, or on full reset)
export async function clearAnalysisEventsFromSupabase(matchId: string): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }
    const { error } = await supabase.from('analysis_events').delete().eq('match_id', matchId);
    if (error) {
      console.error('Error clearing analysis_events from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error clearing analysis_events from Supabase:', err.message);
    return false;
  }
}

// Subscribe to live inserts/updates/deletes of analysis_events for a match.
// Returns an unsubscribe function.
export function subscribeToAnalysisEvents(
  matchId: string,
  handlers: {
    onInsert?: (event: NormalizedEvent) => void;
    onUpdate?: (event: NormalizedEvent) => void;
    onDelete?: (eventId: string) => void;
  }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`analysis_events:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'analysis_events', filter: `match_id=eq.${matchId}` },
      (payload: any) => handlers.onInsert?.(rowToNormalizedEvent(payload.new))
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'analysis_events', filter: `match_id=eq.${matchId}` },
      (payload: any) => handlers.onUpdate?.(rowToNormalizedEvent(payload.new))
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'analysis_events', filter: `match_id=eq.${matchId}` },
      (payload: any) => handlers.onDelete?.(payload.old?.event_id)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Presence: shows which analysts are currently connected to a match's live session
export function subscribeToAnalysisPresence(
  matchId: string,
  presenceInfo: { userId: string; userName: string },
  onSync: (analysts: { userId: string; userName: string }[]) => void
): () => void {
  const supabase = createClient();
  const channel = supabase.channel(`analysis_presence:${matchId}`, {
    config: { presence: { key: presenceInfo.userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ userId: string; userName: string }>();
      const analysts = Object.values(state)
        .map((entries) => entries[0])
        .filter(Boolean)
        .map((e: any) => ({ userId: e.userId, userName: e.userName }));
      onSync(analysts);
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(presenceInfo);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// Delete Active Analysis Session from Supabase (e.g. when completed or reset)
export async function deleteAnalysisSessionFromSupabase(matchId: string): Promise<boolean> {
  if (!matchId) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase
      .from('analysis_sessions')
      .delete()
      .eq('match_id', matchId);

    if (error) {
      return false;
    }

    return true;
  } catch (err: any) {
    return false;
  }
}
