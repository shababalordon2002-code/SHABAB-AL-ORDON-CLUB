import puppeteer from 'puppeteer-core';
import { Player } from '@/types';

// Map English/German Transfermarkt positions to Spanish
const POSITION_MAP_ES: Record<string, string> = {
  'Goalkeeper': 'Portero',
  'Torwart': 'Portero',
  'Centre-Back': 'Defensa Central',
  'Central Defender': 'Defensa Central',
  'Left-Back': 'Lateral Izquierdo',
  'Right-Back': 'Lateral Derecho',
  'Defensive Midfield': 'Pivote Defensivo',
  'Central Midfield': 'Mediocentro',
  'Midfielder': 'Mediocentro',
  'Attacking Midfield': 'Mediocentro Ofensivo',
  'Left Midfield': 'Interior Izquierdo',
  'Right Midfield': 'Interior Derecho',
  'Left Winger': 'Extremo Izquierdo',
  'Right Winger': 'Extremo Derecho',
  'Second Striker': 'Segundo Delantero',
  'Centre-Forward': 'Delantero Centro',
  'Forward': 'Delantero',
};

export function translatePositionToSpanish(pos: string): string {
  if (!pos) return 'Jugador';
  const trimmed = pos.trim();
  
  for (const [enKey, esVal] of Object.entries(POSITION_MAP_ES)) {
    if (trimmed.toLowerCase().includes(enKey.toLowerCase())) {
      return esVal;
    }
  }
  return trimmed;
}

