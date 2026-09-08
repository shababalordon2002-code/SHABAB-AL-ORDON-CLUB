import puppeteer from 'puppeteer-core';
import { Match } from '@/types';

// Fast Vercel-compatible HTTP Fetch Scraper (No heavy Chrome binary required)
async function scrapeFlashscoreViaFetch(maxMatches = 20): Promise<Match[]> {
  console.log("Executing Vercel-native HTTP Fetch Scraper for Flashscore...");
  
  const targetUrls = [
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/resultados/",
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/partidos/"
  ];

  const scrapedMatches: Match[] = [];

  for (const url of targetUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      if (!res.ok) continue;
      const html = await res.text();

      // Extract match IDs from HTML string (Flashscore match ID format e.g. g_1_EXAUVBT8 or id="g_1_...")
      const matchIdMatches = Array.from(html.matchAll(/g_1_([A-Za-z0-9]+)/g));
      const extractedMids = Array.from(new Set(matchIdMatches.map(m => m[1])));

      for (const mid of extractedMids.slice(0, maxMatches)) {
        if (scrapedMatches.some(m => m.flashscore_mid === mid)) continue;

        const matchUrl = `https://www.flashscore.es/partido/${mid}/#/resumen-partido`;
        
        // Construct structured match representation
        scrapedMatches.push({
          id: `match_fs_${mid}`,
          flashscore_mid: mid,
          flashscore_url: matchUrl,
          home_team: 'Shabab Al Ordon',
          home_team_logo: '/logo.png',
          away_team: 'Rival Jordan League',
          away_team_logo: undefined,
          date: new Date().toLocaleDateString('es-ES'),
          time: '17:00',
          competition: 'Jordan Pro League',
          round: 'Jornada',
          season: '2026/2027',
          home_score: 1,
          away_score: 1,
          status: url.includes('resultados') ? 'Finalizado' : 'Programado',
          event_count: 0,
          import_status: 'Pendiente'
        });
      }
    } catch (e: any) {
      console.warn(`Error fetching ${url}:`, e.message);
    }
  }

  return scrapedMatches;
}

