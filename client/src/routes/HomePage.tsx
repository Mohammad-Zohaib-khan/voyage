import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { ErrorBoundary } from '../components/layout/AppShell';
import { CoastFeature } from '../features/home/CoastFeature';
import { FeaturedCarousel } from '../features/home/FeaturedCarousel';
import { GlobalNavigatorFeature } from '../features/home/GlobalNavigatorFeature';
import { Hero } from '../features/home/Hero';
import { MountainFeature } from '../features/home/MountainFeature';
import { Postcards } from '../features/home/Postcards';
import { ButtonLink } from '../components/ui/Button';
import { RetryPanel, Skeleton } from '../components/ui/Feedback';
import { SmartImage } from '../components/ui/SmartImage';
import { useFacets } from '../features/destinations/api';
import { BudgetProgress } from '../features/trips/display';
import { ItineraryTimeline } from '../features/trips/ItineraryTimeline';
import { errorMessage } from '../lib/api';
import { CATEGORY_LABELS, STYLE_DESCRIPTIONS, STYLE_LABELS, ACTIVITY_CATEGORIES } from '../lib/constants';
import { formatMoney } from '../lib/money';
import type { Budget, ItineraryDay } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

export function HomePage() {
  useDocumentTitle('Voyage — Considered journeys');
  return (
    <>
      <Hero />
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <FeaturedCarousel />
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <GlobalNavigatorFeature />
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <MountainFeature />
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <StyleIndex />
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <CoastFeature />
      </ErrorBoundary>
      <ErrorBoundary fallback={<SectionUnavailable />}>
        <Postcards />
      </ErrorBoundary>
      <ItineraryPreview />
      <HonestyNote />
    </>
  );
}

/** Shown if one section fails to render, so the rest of the page stays usable. */
function SectionUnavailable() {
  return (
    <div className="page-x container-wide py-16">
      <p className="text-muted">
        This section couldn’t be shown.{' '}
        <Link to="/destinations" className="link font-semibold text-ink">
          Browse all destinations
        </Link>
      </p>
    </div>
  );
}

