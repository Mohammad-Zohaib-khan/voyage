import { ArrowUpRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../../components/ui/Feedback';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import type { DestinationCard } from '../../lib/types';

// The shader is split out so it never delays the first render of the page.
const WaterShader = lazy(() => import('../../components/effects/WaterShader').then((module) => ({ default: module.WaterShader })));

function useCoastal() {
  return useQuery({
    queryKey: ['destinations', 'coast-feature'],
    queryFn: ({ signal }) => api.get<DestinationCard[]>('/destinations?style=coast&limit=8&sort=name', signal),
    staleTime: 10 * 60_000,
  });
}

/** The coastal feature: real coast-tagged destinations over a quiet, art-directed sea at dusk. */
export function CoastFeature() {
  const { data, isPending, isError, refetch } = useCoastal();
  return (
    <section aria-labelledby="coast-heading" className="relative isolate overflow-hidden bg-forest text-on-forest">
      <Suspense fallback={<div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,#0e1916_0%,#33453f_58%,#9a6a52_63%,#1b332e_66%,#0a1311_100%)]" />}>
        <WaterShader className="-z-10" />
      </Suspense>
      {/* Readability scrim on the text side. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(8_17_15/0.86)_0%,rgb(8_17_15/0.6)_45%,rgb(8_17_15/0.1)_100%)]" />

      <div className="page-x container-wide grid min-h-[min(54rem,100svh)] gap-12 py-24 md:py-32 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-5">
          <h2 id="coast-heading" className="font-serif text-h2">
            Where the land runs out
          </h2>
          <p className="mt-6 max-w-md text-on-forest-muted">
            Cliff villages, black-sand beaches and harbours at dusk. Every place tagged for the coast, with what a day there tends to cost.
          </p>
          <Link to="/destinations?style=coast" className="group mt-8 inline-flex items-center gap-2 font-semibold">
            <span className="underline decoration-paper/35 underline-offset-4 group-hover:decoration-paper">All coastal destinations</span>
            <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          {isError ? (
            <p className="text-on-forest-muted">
              Coastal places didn’t load.{' '}
              <button type="button" onClick={() => void refetch()} className="font-semibold underline underline-offset-4">
                Try again
              </button>
            </p>
          ) : isPending ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full opacity-20" />
              ))}
            </div>
          ) : (
            <ul className="border-t border-white/15">
              {data.map((destination) => (
                <li key={destination.id} className="border-b border-white/15">
                  <Link
                    to={`/destinations/${destination.slug}`}
                    viewTransition
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-4 transition-colors hover:text-paper"
                  >
                    <span className="font-serif text-[1.85rem] leading-none transition-transform duration-500 ease-[var(--ease-settle)] group-hover:translate-x-2">
                      {destination.name}
                    </span>
                    <span className="tabular text-small text-on-forest-muted">
                      {destination.country} <span aria-hidden="true">/</span> ≈ {formatMoney(destination.dailyTotalMinor, destination.currency, { compact: true })} a day
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
