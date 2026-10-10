import { MapPin } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from '../../components/layout/AppShell';
import { supportsWebGL } from '../../components/effects/preferences';
import { EmptyState, RetryPanel, Spinner } from '../../components/ui/Feedback';
import { errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { DestinationFilters } from '../../lib/types';
import { useDestinationList, useSavedIds, useToggleSave } from './api';
import { DestinationCard } from './components';

// three.js and the globe load only when someone opens this view.
const DestinationGlobe = lazy(() => import('./globe/DestinationGlobe'));

function GlobeUnavailable({ reason }: { reason: string }) {
  return (
    <div className="grid aspect-square w-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#22342e,#0e1916_70%)] p-10 text-center text-on-forest-muted">
      <p className="max-w-xs text-small">{reason} Every destination is in the list alongside.</p>
    </div>
  );
}

/**
 * Discovery on a globe: the same filtered results, plotted at their real coordinates. Selecting a
 * pin or a name in the list shows its card; the list is the keyboard and screen-reader path.
 */
export function GlobeView({ filters, onReset }: { filters: DestinationFilters; onReset: () => void }) {
  const list = useDestinationList(filters, 24);
  const savedIds = useSavedIds();
  const { toggle, pendingId } = useToggleSave();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [webgl] = useState(() => supportsWebGL());

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (list.isError) {
    return <RetryPanel className="mt-10" message={errorMessage(list.error, 'Destinations didn’t load.')} onRetry={() => void list.refetch()} retrying={list.isRefetching} />;
  }
  if (!list.isPending && items.length === 0) {
    return (
      <EmptyState className="mt-10" title="No places match all of that">
        Filters combine, so each one narrows the globe.{' '}
        <button type="button" onClick={onReset} className="link font-semibold text-ink">
          Clear filters
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:gap-14">
      <div className="mx-auto w-full max-w-[38rem]">
        {!webgl ? (
          <GlobeUnavailable reason="This browser can’t show the 3D globe." />
        ) : (
          <ErrorBoundary fallback={<GlobeUnavailable reason="The globe couldn’t start on this device." />}>
            <Suspense
              fallback={
                <div className="grid aspect-square w-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#22342e,#0e1916_70%)] text-on-forest-muted">
                  <Spinner size={28} label="Loading the globe" />
                </div>
              }
            >
              <DestinationGlobe destinations={items} selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>
          </ErrorBoundary>
        )}
        <p className="mt-4 text-center text-small text-faint">Drag to turn the globe, then choose a pin. Map data: Natural Earth.</p>
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-small font-semibold text-ink" id="globe-list-heading">
            {items.length} {items.length === 1 ? 'place' : 'places'} on the globe
          </h3>
          <ul aria-labelledby="globe-list-heading" className="mt-3 flex flex-wrap gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={item.id === selectedId}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-small transition-colors',
                    item.id === selectedId ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink',
                  )}
                >
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div aria-live="polite" className="min-h-48">
          {selected ? (
            <div key={selected.id} className="page-fade max-w-sm">
              <DestinationCard destination={selected} saved={savedIds.has(selected.id)} savePending={pendingId === selected.id} onToggleSave={toggle} sharedTransition />
            </div>
          ) : (
            <p className="max-w-sm border-t border-line pt-6 text-muted">Choose a pin or a name to see the place, its daily estimate and a link to its guide.</p>
          )}
        </div>
      </div>
    </div>
  );
}
