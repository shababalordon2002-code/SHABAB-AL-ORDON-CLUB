import { Player } from '@/types';

// The app's player database ("Jugadores") holds only the Shabab Al Ordon squad.
// Rival players live only inside each match lineup.
export const SHABAB_TEAM_ID = 'team_shabab_al_ordon';
export const SHABAB_TEAM_NAME = 'Shabab Al Ordon Club';

export function isShababTeamName(name?: string | null): boolean {
  const lower = (name || '').toLowerCase();
  return lower.includes('shabab') || lower.includes('ordon') || lower.includes('urdon');
}

export function isSquadPlayer(p: Pick<Player, 'team_id'>): boolean {
  return p.team_id === SHABAB_TEAM_ID;
}

// Empty lineup slots ("", "Jugador #7") are not real players
export function isPlaceholderPlayerName(name?: string | null): boolean {
  const trimmed = (name || '').trim();
  return !trimmed || /^jugador\s*#?\s*\d*$/i.test(trimmed);
}

function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Same player if names are equal, or every token of the shorter name is in the longer one
// (e.g. "Saif Suleiman" vs "Saif Suleiman Tamari").
export function isSamePlayerName(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  if (ta.join('') === tb.join('')) return true;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.length >= 2 && short.every(t => long.includes(t));
}

export function newCustomPlayerId(): string {
  return `ply_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
