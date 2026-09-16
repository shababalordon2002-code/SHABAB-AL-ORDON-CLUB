/**
 * Helper to filter matches from September 1, 2026 onwards
 */
export function isMatchOnOrAfterSept2026(dateStr: string, timestampSec?: number): boolean {
  if (timestampSec && timestampSec > 0) {
    // 1788220800 is 2026-09-01T00:00:00Z
    return timestampSec >= 1788220800;
  }
  if (!dateStr) return false;

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  if (dateStr.includes('.') || dateStr.includes('/')) {
    const separator = dateStr.includes('.') ? '.' : '/';
    const parts = dateStr.split(separator);
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }

  if (year !== null && month !== null && !isNaN(year) && !isNaN(month)) {
    if (year > 2026) return true;
    if (year === 2026) return month >= 9;
    return false;
  }

  return true;
}

