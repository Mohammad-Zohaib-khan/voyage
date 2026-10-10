import { CURRENCIES, type CurrencyCode } from './constants';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}`;
  let existing = formatters.get(key);
  if (!existing) {
    existing = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      currencyDisplay: 'narrowSymbol',
    });
    formatters.set(key, existing);
  }
  return existing;
}

function digitsFor(currency: string): number {
  return currency in CURRENCIES ? CURRENCIES[currency as CurrencyCode].digits : 2;
}

/**
 * Display a minor-unit integer amount. Conversion to a float happens only here, at the edge,
 * for display; all arithmetic stays in integers on the server. Whole amounts drop the ".00";
 * "compact" rounds to whole units for glanceable figures.
 */
export function formatMoney(amountMinor: number, currency: string, options: { compact?: boolean } = {}): string {
  const digits = digitsFor(currency);
  const factor = 10 ** digits;
  const major = amountMinor / factor;
  if (options.compact) return formatter(currency, 0).format(Math.round(major));
  return formatter(currency, amountMinor % factor === 0 ? 0 : digits).format(major);
}

/**
 * Parse a user-typed amount ("1,250.5", "1250", "₹ 2,000") into integer minor units without
 * floating-point arithmetic. Returns null when the input is not a valid non-negative amount.
 */
export function parseMoneyToMinor(input: string, currency: CurrencyCode): number | null {
  const digits = CURRENCIES[currency].digits;
  if (input.includes('-')) return null;
  const cleaned = input.replace(/[\s,_]/g, '').replace(/^[^\d.]+/, '');
  if (cleaned === '') return 0;
  const match = /^(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const whole = match[1] ?? '0';
  const fraction = match[2] ?? '';
  if (fraction.length > digits) return null;
  const minorText = `${whole}${fraction.padEnd(digits, '0')}`.replace(/^0+(?=\d)/, '');
  const value = Number(minorText);
  return Number.isSafeInteger(value) ? value : null;
}

/** Turn minor units back into an editable string, e.g. 125050 → "1250.50". */
export function minorToInput(amountMinor: number, currency: CurrencyCode): string {
  const digits = CURRENCIES[currency].digits;
  if (digits === 0) return String(amountMinor);
  const factor = 10 ** digits;
  const whole = Math.floor(amountMinor / factor);
  const fraction = String(amountMinor % factor).padStart(digits, '0');
  return fraction === '0'.repeat(digits) ? String(whole) : `${whole}.${fraction}`;
}
