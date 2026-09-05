import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { MatchDashboard } from '@/types';

const MISSING_TABLE = 'relation "public.match_dashboards" does not exist';

function parseJson<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function rowToDashboard(row: any): MatchDashboard {
  return {
    id: row.id,
    match_id: row.match_id,
    analysis_id: row.analysis_id || null,
    name: row.name || 'Dashboard',
    description: row.description || '',
    botonera_template_id: row.botonera_template_id || null,
    cols: row.cols || 12,
    row_height: row.row_height || 40,
    widgets: parseJson(row.widgets, []),
    global_filters: parseJson(row.global_filters, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Fetch dashboards (optionally for a single match) from Supabase
export async function getDashboardsFromSupabase(matchId?: string): Promise<MatchDashboard[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('match_dashboards').select('*').order('updated_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;
    if (error) {
      if (!error.message.includes(MISSING_TABLE)) {
        console.warn('Supabase fetch match_dashboards error:', error.message);
      }
      return [];
    }

    return (data || []).map(rowToDashboard);
  } catch (err: any) {
    console.warn('Could not load match_dashboards from Supabase:', err.message);
    return [];
  }
}

// Save/Upsert a dashboard to Supabase
export async function saveDashboardToSupabase(dashboard: MatchDashboard): Promise<boolean> {
  if (!dashboard || !dashboard.id || !dashboard.match_id) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const row = {
      id: dashboard.id,
      match_id: dashboard.match_id,
      analysis_id: dashboard.analysis_id || null,
      name: dashboard.name,
      description: dashboard.description || '',
      botonera_template_id: dashboard.botonera_template_id || null,
      cols: dashboard.cols || 12,
      row_height: dashboard.row_height || 40,
      widgets: dashboard.widgets || [],
      global_filters: dashboard.global_filters || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('match_dashboards').upsert([row], { onConflict: 'id' });

    if (error) {
      if (!error.message.includes(MISSING_TABLE)) {
        console.error('Error upserting match_dashboard to Supabase:', error.message);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving match_dashboard to Supabase:', err.message);
    return false;
  }
}

// Delete a dashboard from Supabase
export async function deleteDashboardFromSupabase(dashboardId: string): Promise<boolean> {
  if (!dashboardId) return false;

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase.from('match_dashboards').delete().eq('id', dashboardId);

    if (error) {
      if (!error.message.includes(MISSING_TABLE)) {
        console.error('Error deleting match_dashboard from Supabase:', error.message);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting match_dashboard from Supabase:', err.message);
    return false;
  }
}
