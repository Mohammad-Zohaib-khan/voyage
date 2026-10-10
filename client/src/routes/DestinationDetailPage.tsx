import { CalendarPlus, ChevronRight, Expand } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, RetryPanel, Skeleton } from '../components/ui/Feedback';
import { PhotoCredit, SmartImage } from '../components/ui/SmartImage';
import { useToast } from '../components/ui/toastContext';
import { useSession } from '../features/auth/session';
import { useDestination, useSavedIds, useToggleSave } from '../features/destinations/api';
import { DestinationCard, SaveDestinationButton, SeasonStrip } from '../features/destinations/components';
import { PhotoLightbox } from '../features/destinations/PhotoLightbox';
import { useTrips, useUpdateTrip } from '../features/trips/api';
import { ApiError, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { REGION_LABELS, STYLE_LABELS, TRIP_LIMITS } from '../lib/constants';
import { formatRange, tripStatus } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { DestinationDetail, TripSummary } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

const COST_ROWS = [
  ['accommodation', 'Stay'],
  ['food', 'Food'],
  ['transport', 'Local transport'],
  ['activities', 'Experiences'],
  ['miscellaneous', 'Other'],
] as const;

export default function DestinationDetailPage() {
  const { slug = '' } = useParams();
  const query = useDestination(slug);
  useDocumentTitle(query.data ? `${query.data.name}, ${query.data.country}` : 'Destination');

  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
    return (
      <div className="page-x container-wide py-20">
        {missing ? (
          <EmptyState title="We don’t have a guide for that place" action={<ButtonLink to="/destinations">Browse destinations</ButtonLink>}>
            The link may be out of date, or the destination is no longer listed.
          </EmptyState>
        ) : (
          <RetryPanel message={errorMessage(query.error, 'This destination didn’t load.')} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
        )}
      </div>
    );
  }
  return <Detail destination={query.data} />;
}

