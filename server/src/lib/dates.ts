/**
 * Date-only helpers. Trip dates are calendar dates ("YYYY-MM-DD") with no time zone,
 * stored as strings so that a trip on 9 October is 9 October for every viewer.
 * All arithmetic is done in UTC to avoid daylight-saving drift.
 */

const DAY_MS = 86_400_000;

export function parseIsoDate(value: string): number {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function formatIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return formatIsoDate(parseIsoDate(value) + days * DAY_MS);
}

/** Inclusive number of calendar days between two dates (same day = 1). */
export function inclusiveDayCount(start: string, end: string): number {
  return Math.round((parseIsoDate(end) - parseIsoDate(start)) / DAY_MS) + 1;
}

/** Every date from start to end inclusive. */
export function dateRange(start: string, end: string): string[] {
  const count = inclusiveDayCount(start, end);
  return Array.from({ length: Math.max(count, 0) }, (_, index) => addDays(start, index));
}
