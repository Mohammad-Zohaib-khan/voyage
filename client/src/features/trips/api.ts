import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ActivityCategory, CurrencyCode } from '../../lib/constants';
import type { Activity, Trip, TripSummary } from '../../lib/types';

export const tripKeys = {
  all: ['trips'] as const,
  list: () => ['trips', 'list'] as const,
  detail: (id: string) => ['trips', 'detail', id] as const,
};

export interface TripInput {
  title: string;
  destinationIds: string[];
  startDate: string;
  endDate: string;
  travelerCount: number;
  currency: CurrencyCode;
  budgetTargetMinor: number;
  notes: string;
}

export interface ActivityInput {
  title: string;
  category: ActivityCategory;
  time: string | null;
  location: string;
  notes: string;
  estimatedCostMinor: number;
}

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.list(),
    queryFn: ({ signal }) => api.get<TripSummary[]>('/trips?limit=50', signal),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: ({ signal }) => api.get<Trip>(`/trips/${encodeURIComponent(id)}`, signal),
  });
}

/** Every trip mutation returns the authoritative trip; the cache takes the server's version. */
function useTripMutation<V>(mutationFn: (variables: V) => Promise<Trip>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(trip.id), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.list() });
    },
  });
}

export function useCreateTrip() {
  return useTripMutation((input: TripInput) => api.post<Trip>('/trips', input));
}

export function useUpdateTrip(tripId: string) {
  return useTripMutation((input: Partial<TripInput>) => api.patch<Trip>(`/trips/${tripId}`, input));
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => api.delete(`/trips/${tripId}`),
    onSuccess: (_data, tripId) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.list() });
    },
  });
}

export function useAddActivity(tripId: string) {
  return useTripMutation(({ dayId, input }: { dayId: string; input: ActivityInput }) => api.post<Trip>(`/trips/${tripId}/days/${dayId}/activities`, input));
}

export function useUpdateActivity(tripId: string) {
  return useTripMutation(({ dayId, activityId, input }: { dayId: string; activityId: string; input: Partial<ActivityInput> }) =>
    api.patch<Trip>(`/trips/${tripId}/days/${dayId}/activities/${activityId}`, input),
  );
}

export function useDeleteActivity(tripId: string) {
  return useTripMutation(({ dayId, activityId }: { dayId: string; activityId: string }) =>
    api.delete<Trip>(`/trips/${tripId}/days/${dayId}/activities/${activityId}`),
  );
}

export type ReorderLayout = Array<{ dayId: string; activityIds: string[] }>;

/**
 * Reorder or move activities. The cache is updated optimistically (so a dragged item stays
 * where it was dropped) and rolled back if the server refuses the new layout.
 */
export function useReorder(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: ReorderLayout) => api.patch<Trip>(`/trips/${tripId}/itinerary/reorder`, { days }),
    onMutate: async (layout) => {
      const key = tripKeys.detail(tripId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Trip>(key);
      if (previous) queryClient.setQueryData(key, applyLayout(previous, layout));
      return { previous };
    },
    onError: (_error, _layout, context) => {
      if (context?.previous) queryClient.setQueryData(tripKeys.detail(tripId), context.previous);
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(tripId), trip);
    },
  });
}

/** Apply a reorder layout to a trip locally (used for the optimistic update). */
export function applyLayout(trip: Trip, layout: ReorderLayout): Trip {
  const byId = new Map<string, Activity>();
  for (const day of trip.days) for (const activity of day.activities) byId.set(activity.id, activity);
  const changed = new Map(layout.map((entry) => [entry.dayId, entry.activityIds]));
  return {
    ...trip,
    days: trip.days.map((day) => {
      const ids = changed.get(day.id);
      if (!ids) return day;
      return {
        ...day,
        activities: ids
          .map((id) => byId.get(id))
          .filter((activity): activity is Activity => activity !== undefined)
          .map((activity, order) => ({ ...activity, order })),
      };
    }),
  };
}

/** Swap an activity with its neighbour; returns the layout for the reorder endpoint, or null at an edge. */
export function moveWithinDay(trip: Trip, dayId: string, activityId: string, direction: -1 | 1): ReorderLayout | null {
  const day = trip.days.find((item) => item.id === dayId);
  if (!day) return null;
  const ids = day.activities.map((activity) => activity.id);
  const index = ids.indexOf(activityId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
  return [{ dayId, activityIds: ids }];
}

/** Move an activity to the end of another day. */
export function moveToDay(trip: Trip, fromDayId: string, toDayId: string, activityId: string): ReorderLayout | null {
  if (fromDayId === toDayId) return null;
  const from = trip.days.find((day) => day.id === fromDayId);
  const to = trip.days.find((day) => day.id === toDayId);
  if (!from || !to) return null;
  return [
    { dayId: fromDayId, activityIds: from.activities.map((activity) => activity.id).filter((id) => id !== activityId) },
    { dayId: toDayId, activityIds: [...to.activities.map((activity) => activity.id), activityId] },
  ];
}

/** Download the server-generated CSV for a trip the user owns. */
export async function downloadTripCsv(tripId: string): Promise<string> {
  const { blob, filename } = await api.download(`/trips/${tripId}/export.csv`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
