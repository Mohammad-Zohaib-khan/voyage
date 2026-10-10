import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const REGIONS = ['asia', 'europe', 'africa', 'americas', 'oceania', 'middle-east'] as const;
export const TRAVEL_STYLES = ['coast', 'mountains', 'culture', 'outdoors', 'slow-travel'] as const;
export const BUDGET_BANDS = ['essential', 'comfortable', 'indulgent'] as const;
export const SEASONS = {
  'dec-feb': [12, 1, 2],
  'mar-may': [3, 4, 5],
  'jun-aug': [6, 7, 8],
  'sep-nov': [9, 10, 11],
} as const;
export const SEASON_KEYS = Object.keys(SEASONS) as [keyof typeof SEASONS, ...(keyof typeof SEASONS)[]];
export const COST_CATEGORIES = ['accommodation', 'food', 'transport', 'activities', 'miscellaneous'] as const;

export type Region = (typeof REGIONS)[number];
export type TravelStyle = (typeof TRAVEL_STYLES)[number];
export type BudgetBand = (typeof BUDGET_BANDS)[number];

/** Illustrative per-person daily cost bands, in USD cents. */
export function budgetBandFor(dailyTotalMinor: number): BudgetBand {
  if (dailyTotalMinor < 12_000) return 'essential';
  if (dailyTotalMinor < 25_000) return 'comfortable';
  return 'indulgent';
}

const imageSchema = new Schema(
  {
    /** Base image URL on images.unsplash.com, without query parameters. */
    src: { type: String, required: true, maxlength: 300 },
    alt: { type: String, required: true, maxlength: 300 },
    /** Focal point for object-position, e.g. "50% 40%". */
    focus: { type: String, default: '50% 50%', maxlength: 20 },
    credit: {
      name: { type: String, required: true, maxlength: 120 },
      url: { type: String, required: true, maxlength: 300 },
    },
  },
  { _id: false },
);

const costSchema = new Schema(
  {
    accommodation: { type: Number, required: true, min: 0 },
    food: { type: Number, required: true, min: 0 },
    transport: { type: Number, required: true, min: 0 },
    activities: { type: Number, required: true, min: 0 },
    miscellaneous: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const destinationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    name: { type: String, required: true, maxlength: 120 },
    country: { type: String, required: true, maxlength: 80 },
    region: { type: String, required: true, enum: REGIONS },
    summary: { type: String, required: true, maxlength: 300 },
    description: { type: [String], default: [] },
    heroImage: { type: imageSchema, required: true },
    gallery: { type: [imageSchema], default: [] },
    travelStyles: { type: [String], enum: TRAVEL_STYLES, default: [] },
    bestMonths: { type: [Number], default: [] },
    seasonNote: { type: String, maxlength: 300, default: '' },
    suggestedDays: {
      min: { type: Number, required: true, min: 1 },
      max: { type: Number, required: true, min: 1 },
    },
    costs: {
      currency: { type: String, required: true, default: 'USD' },
      /** Illustrative per-person, per-day estimates in minor units. Not live prices. */
      perPersonPerDayMinor: { type: costSchema, required: true },
      assumptions: { type: String, required: true, maxlength: 500 },
    },
    dailyTotalMinor: { type: Number, required: true, min: 0 },
    budgetBand: { type: String, enum: BUDGET_BANDS, required: true },
    highlights: {
      type: [{ title: { type: String, required: true }, body: { type: String, required: true } }],
      default: [],
    },
    tips: { type: [String], default: [] },
    featuredRank: { type: Number, default: null },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

destinationSchema.index({ published: 1, featuredRank: 1, name: 1 });
destinationSchema.index({ published: 1, region: 1 });
destinationSchema.index({ published: 1, travelStyles: 1 });
destinationSchema.index({ published: 1, budgetBand: 1 });
destinationSchema.index({ published: 1, dailyTotalMinor: 1 });

export type Destination = InferSchemaType<typeof destinationSchema>;
export type DestinationDocument = HydratedDocument<Destination>;
export const DestinationModel = model('Destination', destinationSchema);
