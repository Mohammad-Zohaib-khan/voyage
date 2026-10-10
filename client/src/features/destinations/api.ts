import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { useToast } from '../../components/ui/toastContext';
import { api, errorMessage } from '../../lib/api';
import type { DestinationCard, DestinationDetail, DestinationFilters, Facets, ImageRef, SavedItem } from '../../lib/types';
import { useSession } from '../auth/session';
import { filtersToParams } from './filters';

export const PAGE_SIZE = 9;

export function useDestinationList(filters: DestinationFilters, pageSize = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['destinations', 'list', filters, pageSize],
    initialPageParam: 1,
    // The AbortSignal cancels stale searches when filters change mid-request.
    queryFn: ({ pageParam, signal }) => {
      const params = filtersToParams(filters);
      params.set('page', String(pageParam));
      params.set('limit', String(pageSize));
      return api.getPage<DestinationCard[]>(`/destinations?${params.toString()}`, signal);
    },
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useFeaturedDestinations(limit = 3) {
  return useQuery({
    queryKey: ['destinations', 'featured', limit],
    queryFn: ({ signal }) => api.get<DestinationCard[]>(`/destinations?limit=${limit}`, signal),
    staleTime: 10 * 60_000,
  });
}

export function useDestination(slug: string) {
  return useQuery({
    queryKey: ['destinations', 'detail', slug],
    queryFn: ({ signal }) => api.get<DestinationDetail>(`/destinations/${encodeURIComponent(slug)}`, signal),
    staleTime: 10 * 60_000,
  });
}

export function useAllDestinations() {
  return useQuery({
    queryKey: ['destinations', 'all'],
    queryFn: async ({ signal }) => {
      const first = await api.getPage<DestinationCard[]>('/destinations?limit=24&sort=name', signal);
      const rest = await Promise.all(
        Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
          api.get<DestinationCard[]>(`/destinations?limit=24&sort=name&page=${index + 2}`, signal),
        ),
      );
      return [...first.items, ...rest.flat()];
    },
    staleTime: 10 * 60_000,
  });
}

export type FacetsWithCovers = Omit<Facets, 'styles'> & {
  styles: Array<Facets['styles'][number] & { cover: { name: string; slug: string; image: ImageRef } | null }>;
};

export function useFacets() {
  return useQuery({
    queryKey: ['facets'],
    queryFn: ({ signal }) => api.get<FacetsWithCovers>('/destinations/facets', signal),
    staleTime: 10 * 60_000,
  });
}

export function useSaved() {
  const { user } = useSession();
  return useQuery({
    queryKey: ['saved'],
    queryFn: ({ signal }) => api.get<SavedItem[]>('/saved', signal),
    enabled: Boolean(user),
  });
}

export function useSavedIds(): Set<string> {
  const { data } = useSaved();
  return new Set((data ?? []).map((item) => item.destination.id));
}

/**
 * Save or unsave a destination. Updates optimistically so the heart responds instantly, then
 * reconciles with the server; signed-out visitors are sent to sign in and returned here.
 */
export function useToggleSave() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: ({ destination, saved }: { destination: DestinationCard; saved: boolean }) =>
      saved ? api.delete(`/saved/${destination.id}`) : api.post(`/saved/${destination.id}`),
    onMutate: async ({ destination, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['saved'] });
      const previous = queryClient.getQueryData<SavedItem[]>(['saved']);
      queryClient.setQueryData<SavedItem[]>(['saved'], (current = []) =>
        saved ? current.filter((item) => item.destination.id !== destination.id) : [{ savedAt: new Date().toISOString(), destination }, ...current],
      );
      return { previous };
    },
    onError: (error, { destination, saved }, context) => {
      queryClient.setQueryData(['saved'], context?.previous);
      toast.error(errorMessage(error, saved ? `Couldn’t remove ${destination.name}.` : `Couldn’t save ${destination.name}.`));
    },
    onSuccess: (_data, { destination, saved }) => {
      toast.success(saved ? `Removed ${destination.name} from saved places.` : `Saved ${destination.name}.`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  });

  return {
    toggle: (destination: DestinationCard, saved: boolean) => {
      if (!user) {
        void navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      mutation.mutate({ destination, saved });
    },
    pendingId: mutation.isPending ? mutation.variables.destination.id : null,
  };
}
