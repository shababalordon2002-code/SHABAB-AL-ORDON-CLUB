import puppeteer from 'puppeteer-core';
import { Match } from '@/types';
import { isMatchOnOrAfterSept2026 } from '@/lib/utils/date-utils';

// Fast Vercel-compatible HTTP Fetch Scraper (Parses real Flashscore data feed)
async function scrapeFlashscoreViaFetch(maxMatches = 20): Promise<Match[]> {
  console.log("Executing Flashscore feed parser for Flashscore matches & scores...");
  
  const targetUrls = [
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/resultados/",
    "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/partidos/"
  ];

  const scrapedMatchesMap = new Map<string, Match>();

  for (const url of targetUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        cache: 'no-store'
      });

      if (!res.ok) continue;
      const html = await res.text();

      const rawBlocks = html.split('~AA÷').slice(1);

      for (const block of rawBlocks) {
        const fields = block.split('¬');
        const mid = fields[0];
        if (!mid || mid.length > 12) continue;

        let homeTeam = '';
        let awayTeam = '';
        let homeScore: number | null = null;
        let awayScore: number | null = null;
        let timestamp = 0;
        let competition = 'Premier League';

        fields.forEach(field => {
          if (field.startsWith('AE÷')) homeTeam = field.slice(3).trim();
          else if (field.startsWith('AF÷')) awayTeam = field.slice(3).trim();
          else if (field.startsWith('AG÷')) homeScore = parseInt(field.slice(3), 10);
          else if (field.startsWith('AH÷')) awayScore = parseInt(field.slice(3), 10);
          else if (field.startsWith('AD÷')) timestamp = parseInt(field.slice(3), 10);
          else if (field.startsWith('ZK÷')) competition = field.slice(3).trim();
        });

        if (homeTeam && awayTeam) {
          let dateStr = '';
          let timeStr = '';
          if (timestamp > 0) {
            const d = new Date(timestamp * 1000);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            dateStr = `${day}.${month}.${year}`;
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            timeStr = `${hours}:${mins}`;
          }

          // Skip matches before September 1, 2026
          if (!isMatchOnOrAfterSept2026(dateStr, timestamp)) {
            continue;
          }

          const isFinished = homeScore !== null && !isNaN(homeScore) && awayScore !== null && !isNaN(awayScore);

          const isShababHome = homeTeam.toLowerCase().includes('shabab') || homeTeam.toLowerCase().includes('ordon');
          const isShababAway = awayTeam.toLowerCase().includes('shabab') || awayTeam.toLowerCase().includes('ordon');

          const matchObj: Match = {
            id: `match_fs_${mid}`,
            flashscore_mid: mid,
            flashscore_url: `https://www.flashscore.es/partido/${mid}/`,
            date: dateStr || new Date().toLocaleDateString('es-ES'),
            time: timeStr || '17:00',
            competition: competition || 'Premier League',
            round: '',
            season: '2026/2027',
            home_team: homeTeam,
            home_team_logo: isShababHome ? '/logo.png' : undefined,
            away_team: awayTeam,
            away_team_logo: isShababAway ? '/logo.png' : undefined,
            home_score: isFinished && homeScore !== null ? homeScore : 0,
            away_score: isFinished && awayScore !== null ? awayScore : 0,
            status: isFinished || url.includes('resultados') ? 'Finalizado' : 'Programado',
            event_count: 0,
            import_status: 'Pendiente'
          };

          if (!scrapedMatchesMap.has(mid)) {
            scrapedMatchesMap.set(mid, matchObj);
          }
        }
      }
    } catch (e: any) {
      console.warn(`Error fetching ${url}:`, e.message);
    }
  }

  const resultList = Array.from(scrapedMatchesMap.values());
  console.log(`Flashscore scraper extracted ${resultList.length} matches with real scores.`);
  return resultList.slice(0, maxMatches);
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

        // 1. Try parsing Flashscore raw feed string in script/HTML
        const fullHtml = document.body.innerHTML || '';
        const agMatch = fullHtml.match(/AG÷(\d+)/);
        const ahMatch = fullHtml.match(/AH÷(\d+)/);
        if (agMatch && ahMatch) {
          homeScore = parseInt(agMatch[1], 10);
          awayScore = parseInt(ahMatch[1], 10);
          status = 'Finalizado';
        }

        // 2. Try modern Flashscore score elements if feed match was not found
        if (status === 'Programado') {
          const detailScoreWrapper =
            document.querySelector('.detailScore__wrapper') ||
            document.querySelector('[data-testid*="wcl-scores-score"]') ||
            document.querySelector('[class*="detailScore"]') ||
            document.querySelector('.smv__score');

          if (detailScoreWrapper) {
            const spans = Array.from(detailScoreWrapper.querySelectorAll('span'));
            const numericScores = spans
              .map((s) => (s as HTMLElement).innerText.trim())
              .filter((txt) => /^\d+$/.test(txt));

            if (numericScores.length >= 2) {
              homeScore = parseInt(numericScores[0], 10);
              awayScore = parseInt(numericScores[1], 10);
              status = 'Finalizado';
            } else {
              const text = (detailScoreWrapper as HTMLElement).innerText.trim();
              if (text.includes('-')) {
                const parts = text.split('-').map((s) => parseInt(s.trim(), 10));
                if (!isNaN(parts[0]) && !isNaN(parts[1])) {
                  homeScore = parts[0];
                  awayScore = parts[1];
                  status = 'Finalizado';
                }
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

      if (isMatchOnOrAfterSept2026(matchData.date)) {
        scrapedMatches.push(matchData);
      }
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
