import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, RetryPanel, Skeleton } from '../components/ui/Feedback';
import { SmartImage } from '../components/ui/SmartImage';
import { useSession } from '../features/auth/session';
import { usePreferences } from '../features/auth/usePreferences';
import { useSaved } from '../features/destinations/api';
import { useTrips } from '../features/trips/api';
import { BudgetSummaryLine, TripCard, TripDateRange, TripStatusBadge } from '../features/trips/display';
import { errorMessage } from '../lib/api';
import { greeting, relativeStart, tripStatus } from '../lib/dates';
import type { TripSummary } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useSession();
  const trips = useTrips();
  const saved = useSaved();
  const { dateFormat } = usePreferences();
  const firstName = user?.displayName.split(/\s+/)[0] ?? '';

  const all = trips.data ?? [];
  const active = all.filter((trip) => tripStatus(trip.startDate, trip.endDate) !== 'past');
  const next = active[0];
  const recent = [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  return (
    <div className="page-x container-wide pt-14 pb-24 md:pt-20">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-serif text-h1">
          {greeting()}, {firstName}.
        </h1>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/app/trips/new" icon={<Plus aria-hidden="true" className="size-4" />}>
            New trip
          </ButtonLink>
          <ButtonLink to="/destinations" variant="secondary">
            Browse destinations
          </ButtonLink>
        </div>
      </header>

      {trips.isPending ? (
        <div className="mt-14 grid gap-8 lg:grid-cols-12" aria-label="Loading your dashboard">
          <Skeleton className="aspect-[16/10] lg:col-span-7" />
          <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : trips.isError ? (
        <RetryPanel className="mt-14" message={errorMessage(trips.error, 'Your trips didn’t load.')} onRetry={() => void trips.refetch()} retrying={trips.isRefetching} />
      ) : all.length === 0 ? (
        <EmptyState
          className="mt-14"
          title="Your first journey starts here"
          action={
            <>
              <ButtonLink to="/app/trips/new">Plan a trip</ButtonLink>
              <ButtonLink to="/destinations" variant="secondary">
                Find somewhere to go
              </ButtonLink>
            </>
          }
        >
          Choose dates and a rough budget, and Voyage lays out a day for each date. Add places, times and costs as your plans take shape.
        </EmptyState>
      ) : (
        <>
          {next ? <NextTrip trip={next} format={dateFormat} /> : <p className="mt-14 border-t border-line pt-8 text-muted">No upcoming trips. Your past plans are below.</p>}

          <div className="mt-20 grid gap-16 lg:grid-cols-12 lg:gap-10">
            <section aria-labelledby="recent-heading" className="lg:col-span-7">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="recent-heading" className="font-serif text-h3">
                  Recently edited
                </h2>
                <Link to="/app/trips" className="link text-small font-semibold text-ink">
                  All trips
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {recent.map((trip) => (
                  <li key={trip.id}>
                    <TripCard trip={trip} format={dateFormat} />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="snapshot-heading" className="lg:col-span-4 lg:col-start-9">
              <h2 id="snapshot-heading" className="font-serif text-h3">
                Budget snapshot
              </h2>
              {active.length === 0 ? (
                <p className="mt-4 text-muted">Budgets for upcoming trips will appear here.</p>
              ) : (
                <ul className="mt-6 flex flex-col gap-6">
                  {active.slice(0, 4).map((trip) => (
                    <li key={trip.id}>
                      <Link to={`/app/trips/${trip.id}`} className="mb-2 block truncate font-semibold text-ink hover:underline">
                        {trip.title}
                      </Link>
                      <BudgetSummaryLine budget={trip.budget} currency={trip.currency} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <section aria-labelledby="saved-heading" className="mt-24 border-t border-line pt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="saved-heading" className="font-serif text-h3">
            Saved places
          </h2>
          {saved.data && saved.data.length > 0 ? (
            <Link to="/app/saved" className="link text-small font-semibold text-ink">
              View all {saved.data.length}
            </Link>
          ) : null}
        </div>
        {saved.isPending ? (
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/5]" />
            ))}
          </div>
        ) : saved.isError ? (
          <RetryPanel className="mt-4" message={errorMessage(saved.error, 'Saved places didn’t load.')} onRetry={() => void saved.refetch()} />
        ) : saved.data.length === 0 ? (
          <p className="mt-4 text-muted">
            Save destinations while you browse and they’ll gather here.{' '}
            <Link to="/destinations" className="link font-semibold text-ink">
              Browse destinations
            </Link>
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            {saved.data.slice(0, 4).map(({ destination }) => (
              <li key={destination.id} className="group relative">
                <SmartImage image={destination.heroImage} ratio={4 / 5} sizes="(min-width: 48rem) 22vw, 45vw" decorative fallbackLabel={destination.name} maxWidth={960} />
                <p className="mt-3 font-serif text-[1.5rem] leading-tight text-ink">
                  <Link to={`/destinations/${destination.slug}`} className="after:absolute after:inset-0 group-hover:underline">
                    {destination.name}
                  </Link>
                </p>
                <p className="text-small text-faint">{destination.country}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NextTrip({ trip, format }: { trip: TripSummary; format: 'd MMM yyyy' | 'MMM d, yyyy' | 'yyyy-MM-dd' }) {
  const cover = trip.destinations[0];
  const ongoing = tripStatus(trip.startDate, trip.endDate) === 'ongoing';
  return (
    <section aria-labelledby="next-heading" className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="relative lg:col-span-7">
        {cover ? (
          <SmartImage image={cover.heroImage} ratio={16 / 10} sizes="(min-width: 64rem) 58vw, 100vw" priority fallbackLabel={cover.name} />
        ) : (
          <div aria-hidden="true" className="aspect-[16/10] bg-[linear-gradient(150deg,var(--limestone),var(--mist))]" />
        )}
      </div>
      <div className="flex flex-col justify-end lg:col-span-4 lg:col-start-9">
        <p className="text-small font-semibold text-olive">{ongoing ? 'Happening now' : 'Next up'}</p>
        <h2 id="next-heading" className="mt-2 font-serif text-h2 break-words">
          {trip.title}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
          <TripStatusBadge startDate={trip.startDate} endDate={trip.endDate} />
          {!ongoing ? <span>{relativeStart(trip.startDate)}</span> : null}
        </div>
        <p className="mt-1 text-muted">
          <TripDateRange startDate={trip.startDate} endDate={trip.endDate} format={format} />
        </p>
        {trip.destinations.length ? <p className="mt-1 text-small text-faint">{trip.destinations.map((item) => item.name).join(', ')}</p> : null}
        <div className="mt-8">
          <BudgetSummaryLine budget={trip.budget} currency={trip.currency} />
        </div>
        <ButtonLink to={`/app/trips/${trip.id}`} className="mt-8 self-start" icon={<ArrowRight aria-hidden="true" className="size-4" />}>
          Open itinerary
        </ButtonLink>
      </div>
    </section>
  );
}
