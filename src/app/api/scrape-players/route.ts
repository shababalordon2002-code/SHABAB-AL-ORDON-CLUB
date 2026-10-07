import { NextResponse } from 'next/server';
import { scrape365ScoresPlayers } from '@/lib/scraper/365scores-scraper';
import { replaceSquadInSupabase } from '@/lib/services/players-service';

export const maxDuration = 60;

export async function POST() {
  try {
    console.log("API /api/scrape-players called...");
    const scraped = await scrape365ScoresPlayers();

    // Replace the Shabab Al Ordon squad in Supabase 'players' table
    const players = await replaceSquadInSupabase(scraped);

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
        error: error.message || 'Error al descargar plantilla de 365scores'
      },
      { status: 500 }
    );
  }
}
