import { Globe2, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, RetryPanel } from '../components/ui/Feedback';
import { Select } from '../components/ui/Form';
import { useDestinationList, useFacets, useSavedIds, useToggleSave } from '../features/destinations/api';
import {
  ActiveFilterChips,
  DestinationCard,
  DestinationCardSkeleton,
  DestinationFilters,
  DestinationSearch,
} from '../features/destinations/components';
import { GlobeView } from '../features/destinations/GlobeView';
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, filtersToParams } from '../features/destinations/filters';
import { errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { SORT_OPTIONS } from '../lib/constants';
import type { DestinationFilters as Filters } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

export default function DestinationsPage() {
  useDocumentTitle('Destinations');
  const [params, setParams] = useSearchParams();
  const urlFilters = useMemo(() => filtersFromParams(params), [params]);
  // Local state answers clicks immediately; the URL (shareable, back/forward-safe) follows.
  const [filters, setFilters] = useState(urlFilters);
  const [seenQuery, setSeenQuery] = useState(params.toString());
  if (params.toString() !== seenQuery) {
    // The URL changed (our own update landing, or back/forward): adopt it.
    setSeenQuery(params.toString());
    setFilters(urlFilters);
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const view = params.get('view') === 'globe' ? 'globe' : 'grid';

  const update = useCallback(
    (next: Filters) => {
      setFilters(next);
      const nextParams = filtersToParams(next);
      if (view === 'globe') nextParams.set('view', 'globe');
      setParams(nextParams, { replace: true, preventScrollReset: true });
    },
    [setParams, view],
  );
  const setView = (next: 'grid' | 'globe') => {
    const nextParams = filtersToParams(filters);
    if (next === 'globe') nextParams.set('view', 'globe');
    setParams(nextParams, { replace: true, preventScrollReset: true });
  };
  const setQuery = useCallback((q: string) => update({ ...filters, q }), [filters, update]);
  const reset = () => update(EMPTY_FILTERS);

  const list = useDestinationList(filters);
  const facets = useFacets();
  const savedIds = useSavedIds();
  const { toggle, pendingId } = useToggleSave();

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const activeCount = activeFilterCount(filters);
  const styleCounts = Object.fromEntries((facets.data?.styles ?? []).map((item) => [item.value, item.count]));

  return (
    <div className="page-x container-wide pt-14 pb-24 md:pt-20">
      <header className="grid gap-8 border-b border-line pb-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-6">
          <h1 className="font-serif text-h1">Destinations</h1>
          <p className="mt-4 max-w-md text-muted">
            Places chosen for the quality of time you spend there. Costs are illustrative daily estimates per person, in US dollars.
          </p>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <DestinationSearch value={filters.q} onChange={setQuery} />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-28">
            <DestinationFilters filters={filters} onChange={update} counts={styleCounts} />
          </div>
        </aside>

        <section aria-labelledby="results-heading" aria-busy={list.isFetching || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="results-heading" className="text-small text-muted" aria-live="polite">
              {list.isPending ? 'Loading destinations…' : `${total} ${total === 1 ? 'destination' : 'destinations'}`}
              {activeCount > 0 && !list.isPending ? ` with ${activeCount} ${activeCount === 1 ? 'filter' : 'filters'}` : ''}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="View" className="flex rounded-[3px] border border-line-strong p-0.5">
                {(
                  [
                    ['grid', 'Grid', LayoutGrid],
                    ['globe', 'Globe', Globe2],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={view === value}
                    onClick={() => setView(value)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-[2px] px-3 text-small font-semibold transition-colors',
                      view === value ? 'bg-ink text-canvas' : 'text-muted hover:text-ink',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setDrawerOpen(true)} icon={<SlidersHorizontal aria-hidden="true" className="size-4" />}>
                Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </Button>
              <label className="flex items-center gap-2 text-small text-muted">
                <span className="hidden sm:inline">Sort by</span>
                <span className="sr-only sm:hidden">Sort by</span>
                <Select
                  value={filters.sort}
                  onChange={(event) => update({ ...filters, sort: event.target.value as Filters['sort'] })}
                  className="h-9 w-auto min-w-48 text-small"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <ActiveFilterChips filters={filters} onChange={update} onReset={reset} />
          </div>

          {view === 'globe' ? (
            <GlobeView filters={filters} onReset={reset} />
          ) : list.isError && items.length === 0 ? (
            <RetryPanel className="mt-10" message={errorMessage(list.error, 'Destinations didn’t load.')} onRetry={() => void list.refetch()} retrying={list.isRefetching} />
          ) : list.isPending ? (
            <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <DestinationCardSkeleton key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              className="mt-10"
              title="No places match all of that"
              action={
                <Button variant="secondary" onClick={reset}>
                  Clear filters
                </Button>
              }
            >
              Filters combine, so each one narrows the list. Try removing one, or search for a country instead.
            </EmptyState>
          ) : (
            <>
              <ul className={`mt-10 grid gap-x-8 gap-y-16 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
                {items.map((destination, index) => (
                  <li key={destination.id}>
                    <DestinationCard
                      destination={destination}
                      saved={savedIds.has(destination.id)}
                      savePending={pendingId === destination.id}
                      onToggleSave={toggle}
                      priority={index < 3}
                      sharedTransition
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-16 flex flex-col items-center gap-4 border-t border-line pt-8">
                <p className="text-small text-muted">
                  Showing {items.length} of {total}
                </p>
                {list.hasNextPage ? (
                  <Button variant="secondary" onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>
                    Show more destinations
                  </Button>
                ) : null}
                {list.isError && items.length > 0 ? (
                  <p role="alert" className="text-small text-danger">
                    More destinations didn’t load.{' '}
                    <button type="button" className="link font-semibold" onClick={() => void list.fetchNextPage()}>
                      Try again
                    </button>
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        variant="drawer"
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={activeCount === 0}>
              Clear all
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>Show {list.isPending ? '' : total} results</Button>
          </>
        }
      >
        <DestinationFilters filters={filters} onChange={update} counts={styleCounts} />
      </Dialog>
    </div>
  );
}