// Full Puppeteer Scraper for Transfermarkt Squad Detailed View Page
async function scrapeTransfermarktViaPuppeteer(): Promise<Player[]> {
  console.log("Launching Puppeteer for Transfermarkt detailed squad scraper...");
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  const targetUrl = "https://www.transfermarkt.com/shabab-al-ordon-club/kader/verein/15832/saison_id/2026/plus/1";
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
  await new Promise(r => setTimeout(r, 2500));

  const rawPlayers = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table.items > tbody > tr'));
    const results: any[] = [];

    rows.forEach((row, index) => {
      // 1. Name e.g. <td class="hauptlink"><a href="...">Noureddine Al-Torman</a></td>
      const nameElem = row.querySelector('td.hauptlink a');
      const name = nameElem ? (nameElem as HTMLElement).innerText.trim() : '';
      if (!name) return;

      // 2. Dorsal / Number e.g. <div class="rn_nummer">22</div>
      const numberElem = row.querySelector('.rn_nummer, .rueckennummer');
      const numberText = numberElem ? (numberElem as HTMLElement).innerText.trim() : '';
      const number = parseInt(numberText, 10) || (results.length + 1);

      // 3. Photo URL e.g. <img src="..." title="Name" ...>
      const imgElem = row.querySelector('td.hauptlink img, img.bilderrahmen-fixed, img.inline-table');
      const photoUrl = imgElem ? (imgElem.getAttribute('src') || imgElem.getAttribute('data-src') || '') : '';

      // 4. Position e.g. Goalkeeper, Centre-Back, etc.
      const inlineTablePos = row.querySelector('table.inline-table tr:nth-child(2) td');
      const posText = inlineTablePos ? (inlineTablePos as HTMLElement).innerText.trim() : '';

      // 5. Age e.g. "(26)" or birthdate text
      const zentriertCols = Array.from(row.querySelectorAll('td.zentriert'));
      let age: number | undefined = undefined;
      for (const col of zentriertCols) {
        const txt = (col as HTMLElement).innerText.trim();
        const ageMatch = txt.match(/\((\d{2})\)/) || txt.match(/(\d{2})\s*years/);
        if (ageMatch) {
          age = parseInt(ageMatch[1], 10);
          break;
        }
      }

      // 6. Nationality & Flag e.g. <img src="..." title="Jordan" class="flaggenrahmen">
      const flagImg = row.querySelector('img.flaggenrahmen');
      const nationality = flagImg ? (flagImg.getAttribute('title') || 'Jordania') : 'Jordania';
      const flagUrl = flagImg ? (flagImg.getAttribute('src') || '') : '';

      results.push({
        id: `ply_tm_${results.length + 1}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name,
        number,
        rawPosition: posText || 'Jugador',
        photo_url: photoUrl.includes('portrait') || photoUrl.includes('transfermarkt') ? photoUrl : undefined,
        age: age || undefined,
        nationality,
        flag_url: flagUrl || undefined,
      });
    });

    return results;
  });

  await browser.close();

  // Map positions to Spanish
  return rawPlayers.map(p => ({
    id: p.id,
    name: p.name,
    number: p.number,
    position: translatePositionToSpanish(p.rawPosition),
    team_id: 'team_shabab_al_ordon',
    team_name: 'Shabab Al Ordon Club',
    photo_url: p.photo_url,
    age: p.age,
    nationality: p.nationality,
    flag_url: p.flag_url,
  }));
}

// Lightweight HTTP fetch fallback for Vercel Serverless
async function scrapeTransfermarktViaFetch(): Promise<Player[]> {
  console.log("Executing HTTP fetch scraper for Transfermarkt squad...");
  const targetUrl = "https://www.transfermarkt.com/shabab-al-ordon-club/kader/verein/15832/saison_id/2026/plus/1";

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      console.warn(`Transfermarkt fetch status: ${res.status}`);
      return getFallbackTransfermarktPlayers();
    }

    const html = await res.text();
    const players: Player[] = [];
    const rowMatches = Array.from(html.matchAll(/<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/g));

    let index = 1;
    for (const match of rowMatches) {
      const rowHtml = match[1];

      const nameMatch = rowHtml.match(/<td class="hauptlink">\s*<a[^>]*>\s*([^<]+)\s*<\/a>/);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (!name) continue;

      const numberMatch = rowHtml.match(/<div class="rn_nummer">(\d+)<\/div>/) || rowHtml.match(/rueckennummer[^>]*>(\d+)/);
      const number = numberMatch ? parseInt(numberMatch[1], 10) : index;

      const photoMatch = rowHtml.match(/<img[^>]*src="([^"]*portrait[^"]*)"/) || rowHtml.match(/data-src="([^"]*portrait[^"]*)"/);
      const photoUrl = photoMatch ? photoMatch[1] : undefined;

      const posMatch = rowHtml.match(/<\/tr>\s*<tr>\s*<td>\s*([^<]+)\s*<\/td>\s*<\/tr>/) || rowHtml.match(/title="(Goalkeeper|Centre-Back|Left-Back|Right-Back|Defensive Midfield|Central Midfield|Attacking Midfield|Left Winger|Right Winger|Centre-Forward|Forward)"/);
      const rawPosition = posMatch ? posMatch[1].trim() : 'Jugador';
      const positionEs = translatePositionToSpanish(rawPosition);

      const ageMatch = rowHtml.match(/\((\d{2})\)/);
      const ageNum = ageMatch ? parseInt(ageMatch[1], 10) : undefined;

      const flagMatch = rowHtml.match(/<img[^>]*title="([^"]+)"[^>]*class="flaggenrahmen"[^>]*src="([^"]+)"/) ||
                        rowHtml.match(/<img[^>]*src="([^"]+)"[^>]*title="([^"]+)"[^>]*class="flaggenrahmen"/);

      let nationality = 'Jordania';
      let flagUrl: string | undefined = undefined;

      if (flagMatch) {
        if (flagMatch[1].startsWith('http')) {
          flagUrl = flagMatch[1];
          nationality = flagMatch[2];
        } else {
          nationality = flagMatch[1];
          flagUrl = flagMatch[2];
        }
      }

      players.push({
        id: `ply_tm_${index}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: name,
        number: number,
        position: positionEs,
        team_id: 'team_shabab_al_ordon',
        team_name: 'Shabab Al Ordon Club',
        photo_url: photoUrl,
        age: ageNum,
        nationality: nationality,
        flag_url: flagUrl,
      });

      index++;
    }

    if (players.length > 0) {
      console.log(`Successfully scraped ${players.length} players via fetch.`);
      return players;
    }
  } catch (err: any) {
    console.warn("Transfermarkt fetch error:", err.message);
  }

  return getFallbackTransfermarktPlayers();
}

