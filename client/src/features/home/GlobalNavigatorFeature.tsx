import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Compass, Globe as GlobeIcon, MapPin, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '../../components/ui/Feedback';
import { SmartImage } from '../../components/ui/SmartImage';
import { api } from '../../lib/api';
import { REGION_LABELS, type Region } from '../../lib/constants';
import { formatMoney } from '../../lib/money';
import type { DestinationCard } from '../../lib/types';

const DestinationGlobe = lazy(() => import('../destinations/globe/DestinationGlobe'));

const HIGHLIGHT_IDS = [
  { label: 'Kyoto', id: 'kyoto', name: 'Kyoto' },
  { label: 'Dolomites', id: 'dolomites', name: 'Dolomites' },
  { label: 'Reine', id: 'reine', name: 'Reine' },
  { label: 'Oaxaca', id: 'oaxaca', name: 'Oaxaca' },
  { label: 'Uyuni', id: 'salar-de-uyuni', name: 'Salar de Uyuni' },
  { label: 'Cape Town', id: 'cape-town', name: 'Cape Town' },
];

export function GlobalNavigatorFeature() {
  const { data: destinations = [], isPending } = useQuery({
    queryKey: ['destinations', 'all-for-globe-feature'],
    queryFn: ({ signal }) => api.get<DestinationCard[]>('/destinations?limit=24&sort=name', signal),
    staleTime: 10 * 60_000,
  });

  const [selectedId, setSelectedId] = useState<string | null>('kyoto');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');

  const filteredDestinations = destinations.filter(
    (d) => regionFilter === 'all' || d.region === regionFilter,
  );

  const activeDestination = destinations.find((d) => d.id === selectedId) ?? destinations[0];

  return (
    <section aria-labelledby="globe-feature-heading" className="hs-globe relative isolate overflow-hidden">
      {/* Subtle celestial background glows */}
      <div
        aria-hidden="true"
        className="hs-globe-glow pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e3a184]/5 blur-[120px]"
      />

      <div className="page-x container-wide py-24 md:py-32">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-black/5 dark:bg-white/5 px-3 py-1 text-micro font-medium" style={{ color: 'var(--hs-btn-accent-text)' }}>
              <Sparkles aria-hidden="true" className="size-3.5" />
              <span>Real-Time 3D Planetary Navigator</span>
            </div>
            <h2 id="globe-feature-heading" className="mt-4 font-serif text-h2" style={{ color: 'var(--hs-text)' }}>
              The world in three dimensions
            </h2>
            <p className="mt-4 max-w-xl" style={{ color: 'var(--hs-muted)' }}>
              Drag to turn the terrestrial sphere. Choose waypoint beacons across continents to inspect regional climates, travel costs, and expedition routes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:col-span-5 lg:justify-end">
            {(['all', 'asia', 'europe', 'americas', 'africa'] as const).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`rounded-full px-3.5 py-1 text-micro font-semibold transition-all ${
                  regionFilter === reg
                    ? 'border font-semibold shadow-xs'
                    : 'hs-pill-inactive hover:opacity-100'
                }`}
                style={
                  regionFilter === reg
                    ? {
                        borderColor: 'var(--hs-btn-accent-border)',
                        backgroundColor: 'var(--hs-btn-accent-bg)',
                        color: 'var(--hs-btn-accent-text)',
                      }
                    : undefined
                }
              >
                {reg === 'all' ? 'All Continents' : REGION_LABELS[reg]}
              </button>
            ))}
          </div>
        </div>

        {/* Quick jump waypoint bar */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-y hs-border-color py-3 text-micro" style={{ color: 'var(--hs-muted)' }}>
          <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--hs-btn-accent-text)' }}>
            <Compass aria-hidden="true" className="size-3.5" />
            Quick Waypoints:
          </span>
          {HIGHLIGHT_IDS.map((item) => {
            const dest = destinations.find((d) => d.slug === item.id || d.id.includes(item.id));
            const id = dest ? dest.id : item.id;
            const isSelected = selectedId === id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={`rounded-[3px] px-2.5 py-0.5 transition-colors ${
                  isSelected
                    ? 'font-semibold shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: 'var(--hs-btn-accent-bg)',
                        color: 'var(--hs-btn-accent-text)',
                        border: '1px solid var(--hs-btn-accent-border)',
                      }
                    : { color: 'var(--hs-muted)' }
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 3D Globe + Floating Telemetry Card Grid */}
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Globe Canvas Container */}
          <div className="relative mx-auto aspect-square w-full max-w-[28rem] lg:col-span-7 lg:max-w-none">
            <div className="relative size-full rounded-full p-2 ring-1 ring-black/10 dark:ring-white/15 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xs">
              <Suspense
                fallback={
                  <div className="hs-card grid size-full place-items-center rounded-full">
                    <div className="flex flex-col items-center gap-3 text-micro" style={{ color: 'var(--hs-muted)' }}>
                      <GlobeIcon className="size-8 animate-spin" style={{ color: 'var(--hs-btn-accent-text)' }} />
                      <span>Generating 3D planetary mesh…</span>
                    </div>
                  </div>
                }
              >
                {isPending ? (
                  <Skeleton className="size-full rounded-full opacity-20" />
                ) : (
                  <DestinationGlobe
                    destinations={filteredDestinations.length > 0 ? filteredDestinations : destinations}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                  />
                )}
              </Suspense>
            </div>
            <p className="mt-4 text-center text-micro" style={{ color: 'var(--hs-muted)' }}>
              ✦ Drag in any direction to rotate the globe · Click beacons to explore
            </p>
          </div>

          {/* Active Waypoint 3D Glass Inspector Card */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {activeDestination ? (
                <motion.article
                  key={activeDestination.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="hs-card overflow-hidden rounded-[8px] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <SmartImage
                      image={activeDestination.heroImage}
                      sizes="(min-width: 1024px) 35vw, 100vw"
                      decorative
                      maxWidth={960}
                      className="size-full"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,transparent_60%)]" />
                    <div className="hs-card absolute top-3 left-3 flex items-center gap-1.5 rounded-full border px-3 py-1 text-micro font-medium backdrop-blur-md" style={{ color: 'var(--hs-text)' }}>
                      <MapPin aria-hidden="true" className="size-3" style={{ color: 'var(--hs-btn-accent-text)' }} />
                      <span>
                        {Math.abs(activeDestination.location.lat).toFixed(1)}°
                        {activeDestination.location.lat >= 0 ? 'N' : 'S'},{' '}
                        {Math.abs(activeDestination.location.lng).toFixed(1)}°
                        {activeDestination.location.lng >= 0 ? 'E' : 'W'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-micro font-semibold tracking-wider uppercase" style={{ color: 'var(--hs-btn-accent-text)' }}>
                      {activeDestination.country} · {REGION_LABELS[activeDestination.region]}
                    </p>
                    <h3 className="mt-1 font-serif text-[2.2rem] leading-none" style={{ color: 'var(--hs-text)' }}>
                      {activeDestination.name}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-small" style={{ color: 'var(--hs-muted)' }}>
                      {activeDestination.summary}
                    </p>

                    <dl className="mt-5 grid grid-cols-2 gap-4 border-y hs-border-color py-4 text-micro">
                      <div>
                        <dt style={{ color: 'var(--hs-muted)' }}>Estimated Cost</dt>
                        <dd className="mt-0.5 font-semibold" style={{ color: 'var(--hs-text)' }}>
                          {formatMoney(activeDestination.dailyTotalMinor, activeDestination.currency, { compact: true })} / day
                        </dd>
                      </div>
                      <div>
                        <dt style={{ color: 'var(--hs-muted)' }}>Stay Duration</dt>
                        <dd className="mt-0.5 font-semibold" style={{ color: 'var(--hs-text)' }}>
                          {activeDestination.suggestedDays.min}–{activeDestination.suggestedDays.max} days
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        to={`/destinations/${activeDestination.slug}`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-[3px] px-5 text-small font-semibold transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
                        style={{
                          backgroundColor: 'var(--hs-btn-primary-bg)',
                          color: 'var(--hs-btn-primary-text)',
                        }}
                      >
                        Explore {activeDestination.name}
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </Link>
                      <Link
                        to={`/app/trips/new?destination=${activeDestination.id}`}
                        className="inline-flex h-10 items-center rounded-[3px] border px-4 text-small font-semibold transition-colors"
                        style={{
                          borderColor: 'var(--hs-btn-outline-border)',
                          color: 'var(--hs-btn-outline-text)',
                        }}
                      >
                        Plan journey
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
