import { NextResponse } from 'next/server';
import { scrapeFlashscoreMatches } from '@/lib/scraper/flashscore-scraper';
import { saveMatchesToSupabase } from '@/lib/services/matches-service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 15;
    
    console.log(`API /api/scrape-matches called with limit=${limit}`);
    const matches = await scrapeFlashscoreMatches(limit);

    // Save/Upsert scraped matches directly to Supabase 'matches' table
    await saveMatchesToSupabase(matches);

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches: matches
    });
  } catch (error: any) {
    console.error('Error in /api/scrape-matches API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al ejecutar scraping de partidos de Flashscore'
      },
      { status: 500 }
    );
  }
}