function Detail({ destination }: { destination: DestinationDetail }) {
  const savedIds = useSavedIds();
  const { toggle, pendingId } = useToggleSave();
  const [addOpen, setAddOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photos = [destination.heroImage, ...destination.gallery];
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = savedIds.has(destination.id);

  const openAddToTrip = () => {
    if (!user) {
      void navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setAddOpen(true);
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={openAddToTrip} icon={<CalendarPlus aria-hidden="true" className="size-4" />}>
        Add to a trip
      </Button>
      <Button variant="secondary" onClick={() => toggle(destination, saved)} disabled={pendingId === destination.id} aria-pressed={saved}>
        {saved ? 'Saved' : 'Save for later'}
      </Button>
    </div>
  );

  return (
    <article>
      <div className="page-x container-wide pt-10 md:pt-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-small text-muted">
            <li>
              <Link to="/destinations" className="link">
                Destinations
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li aria-current="page" className="text-ink">
              {destination.name}
            </li>
          </ol>
        </nav>

        <header className="mt-8 grid gap-8 pb-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="text-small text-faint">
              {destination.country}, {REGION_LABELS[destination.region]}
            </p>
            <h1 className="mt-2 font-serif text-display tracking-[-0.02em]">{destination.name}</h1>
          </div>
          <div className="flex flex-col gap-6 md:col-span-5">
            <p className="text-lead text-muted">{destination.summary}</p>
            {actions}
          </div>
        </header>
      </div>

      <figure className="page-x container-wide">
        {/* One image, cropped by CSS: portrait on phones, panoramic from tablet up. */}
        <button
          type="button"
          onClick={() => setPhotoIndex(0)}
          aria-label={`View ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} of ${destination.name}`}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[2px] text-left"
        >
          <SmartImage
            image={destination.heroImage}
            sizes="(min-width: 88rem) 88rem, 100vw"
            priority
            fallbackLabel={destination.name}
            className="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"
            imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-settle)] group-hover:scale-[1.025]"
            transitionName={`destination-${destination.slug}`}
          />
          <span className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-[rgb(8_17_15/0.6)] px-3.5 py-2 text-small font-semibold text-paper backdrop-blur transition-[background-color,transform] group-hover:bg-[rgb(8_17_15/0.8)] group-active:scale-95">
            <Expand aria-hidden="true" className="size-4" />
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        </button>
        <figcaption className="mt-3 flex justify-between gap-4 text-faint">
          <PhotoCredit image={destination.heroImage} />
        </figcaption>
      </figure>

      <div className="page-x container-wide mt-16 grid gap-16 pb-24 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="sr-only">
              Overview
            </h2>
            <div className="measure flex flex-col gap-5 text-lead leading-[1.7] text-ink">
              {destination.description.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Travel styles">
              {destination.travelStyles.map((style) => (
                <li key={style}>
                  <Link to={`/destinations?style=${style}`} className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-small text-ink hover:border-ink">
                    {STYLE_LABELS[style]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="highlights-heading" className="mt-20">
            <h2 id="highlights-heading" className="font-serif text-h3">
              Highlights
            </h2>
            <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {destination.highlights.map((highlight) => (
                <li key={highlight.title} className="border-t border-line-strong pt-4">
                  <h3 className="font-semibold text-ink">{highlight.title}</h3>
                  <p className="mt-2 text-muted">{highlight.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {destination.gallery.length > 0 ? (
            <section aria-labelledby="gallery-heading" className="mt-20">
              <h2 id="gallery-heading" className="sr-only">
                Gallery
              </h2>
              <div className="grid grid-cols-12 gap-4">
                {destination.gallery.map((image, index) => (
                  <figure key={image.src} className={cn(index === 0 ? 'col-span-12 sm:col-span-7' : 'col-span-12 sm:col-span-5 sm:mt-24')}>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex(index + 1)}
                      aria-label={`Open photo: ${image.alt}`}
                      className="group block w-full cursor-zoom-in overflow-hidden rounded-[2px]"
                    >
                      <SmartImage
                        image={image}
                        ratio={index === 0 ? 4 / 5 : 3 / 4}
                        sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw"
                        fallbackLabel={destination.name}
                        imgClassName="transition-transform duration-700 ease-[var(--ease-settle)] group-hover:scale-[1.04]"
                      />
                    </button>
                    <figcaption className="mt-2 text-faint">
                      <PhotoCredit image={image} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="tips-heading" className="mt-20">
            <h2 id="tips-heading" className="font-serif text-h3">
              Practical notes
            </h2>
            <ul className="mt-6 border-t border-line">
              {destination.tips.map((tip) => (
                <li key={tip} className="border-b border-line py-4 text-ink">
                  {tip}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small text-faint">
              General guidance only. Check official sources for current entry rules, opening hours and safety advice before you travel.
            </p>
          </section>
        </div>

        <aside aria-labelledby="glance-heading" className="lg:col-span-4 lg:col-start-9">
          <div className="flex flex-col gap-8 border-t-2 border-ink pt-6 lg:sticky lg:top-28">
            <h2 id="glance-heading" className="text-small font-semibold text-ink">
              At a glance
            </h2>
            <div>
              <p className="text-small text-faint">Suggested stay</p>
              <p className="mt-1 font-serif text-[2rem] leading-none">
                {destination.suggestedDays.min}–{destination.suggestedDays.max} days
              </p>
            </div>
            <div>
              <p className="mb-3 text-small text-faint">Best months to visit</p>
              <SeasonStrip months={destination.bestMonths} />
              <p className="mt-3 text-small text-muted">{destination.seasonNote}</p>
            </div>
            <div>
              <p className="text-small text-faint">Daily estimate, per person</p>
              <p className="tabular mt-1 font-serif text-[2rem] leading-none">≈ {formatMoney(destination.dailyTotalMinor, destination.costs.currency, { compact: true })}</p>
              <table className="mt-4 w-full text-small">
                <caption className="sr-only">Estimated daily cost by category, in {destination.costs.currency}</caption>
                <tbody>
                  {COST_ROWS.map(([key, label]) => (
                    <tr key={key} className="border-t border-line">
                      <th scope="row" className="py-2 text-left font-normal text-muted">
                        {label}
                      </th>
                      <td className="tabular py-2 text-right text-ink">{formatMoney(destination.costs.perPersonPerDayMinor[key], destination.costs.currency, { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-micro leading-relaxed text-faint">{destination.costs.assumptions}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={openAddToTrip} className="flex-1" icon={<CalendarPlus aria-hidden="true" className="size-4" />}>
                Add to a trip
              </Button>
              <SaveDestinationButton destination={destination} saved={saved} pending={pendingId === destination.id} onToggle={toggle} tone="default" />
            </div>
          </div>
        </aside>
      </div>

      {destination.related.length > 0 ? (
        <section aria-labelledby="related-heading" className="bg-sunken">
          <div className="page-x container-wide py-20">
            <h2 id="related-heading" className="font-serif text-h2">
              If you like {destination.name}
            </h2>
            <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {destination.related.map((item) => (
                <li key={item.id}>
                  <DestinationCard destination={item} saved={savedIds.has(item.id)} savePending={pendingId === item.id} onToggleSave={toggle} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {user ? <AddToTripDialog open={addOpen} onClose={() => setAddOpen(false)} destination={destination} format={user.preferences.dateFormat} /> : null}
      <PhotoLightbox images={photos} index={photoIndex} onIndexChange={setPhotoIndex} place={destination.name} />
    </article>
  );
}

function AddToTripDialog({ open, onClose, destination, format }: { open: boolean; onClose: () => void; destination: DestinationDetail; format: 'd MMM yyyy' | 'MMM d, yyyy' | 'yyyy-MM-dd' }) {
  const trips = useTrips();
  const candidates = (trips.data ?? []).filter((trip) => tripStatus(trip.startDate, trip.endDate) !== 'past');

  return (
    <Dialog open={open} onClose={onClose} title={`Add ${destination.name} to a trip`} description="Choose a trip you’re planning, or start a new one.">
      {trips.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Loading your trips">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : trips.isError ? (
        <RetryPanel message={errorMessage(trips.error, 'Your trips didn’t load.')} onRetry={() => void trips.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          {candidates.length > 0 ? (
            <ul className="divide-y divide-line border-y border-line">
              {candidates.map((trip) => (
                <AddToTripRow key={trip.id} trip={trip} destination={destination} format={format} onDone={onClose} />
              ))}
            </ul>
          ) : (
            <p className="text-muted">You have no upcoming trips yet.</p>
          )}
          <ButtonLink to={`/app/trips/new?destination=${destination.id}`} variant={candidates.length ? 'secondary' : 'primary'} className="self-start">
            Start a new trip with {destination.name}
          </ButtonLink>
        </div>
      )}
    </Dialog>
  );
}

function AddToTripRow({ trip, destination, format, onDone }: { trip: TripSummary; destination: DestinationDetail; format: 'd MMM yyyy' | 'MMM d, yyyy' | 'yyyy-MM-dd'; onDone: () => void }) {
  const update = useUpdateTrip(trip.id);
  const toast = useToast();
  const included = trip.destinations.some((item) => item.id === destination.id);
  const full = trip.destinations.length >= TRIP_LIMITS.maxDestinations;

  const add = () => {
    update.mutate(
      { destinationIds: [...trip.destinations.map((item) => item.id), destination.id] },
      {
        onSuccess: () => {
          toast.success(`Added ${destination.name} to ${trip.title}.`);
          onDone();
        },
        onError: (error) => toast.error(errorMessage(error, 'That didn’t save. Try again.')),
      },
    );
  };

  return (
    <li className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{trip.title}</p>
        <p className="text-small text-muted">{formatRange(trip.startDate, trip.endDate, format)}</p>
      </div>
      <Button size="sm" variant={included ? 'ghost' : 'secondary'} disabled={included || full} loading={update.isPending} onClick={add}>
        {included ? 'Already added' : full ? 'Trip is full' : 'Add'}
      </Button>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-x container-wide pt-14 pb-24" aria-busy="true" aria-label="Loading destination">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-10 h-24 w-2/3" />
      <Skeleton className="mt-10 aspect-[21/9] w-full" />
      <div className="mt-16 grid gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <Skeleton className="h-80 lg:col-span-4 lg:col-start-9" />
      </div>
    </div>
  );
}
