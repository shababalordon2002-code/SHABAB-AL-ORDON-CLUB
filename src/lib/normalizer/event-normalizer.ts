import { NormalizedEvent, RawLongoMatchEvent, Player, PlayerMapping } from '@/types';

/**
 * Converts raw LongoMatch parsed XML events into canonical NormalizedEvent entities.
 * Automatically computes minute, second, duration, end_x/end_y coordinates,
 * and flags unmapped players as "Jugador pendiente de asociar".
 */
export function normalizeLongoMatchEvents(
  rawEvents: RawLongoMatchEvent[],
  matchId: string,
  playersList: Player[],
  playerMappings: PlayerMapping[]
): { normalizedEvents: NormalizedEvent[]; unmappedPlayerNames: string[] } {
  const normalizedEvents: NormalizedEvent[] = [];
  const unmappedNamesSet = new Set<string>();

  const now = new Date().toISOString();

  // Fast lookup: longomatch_name -> player_id
  const mappingMap = new Map<string, string>();
  playerMappings.forEach(pm => {
    mappingMap.set(pm.longomatch_name.toLowerCase().trim(), pm.player_id);
  });

  // Fast lookup: player.name -> player_id
  const playerMap = new Map<string, string>();
  playersList.forEach(p => {
    playerMap.set(p.name.toLowerCase().trim(), p.id);
  });

  rawEvents.forEach((raw, idx) => {
    let resolvedPlayerId: string | null = null;
    let resolvedPlayerName: string = 'Jugador pendiente de asociar';

    if (raw.player && raw.player.trim().length > 0) {
      const cleanName = raw.player.trim();
      const lowerName = cleanName.toLowerCase();

      if (mappingMap.has(lowerName)) {
        resolvedPlayerId = mappingMap.get(lowerName)!;
        const officialPlayer = playersList.find(p => p.id === resolvedPlayerId);
        resolvedPlayerName = officialPlayer ? officialPlayer.name : cleanName;
      } else if (playerMap.has(lowerName)) {
        resolvedPlayerId = playerMap.get(lowerName)!;
        const officialPlayer = playersList.find(p => p.id === resolvedPlayerId);
        resolvedPlayerName = officialPlayer ? officialPlayer.name : cleanName;
      } else {
        // Player name present in XML but not in canonical DB
        resolvedPlayerName = `${cleanName} (Pendiente de asociar)`;
        unmappedNamesSet.add(cleanName);
      }
    }

    const eventId = `norm_${matchId}_${idx + 1}_${Math.random().toString(36).substr(2, 6)}`;

    // Timestamp calculations
    const timestamp = raw.start !== undefined ? raw.start : null;
    const minute = timestamp !== null ? Math.floor(timestamp / 60) : null;
    const second = timestamp !== null ? Math.floor(timestamp % 60) : null;

    let duration: number | null = null;
    if (raw.stop !== undefined && raw.start !== undefined) {
      duration = Math.max(0, parseFloat((raw.stop - raw.start).toFixed(1)));
    }

    // Normalized coordinates (0 to 100)
    let x: number | null = raw.x !== undefined ? raw.x : null;
    let y: number | null = raw.y !== undefined ? raw.y : null;
    let end_x: number | null = raw.end_x !== undefined ? raw.end_x : null;
    let end_y: number | null = raw.end_y !== undefined ? raw.end_y : null;

    if (x !== null && x > 100) x = parseFloat((x / 10).toFixed(1));
    if (y !== null && y > 100) y = parseFloat((y / 10).toFixed(1));
    if (end_x !== null && end_x > 100) end_x = parseFloat((end_x / 10).toFixed(1));
    if (end_y !== null && end_y > 100) end_y = parseFloat((end_y / 10).toFixed(1));

    const normalized: NormalizedEvent = {
      event_id: eventId,
      source_event_id: raw.sourceId || null,
      match_id: matchId,
      team_id: raw.team ? `team_${raw.team.toLowerCase().replace(/\s+/g, '_')}` : null,
      team_name: raw.team || null,
      player_id: resolvedPlayerId,
      player_name: resolvedPlayerName,
      event_type: raw.name || raw.category || 'Evento Generico',
      category: raw.category || 'General',
      subcategory: raw.subcategory || null,
      timestamp,
      minute,
      second,
      duration,
      period: raw.period !== undefined ? raw.period : null,
      x,
      y,
      end_x,
      end_y,
      outcome: raw.outcome || null,
      metadata: raw.attributes || {},
      source: 'longomatch',
      created_at: now,
      updated_at: now
    };

    normalizedEvents.push(normalized);
  });

  return {
    normalizedEvents,
    unmappedPlayerNames: Array.from(unmappedNamesSet)
  };
}
