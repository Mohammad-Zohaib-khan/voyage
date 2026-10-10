import { Plus } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, RetryPanel, Skeleton } from '../components/ui/Feedback';
import { usePreferences } from '../features/auth/usePreferences';
import { useTrips } from '../features/trips/api';
import { TripCard } from '../features/trips/display';
import { errorMessage } from '../lib/api';
import { tripStatus } from '../lib/dates';
import type { TripSummary } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

export default function TripsPage() {
  useDocumentTitle('My trips');
  const { data, isPending, isError, error, refetch, isRefetching } = useTrips();
  const { dateFormat } = usePreferences();

  const current = (data ?? []).filter((trip) => tripStatus(trip.startDate, trip.endDate) !== 'past');
  const past = (data ?? []).filter((trip) => tripStatus(trip.startDate, trip.endDate) === 'past').reverse();

  return (
    <div className="page-x container-wide pt-14 pb-24 md:pt-20">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-10">
        <div>
          <h1 className="font-serif text-h1">My trips</h1>
          <p className="mt-3 text-muted">{data ? `${data.length} ${data.length === 1 ? 'trip' : 'trips'} in your account` : 'Your plans, kept in one place.'}</p>
        </div>
        <ButtonLink to="/app/trips/new" icon={<Plus aria-hidden="true" className="size-4" />}>
          New trip
        </ButtonLink>
      </header>

      {isPending ? (
        <div className="mt-6 flex flex-col divide-y divide-line" aria-label="Loading trips">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-6 py-5">
              <Skeleton className="size-24" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <RetryPanel className="mt-10" message={errorMessage(error, 'Your trips didn’t load.')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : data.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No trips yet"
          action={
            <>
              <ButtonLink to="/app/trips/new">Plan your first trip</ButtonLink>
              <ButtonLink to="/destinations" variant="secondary">
                Find a destination
              </ButtonLink>
            </>
          }
        >
          A trip starts with dates and a rough budget. You can add places and fill in the days as you go.
        </EmptyState>
      ) : (
        <>
          <TripGroup title="Upcoming and under way" trips={current} format={dateFormat} empty="Nothing coming up. Time to plan something?" />
          {past.length ? <TripGroup title="Past trips" trips={past} format={dateFormat} /> : null}
        </>
      )}
    </div>
  );
}

function TripGroup({ title, trips, format, empty }: { title: string; trips: TripSummary[]; format: 'd MMM yyyy' | 'MMM d, yyyy' | 'yyyy-MM-dd'; empty?: string }) {
  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="text-small font-semibold text-ink">{title}</h2>
      {trips.length === 0 ? (
        <p className="mt-4 border-t border-line pt-6 text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} format={format} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