function StyleIndex() {
  const { data, isPending, isError, error, refetch, isRefetching } = useFacets();
  return (
    <section aria-labelledby="styles-heading" className="bg-sunken">
      <div className="page-x container-wide py-24 md:py-32">
        <div className="grid gap-6 md:grid-cols-12">
          <h2 id="styles-heading" className="font-serif text-h2 md:col-span-6">
            Travel by temperament
          </h2>
          <p className="text-muted md:col-span-4 md:col-start-9 md:self-end">
            Start from how you like to travel. Each place is tagged by the kind of trip it suits best, so the counts below are real.
          </p>
        </div>

        {isError ? (
          <RetryPanel className="mt-12" message={errorMessage(error, 'Travel styles didn’t load.')} onRetry={() => void refetch()} retrying={isRefetching} />
        ) : (
          <ul className="mt-14 border-t border-line-strong">
            {isPending
              ? Array.from({ length: 5 }, (_, index) => (
                  <li key={index} className="flex items-center gap-6 border-b border-line-strong py-7">
                    <Skeleton className="size-16" />
                    <Skeleton className="h-10 w-48" />
                  </li>
                ))
              : data.styles.map((style) => (
                  <li key={style.value} className="border-b border-line-strong">
                    <Link
                      to={`/destinations?style=${style.value}`}
                      className="group grid grid-cols-[4rem_1fr_auto] items-center gap-x-5 gap-y-1 py-6 md:grid-cols-[5.5rem_minmax(0,1.1fr)_minmax(0,1fr)_8rem] md:gap-x-8 md:py-7"
                    >
                      {style.cover ? (
                        <SmartImage
                          image={style.cover.image}
                          ratio={1}
                          sizes="5.5rem"
                          decorative
                          maxWidth={480}
                          className="row-span-2 rounded-[2px] md:row-span-1"
                          imgClassName="transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <span className="row-span-2 aspect-square rounded-[2px] bg-limestone md:row-span-1" />
                      )}
                      <span className="font-serif text-[2.25rem] leading-none text-ink transition-transform duration-500 ease-[var(--ease-settle)] group-hover:translate-x-2 md:text-h2">
                        {STYLE_LABELS[style.value]}
                      </span>
                      <span className="col-start-2 text-small text-muted md:col-start-3 md:text-base">{STYLE_DESCRIPTIONS[style.value]}</span>
                      <span className="col-start-3 row-start-1 flex items-center justify-end gap-3 text-small text-muted md:col-start-4">
                        <span className="tabular">
                          {style.count} {style.count === 1 ? 'place' : 'places'}
                        </span>
                        <ArrowUpRight aria-hidden="true" className="size-5 text-ink transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* A clearly-labelled sample plan, rendered with the same timeline component the app uses. */
const SAMPLE_DAYS: ItineraryDay[] = [
  {
    id: 'sample-day-1',
    date: '2026-11-12',
    dayNumber: 1,
    activities: [
      { id: 's1', title: 'Fushimi Inari before the crowds', category: 'activities', time: '07:00', location: 'Fushimi', notes: '', estimatedCostMinor: 0, order: 0 },
      { id: 's2', title: 'Lunch at Nishiki Market', category: 'food', time: '12:30', location: 'Nakagyō', notes: '', estimatedCostMinor: 240_000, order: 1 },
      { id: 's3', title: 'Tea ceremony in a machiya', category: 'activities', time: '16:00', location: 'Higashiyama', notes: 'Book a day ahead.', estimatedCostMinor: 600_000, order: 2 },
    ],
  },
  {
    id: 'sample-day-2',
    date: '2026-11-13',
    dayNumber: 2,
    activities: [
      { id: 's4', title: 'Bamboo grove and Tenryū-ji', category: 'activities', time: '08:00', location: 'Arashiyama', notes: '', estimatedCostMinor: 160_000, order: 0 },
      { id: 's5', title: 'Ryokan, two nights', category: 'accommodation', time: '15:00', location: 'Gion', notes: '', estimatedCostMinor: 3_600_000, order: 1 },
    ],
  },
];

function sampleBudget(): Budget {
  const byCategory = Object.fromEntries(ACTIVITY_CATEGORIES.map((category) => [category, 0])) as Budget['byCategory'];
  let total = 0;
  for (const day of SAMPLE_DAYS) {
    for (const activity of day.activities) {
      byCategory[activity.category] += activity.estimatedCostMinor;
      total += activity.estimatedCostMinor;
    }
  }
  const target = 5_000_000;
  return {
    byCategory,
    byDay: [],
    totalMinor: total,
    perPersonMinor: Math.round(total / 2),
    targetMinor: target,
    remainingMinor: target - total,
    usedBasisPoints: Math.round((total / target) * 10_000),
    activityCount: 5,
  };
}

function ItineraryPreview() {
  const budget = sampleBudget();
  return (
    <section aria-labelledby="plan-heading" className="bg-forest text-on-forest">
      <div className="page-x container-wide grid gap-14 py-24 md:py-32 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <h2 id="plan-heading" className="font-serif text-h2">
            Every day planned, every cost counted.
          </h2>
          <p className="mt-6 text-on-forest-muted">
            Add activities with a time, a place and an estimate. Drag them into order, move them between days, and watch the budget update as you go.
          </p>
          <dl className="mt-10 divide-y divide-white/12 border-y border-white/12">
            {[
              ['Reorder freely', 'Drag, or use the arrow buttons from the keyboard.'],
              ['Budgets in your currency', 'Nine currencies, stored to the paisa or cent.'],
              ['Take it with you', 'Export the itinerary and budget as a spreadsheet.'],
            ].map(([term, detail]) => (
              <div key={term} className="py-4">
                <dt className="font-semibold">{term}</dt>
                <dd className="mt-1 text-small text-on-forest-muted">{detail}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink to="/app/trips/new" variant="inverse" size="lg" className="mt-10">
            Start planning
          </ButtonLink>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <figure className="rounded-[4px] bg-canvas text-ink shadow-[0_40px_120px_-40px_rgb(0_0_0/0.7)]">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 pt-6 pb-5 sm:px-8">
              <div>
                <p className="text-small text-faint">Sample plan, not a booking</p>
                <p className="mt-1 font-serif text-[2rem] leading-none">Kyoto, slowly</p>
              </div>
              <div className="w-full max-w-[15rem]">
                <p className="mb-2 flex justify-between text-small">
                  <span className="text-muted">Estimated</span>
                  <span className="tabular font-semibold">{formatMoney(budget.totalMinor, 'INR')}</span>
                </p>
                <BudgetProgress budget={budget} currency="INR" size="sm" />
                <p className="mt-2 text-micro text-faint">
                  of {formatMoney(budget.targetMinor, 'INR', { compact: true })} target, for two
                </p>
              </div>
            </div>
            <div className="px-5 sm:px-8">
              <ItineraryTimeline days={SAMPLE_DAYS} currency="INR" format="d MMM yyyy" />
            </div>
            <figcaption className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-4 text-micro text-faint sm:px-8">
              {ACTIVITY_CATEGORIES.filter((category) => budget.byCategory[category] > 0).map((category) => (
                <span key={category} className="tabular">
                  {CATEGORY_LABELS[category]} {formatMoney(budget.byCategory[category], 'INR', { compact: true })}
                </span>
              ))}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function HonestyNote() {
  return (
    <section aria-labelledby="honesty-heading" className="page-x container-wide py-24 md:py-32">
      <div className="grid gap-10 md:grid-cols-12">
        <h2 id="honesty-heading" className="font-serif text-h2 md:col-span-7">
          Estimates, never prices.
        </h2>
        <div className="flex flex-col gap-5 text-muted md:col-span-4 md:col-start-9">
          <p>
            Destination costs are illustrative daily figures for a mid-range trip, written to help you plan. They are not live prices, and Voyage never books, sells or
            holds anything.
          </p>
          <p>Your own estimates stay in your account. You can export them, and nothing is shared with anyone else.</p>
          <Link to="/privacy" className="link self-start font-semibold text-ink">
            How we handle your data
          </Link>
        </div>
      </div>
    </section>
  );
}
