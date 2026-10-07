import { NextResponse } from 'next/server';
import { scrapeFlashscoreMatches } from '@/lib/scraper/flashscore-scraper';
import { saveMatchesToSupabase } from '@/lib/services/matches-service';

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

    console.log('[Cron Job] Ejecutando scraping automatizado de partidos cada 2 días...');

    // The squad is not synced here: it is edited by hand in "Jugadores" and only replaced
    // from 365scores when the user presses "Sincronizar 365scores".
    const matches = await scrapeFlashscoreMatches(20);
    await saveMatchesToSupabase(matches);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      matchesCount: matches.length,
      matches: matches,
      message: 'Scraping automatizado de partidos completado y guardado en Supabase'
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
