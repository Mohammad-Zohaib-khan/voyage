import { isValidObjectId } from 'mongoose';
import { z, type ZodType } from 'zod';
import { HttpError } from './http.js';

/** Parse untrusted input against a schema, converting failures into a 400 with field issues. */
export function parseInput<S extends ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Some fields need attention',
      result.error.issues.slice(0, 20).map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** A 24-hex MongoDB ObjectId supplied as a string. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Invalid identifier')
  .refine((value) => isValidObjectId(value), 'Invalid identifier');

/** Trimmed single-line text with bounded length. Control characters are rejected. */
export const lineText = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? 'Required' : `Use at least ${min} characters`)
    .max(max, `Use ${max} characters or fewer`)
    // eslint-disable-next-line no-control-regex -- intentionally matching control characters to reject them
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Contains unsupported characters');

/** Trimmed multi-line text. Newlines and tabs are allowed; other control characters are not. */
export const multilineText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer`)
    // eslint-disable-next-line no-control-regex -- intentionally matching control characters to reject them
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Contains unsupported characters');

/** Calendar date without time zone, e.g. 2026-10-09. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 2000 && y <= 2100;
  }, 'Enter a real calendar date');
