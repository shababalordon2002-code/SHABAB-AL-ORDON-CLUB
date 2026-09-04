import puppeteer from 'puppeteer-core';

export async function scrapeFlashscoreMatches(maxMatches = 25) {
  console.log("Starting Flashscore match scraper...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  const url = "https://www.flashscore.es/equipo/shabab-al-ordon/ld5M1lKt/partidos/";
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 2000));

  // Accept cookies if modal exists
  try {
    const cookieBtn = await page.$("#onetrust-accept-btn-handler");
    if (cookieBtn) {
      await cookieBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch(e) {}

  // Click "Mostrar más partidos" if available to load all
  try {
    let showMore = await page.$('.event__more');
    let clicks = 0;
    while (showMore && clicks < 3) {
      console.log('Clicking "Mostrar más partidos"...');
      await showMore.click();
      await new Promise(r => setTimeout(r, 1500));
      showMore = await page.$('.event__more');
      clicks++;
    }
  } catch(e) {}

  // Collect all match link URLs from the main matches list
  const matchLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a.eventRowLink, a[id^="match-row-g_1_"]'));
    return links.map(a => ({
      id: a.id,
      href: a.href
    })).filter((item, index, self) => item.href && self.findIndex(t => t.href === item.href) === index);
  });

  console.log(`Found ${matchLinks.length} match links to scrape.`);

  const scrapedMatches = [];
  const targetLinks = matchLinks.slice(0, maxMatches);

  for (let i = 0; i < targetLinks.length; i++) {
    const item = targetLinks[i];
    console.log(`[${i + 1}/${targetLinks.length}] Scraping detail page: ${item.href}`);

    try {
      await page.goto(item.href, { waitUntil: "domcontentloaded", timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      const matchData = await page.evaluate((matchHref) => {
        // 1. Escudo local & equipo local
        const homeContainer = document.querySelector('.duelParticipant__home') || document.querySelector('.smv__homeParticipant');
        const homeTeamNameElem = homeContainer?.querySelector('a.participant__participantName, .participant__participantName') || document.querySelector('.duelParticipant__home .participant__participantName');
        const homeLogoImg = homeContainer?.querySelector('img.participant__image, img') || document.querySelector('.duelParticipant__home img');

        // 2. Escudo visitante & equipo visitante
        const awayContainer = document.querySelector('.duelParticipant__away') || document.querySelector('.smv__awayParticipant');
        const awayTeamNameElem = awayContainer?.querySelector('a.participant__participantName, .participant__participantName') || document.querySelector('.duelParticipant__away .participant__participantName');
        const awayLogoImg = awayContainer?.querySelector('img.participant__image, img') || document.querySelector('.duelParticipant__away img');

        // 3. Fecha y hora (div)
        const dateElem = document.querySelector('.duelParticipant__startTime, .smv__startTime');
        const dateRawText = dateElem ? dateElem.innerText.trim() : '';

        // 4. Liga - Jornada (span with data-testid="wcl-scores-overline-03" or header elements)
        let compText = '';
        let roundText = '';

        // Check for span with data-testid="wcl-scores-overline-03" or elements containing "Jornada" / "League" / "Cup"
        const testIdElem = document.querySelector('[data-testid="wcl-scores-overline-03"]');
        if (testIdElem && testIdElem.innerText.trim()) {
          compText = testIdElem.innerText.trim();
        }

        if (!compText || compText === 'FÚTBOL') {
          const breadcrumbs = Array.from(document.querySelectorAll('a[href*="/futbol/"], span.wcl-scores-overline-03, .tournamentHeader__country'));
          const texts = breadcrumbs.map(b => b.innerText.trim()).filter(Boolean);
          const leagueText = texts.find(t => t.toLowerCase().includes('league') || t.toLowerCase().includes('cup') || t.toLowerCase().includes('jornada') || t.toLowerCase().includes('liga'));
          if (leagueText) {
            compText = leagueText;
          }
        }

        if (!compText || compText === 'FÚTBOL') {
          compText = 'Premier League';
        }

        if (compText.includes('-')) {
          const parts = compText.split('-');
          compText = parts[0].trim();
          roundText = parts.slice(1).join('-').trim();
        } else if (compText.includes('Jornada')) {
          roundText = compText;
        }

        // Parse date and time e.g. "04.09.2026 17:00"
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

        // Scores if available
        const scoreElem = document.querySelector('.detailScore__wrapper, .smv__score');
        const scoreText = scoreElem ? scoreElem.innerText.trim().replace(/\n/g, ' ') : '';
        let homeScore = 0;
        let awayScore = 0;
        let status = 'Programado';

        if (scoreText && scoreText.includes('-')) {
          const parts = scoreText.split('-').map(s => parseInt(s.trim(), 10));
          if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            homeScore = parts[0];
            awayScore = parts[1];
            status = 'Finalizado';
          }
        }

        // Extract MID parameter from URL
        const urlObj = new URL(matchHref);
        const mid = urlObj.searchParams.get('mid') || '';

        return {
          id: mid ? `match_fs_${mid}` : `match_fs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          flashscore_mid: mid,
          flashscore_url: matchHref,
          home_team: homeTeamNameElem ? homeTeamNameElem.innerText.trim() : 'Local',
          home_team_logo: homeLogoImg ? homeLogoImg.getAttribute('src') : '',
          away_team: awayTeamNameElem ? awayTeamNameElem.innerText.trim() : 'Visitante',
          away_team_logo: awayLogoImg ? awayLogoImg.getAttribute('src') : '',
          date_raw: dateRawText,
          date: date || new Date().toISOString().split('T')[0],
          time: time || '17:00',
          competition: compText || 'Premier League',
          round: roundText || '',
          season: '2026/2027',
          home_score: homeScore,
          away_score: awayScore,
          status: status,
          event_count: 0,
          import_status: 'Pendiente'
        };
      }, item.href);

      scrapedMatches.push(matchData);
    } catch(err) {
      console.error(`Error scraping match ${item.href}:`, err.message);
    }
  }

  await browser.close();
  console.log(`Successfully scraped ${scrapedMatches.length} matches.`);
  return scrapedMatches;
}

// Run standalone if executed directly
scrapeFlashscoreMatches(3)
  .then(matches => console.log('Sample Scraped Matches:\n', JSON.stringify(matches, null, 2)))
  .catch(console.error);

