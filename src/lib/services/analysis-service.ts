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

    const row: Record<string, any> = {
      id: analysis.id,
      match_id: analysis.match_id,
      title: analysis.title,
      analyst_name: analysis.analyst_name || 'Analista SAO',
      status: analysis.status || 'completed',
      video_type: analysis.video_type || null,
      video_url: analysis.video_url || null,
      video_source_name: analysis.video_source_name || null,
      p1_video_start_time: analysis.p1_video_start_time ?? null,
      p2_video_start_time: analysis.p2_video_start_time ?? null,
      botonera_template_id: analysis.botonera_template_id || null,
      home_lineup: analysis.home_lineup || null,
      away_lineup: analysis.away_lineup || null,
      events: analysis.events || [],
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('match_analyses')
      .upsert([row], { onConflict: 'id' });

    if (error && /Could not find the '.+' column/.test(error.message)) {
      console.warn(
        `La tabla 'match_analyses' de Supabase no tiene las columnas de alineación (${error.message}). ` +
        'Ejecuta supabase/migrations/0009_add_lineups_to_matches_and_analyses.sql en el SQL Editor.'
      );
      const fallbackRow = { ...row };
      delete fallbackRow.home_lineup;
      delete fallbackRow.away_lineup;
      ({ error } = await supabase.from('match_analyses').upsert([fallbackRow], { onConflict: 'id' }));
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
