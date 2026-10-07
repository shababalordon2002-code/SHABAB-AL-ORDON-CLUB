import { Player } from '@/types';
import { SHABAB_TEAM_ID, SHABAB_TEAM_NAME } from '@/lib/squad';

// Squad source: https://www.365scores.com/es/football/team/shabab-al-urdon-8277/squad
// The squad page is client-rendered from this JSON endpoint, so we read it directly
// (plain fetch, works on Vercel without a headless browser).
const COMPETITOR_ID = 8277;
const SQUAD_API_URL = `https://webws.365scores.com/web/squads/?appTypeId=5&langId=29&competitors=${COMPETITOR_ID}`;

interface Athlete365 {
  id: number;
  name: string;
  age?: number;
  jerseyNum?: number;
  nationalityId?: number;
  imageVersion?: number;
  position?: { id: number; name?: string };
  formationPosition?: { id: number; name?: string };
}

interface Country365 {
  id: number;
  name: string;
  imageVersion?: number;
}

// Same image transformation as the squad widget, at a larger size for the app cards
function athletePhotoUrl(a: Athlete365): string {
  return `https://imagecache.365scores.com/image/upload/f_png,w_100,h_100,c_limit,q_auto:eco,dpr_2,d_Athletes:default.png,r_max,c_thumb,g_face,z_0.65/v${a.imageVersion || 1}/Athletes/${a.id}`;
}

function countryFlagUrl(c: Country365): string {
  return `https://imagecache.365scores.com/image/upload/f_png,w_24,h_24,c_limit,q_auto:eco,dpr_2,d_Countries:round:default.png/v${c.imageVersion || 1}/Countries/round/${c.id}`;
}

export async function scrape365ScoresPlayers(): Promise<Player[]> {
  console.log('Fetching Shabab Al Ordon squad from 365scores...');
  const res = await fetch(SQUAD_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`365scores respondió con estado ${res.status}`);
  }

  const data = await res.json();
  const squad = (data.squads || []).find((s: any) => s.competitorId === COMPETITOR_ID);
  const athletes: Athlete365[] = squad?.athletes || [];
  const countries = new Map<number, Country365>(
    (data.countries || []).map((c: Country365) => [c.id, c])
  );

  const players: Player[] = athletes
    // position.id 0 = staff (Entrenador / Dirección)
    .filter(a => a.position && a.position.id > 0)
    .map(a => {
      const country = a.nationalityId !== undefined ? countries.get(a.nationalityId) : undefined;
      return {
        id: `ply_365_${a.id}`,
        name: a.name.trim(),
        number: a.jerseyNum && a.jerseyNum > 0 ? a.jerseyNum : 0,
        position: a.formationPosition?.name || a.position?.name || 'Jugador',
        team_id: SHABAB_TEAM_ID,
        team_name: SHABAB_TEAM_NAME,
        photo_url: athletePhotoUrl(a),
        age: a.age && a.age > 0 ? a.age : undefined,
        nationality: country?.name || 'Jordania',
        flag_url: country ? countryFlagUrl(country) : undefined,
      };
    });

  if (players.length === 0) {
    throw new Error('365scores no devolvió jugadores para Shabab Al Ordon');
  }

  console.log(`Scraped ${players.length} players from 365scores.`);
  return players;
}
