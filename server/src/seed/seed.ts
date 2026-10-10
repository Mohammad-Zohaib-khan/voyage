import { budgetBandFor, DestinationModel } from '../modules/destinations/destination.model.js';
import { COST_ASSUMPTIONS, DESTINATIONS, type SeedImage } from './destinations.data.js';

const UNSPLASH_UTM = 'utm_source=voyage_travel_planner&utm_medium=referral';

function toImage(image: SeedImage) {
  return {
    src: `https://images.unsplash.com/${image.id}`,
    alt: image.alt,
    focus: image.focus ?? '50% 50%',
    credit: { name: image.credit, url: `${image.page}?${UNSPLASH_UTM}` },
  };
}

export function buildDestinationDocuments() {
  return DESTINATIONS.map((item) => {
    const [accommodation, food, transport, activities, miscellaneous] = item.costs;
    const dailyTotalMinor = accommodation + food + transport + activities + miscellaneous;
    return {
      slug: item.slug,
      location: item.location,
      name: item.name,
      country: item.country,
      region: item.region,
      summary: item.summary,
      description: item.description,
      heroImage: toImage(item.hero),
      gallery: item.gallery.map(toImage),
      travelStyles: item.travelStyles,
      bestMonths: item.bestMonths,
      seasonNote: item.seasonNote,
      suggestedDays: item.suggestedDays,
      costs: {
        currency: 'USD',
        perPersonPerDayMinor: { accommodation, food, transport, activities, miscellaneous },
        assumptions: COST_ASSUMPTIONS,
      },
      dailyTotalMinor,
      budgetBand: budgetBandFor(dailyTotalMinor),
      highlights: item.highlights,
      tips: item.tips,
      featuredRank: item.featuredRank,
      published: true,
    };
  });
}

/**
 * Idempotent: upserts destinations by slug. Destinations are editorial content owned by the
 * seed; user-created records (users, trips, saved places, sessions) are never touched.
 */
export async function seedDestinations(): Promise<{ upserted: number; updated: number }> {
  const docs = buildDestinationDocuments();
  const result = await DestinationModel.bulkWrite(
    docs.map((doc) => ({
      updateOne: { filter: { slug: doc.slug }, update: { $set: doc }, upsert: true },
    })),
  );
  return { upserted: result.upsertedCount, updated: result.modifiedCount };
}