export async function scrapeTransfermarktPlayers(): Promise<Player[]> {
  try {
    return await scrapeTransfermarktViaPuppeteer();
  } catch (err: any) {
    console.warn("Puppeteer transfermarkt scraper failed, falling back to fetch:", err.message);
    return await scrapeTransfermarktViaFetch();
  }
}

export function getFallbackTransfermarktPlayers(): Player[] {
  return [
    { id: 'ply_tm_1_waleed_issam', name: 'Waleed Issam', number: 1, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', photo_url: 'https://img.a.transfermarkt.technology/portrait/medium/569541-1770765964.jpeg?lm=4711', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_2_noureddine_al_torman', name: 'Noureddine Al-Torman', number: 22, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', photo_url: 'https://img.a.transfermarkt.technology/portrait/medium/1119510-1770677822.jpeg?lm=4711', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_3_salameh_salman', name: 'Salameh Salman', number: 99, position: 'Portero', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_4_sa_l_castro', name: 'Saúl Castro', number: 4, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 24, nationality: 'Ecuador', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/44.png?lm=4711' },
    { id: 'ply_tm_5_amer_al_majdoubah', name: 'Amer Al-Majdoubah', number: 14, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_6_ali_rabaei', name: 'Ali Rabaei', number: 6, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 23, nationality: 'Palestina', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/240.png?lm=4711' },
    { id: 'ply_tm_7_qusai_tannous', name: 'Qusai Tannous', number: 16, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_8_hassan_holwah', name: 'Hassan Holwah', number: 3, position: 'Defensa Central', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 23, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_9_mohammad_abu_ghoush', name: 'Mohammad Abu Ghoush', number: 9, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_10_jordy_dur_n', name: 'Jordy Durán', number: 10, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'República Dominicana', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/43.png?lm=4711' },
    { id: 'ply_tm_11_yazeed_mahfouz', name: 'Yazeed Mahfouz', number: 2, position: 'Lateral Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 25, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_12_anas_zabout', name: 'Anas Zabout', number: 4, position: 'Lateral Derecho', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_13_ghassan_abu_hassan', name: 'Ghassan Abu Hassan', number: 55, position: 'Lateral Derecho', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_14_saif_suleiman', name: 'Saif Suleiman', number: 6, position: 'Pivote Defensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_15_ismail_freihat', name: 'Ismail Freihat', number: 15, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 19, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_16_rashid_al_shroqi', name: 'Rashid Al-Shroqi', number: 21, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_17_ahmad_khaled', name: 'Ahmad Khaled', number: 26, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_18_mustafa_al_saifi', name: 'Mustafa Al-Saifi', number: 23, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_19_fayez_draghmeh', name: 'Fayez Draghmeh', number: 88, position: 'Mediocentro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_20_ayham_hisham', name: 'Ayham Hisham', number: 10, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_21_hamza_al_shamali', name: 'Hamza Al-Shamali', number: 21, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 30, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_22_anas_zara', name: 'Anas Zara', number: 22, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 17, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_23_mohamad_al_absi', name: 'Mohamad Al-Absi', number: 77, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 21, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_24_iyed_belgacem', name: 'Iyed Belgacem', number: 27, position: 'Mediocentro Ofensivo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Túnez', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/173.png?lm=4711' },
    { id: 'ply_tm_25_mohammad_abu_arqob', name: 'Mohammad Abu Arqob', number: 25, position: 'Extremo Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 30, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_26_adham_al_refaei', name: 'Adham Al-Refaei', number: 70, position: 'Extremo Izquierdo', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_27_khaldoon_sabra', name: 'Khaldoon Sabra', number: 27, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 22, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_28_shaher_shelbaieh', name: 'Shaher Shelbaieh', number: 17, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 27, nationality: 'Jordania', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/78.png?lm=4711' },
    { id: 'ply_tm_29_maikel_caicedo', name: 'Maikel Caicedo', number: 29, position: 'Delantero Centro', team_id: 'team_shabab_al_ordon', team_name: 'Shabab Al Ordon Club', age: 24, nationality: 'Ecuador', flag_url: 'https://img.a.transfermarkt.technology/flagge/verysmall/44.png?lm=4711' }
  ];
}
