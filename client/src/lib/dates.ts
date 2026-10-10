import type { Preferences } from './types';

/**
 * Trip dates are calendar dates ("YYYY-MM-DD") with no time zone. They are parsed as UTC
 * midnight and formatted in UTC so a date never shifts by a day in any viewer's time zone.
 */

const DAY_MS = 86_400_000;

export function parseIso(value: string): Date {
  const [y = 1970, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today in the viewer's local calendar, as an ISO date. */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDaysIso(value: string, days: number): string {
  return toIso(new Date(parseIso(value).getTime() + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / DAY_MS);
}

export function inclusiveDays(start: string, end: string): number {
  return daysBetween(start, end) + 1;
}

type DateFormat = Preferences['dateFormat'];

export function formatDate(value: string, format: DateFormat = 'd MMM yyyy'): string {
  if (format === 'yyyy-MM-dd') return value;
  const date = parseIso(value);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return format === 'MMM d, yyyy' ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
}

export function formatRange(start: string, end: string, format: DateFormat = 'd MMM yyyy'): string {
  if (start === end) return formatDate(start, format);
  return `${formatDate(start, format)} – ${formatDate(end, format)}`;
}

export function weekday(value: string, style: 'long' | 'short' = 'short'): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: style, timeZone: 'UTC' }).format(parseIso(value));
}

export type TripStatus = 'upcoming' | 'ongoing' | 'past';

export function tripStatus(start: string, end: string, today = todayIso()): TripStatus {
  if (end < today) return 'past';
  if (start > today) return 'upcoming';
  return 'ongoing';
}

export function relativeStart(start: string, today = todayIso()): string {
  const days = daysBetween(today, start);
  if (days === 0) return 'Starts today';
  if (days === 1) return 'Starts tomorrow';
  if (days > 1 && days < 60) return `In ${days} days`;
  if (days >= 60) return `In ${Math.round(days / 30)} months`;
  return '';
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