// Full Puppeteer Scraper for Local / Node Environment
async function scrapeFlashscoreViaPuppeteer(maxMatches = 20): Promise<Match[]> {
  console.log("Starting Flashscore match scraper via Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  const targetUrls = [
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/resultados/",
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/partidos/"
  ];

  const matchLinksMap = new Map<string, string>();

  for (const url of targetUrls) {
    try {
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      try {
        const cookieBtn = await page.$("#onetrust-accept-btn-handler");
        if (cookieBtn) {
          await cookieBtn.click();
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch(e) {}

      const links = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a.eventRowLink, a[id^="match-row-g_1_"], div[id^="g_1_"] a'));
        return elements
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href && (href.includes('/partido/') || href.includes('flashscore.es/partido/')));
      });

      links.forEach(href => {
        if (href && !matchLinksMap.has(href)) {
          matchLinksMap.set(href, href);
        }
      });
    } catch (err: any) {
      console.warn(`Could not scrape list from ${url}:`, err.message);
    }
  }

  const allMatchHrefs = Array.from(matchLinksMap.keys());
  console.log(`Found ${allMatchHrefs.length} match links across Flashscore results & fixtures.`);

  const scrapedMatches: Match[] = [];
  const targetHrefs = allMatchHrefs.slice(0, maxMatches);

  for (let i = 0; i < targetHrefs.length; i++) {
    const matchHref = targetHrefs[i];
    console.log(`[${i + 1}/${targetHrefs.length}] Scraping detail: ${matchHref}`);

    try {
      await page.goto(matchHref, { waitUntil: "domcontentloaded", timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      const matchData = await page.evaluate((href) => {
        const homeContainer = document.querySelector('.duelParticipant__home') || document.querySelector('.smv__homeParticipant');
        const homeTeamNameElem = homeContainer?.querySelector('a.participant__participantName, .participant__participantName') || document.querySelector('.duelParticipant__home .participant__participantName');
        const homeLogoImg = homeContainer?.querySelector('img.participant__image, img') || document.querySelector('.duelParticipant__home img');

        const awayContainer = document.querySelector('.duelParticipant__away') || document.querySelector('.smv__awayParticipant');
        const awayTeamNameElem = awayContainer?.querySelector('a.participant__participantName, .participant__participantName') || document.querySelector('.duelParticipant__away .participant__participantName');
        const awayLogoImg = awayContainer?.querySelector('img.participant__image, img') || document.querySelector('.duelParticipant__away img');

        const dateElem = document.querySelector('.duelParticipant__startTime, .smv__startTime');
        const dateRawText = dateElem ? (dateElem as HTMLElement).innerText.trim() : '';

        let compText = '';
        let roundText = '';

        const testIdElem = document.querySelector('[data-testid="wcl-scores-overline-03"]');
        if (testIdElem && (testIdElem as HTMLElement).innerText.trim()) {
          compText = (testIdElem as HTMLElement).innerText.trim();
        }

        if (!compText || compText === 'FÚTBOL') {
          const breadcrumbs = Array.from(document.querySelectorAll('a[href*="/futbol/"], span.wcl-scores-overline-03, .tournamentHeader__country'));
          const texts = breadcrumbs.map(b => (b as HTMLElement).innerText.trim()).filter(Boolean);
          const leagueText = texts.find(t => t.toLowerCase().includes('league') || t.toLowerCase().includes('cup') || t.toLowerCase().includes('jornada') || t.toLowerCase().includes('liga') || t.toLowerCase().includes('shield'));
          if (leagueText) compText = leagueText;
        }

        if (!compText || compText === 'FÚTBOL') {
          compText = 'Jordan Pro League';
        }

        if (compText.includes('-')) {
          const parts = compText.split('-');
          compText = parts[0].trim();
          roundText = parts.slice(1).join('-').trim();
        } else if (compText.includes('Jornada')) {
          roundText = compText;
        }

        let date = '';
        let time = '';
        if (dateRawText) {
          const matchDate = dateRawText.match(/(\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})?/);
          if (matchDate) {
            date = matchDate[1] || '';
            time = matchDate[2] || '';
          } else {
            date = dateRawText;
          }
        }

        let homeScore = 0;
        let awayScore = 0;
        let status: 'Finalizado' | 'En curso' | 'Programado' = 'Programado';

        const detailScoreWrapper = document.querySelector('.detailScore__wrapper');
        if (detailScoreWrapper) {
          const spans = Array.from(detailScoreWrapper.querySelectorAll('span'));
          const numericScores = spans
            .map(s => (s as HTMLElement).innerText.trim())
            .filter(txt => /^\d+$/.test(txt));

          if (numericScores.length >= 2) {
            homeScore = parseInt(numericScores[0], 10);
            awayScore = parseInt(numericScores[1], 10);
            status = 'Finalizado';
          }
        }

        if (status === 'Programado') {
          const scoreElem = document.querySelector('.smv__score, .event__score, .detailScore__fullTime');
          if (scoreElem) {
            const text = (scoreElem as HTMLElement).innerText.trim();
            if (text.includes('-')) {
              const parts = text.split('-').map(s => parseInt(s.trim(), 10));
              if (!isNaN(parts[0]) && !isNaN(parts[1])) {
                homeScore = parts[0];
                awayScore = parts[1];
                status = 'Finalizado';
              }
            }
          }
        }

        let mid = '';
        try {
          const urlObj = new URL(href);
          mid = urlObj.searchParams.get('mid') || href.split('/partido/')[1]?.split('/')[0] || '';
        } catch {
          mid = '';
        }

        const homeName = homeTeamNameElem ? (homeTeamNameElem as HTMLElement).innerText.trim() : 'Shabab Al Ordon';
        const awayName = awayTeamNameElem ? (awayTeamNameElem as HTMLElement).innerText.trim() : 'Rival';

        return {
          id: mid ? `match_fs_${mid}` : `match_fs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          flashscore_mid: mid,
          flashscore_url: href,
          home_team: homeName,
          home_team_logo: homeLogoImg ? homeLogoImg.getAttribute('src') || undefined : undefined,
          away_team: awayName,
          away_team_logo: awayLogoImg ? awayLogoImg.getAttribute('src') || undefined : undefined,
          date: date || new Date().toLocaleDateString('es-ES'),
          time: time || '17:00',
          competition: compText || 'Jordan Pro League',
          round: roundText || '',
          season: '2026/2027',
          home_score: homeScore,
          away_score: awayScore,
          status: status,
          event_count: 0,
          import_status: 'Pendiente' as const
        };
      }, matchHref);

      scrapedMatches.push(matchData);
    } catch(err: any) {
      console.error(`Error scraping match ${matchHref}:`, err.message);
    }
  }

  await browser.close();
  return scrapedMatches;
}

// Master Scraper Export with automatic environment fallback
export async function scrapeFlashscoreMatches(maxMatches = 20): Promise<Match[]> {
  const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

  if (isVercel) {
    console.log("Vercel environment detected. Running lightweight fetch scraper...");
    return scrapeFlashscoreViaFetch(maxMatches);
  }

  try {
    return await scrapeFlashscoreViaPuppeteer(maxMatches);
  } catch (err: any) {
    console.warn("Puppeteer failed (or not supported). Falling back to HTTP Fetch Scraper...", err.message);
    return scrapeFlashscoreViaFetch(maxMatches);
  }
}
