'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Player, TeamCircleStyle } from '@/types';
import { dbStore } from '@/lib/store/db-store';
import { isPlaceholderPlayerName, isSamePlayerName, isShababTeamName } from '@/lib/squad';
import { PlayerAvatar } from '@/components/player/PlayerBadge';

// Short labels for the 365scores demarcaciones, for tight spots like the pitch
const POSITION_SHORT: Record<string, string> = {
  'portero': 'POR',
  'defensa central': 'DFC',
  'defensa lateral izquierdo': 'LI',
  'defensa lateral derecho': 'LD',
  'mediocampista defensivo': 'MCD',
  'mediocampista central': 'MC',
  'mediocampista ofensivo': 'MCO',
  'mediocampista izquierdo': 'MI',
  'mediocampista derecho': 'MD',
  'delantero izquierdo': 'EI',
  'delantero derecho': 'ED',
  'centro delantero': 'DC',
};

export function positionShort(position?: string | null): string {
  const key = (position || '').toLowerCase().trim();
  return POSITION_SHORT[key] || (position || '').slice(0, 3).toUpperCase();
}

// One Supabase sync shared by every pitch/modal mounted around the same time
let squadSync: { at: number; promise: Promise<Player[]> } | null = null;
function syncSquadOnce(): Promise<Player[]> {
  if (!squadSync || Date.now() - squadSync.at > 60_000) {
    squadSync = { at: Date.now(), promise: dbStore.syncPlayersFromSupabase().catch(() => dbStore.getPlayers()) };
  }
  return squadSync.promise;
}

/**
 * Returns a lookup from a lineup entry to its Shabab Al Ordon squad player (by id, then by
 * name). Always undefined for other teams: the player database only holds the Shabab squad.
 */
export function useSquadPlayerLookup(teamName?: string | null) {
  const isShabab = isShababTeamName(teamName);
  const [squad, setSquad] = useState<Player[]>([]);

  useEffect(() => {
    if (!isShabab) {
      setSquad([]);
      return;
    }
    let alive = true;
    setSquad(dbStore.getPlayers());
    syncSquadOnce().then((players) => {
      if (alive && players.length > 0) setSquad(players);
    });
    return () => {
      alive = false;
    };
  }, [isShabab]);

  return useCallback(
    (entry?: { id?: string; name?: string } | null): Player | undefined => {
      if (!entry || squad.length === 0) return undefined;
      const byId = entry.id ? squad.find((p) => p.id === entry.id) : undefined;
      if (byId) return byId;
      if (isPlaceholderPlayerName(entry.name)) return undefined;
      return squad.find((p) => isSamePlayerName(p.name, entry.name || ''));
    },
    [squad]
  );
}

/** Photo of a squad player framed in the team colour, with the shirt number badge. */
export function SquadPlayerToken({
  player,
  number,
  size = 36,
  circleStyle,
  highlight,
}: {
  player: Player;
  number?: number | string;
  size?: number;
  circleStyle?: TeamCircleStyle;
  /** Overrides the frame colour (e.g. amber for a substitute who came on) */
  highlight?: string;
}) {
  const frame = highlight || circleStyle?.primaryColor || '#dc2626';
  const shown = number !== undefined && number !== '' && Number(number) !== 0 ? number : player.number || '–';
  const badge = Math.max(14, Math.round(size * 0.44));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full p-[2px] shadow-md" style={{ background: frame }}>
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} size={size - 4} className="border-0" />
      </div>
      <span
        className="absolute -bottom-1 -right-1.5 rounded-full bg-slate-950 border border-amber-400/70 text-amber-300 font-black font-mono flex items-center justify-center leading-none shadow"
        style={{ minWidth: badge, height: badge, fontSize: Math.max(8, badge * 0.6), padding: '0 2px' }}
      >
        {shown}
      </span>
    </div>
  );
}
