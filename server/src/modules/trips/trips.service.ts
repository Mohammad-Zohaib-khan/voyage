import type { Types } from 'mongoose';
import { dateRange, inclusiveDayCount } from '../../lib/dates.js';
import { HttpError, notFound } from '../../lib/http.js';
import { findPublishedByIds } from '../destinations/destinations.service.js';
import { computeBudget } from './budget.js';
import { TRIP_LIMITS, TripModel, type TripDocument } from './trip.model.js';
import type { CreateActivityInput, CreateTripInput, ReorderInput, UpdateActivityInput, UpdateTripInput } from './trips.schemas.js';

const tripNotFound = () => notFound('Trip');

/**
 * Every lookup is scoped by the owner's ID from the session. A trip that exists but belongs
 * to someone else is indistinguishable from one that does not exist (404).
 */
async function loadOwnedTrip(userId: string, tripId: string): Promise<TripDocument> {
  const trip = await TripModel.findOne({ _id: tripId, userId });
  if (!trip) throw tripNotFound();
  return trip;
}

async function assertDestinationsExist(ids: readonly string[]): Promise<void> {
  const found = await findPublishedByIds(ids);
  if (found.length !== new Set(ids).size) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Some fields need attention', [
      { path: 'destinationIds', message: 'One or more destinations are not available' },
    ]);
  }
}

type DestinationPreview = { id: string; slug: string; name: string; country: string; heroImage: unknown };

async function destinationPreviews(ids: readonly Types.ObjectId[]): Promise<Map<string, DestinationPreview>> {
  const docs = await findPublishedByIds(ids.map(String));
  return new Map(
    docs.map((doc) => [doc._id.toString(), { id: doc._id.toString(), slug: doc.slug, name: doc.name, country: doc.country, heroImage: doc.heroImage }]),
  );
}

function orderedPreviews(ids: readonly Types.ObjectId[], previews: Map<string, DestinationPreview>): DestinationPreview[] {
  return ids.map((id) => previews.get(id.toString())).filter((item): item is DestinationPreview => item !== undefined);
}

function toTripSummary(trip: TripDocument, previews: Map<string, DestinationPreview>) {
  const budget = computeBudget(trip);
  return {
    id: trip._id.toString(),
    title: trip.title,
    destinations: orderedPreviews(trip.destinationIds, previews),
    startDate: trip.startDate,
    endDate: trip.endDate,
    dayCount: trip.days.length,
    travelerCount: trip.travelerCount,
    currency: trip.currency,
    budgetTargetMinor: trip.budgetTargetMinor,
    notes: trip.notes,
    budget,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

async function toTripDetail(trip: TripDocument) {
  const previews = await destinationPreviews(trip.destinationIds);
  return {
    ...toTripSummary(trip, previews),
    days: trip.days.map((day, index) => ({
      id: day._id.toString(),
      date: day.date,
      dayNumber: index + 1,
      activities: day.activities.map((activity, order) => ({
        id: activity._id.toString(),
        title: activity.title,
        category: activity.category,
        time: activity.time ?? null,
        location: activity.location,
        notes: activity.notes,
        estimatedCostMinor: activity.estimatedCostMinor,
        order,
      })),
    })),
  };
}

export type TripDetailDto = Awaited<ReturnType<typeof toTripDetail>>;

export async function listTrips(userId: string, page: number, limit: number) {
  const filter = { userId };
  const [trips, total] = await Promise.all([
    TripModel.find(filter)
      .sort({ startDate: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    TripModel.countDocuments(filter),
  ]);
  const previews = await destinationPreviews(trips.flatMap((trip) => trip.destinationIds));
  return {
    items: trips.map((trip) => toTripSummary(trip, previews)),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getTrip(userId: string, tripId: string) {
  return toTripDetail(await loadOwnedTrip(userId, tripId));
}

export async function createTrip(userId: string, input: CreateTripInput) {
  const count = await TripModel.countDocuments({ userId });
  if (count >= TRIP_LIMITS.maxTripsPerUser) {
    throw new HttpError(409, 'LIMIT_REACHED', `You can keep up to ${TRIP_LIMITS.maxTripsPerUser} trips. Delete an old trip to add another.`);
  }
  await assertDestinationsExist(input.destinationIds);
  const trip = await TripModel.create({
    userId,
    title: input.title,
    destinationIds: input.destinationIds,
    startDate: input.startDate,
    endDate: input.endDate,
    travelerCount: input.travelerCount,
    currency: input.currency,
    budgetTargetMinor: input.budgetTargetMinor,
    notes: input.notes,
    days: dateRange(input.startDate, input.endDate).map((date) => ({ date, activities: [] })),
  });
  return toTripDetail(trip);
}

/**
 * Rebuild the day list for new dates. If the trip keeps its length, days shift with their
 * activities. Otherwise days are matched by date; dropping a day that still has activities is
 * refused so nothing is deleted silently.
 */
function reconcileDays(trip: TripDocument, startDate: string, endDate: string) {
  const newDates = dateRange(startDate, endDate);
  const existing = trip.days.map((day) => day.toObject() as { _id: Types.ObjectId; date: string; activities: unknown[] });

  if (newDates.length === existing.length) {
    return existing.map((day, index) => ({ ...day, date: newDates[index] as string }));
  }

  const byDate = new Map(existing.map((day) => [day.date, day]));
  const kept = new Set(newDates);
  const stranded = existing.filter((day) => !kept.has(day.date) && day.activities.length > 0);
  if (stranded.length > 0) {
    const activityCount = stranded.reduce((sum, day) => sum + day.activities.length, 0);
    throw new HttpError(
      409,
      'CONFLICT',
      `These dates would remove ${stranded.length} day${stranded.length === 1 ? '' : 's'} with ${activityCount} planned activit${activityCount === 1 ? 'y' : 'ies'}. Move or delete them first.`,
    );
  }
  return newDates.map((date) => byDate.get(date) ?? { date, activities: [] });
}

export async function updateTrip(userId: string, tripId: string, input: UpdateTripInput) {
  const trip = await loadOwnedTrip(userId, tripId);

  const startDate = input.startDate ?? trip.startDate;
  const endDate = input.endDate ?? trip.endDate;
  if (input.startDate !== undefined || input.endDate !== undefined) {
    const days = inclusiveDayCount(startDate, endDate);
    if (days < 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Some fields need attention', [
        { path: 'endDate', message: 'End date must be on or after the start date' },
      ]);
    }
    if (days > TRIP_LIMITS.maxDays) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Some fields need attention', [
        { path: 'endDate', message: `Trips can be up to ${TRIP_LIMITS.maxDays} days long` },
      ]);
    }
    if (startDate !== trip.startDate || endDate !== trip.endDate) {
      trip.set('days', reconcileDays(trip, startDate, endDate));
      trip.startDate = startDate;
      trip.endDate = endDate;
    }
  }

  if (input.destinationIds !== undefined) {
    await assertDestinationsExist(input.destinationIds);
    trip.set('destinationIds', input.destinationIds);
  }
  if (input.title !== undefined) trip.title = input.title;
  if (input.travelerCount !== undefined) trip.travelerCount = input.travelerCount;
  if (input.currency !== undefined) trip.currency = input.currency;
  if (input.budgetTargetMinor !== undefined) trip.budgetTargetMinor = input.budgetTargetMinor;
  if (input.notes !== undefined) trip.notes = input.notes;

  await trip.save();
  return toTripDetail(trip);
}

export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const result = await TripModel.deleteOne({ _id: tripId, userId });
  if (result.deletedCount !== 1) throw tripNotFound();
}

