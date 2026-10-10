import mongoose, { type QueryFilter, type SortOrder } from 'mongoose';
import { z } from 'zod';
import { notFound } from '../../lib/http.js';
import { lineText } from '../../lib/validation.js';
import {
  BUDGET_BANDS,
  DestinationModel,
  REGIONS,
  SEASONS,
  SEASON_KEYS,
  TRAVEL_STYLES,
  type Destination,
} from './destination.model.js';

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .max(200)
    .transform((value) => value.split(',').map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).max(values.length))
    .optional();

export const destinationListQuerySchema = z
  .object({
    q: lineText(80).optional(),
    region: csvEnum(REGIONS),
    style: csvEnum(TRAVEL_STYLES),
    budget: csvEnum(BUDGET_BANDS),
    season: csvEnum(SEASON_KEYS),
    sort: z.enum(['featured', 'name', 'cost-asc', 'cost-desc']).default('featured'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(9),
  })
  .strict();

export type DestinationListQuery = z.infer<typeof destinationListQuerySchema>;

export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid destination').max(80);

const SORTS: Record<DestinationListQuery['sort'], Record<string, SortOrder>> = {
  featured: { featuredRank: 1, name: 1 },
  name: { name: 1 },
  'cost-asc': { dailyTotalMinor: 1, name: 1 },
  'cost-desc': { dailyTotalMinor: -1, name: 1 },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type DestinationRecord = Destination & { _id: mongoose.Types.ObjectId };

export function toDestinationCard(doc: DestinationRecord) {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    country: doc.country,
    region: doc.region,
    location: { lat: doc.location?.lat ?? 0, lng: doc.location?.lng ?? 0 },
    summary: doc.summary,
    heroImage: doc.heroImage,
    travelStyles: doc.travelStyles,
    bestMonths: doc.bestMonths,
    suggestedDays: doc.suggestedDays,
    dailyTotalMinor: doc.dailyTotalMinor,
    currency: doc.costs?.currency ?? 'USD',
    budgetBand: doc.budgetBand,
  };
}

export type DestinationCardDto = ReturnType<typeof toDestinationCard>;

export function toDestinationDetail(doc: DestinationRecord) {
  return {
    ...toDestinationCard(doc),
    description: doc.description,
    gallery: doc.gallery,
    seasonNote: doc.seasonNote,
    costs: doc.costs,
    highlights: doc.highlights.map((item) => ({ title: item.title, body: item.body })),
    tips: doc.tips,
  };
}

/** Builds the Mongo filter. Operator objects are created here, never taken from input, and marked trusted. */
export function buildDestinationFilter(query: DestinationListQuery): QueryFilter<Destination> {
  const filter: QueryFilter<Destination> = { published: true };
  if (query.region?.length) filter.region = mongoose.trusted({ $in: query.region });
  if (query.style?.length) filter.travelStyles = mongoose.trusted({ $in: query.style });
  if (query.budget?.length) filter.budgetBand = mongoose.trusted({ $in: query.budget });
  if (query.season?.length) {
    const months = [...new Set(query.season.flatMap((key) => SEASONS[key]))];
    filter.bestMonths = mongoose.trusted({ $in: months });
  }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { country: pattern }, { summary: pattern }];
  }
  return filter;
}

export async function listDestinations(query: DestinationListQuery) {
  const filter = buildDestinationFilter(query);
  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    DestinationModel.find(filter).sort(SORTS[query.sort]).skip(skip).limit(query.limit).lean<DestinationRecord[]>(),
    DestinationModel.countDocuments(filter),
  ]);
  return {
    items: docs.map(toDestinationCard),
    meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getDestinationBySlug(slug: string) {
  const doc = await DestinationModel.findOne({ slug, published: true }).lean<DestinationRecord>();
  if (!doc) throw notFound('Destination');

  const candidates = await DestinationModel.find({
    published: true,
    _id: mongoose.trusted({ $ne: doc._id }),
    $or: [{ region: doc.region }, { travelStyles: mongoose.trusted({ $in: doc.travelStyles }) }],
  })
    .sort({ featuredRank: 1 })
    .limit(12)
    .lean<DestinationRecord[]>();

  // Rank by shared styles, then same region.
  const related = candidates
    .map((candidate) => ({
      candidate,
      score:
        candidate.travelStyles.filter((style) => doc.travelStyles.includes(style)).length +
        (candidate.region === doc.region ? 1.5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ candidate }) => toDestinationCard(candidate));

  return { ...toDestinationDetail(doc), related };
}

export async function getDestinationFacets() {
  const [styleCounts, regions, total, candidates] = await Promise.all([
    Promise.all(TRAVEL_STYLES.map(async (style) => ({ value: style, count: await DestinationModel.countDocuments({ published: true, travelStyles: style }) }))),
    Promise.all(REGIONS.map(async (region) => ({ value: region, count: await DestinationModel.countDocuments({ published: true, region }) }))),
    DestinationModel.countDocuments({ published: true }),
    DestinationModel.find({ published: true }).sort({ featuredRank: 1 }).limit(60).lean<DestinationRecord[]>(),
  ]);

  // A representative photo per style: the highest-ranked place with that tag, avoiding repeats.
  const used = new Set<string>();
  const styles = styleCounts.map((entry) => {
    const cover =
      candidates.find((item) => item.travelStyles.includes(entry.value) && !used.has(item.slug)) ??
      candidates.find((item) => item.travelStyles.includes(entry.value));
    if (cover) used.add(cover.slug);
    return { ...entry, cover: cover ? { name: cover.name, slug: cover.slug, image: cover.heroImage } : null };
  });

  return { styles, regions, total };
}

/** Returns published destinations for the given IDs, preserving no particular order. */
export async function findPublishedByIds(ids: readonly string[]) {
  if (ids.length === 0) return [];
  return DestinationModel.find({ _id: mongoose.trusted({ $in: ids }), published: true }).lean<DestinationRecord[]>();
}
