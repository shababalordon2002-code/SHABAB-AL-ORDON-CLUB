import { NextResponse } from 'next/server';
import { scrapeFlashscoreMatches } from '@/lib/scraper/flashscore-scraper';
import { scrapeTransfermarktPlayers } from '@/lib/scraper/transfermarkt-scraper';
import { saveMatchesToSupabase } from '@/lib/services/matches-service';
import { savePlayersToSupabase } from '@/lib/services/players-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max 60 seconds for Vercel Serverless Function

export async function GET(request: Request) {
  try {
    // Verify authorization header from Vercel Cron if CRON_SECRET is defined
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('[Cron Job] Ejecutando scraping automatizado (Partidos + Plantilla Transfermarkt) cada 2 días...');
    
    const [matches, players] = await Promise.all([
      scrapeFlashscoreMatches(20),
      scrapeTransfermarktPlayers()
    ]);

    // Upsert both matches and players to Supabase tables
    await Promise.all([
      saveMatchesToSupabase(matches),
      savePlayersToSupabase(players)
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      matchesCount: matches.length,
      playersCount: players.length,
      matches: matches,
      players: players,
      message: 'Scraping automatizado de partidos y plantilla completado y guardado en Supabase'
    });
  } catch (error: any) {
    console.error('[Cron Job Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al ejecutar cron job de scraping'
      },
      { status: 500 }
    );
  }
}
