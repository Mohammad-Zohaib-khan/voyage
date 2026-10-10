import { z } from 'zod';
import { inclusiveDayCount } from '../../lib/dates.js';
import { CURRENCY_CODES, MAX_AMOUNT_MINOR } from '../../lib/money.js';
import { isoDateSchema, lineText, multilineText, objectIdSchema } from '../../lib/validation.js';
import { ACTIVITY_CATEGORIES, TRIP_LIMITS } from './trip.model.js';

const amountMinor = z
  .number({ error: 'Enter an amount' })
  .int('Use whole minor units')
  .min(0, 'Amount cannot be negative')
  .max(MAX_AMOUNT_MINOR, 'Amount is too large');

const destinationIds = z
  .array(objectIdSchema)
  .max(TRIP_LIMITS.maxDestinationsPerTrip, `Choose up to ${TRIP_LIMITS.maxDestinationsPerTrip} destinations`)
  .refine((ids) => new Set(ids).size === ids.length, 'Each destination can only be added once');

function checkDateRange(value: { startDate?: string | undefined; endDate?: string | undefined }, ctx: z.RefinementCtx) {
  if (!value.startDate || !value.endDate) return;
  const days = inclusiveDayCount(value.startDate, value.endDate);
  if (days < 1) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' });
  } else if (days > TRIP_LIMITS.maxDays) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: `Trips can be up to ${TRIP_LIMITS.maxDays} days long` });
  }
}

const tripFields = {
  title: lineText(120),
  destinationIds,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  travelerCount: z
    .number({ error: 'Enter the number of travellers' })
    .int()
    .min(1, 'At least one traveller')
    .max(TRIP_LIMITS.maxTravelers, `Up to ${TRIP_LIMITS.maxTravelers} travellers`),
  currency: z.enum(CURRENCY_CODES, { error: 'Choose a supported currency' }),
  budgetTargetMinor: amountMinor,
  notes: multilineText(2000),
};

export const createTripSchema = z
  .object({ ...tripFields, destinationIds: destinationIds.default([]), notes: tripFields.notes.default('') })
  .strict()
  .superRefine(checkDateRange);

export const updateTripSchema = z
  .object({
    title: tripFields.title.optional(),
    destinationIds: destinationIds.optional(),
    startDate: tripFields.startDate.optional(),
    endDate: tripFields.endDate.optional(),
    travelerCount: tripFields.travelerCount.optional(),
    currency: tripFields.currency.optional(),
    budgetTargetMinor: tripFields.budgetTargetMinor.optional(),
    notes: tripFields.notes.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, e.g. 09:30')
  .nullable();

export const createActivitySchema = z
  .object({
    title: lineText(120),
    category: z.enum(ACTIVITY_CATEGORIES, { error: 'Choose a category' }),
    time: timeSchema.default(null),
    location: lineText(120, 0).default(''),
    notes: multilineText(1000).default(''),
    estimatedCostMinor: amountMinor.default(0),
  })
  .strict();

export const updateActivitySchema = z
  .object({
    title: lineText(120).optional(),
    category: z.enum(ACTIVITY_CATEGORIES).optional(),
    time: timeSchema.optional(),
    location: lineText(120, 0).optional(),
    notes: multilineText(1000).optional(),
    estimatedCostMinor: amountMinor.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export const reorderSchema = z
  .object({
    days: z
      .array(
        z
          .object({
            dayId: objectIdSchema,
            activityIds: z.array(objectIdSchema).max(TRIP_LIMITS.maxActivitiesPerDay, `Up to ${TRIP_LIMITS.maxActivitiesPerDay} activities per day`),
          })
          .strict(),
      )
      .min(1)
      .max(TRIP_LIMITS.maxDays),
  })
  .strict();

export const tripListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strict();

export const tripParamsSchema = z.object({ tripId: objectIdSchema });
export const dayParamsSchema = z.object({ tripId: objectIdSchema, dayId: objectIdSchema });
export const activityParamsSchema = z.object({ tripId: objectIdSchema, dayId: objectIdSchema, activityId: objectIdSchema });

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
