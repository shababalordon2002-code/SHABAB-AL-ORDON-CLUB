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
      // If browser fetch fails (e.g. adblocker or network), try internal API route
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/players');
          const json = await res.json();
          if (json.success && Array.isArray(json.players)) {
            return json.players as Player[];
          }
        } catch {
          // Fall through
        }
      }
      console.warn('Supabase fetch players warning:', error.message);
      return [];
    }

    return (data || []) as Player[];
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/players');
        const json = await res.json();
        if (json.success && Array.isArray(json.players)) {
          return json.players as Player[];
        }
      } catch {
        // Fall through
      }
    }
    console.warn('Could not load players from Supabase:', err.message);
    return [];
  }
}

// Upsert players into Supabase 'players' table
export async function savePlayersToSupabase(players: Player[]): Promise<boolean> {
  if (!players || players.length === 0) return true;

  const isServer = typeof window === 'undefined';

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

  // Server-side execution: always use admin client
  if (isServer) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('players')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.warn('Server error upserting players to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Server exception saving players to Supabase:', err.message);
      return false;
    }
  }

  // Browser-side execution:
  // 1. Try standard browser client (anon key)
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('players')
      .upsert(rows, { onConflict: 'id' });

    if (!error) {
      return true;
    }

    // If browser client fails with Failed to fetch / CORS / adblocker, fallback to internal API route
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err: any) {
    // 2. Fallback to same-origin /api/players which uses server admin client
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch (apiErr: any) {
      console.warn('Could not sync players to Supabase (offline/network issue):', apiErr.message || err.message);
      return false;
    }
  }
}

// Delete player from Supabase 'players' table
export async function deletePlayerFromSupabase(playerId: string): Promise<boolean> {
  if (!playerId) return false;

  const isServer = typeof window === 'undefined';

  if (isServer) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) {
        console.warn('Server error deleting player from Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Server exception deleting player from Supabase:', err.message);
      return false;
    }
  }

  // Browser-side execution
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (!error) {
      return true;
    }

    // Fallback to internal API
    const res = await fetch(`/api/players?id=${encodeURIComponent(playerId)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    try {
      const res = await fetch(`/api/players?id=${encodeURIComponent(playerId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch (apiErr: any) {
      console.warn('Could not delete player from Supabase (offline/network issue):', apiErr.message);
      return false;
    }
  }
}
