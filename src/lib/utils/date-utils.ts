/**
 * Helper to filter matches from September 1, 2026 onwards
 */
export function isMatchOnOrAfterSept2026(dateStr: string, timestampSec?: number): boolean {
  if (timestampSec && timestampSec > 0) {
    // 1788220800 is 2026-09-01T00:00:00Z
    return timestampSec >= 1788220800;
  }
  if (!dateStr) return false;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      if (year > 2026) return true;
      if (year === 2026) return month >= 9;
      return false;
    }
  }
  return true;
}
