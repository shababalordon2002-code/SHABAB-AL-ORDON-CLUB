import { Match, NormalizedEvent } from '@/types';

/**
 * Resolves the match period (1 for 1st half, 2 for 2nd half) from event metadata, period field, or minute/timestamp.
 */
export function resolveEventPeriod(evt: NormalizedEvent): number {
  if (evt.period !== null && evt.period !== undefined && Number(evt.period) > 0) {
    return Number(evt.period);
  }
  if (evt.metadata?.period) {
    const p = Number(evt.metadata.period);
    if (!isNaN(p) && p > 0) return p;
  }
  const pName = (evt.metadata?.period_name || evt.metadata?.parte || '').toString();
  if (pName.includes('2')) return 2;
  if (pName.includes('1')) return 1;

  const min = evt.minute !== null && evt.minute !== undefined ? Number(evt.minute) : null;
  if (min !== null && min >= 45) return 2;

  const ts = evt.timestamp !== null && evt.timestamp !== undefined ? Number(evt.timestamp) : 0;
  if (ts >= 2700) return 2;

  return 1;
}

/**
 * Calculates the exact video timestamp (in seconds) for a given event,
 * handling both direct video file timestamps (e.g. LongoMatch XML) and match clock timestamps
 * with period offset compensation (p1_video_start_time / p2_video_start_time).
 */
export function calculateEventVideoTime(
  evt: NormalizedEvent,
  match?: Match | null,
  periodVideoOffsets?: Record<number, number>,
  leadInSeconds: number = 12
): number {
  const evtPeriod = resolveEventPeriod(evt);

  // 1. Resolve period video start offsets
  let p1Offset = 0;
  let p2Offset = 0;

  if (periodVideoOffsets) {
    p1Offset = periodVideoOffsets[1] ?? 0;
    p2Offset = periodVideoOffsets[2] ?? 0;
  }
  if (match) {
    if (match.p1_video_start_time != null) p1Offset = match.p1_video_start_time;
    if (match.p2_video_start_time != null) p2Offset = match.p2_video_start_time;
  }

  const pOffset = evtPeriod >= 2 ? p2Offset : p1Offset;

  // 2. Derive seconds elapsed within the specific period from minute/second or relative timestamp
  let rawSec = 0;
  if (evt.minute !== null && evt.minute !== undefined) {
    const min = Number(evt.minute);
    const sec = Number(evt.second) || 0;
    // If minute is 53 (absolute match minute), relative minute in 2nd half is 53 - 45 = 8
    // If minute is 8 (relative to 2nd half), relMin is 8
    const relMin = evtPeriod >= 2 && min >= 45 ? min - 45 : min;
    rawSec = relMin * 60 + sec;
  } else if (evt.timestamp !== null && evt.timestamp !== undefined) {
    const ts = Number(evt.timestamp);
    // If timestamp is absolute match seconds >= 2700 (45m), relative seconds in 2nd half is ts - 2700
    rawSec = evtPeriod >= 2 && ts >= 2700 ? ts - 2700 : ts;
  }

  // 3. Target video position = period video start offset + seconds in period
  const targetTime = pOffset + rawSec;

  return Math.max(0, targetTime - leadInSeconds);
}
