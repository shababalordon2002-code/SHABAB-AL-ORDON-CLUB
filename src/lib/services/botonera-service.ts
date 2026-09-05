import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { BotoneraTemplate, ActiveBotoneraSession } from '@/types';

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

    const row = {
      match_id: session.selectedMatchId,
      period: session.period,
      timer_seconds: session.timerSeconds,
      is_timer_running: session.isTimerRunning,
      start_timestamp: session.startTimestamp,
      last_updated_timestamp: session.lastUpdatedTimestamp || Date.now(),
      events: session.events || [],
      is_configured: session.isConfigured ?? true,
      video_type: session.videoType || null,
      video_source_name: session.videoSourceName || null,
      video_url: session.videoUrl || null,
      p1_video_start_seconds: session.p1VideoStartSeconds ?? null,
      p2_video_start_seconds: session.p2VideoStartSeconds ?? null,
      botonera_template_id: session.botoneraTemplateId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('analysis_sessions')
      .upsert([row], { onConflict: 'match_id' });

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
