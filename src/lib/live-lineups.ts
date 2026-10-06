/**
 * Shared lineups and substitutions for a live tagging session.
 *
 * Substitutions are ordinary events. Every saved lineup change is also an event
 * ("Cambio de alineación") that carries the full lineup snapshot, so it syncs to the other
 * analysts in real time and shows up in the events feed and on the video timeline like any
 * other event. A team's current lineup is the one of its latest lineup-change event, falling
 * back to the lineup stored in the match.
 */
import { NormalizedEvent, Player, TeamLineupConfig } from '@/types';

export type TeamSide = 'home' | 'away';

export const LINEUP_CHANGE_EVENT_TYPE = 'Cambio de alineación';
export const LINEUP_CHANGE_CATEGORY = 'Alineación';

export function isLineupChangeEvent(e: NormalizedEvent | null | undefined): boolean {
  if (!e) return false;
  return e.metadata?.lineup_change === true || e.event_type === LINEUP_CHANGE_EVENT_TYPE;
}

export function isSubstitutionEvent(e: NormalizedEvent | null | undefined): boolean {
  if (!e || isLineupChangeEvent(e)) return false;
  return e.event_type === 'Sustitución' || e.category === 'Cambio' || Boolean(e.metadata?.player_in);
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();

/** Which team an event belongs to, or null when it can't be told. */
export function eventTeamSide(
  e: NormalizedEvent,
  homeTeamName: string | null | undefined,
  awayTeamName: string | null | undefined
): TeamSide | null {
  if (e.metadata?.team_side === 'home' || e.metadata?.team_side === 'away') return e.metadata.team_side;
  if (e.team_id === 'home_team') return 'home';
  if (e.team_id === 'away_team') return 'away';
  const team = norm(e.team_name);
  if (team && team === norm(homeTeamName)) return 'home';
  if (team && team === norm(awayTeamName)) return 'away';
  return null;
}

const savedAtOf = (e: NormalizedEvent) => {
  const at = Number(e.metadata?.saved_at);
  if (Number.isFinite(at) && at > 0) return at;
  const created = e.created_at ? Date.parse(e.created_at) : NaN;
  return Number.isFinite(created) ? created : 0;
};

/** Latest lineup-change event of a team (by when it was saved, not by match time). */
export function latestLineupEvent(
  events: NormalizedEvent[],
  side: TeamSide,
  homeTeamName: string | null | undefined,
  awayTeamName: string | null | undefined
): NormalizedEvent | null {
  let latest: NormalizedEvent | null = null;
  for (const e of events) {
    if (!isLineupChangeEvent(e) || !e.metadata?.lineup) continue;
    if (eventTeamSide(e, homeTeamName, awayTeamName) !== side) continue;
    if (!latest || savedAtOf(e) >= savedAtOf(latest)) latest = e;
  }
  return latest;
}

const playerLabel = (p: { name?: string; number?: number | string }) => {
  const name = (p.name || '').trim();
  const num = p.number !== undefined && p.number !== '' ? `#${p.number}` : '';
  return [num, name].filter(Boolean).join(' ') || 'Jugador';
};

/** Human summary of what changed between two lineups, one item per change. */
export function describeLineupChange(prev: TeamLineupConfig | null | undefined, next: TeamLineupConfig): string[] {
  const changes: string[] = [];
  if (!prev) return ['Alineación inicial'];
  if (prev.formation !== next.formation) changes.push(`Formación: ${prev.formation} → ${next.formation}`);

  const key = (p: { id: string }) => p.id;
  const prevStarters = new Map(prev.starters.map((p) => [key(p), p]));
  const nextStarters = new Map(next.starters.map((p) => [key(p), p]));
  next.starters.forEach((p) => {
    const before = prevStarters.get(key(p));
    if (!before) {
      changes.push(`Entra al once: ${playerLabel(p)}`);
    } else if (norm(before.name) !== norm(p.name) || String(before.number) !== String(p.number)) {
      changes.push(`${playerLabel(before)} → ${playerLabel(p)}`);
    } else if ((before.position || '') !== (p.position || '')) {
      changes.push(`${playerLabel(p)}: ${before.position || '-'} → ${p.position || '-'}`);
    }
  });
  prev.starters.forEach((p) => {
    if (!nextStarters.has(key(p))) changes.push(`Sale del once: ${playerLabel(p)}`);
  });

  const prevSubs = new Map(prev.substitutes.map((p) => [key(p), p]));
  const nextSubs = new Map(next.substitutes.map((p) => [key(p), p]));
  next.substitutes.forEach((p) => {
    const before = prevSubs.get(key(p));
    if (!before) {
      if (!prevStarters.has(key(p))) changes.push(`Nuevo suplente: ${playerLabel(p)}`);
    } else if (norm(before.name) !== norm(p.name) || String(before.number) !== String(p.number)) {
      changes.push(`Suplente ${playerLabel(before)} → ${playerLabel(p)}`);
    }
  });
  prev.substitutes.forEach((p) => {
    if (!nextSubs.has(key(p)) && !nextStarters.has(key(p))) changes.push(`Quitado de suplentes: ${playerLabel(p)}`);
  });

  if (changes.length === 0) {
    const sameStyle = JSON.stringify(prev.circleStyle) === JSON.stringify(next.circleStyle);
    changes.push(sameStyle ? 'Posiciones en el campo' : 'Equipación');
  }
  return changes;
}

/** True when two lineups are the same (nothing worth an event). */
export function sameLineup(a: TeamLineupConfig | null | undefined, b: TeamLineupConfig | null | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Players of a team built from its lineup (same shape the live scoreboard produces). */
export function lineupToPlayers(cfg: TeamLineupConfig, teamName: string, side: TeamSide): Player[] {
  const tId = side === 'home' ? 'team_home' : 'team_away';
  return [...cfg.starters, ...cfg.substitutes].map((item, idx) => ({
    id: item.id || `p_${tId}_${idx}`,
    name: item.name.trim() || `Jugador #${item.number}`,
    number: typeof item.number === 'number' ? item.number : parseInt(String(item.number)) || idx + 1,
    position: item.position || (idx === 0 ? 'POR' : 'JUG'),
    team_id: tId,
    team_name: teamName,
  }));
}

// ==================== LINEUP WRITE LOCK ====================
// While an analyst is inside a live session the lineup comes from the lineup-change events, so
// the generic save paths (match, analysis, session heartbeat) must not push lineups to Supabase:
// a stale copy would overwrite the one another analyst just saved. Only the explicit lineup
// writes of the Botonera (on a lineup change, a deleted change, and on exit) push them.
// In-memory per tab, set by the Botonera while the session is open.
const lineupLockedMatches = new Set<string>();

export function setLiveLineupLock(matchId: string, active: boolean): void {
  if (!matchId) return;
  if (active) lineupLockedMatches.add(matchId);
  else lineupLockedMatches.delete(matchId);
}

export function isLiveLineupLocked(matchId: string | null | undefined): boolean {
  return !!matchId && lineupLockedMatches.has(matchId);
}
