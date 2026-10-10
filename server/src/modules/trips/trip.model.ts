import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from 'mongoose';
import { CURRENCY_CODES } from '../../lib/money.js';

export const ACTIVITY_CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'miscellaneous'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const TRIP_LIMITS = {
  maxDays: 60,
  maxActivitiesPerDay: 25,
  maxTripsPerUser: 100,
  maxDestinationsPerTrip: 8,
  maxTravelers: 20,
} as const;

const activitySchema = new Schema({
  title: { type: String, required: true, maxlength: 120 },
  category: { type: String, required: true, enum: ACTIVITY_CATEGORIES },
  /** Local time of day, "HH:MM", or null when untimed. */
  time: { type: String, default: null, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  location: { type: String, default: '', maxlength: 120 },
  notes: { type: String, default: '', maxlength: 1000 },
  /** Estimated cost for the whole party, in the trip currency's minor unit. */
  estimatedCostMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
});

const daySchema = new Schema({
  /** Calendar date, "YYYY-MM-DD". */
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  activities: {
    type: [activitySchema],
    default: [],
    validate: {
      validator: (value: unknown[]) => value.length <= TRIP_LIMITS.maxActivitiesPerDay,
      message: 'Too many activities on one day',
    },
  },
});

const tripSchema = new Schema(
  {
    /** Owner. Always set from the authenticated session, never from request input. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    destinationIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Destination' }], default: [] },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    travelerCount: { type: Number, required: true, min: 1, max: TRIP_LIMITS.maxTravelers },
    currency: { type: String, required: true, enum: CURRENCY_CODES },
    budgetTargetMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    notes: { type: String, default: '', maxlength: 2000 },
    days: {
      type: [daySchema],
      default: [],
      validate: { validator: (value: unknown[]) => value.length <= TRIP_LIMITS.maxDays, message: 'Trip is too long' },
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

tripSchema.index({ userId: 1, startDate: 1 });

export type Trip = InferSchemaType<typeof tripSchema>;
export type TripDocument = HydratedDocument<Trip>;
export type TripDay = Trip['days'][number] & { _id: Types.ObjectId };
export type TripActivity = TripDay['activities'][number] & { _id: Types.ObjectId };
export const TripModel = model('Trip', tripSchema);
