import { describe, expect, it } from 'vitest';
import { safeNextPath } from '../features/auth/nextPath';
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, filtersToParams, toggleValue } from '../features/destinations/filters';
import { applyLayout, moveToDay, moveWithinDay } from '../features/trips/api';
import { addDaysIso, formatDate, formatRange, inclusiveDays, relativeStart, tripStatus } from '../lib/dates';
import { formatMoney, minorToInput, parseMoneyToMinor } from '../lib/money';
import type { Trip } from '../lib/types';

describe('money parsing and formatting', () => {
  it('parses typed amounts into integer minor units without floats', () => {
    expect(parseMoneyToMinor('1250', 'INR')).toBe(125000);
    expect(parseMoneyToMinor('1,250.5', 'INR')).toBe(125050);
    expect(parseMoneyToMinor('₹ 2,000.05', 'INR')).toBe(200005);
    expect(parseMoneyToMinor('0.1', 'USD')).toBe(10);
    expect(parseMoneyToMinor('150000', 'JPY')).toBe(150000);
    expect(parseMoneyToMinor('', 'EUR')).toBe(0);
  });

  it('rejects negatives, extra decimals and garbage', () => {
    expect(parseMoneyToMinor('-5', 'USD')).toBeNull();
    expect(parseMoneyToMinor('1.234', 'USD')).toBeNull();
    expect(parseMoneyToMinor('12.5', 'JPY')).toBeNull();
    expect(parseMoneyToMinor('12abc', 'USD')).toBeNull();
    expect(parseMoneyToMinor('1e5', 'USD')).toBeNull();
  });

  it('round-trips minor units through the edit field', () => {
    expect(minorToInput(125050, 'INR')).toBe('1250.50');
    expect(minorToInput(125000, 'INR')).toBe('1250');
    expect(minorToInput(5, 'USD')).toBe('0.05');
    expect(minorToInput(4500, 'JPY')).toBe('4500');
  });

  it('formats whole amounts without trailing zeros', () => {
    expect(formatMoney(240000, 'USD')).toMatch(/2,400$/);
    expect(formatMoney(240050, 'USD')).toMatch(/2,400\.50$/);
    expect(formatMoney(18049, 'USD', { compact: true })).toMatch(/180$/);
  });
});

describe('date-only handling', () => {
  it('formats calendar dates without time-zone drift', () => {
    expect(formatDate('2026-11-01')).toBe('1 Nov 2026');
    expect(formatDate('2026-11-01', 'MMM d, yyyy')).toBe('Nov 1, 2026');
    expect(formatDate('2026-11-01', 'yyyy-MM-dd')).toBe('2026-11-01');
    expect(formatRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
  });

  it('computes durations and status', () => {
    expect(inclusiveDays('2028-02-27', '2028-03-01')).toBe(4);
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(tripStatus('2026-10-10', '2026-10-12', '2026-10-09')).toBe('upcoming');
    expect(tripStatus('2026-10-08', '2026-10-12', '2026-10-09')).toBe('ongoing');
    expect(tripStatus('2026-10-01', '2026-10-08', '2026-10-09')).toBe('past');
    expect(relativeStart('2026-10-10', '2026-10-09')).toBe('Starts tomorrow');
  });
});

describe('destination filter URL state', () => {
  it('round-trips filters through query parameters', () => {
    const filters = { ...EMPTY_FILTERS, q: 'india', region: ['asia' as const], style: ['mountains' as const, 'culture' as const], sort: 'cost-asc' as const };
    const params = filtersToParams(filters);
    expect(params.toString()).toBe('q=india&region=asia&style=mountains%2Cculture&sort=cost-asc');
    expect(filtersFromParams(params)).toEqual(filters);
  });

  it('drops unknown values from hand-edited links', () => {
    const parsed = filtersFromParams(new URLSearchParams('region=atlantis,asia&style=coast,coast&sort=rating&budget=free'));
    expect(parsed.region).toEqual(['asia']);
    expect(parsed.style).toEqual(['coast']);
    expect(parsed.sort).toBe('featured');
    expect(parsed.budget).toEqual([]);
  });

  it('counts active filters and toggles values', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: '  ', region: ['asia'] })).toBe(1);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });
});

describe('sign-in return paths', () => {
  it('only allows same-site relative paths', () => {
    expect(safeNextPath('/app/trips/123?x=1')).toBe('/app/trips/123?x=1');
    expect(safeNextPath('https://evil.example')).toBe('/app');
    expect(safeNextPath('//evil.example')).toBe('/app');
    expect(safeNextPath('/\\evil.example')).toBe('/app');
    expect(safeNextPath(null)).toBe('/app');
  });
});

describe('itinerary layout helpers', () => {
  const activity = (id: string, order: number) => ({ id, title: id, category: 'food' as const, time: null, location: '', notes: '', estimatedCostMinor: 100, order });
  const trip = {
    days: [
      { id: 'd1', date: '2026-11-01', dayNumber: 1, activities: [activity('a', 0), activity('b', 1), activity('c', 2)] },
      { id: 'd2', date: '2026-11-02', dayNumber: 2, activities: [activity('d', 0)] },
    ],
  } as unknown as Trip;

  it('swaps neighbours and refuses to move past the edges', () => {
    expect(moveWithinDay(trip, 'd1', 'b', -1)).toEqual([{ dayId: 'd1', activityIds: ['b', 'a', 'c'] }]);
    expect(moveWithinDay(trip, 'd1', 'a', -1)).toBeNull();
    expect(moveWithinDay(trip, 'd1', 'c', 1)).toBeNull();
  });

  it('moves an activity to the end of another day', () => {
    expect(moveToDay(trip, 'd1', 'd2', 'b')).toEqual([
      { dayId: 'd1', activityIds: ['a', 'c'] },
      { dayId: 'd2', activityIds: ['d', 'b'] },
    ]);
    expect(moveToDay(trip, 'd1', 'd1', 'b')).toBeNull();
  });

  it('applies a layout optimistically and renumbers order', () => {
    const next = applyLayout(trip, [{ dayId: 'd1', activityIds: ['c', 'a', 'b'] }]);
    expect(next.days[0]?.activities.map((item) => [item.id, item.order])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
    expect(next.days[1]).toBe(trip.days[1]);
  });
});
