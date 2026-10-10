import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from '../config/env.js';
import { escapeCsvCell, safeFilename, toCsv } from '../lib/csv.js';
import { addDays, dateRange, inclusiveDayCount } from '../lib/dates.js';
import { divideRounded, minorToDecimalString } from '../lib/money.js';
import { isoDateSchema } from '../lib/validation.js';
import { findUnsafeKey } from '../middleware/security.js';
import { passwordProblem } from '../modules/auth/password.js';
import { budgetBandFor } from '../modules/destinations/destination.model.js';
import { computeBudget } from '../modules/trips/budget.js';

describe('money', () => {
  it('rounds integer division half up', () => {
    expect(divideRounded(10, 3)).toBe(3);
    expect(divideRounded(11, 2)).toBe(6);
    expect(divideRounded(5, 2)).toBe(3);
    expect(divideRounded(4, 2)).toBe(2);
    expect(divideRounded(0, 7)).toBe(0);
    expect(divideRounded(-5, 2)).toBe(-3);
  });

  it('rejects non-integers and zero divisors', () => {
    expect(() => divideRounded(1.5, 2)).toThrow(RangeError);
    expect(() => divideRounded(10, 0)).toThrow(RangeError);
  });

  it('formats minor units without floating-point error', () => {
    expect(minorToDecimalString(123456, 'INR')).toBe('1234.56');
    expect(minorToDecimalString(5, 'USD')).toBe('0.05');
    expect(minorToDecimalString(-1050, 'EUR')).toBe('-10.50');
    expect(minorToDecimalString(4500, 'JPY')).toBe('4500');
    // 0.1 + 0.2 style errors cannot occur because values never become floats.
    expect(minorToDecimalString(10 + 20, 'USD')).toBe('0.30');
  });
});

describe('budget', () => {
  const day = (id: string, items: Array<[string, number]>) => ({
    _id: id,
    activities: items.map(([category, estimatedCostMinor]) => ({ category, estimatedCostMinor })),
  });

  it('totals by category and by day', () => {
    const budget = computeBudget({
      days: [day('d1', [['food', 1500], ['transport', 4000]]), day('d2', [['food', 2500], ['activities', 999]])],
      travelerCount: 2,
      budgetTargetMinor: 10_000,
    });
    expect(budget.byCategory).toEqual({ transport: 4000, accommodation: 0, food: 4000, activities: 999, miscellaneous: 0 });
    expect(budget.byDay).toEqual([
      { dayId: 'd1', totalMinor: 5500 },
      { dayId: 'd2', totalMinor: 3499 },
    ]);
    expect(budget.totalMinor).toBe(8999);
    expect(budget.perPersonMinor).toBe(4500); // 4499.5 rounds half up
    expect(budget.remainingMinor).toBe(1001);
    expect(budget.usedBasisPoints).toBe(8999);
    expect(budget.activityCount).toBe(4);
  });

  it('reports overspend as a negative remainder and handles no target', () => {
    const over = computeBudget({ days: [day('d1', [['accommodation', 50_000]])], travelerCount: 3, budgetTargetMinor: 40_000 });
    expect(over.remainingMinor).toBe(-10_000);
    expect(over.perPersonMinor).toBe(16_667);
    const noTarget = computeBudget({ days: [], travelerCount: 1, budgetTargetMinor: 0 });
    expect(noTarget.usedBasisPoints).toBeNull();
    expect(noTarget.totalMinor).toBe(0);
  });
});

describe('dates', () => {
  it('counts inclusive days and builds ranges across month and leap boundaries', () => {
    expect(inclusiveDayCount('2026-10-09', '2026-10-09')).toBe(1);
    expect(inclusiveDayCount('2026-10-09', '2026-10-08')).toBe(0);
    expect(dateRange('2028-02-27', '2028-03-01')).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('only accepts real calendar dates', () => {
    expect(isoDateSchema.safeParse('2026-02-29').success).toBe(false);
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-1-01').success).toBe(false);
    expect(isoDateSchema.safeParse('1999-12-31').success).toBe(false);
  });
});

describe('csv safety', () => {
  it.each(['=SUM(A1:A2)', '+1+1', '-2+3', '@cmd', '\tTAB', '\rCR'])('neutralises formula prefix %j', (value) => {
    expect(escapeCsvCell(value).startsWith(`"'`)).toBe(true);
  });

  it('quotes cells and doubles embedded quotes', () => {
    expect(escapeCsvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(42)).toBe('"42"');
  });

  it('produces CRLF rows with a BOM', () => {
    expect(toCsv([['a', 'b'], ['c']])).toBe('﻿"a","b"\r\n"c"\r\n');
  });

  it('builds safe filenames', () => {
    expect(safeFilename('../../etc/passwd"; rm', 'csv')).toBe('etcpasswd-rm.csv');
    expect(safeFilename('Autumn in Kyoto!', 'csv')).toBe('autumn-in-kyoto.csv');
    expect(safeFilename('???', 'csv')).toBe('voyage-trip.csv');
  });
});

describe('operator-key detection', () => {
  it('finds operator and dotted keys at any depth', () => {
    expect(findUnsafeKey({ email: { $gt: '' } })).toBe('$gt');
    expect(findUnsafeKey({ a: [{ b: { 'c.d': 1 } }] })).toBe('c.d');
    expect(findUnsafeKey({ title: 'Price is $5 total' })).toBeNull();
    expect(findUnsafeKey(JSON.parse('{"__proto__": {"admin": true}}'))).toBe('__proto__');
  });
});

describe('password policy', () => {
  it('rejects common passwords and passwords containing the email name', () => {
    expect(passwordProblem('password123', 'a@b.co')).not.toBeNull();
    expect(passwordProblem('priya-is-travelling', 'priya@example.com')).not.toBeNull();
    expect(passwordProblem('aaaaaaaaaaaa', 'x@y.co')).not.toBeNull();
    expect(passwordProblem('quiet lanterns over the river', 'priya@example.com')).toBeNull();
  });
});

describe('destination budget bands', () => {
  it('maps daily totals to bands', () => {
    expect(budgetBandFor(9_999)).toBe('essential');
    expect(budgetBandFor(12_000)).toBe('comfortable');
    expect(budgetBandFor(25_000)).toBe('indulgent');
  });
});

describe('environment validation', () => {
  const base = { SESSION_SECRET: 'x'.repeat(40), MONGODB_URI: 'mongodb://localhost/test' };

  it('requires a long session secret', () => {
    expect(() => loadEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(EnvValidationError);
  });

  it('requires exact https origins and a real secret in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS/);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(EnvValidationError);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: 'http://voyage.example' })).toThrow(EnvValidationError);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: 'https://voyage.app', SESSION_SECRET: `change-me-${'x'.repeat(40)}` })).toThrow(
      /SESSION_SECRET/,
    );
    expect(loadEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: 'https://voyage.app' }).CORS_ORIGINS).toEqual(['https://voyage.app']);
  });

  it('rejects origins with paths', () => {
    expect(() => loadEnv({ ...base, CORS_ORIGINS: 'http://localhost:5173/app' })).toThrow(/exact origin/);
  });

  it('never echoes secret values in errors', () => {
    try {
      loadEnv({ ...base, SESSION_SECRET: 'tiny-secret-value' });
    } catch (error) {
      expect(String(error)).not.toContain('tiny-secret-value');
    }
  });
});
