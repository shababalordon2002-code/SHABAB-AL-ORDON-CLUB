import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('number', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, players: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const players = body.players;
    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const supabase = createAdminClient();
    const rows = players.map((p: any) => ({
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
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('players')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase /api/players upsert error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    console.warn('Error in /api/players POST:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('id');

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'Missing player id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