function findDay(trip: TripDocument, dayId: string) {
  const day = trip.days.id(dayId);
  if (!day) throw notFound('Day');
  return day;
}

export async function addActivity(userId: string, tripId: string, dayId: string, input: CreateActivityInput) {
  const trip = await loadOwnedTrip(userId, tripId);
  const day = findDay(trip, dayId);
  if (day.activities.length >= TRIP_LIMITS.maxActivitiesPerDay) {
    throw new HttpError(409, 'LIMIT_REACHED', `A day can hold up to ${TRIP_LIMITS.maxActivitiesPerDay} activities.`);
  }
  day.activities.push({
    title: input.title,
    category: input.category,
    time: input.time,
    location: input.location,
    notes: input.notes,
    estimatedCostMinor: input.estimatedCostMinor,
  });
  await trip.save();
  return toTripDetail(trip);
}

export async function updateActivity(userId: string, tripId: string, dayId: string, activityId: string, input: UpdateActivityInput) {
  const trip = await loadOwnedTrip(userId, tripId);
  const activity = findDay(trip, dayId).activities.id(activityId);
  if (!activity) throw notFound('Activity');
  if (input.title !== undefined) activity.title = input.title;
  if (input.category !== undefined) activity.category = input.category;
  if (input.time !== undefined) activity.time = input.time;
  if (input.location !== undefined) activity.location = input.location;
  if (input.notes !== undefined) activity.notes = input.notes;
  if (input.estimatedCostMinor !== undefined) activity.estimatedCostMinor = input.estimatedCostMinor;
  await trip.save();
  return toTripDetail(trip);
}

export async function deleteActivity(userId: string, tripId: string, dayId: string, activityId: string) {
  const trip = await loadOwnedTrip(userId, tripId);
  const day = findDay(trip, dayId);
  if (!day.activities.id(activityId)) throw notFound('Activity');
  // Rewrite the day's list rather than issuing a $pull, so the change is one plain $set.
  day.set(
    'activities',
    day.activities.filter((activity) => activity._id.toString() !== activityId).map((activity) => activity.toObject()),
  );
  await trip.save();
  return toTripDetail(trip);
}

/**
 * Apply a new activity layout to one or more days. The listed days must contain exactly the
 * activities they currently hold between them, so activities can move between those days but
 * none can be added, duplicated or dropped through this endpoint.
 */
export async function reorderItinerary(userId: string, tripId: string, input: ReorderInput) {
  const trip = await loadOwnedTrip(userId, tripId);

  const dayIds = input.days.map((entry) => entry.dayId);
  if (new Set(dayIds).size !== dayIds.length) throw new HttpError(400, 'BAD_REQUEST', 'Each day can only appear once');

  const days = input.days.map((entry) => findDay(trip, entry.dayId));
  const current = new Map<string, Record<string, unknown>>();
  for (const day of days) {
    for (const activity of day.activities) current.set(activity._id.toString(), activity.toObject());
  }

  const requested = input.days.flatMap((entry) => entry.activityIds);
  const requestedSet = new Set(requested);
  if (requested.length !== requestedSet.size || requestedSet.size !== current.size || requested.some((id) => !current.has(id))) {
    throw new HttpError(409, 'CONFLICT', 'The itinerary changed since it was loaded. Reload and try again.');
  }

  input.days.forEach((entry, index) => {
    const day = days[index];
    if (!day) return;
    day.set(
      'activities',
      entry.activityIds.map((id) => current.get(id)),
    );
  });

  await trip.save();
  return toTripDetail(trip);
}

/** Used by the CSV export: the full owned trip document. */
export async function getOwnedTripForExport(userId: string, tripId: string) {
  return toTripDetail(await loadOwnedTrip(userId, tripId));
}

