import { BUDGET_BANDS, REGIONS, SEASON_KEYS, SORT_OPTIONS, TRAVEL_STYLES } from '../../lib/constants';
import type { DestinationFilters } from '../../lib/types';

export const EMPTY_FILTERS: DestinationFilters = { q: '', region: [], style: [], budget: [], season: [], sort: 'featured' };

function pickList<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  const values = raw.split(',').filter((value): value is T => (allowed as readonly string[]).includes(value));
  return [...new Set(values)];
}

/** Read filters from the URL, silently dropping anything unknown so old or edited links still work. */
export function filtersFromParams(params: URLSearchParams): DestinationFilters {
  const sort = params.get('sort');
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    region: pickList(params, 'region', REGIONS),
    style: pickList(params, 'style', TRAVEL_STYLES),
    budget: pickList(params, 'budget', BUDGET_BANDS),
    season: pickList(params, 'season', SEASON_KEYS),
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? (sort as DestinationFilters['sort']) : 'featured',
  };
}

/** Serialise filters for the URL and the API, omitting defaults so links stay short. */
export function filtersToParams(filters: DestinationFilters): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set('q', q);
  if (filters.region.length) params.set('region', filters.region.join(','));
  if (filters.style.length) params.set('style', filters.style.join(','));
  if (filters.budget.length) params.set('budget', filters.budget.join(','));
  if (filters.season.length) params.set('season', filters.season.join(','));
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  return params;
}

export function activeFilterCount(filters: DestinationFilters): number {
  return filters.region.length + filters.style.length + filters.budget.length + filters.season.length + (filters.q.trim() ? 1 : 0);
}

export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
