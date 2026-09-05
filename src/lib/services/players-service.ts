import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { Player } from '@/types';

// Fetch players from Supabase 'players' table
export async function getPlayersFromSupabase(): Promise<Player[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('number', { ascending: true });

    if (error) {
      console.warn('Supabase fetch players error:', error.message);
      return [];
    }

    return (data || []) as Player[];
  } catch (err: any) {
    console.warn('Could not load players from Supabase:', err.message);
    return [];
  }
}

// Upsert players into Supabase 'players' table (Service Role / Admin or Browser)
export async function savePlayersToSupabase(players: Player[]): Promise<boolean> {
  if (!players || players.length === 0) return true;

  try {
    // Try admin client first if available, else browser client
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const rows = players.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      team_id: p.team_id || 'team_shabab_al_ordon',
      team_name: p.team_name || 'Shabab Al Ordon Club',
      photo_url: p.photo_url || null,
      age: p.age || null,
      nationality: p.nationality || 'Jordania',
      flag_url: p.flag_url || null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('players')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting players to Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving players to Supabase:', err.message);
    return false;
  }
}

// Delete player from Supabase 'players' table
export async function deletePlayerFromSupabase(playerId: string): Promise<boolean> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createClient();
    }

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Error deleting player from Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error deleting player from Supabase:', err.message);
    return false;
  }
}
