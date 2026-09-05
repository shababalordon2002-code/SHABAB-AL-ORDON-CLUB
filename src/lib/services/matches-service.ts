import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { Match } from '@/types';

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

    return (data || []) as Match[];
  } catch (err: any) {
    console.warn('Could not load matches from Supabase:', err.message);
    return [];
  }
}

// Columnas de vídeo / botonera del partido. Viven en la migración
// supabase/migrations/0001_matches_video_sync_columns.sql; mientras no esté
// aplicada, PostgREST responde "Could not find the 'X' column" y guardamos el
// resto del partido sin ellas en lugar de perder el upsert entero.
const OPTIONAL_MATCH_COLUMNS = [
  'video_type',
  'video_url',
  'video_source_name',
  'p1_video_start_time',
  'p2_video_start_time',
  'botonera_template_id',
] as const;

// Upsert matches into Supabase 'matches' table
export async function saveMatchesToSupabase(matches: Match[]): Promise<boolean> {
  if (!matches || matches.length === 0) return true;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const rows = matches.map(m => ({
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
      home_score: m.home_score ?? 0,
      away_score: m.away_score ?? 0,
      status: m.status || 'Programado',
      event_count: m.event_count || 0,
      import_status: m.import_status || 'Pendiente',
      flashscore_url: m.flashscore_url || null,
      flashscore_mid: m.flashscore_mid || null,
      video_type: m.video_type || null,
      video_url: m.video_url || null,
      video_source_name: m.video_source_name || null,
      p1_video_start_time: m.p1_video_start_time ?? null,
      p2_video_start_time: m.p2_video_start_time ?? null,
      botonera_template_id: m.botonera_template_id || null,
      updated_at: new Date().toISOString()
    }));

    let { error } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'id' });

    // Esquema antiguo sin las columnas de vídeo/botonera → reintento sin ellas
    if (error && /Could not find the '.+' column/.test(error.message)) {
      console.warn(
        `La tabla 'matches' de Supabase no tiene las columnas de vídeo/botonera (${error.message}). ` +
        'Ejecuta supabase/migrations/0001_matches_video_sync_columns.sql en el SQL Editor. ' +
        'Mientras tanto se guarda el partido sin la sincronización de vídeo.'
      );

      const strippedRows = rows.map((row) => {
        const copy: Record<string, any> = { ...row };
        OPTIONAL_MATCH_COLUMNS.forEach((col) => delete copy[col]);
        return copy;
      });

      ({ error } = await supabase.from('matches').upsert(strippedRows, { onConflict: 'id' }));
    }

    if (error) {
      console.error('Error upserting matches to Supabase:', error.message);
      return false;
    }

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
