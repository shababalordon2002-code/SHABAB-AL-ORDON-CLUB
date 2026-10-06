// Helpers to keep Supabase egress (outgoing traffic, billed per GB) low without
// changing what the app reads or writes.

// Columns read back from `matches` / `match_analyses` / `analysis_sessions` before a save
// ("a fuego" protection). Selecting only these instead of `*` avoids downloading the
// heavy `events` JSONB blob on every autosave / heartbeat.
export const MATCH_PRESERVE_COLUMNS =
  'id, video_url, video_type, video_source_name, p1_video_start_time, p2_video_start_time, period_adjustments, botonera_template_id, home_lineup, away_lineup';
export const ANALYSIS_PRESERVE_COLUMNS =
  'id, match_id, status, created_at, analyst_name, video_url, video_type, video_source_name, p1_video_start_time, p2_video_start_time, period_adjustments, botonera_template_id, home_lineup, away_lineup';
export const SESSION_PRESERVE_COLUMNS =
  'id, match_id, analyst_name, match_title, video_url, video_type, video_source_name, p1_video_start_seconds, p2_video_start_seconds, period_adjustments, botonera_template_id, home_lineup, away_lineup';

// Runs a select with a narrow column list; if the table is missing one of those columns
// (a migration not applied yet), retries with `*` so behavior never degrades.
export async function selectWithFallback(
  run: (columns: string) => PromiseLike<{ data: any; error: any }>,
  columns: string
): Promise<{ data: any; error: any }> {
  const res = await run(columns);
  if (res.error && /column|does not exist/i.test(res.error.message || '')) {
    return run('*');
  }
  return res;
}

// JSON comparison independent of object key order (Postgres jsonb reorders keys).
function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

// True when every field of `next` (except the ignored ones) already holds the same value
// in `existing` — i.e. the write would be a no-op. Skipping no-op writes avoids a Realtime
// broadcast to every connected client, each of which would then re-download data.
export function isNoOpUpdate(
  existing: Record<string, any> | null | undefined,
  next: Record<string, any>,
  ignore: string[] = ['updated_at']
): boolean {
  if (!existing) return false;
  return Object.keys(next).every((k) => {
    if (ignore.includes(k)) return true;
    if (!(k in existing)) return false;
    let a = existing[k];
    if (typeof a === 'string' && typeof next[k] === 'object' && next[k] !== null) {
      try { a = JSON.parse(a); } catch { /* compare as-is */ }
    }
    return stableStringify(a ?? null) === stableStringify(next[k] ?? null);
  });
}

// Match id a Realtime postgres_changes payload refers to, or null when it can't be told
// (e.g. a DELETE on a table without REPLICA IDENTITY FULL only carries the primary key).
export function realtimeMatchId(table: string, payload: any): string | null {
  const row = (payload?.new && Object.keys(payload.new).length > 0 ? payload.new : payload?.old) || {};
  if (table === 'matches') return row.id || null;
  if (row.match_id) return row.match_id;
  return null;
}

// Collects the match ids touched by Realtime events during a debounce window, then hands
// them to `flush` (or `null` when any event couldn't be attributed -> caller does a full sync).
export function createMatchChangeBatcher(
  flush: (matchIds: string[] | null) => void,
  delayMs: number
) {
  let pending = new Set<string>();
  let needsFull = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    push(table: string, payload: any) {
      const id = realtimeMatchId(table, payload);
      if (id) pending.add(id);
      else needsFull = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const ids = needsFull ? null : Array.from(pending);
        pending = new Set();
        needsFull = false;
        timer = null;
        flush(ids);
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
