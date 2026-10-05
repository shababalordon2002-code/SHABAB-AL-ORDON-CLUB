/**
 * Per-analyst lineups and substitutions for a live tagging session.
 *
 * Like the chrono, each analyst keeps their own lineup and substitutions for a team once they
 * touch it (edit the lineup, add / edit / delete a substitution, or reset it). Until then the
 * team follows the shared stored state. When the analyst leaves and saves, only the teams they
 * touched overwrite what was stored: the last one to save wins, per team.
 *
 * The state lives in this browser's localStorage (keyed by match) so a reload keeps it.
 */
import { NormalizedEvent, TeamLineupConfig } from '@/types';

export type TeamSide = 'home' | 'away';

export interface AnalystTeamState {
  lineup: TeamLineupConfig | null;
  subs: NormalizedEvent[];
}

export type AnalystTeams = Partial<Record<TeamSide, AnalystTeamState>>;

const storageKey = (matchId: string) => `sao_analyst_personal_${matchId}`;

export function getAnalystTeams(matchId: string | null | undefined): AnalystTeams {
  if (!matchId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(matchId));
    return raw ? (JSON.parse(raw) as AnalystTeams) : {};
  } catch {
    return {};
  }
}

export function saveAnalystTeams(matchId: string, teams: AnalystTeams): void {
  if (!matchId || typeof window === 'undefined') return;
  try {
    if (Object.keys(teams).length === 0) {
      window.localStorage.removeItem(storageKey(matchId));
    } else {
      window.localStorage.setItem(storageKey(matchId), JSON.stringify(teams));
    }
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function clearAnalystTeams(matchId: string): void {
  saveAnalystTeams(matchId, {});
}

export function isSubstitutionEvent(e: NormalizedEvent | null | undefined): boolean {
  if (!e) return false;
  return e.event_type === 'Sustitución' || e.category === 'Cambio' || Boolean(e.metadata?.player_in);
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();

/** Which team a substitution belongs to, or null when it can't be told. */
export function eventTeamSide(
  e: NormalizedEvent,
  homeTeamName: string | null | undefined,
  awayTeamName: string | null | undefined
): TeamSide | null {
  if (e.team_id === 'home_team') return 'home';
  if (e.team_id === 'away_team') return 'away';
  const team = norm(e.team_name);
  if (team && team === norm(homeTeamName)) return 'home';
  if (team && team === norm(awayTeamName)) return 'away';
  return null;
}

/**
 * Replaces the substitutions of the teams this analyst has touched with their own copy, so a
 * list loaded from Supabase (or from another analyst's save) never overrides them.
 */
export function applyAnalystSubs(
  list: NormalizedEvent[],
  teams: AnalystTeams,
  homeTeamName: string | null | undefined,
  awayTeamName: string | null | undefined
): NormalizedEvent[] {
  const sides = Object.keys(teams) as TeamSide[];
  if (sides.length === 0) return list;
  const kept = list.filter((e) => {
    if (!isSubstitutionEvent(e)) return true;
    const side = eventTeamSide(e, homeTeamName, awayTeamName);
    return !side || !teams[side];
  });
  const own = sides.flatMap((side) => teams[side]?.subs || []);
  const keptIds = new Set(kept.map((e) => e.event_id));
  return [...kept, ...own.filter((e) => !keptIds.has(e.event_id))];
}

// ==================== LINEUP WRITE LOCK ====================
// While an analyst is inside a live session their lineups are personal, so the generic save
// paths (match, analysis, session heartbeat) must not push lineups to Supabase: they would
// overwrite the lineup another analyst just saved. Only the explicit per-team save on exit
// writes them. In-memory per tab, set by the Botonera while the session is open.
const lineupLockedMatches = new Set<string>();

export function setLiveLineupLock(matchId: string, active: boolean): void {
  if (!matchId) return;
  if (active) lineupLockedMatches.add(matchId);
  else lineupLockedMatches.delete(matchId);
}

export function isLiveLineupLocked(matchId: string | null | undefined): boolean {
  return !!matchId && lineupLockedMatches.has(matchId);
}
