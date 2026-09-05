import { NextResponse } from 'next/server';
import { scrapeTransfermarktPlayers } from '@/lib/scraper/transfermarkt-scraper';
import { savePlayersToSupabase } from '@/lib/services/players-service';

export const maxDuration = 60;

export async function POST() {
  try {
    console.log("API /api/scrape-players called...");
    const players = await scrapeTransfermarktPlayers();

    // Save/Upsert scraped players directly to Supabase 'players' table
    await savePlayersToSupabase(players);

    return NextResponse.json({
      success: true,
      count: players.length,
      players: players
    });
  } catch (error: any) {
    console.error("Error in /api/scrape-players:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al descargar plantilla de Transfermarkt'
      },
      { status: 500 }
    );
  }
}
