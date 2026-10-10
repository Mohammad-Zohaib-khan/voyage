/**
 * Money is stored and calculated as integers in the currency's minor unit
 * (paise, cents, yen). Floating point is only used when formatting for display.
 */

export const CURRENCIES = {
  INR: { minorDigits: 2, label: 'Indian rupee' },
  USD: { minorDigits: 2, label: 'US dollar' },
  EUR: { minorDigits: 2, label: 'Euro' },
  GBP: { minorDigits: 2, label: 'British pound' },
  JPY: { minorDigits: 0, label: 'Japanese yen' },
  AUD: { minorDigits: 2, label: 'Australian dollar' },
  CAD: { minorDigits: 2, label: 'Canadian dollar' },
  SGD: { minorDigits: 2, label: 'Singapore dollar' },
  AED: { minorDigits: 2, label: 'UAE dirham' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

/** Upper bound for any single stored amount, in minor units. Keeps every sum well inside Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT_MINOR = 100_000_000_000; // e.g. 1,000,000,000.00

/** Integer division rounded half away from zero, for non-negative numerators and positive divisors. */
export function divideRounded(numerator: number, divisor: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new RangeError('divideRounded expects safe integers and a positive divisor');
  }
  const sign = numerator < 0 ? -1 : 1;
  const abs = Math.abs(numerator);
  return sign * Math.floor((abs * 2 + divisor) / (divisor * 2));
}

/** Render minor units as a plain decimal string, e.g. 123456 → "1234.56" (INR) or "123456" (JPY). */
export function minorToDecimalString(amountMinor: number, currency: CurrencyCode): string {
  const digits = CURRENCIES[currency].minorDigits;
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  if (digits === 0) return `${sign}${abs}`;
  const factor = 10 ** digits;
  const whole = Math.floor(abs / factor);
  const fraction = String(abs % factor).padStart(digits, '0');
  return `${sign}${whole}.${fraction}`;
}
