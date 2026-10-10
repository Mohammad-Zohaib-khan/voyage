import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Compass, Mountain, Wind } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router';
import { useAllowMotion } from '../../components/effects/preferences';
import { Skeleton } from '../../components/ui/Feedback';
import { SmartImage } from '../../components/ui/SmartImage';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import type { DestinationCard } from '../../lib/types';

function useMountainDestinations() {
  return useQuery({
    queryKey: ['destinations', 'mountain-feature'],
    queryFn: ({ signal }) => api.get<DestinationCard[]>('/destinations?style=mountains&limit=8&sort=name', signal),
    staleTime: 10 * 60_000,
  });
}

function formatCoords(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} · ${lngStr}`;
}

/** Estimated alpine summit elevation based on destination name/region for immersion */
function summitElevation(name: string): string {
  if (name.includes('Dolomites')) return '3,343 m / 10,968 ft';
  if (name.includes('Swiss') || name.includes('Zermatt')) return '4,478 m / 14,692 ft';
  if (name.includes('Patagonia') || name.includes('Torres')) return '3,050 m / 10,007 ft';
  if (name.includes('Karakoram') || name.includes('Hunza')) return '7,788 m / 25,551 ft';
  if (name.includes('Inca') || name.includes('Cusco')) return '4,215 m / 13,828 ft';
  if (name.includes('Lofoten') || name.includes('Reine')) return '1,029 m / 3,376 ft';
  return '3,120 m / 10,236 ft';
}

/**
 * 3D Interactive Depth Viewport:
 * Renders the mountain photography with realistic 3D perspective rotation,
 * dynamic specular sunlight reflection following the pointer, and a floating 3D telemetry HUD.
 */
function MountainDepthViewport({ destination }: { destination: DestinationCard }) {
  const allowMotion = useAllowMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, lightX: 50, lightY: 50 });

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!allowMotion || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Map to -7 to +7 degrees
    const rotY = (x - 0.5) * 14;
    const rotX = (0.5 - y) * 14;
    setTilt({ rotX, rotY, lightX: x * 100, lightY: y * 100 });
  };

  const onPointerLeave = () => {
    setTilt({ rotX: 0, rotY: 0, lightX: 50, lightY: 50 });
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative size-full overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        className="relative size-full transition-transform duration-200 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) scale3d(1.02, 1.02, 1.02)`,
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={destination.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <SmartImage
              image={destination.heroImage}
              sizes="(min-width: 768px) 66vw, 100vw"
              decorative
              maxWidth={1920}
              className="size-full"
            />
          </motion.div>
        </AnimatePresence>

        {/* Dynamic 3D specular light glare tracking pointer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 500px at ${tilt.lightX}% ${tilt.lightY}%, rgba(255,255,255,0.4) 0%, rgba(255,240,210,0.12) 40%, transparent 80%)`,
          }}
        />

        {/* Atmospheric depth vignette and edge rim */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,8,7,0.7)_100%)]"
        />

        {/* Floating 3D Telemetry HUD (Elevated in 3D Space) */}
        <div
          className="pointer-events-none absolute top-8 right-8 z-20 hidden md:block"
          style={{ transform: 'translateZ(40px)' }}
        >
          <div className="hs-card flex flex-col items-end gap-2 rounded-[6px] border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md" style={{ color: 'var(--hs-text)' }}>
            <div className="flex items-center gap-1.5 text-micro font-semibold tracking-wider uppercase" style={{ color: 'var(--hs-btn-accent-text)' }}>
              <Mountain aria-hidden="true" className="size-3.5" />
              <span>Alpine Survey</span>
            </div>
            <p className="font-serif text-[1.4rem] leading-none" style={{ color: 'var(--hs-text)' }}>{destination.name}</p>
            <div className="mt-1 flex items-center gap-3 text-micro" style={{ color: 'var(--hs-muted)' }}>
              <span className="flex items-center gap-1">
                <Compass aria-hidden="true" className="size-3" style={{ color: 'var(--hs-btn-accent-text)' }} />
                {formatCoords(destination.location.lat, destination.location.lng)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Wind aria-hidden="true" className="size-3" style={{ color: 'var(--hs-btn-accent-text)' }} />
                {summitElevation(destination.name)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The mountain chapter of the home page: a list of real mountain destinations.
 * Hovering or focusing a row crossfades the photorealistic 3D Depth Viewport
 * to that place with dynamic pointer parallax, specular light sheen, and alpine telemetry.
 */
export function MountainFeature() {
  const { data, isPending, isError, refetch } = useMountainDestinations();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = data?.[activeIndex] ?? data?.[0];

  return (
    <section aria-labelledby="mountain-heading" className="hs-dark relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-20 h-[26rem] md:inset-y-0 md:left-[34%] md:h-auto">
        {active ? (
          <MountainDepthViewport destination={active} />
        ) : (
          <div className="hs-dark size-full" />
        )}
      </div>

      <div aria-hidden="true" className="hs-mountain-scrim-mobile pointer-events-none absolute inset-0 -z-10 md:hidden" />
      <div aria-hidden="true" className="hs-mountain-scrim-desktop pointer-events-none absolute inset-0 -z-10 hidden md:block" />

      <div className="page-x container-wide grid min-h-[min(50rem,100svh)] items-end gap-12 pt-[17rem] pb-16 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-micro font-semibold tracking-wider uppercase" style={{ color: 'var(--hs-btn-accent-text)' }}>
            <span className="size-1.5 rounded-full" style={{ backgroundColor: 'var(--hs-btn-accent-text)' }} />
            High Country Expedition
          </div>
          <h2 id="mountain-heading" className="mt-2 font-serif text-h2" style={{ color: 'var(--hs-text)' }}>
            Into the high country
          </h2>
          <p className="mt-4 max-w-md" style={{ color: 'var(--hs-muted)' }}>
            High passes, glacier light and cold, clear air. Move pointer over places to preview them with interactive 3D depth and alpine telemetry.
          </p>

          {isError ? (
            <p className="mt-8" style={{ color: 'var(--hs-muted)' }}>
              Mountain places didn’t load.{' '}
              <button type="button" onClick={() => void refetch()} className="font-semibold underline underline-offset-4" style={{ color: 'var(--hs-text)' }}>
                Try again
              </button>
            </p>
          ) : isPending ? (
            <div className="mt-8 flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full opacity-20" />
              ))}
            </div>
          ) : (
            <ul className="mt-8 border-t hs-border-color">
              {data.map((destination, index) => (
                <li key={destination.id} className="border-b hs-border-color">
                  <Link
                    to={`/destinations/${destination.slug}`}
                    viewTransition
                    onPointerEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    aria-label={`${destination.name}, ${destination.country}, about ${formatMoney(destination.dailyTotalMinor, destination.currency, { compact: true })} a day`}
                    data-active={index === activeIndex || undefined}
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-3.5 transition-colors"
                    style={{ color: index === activeIndex ? 'var(--hs-text)' : 'var(--hs-muted)' }}
                  >
                    <span className="font-serif text-[1.6rem] leading-none transition-transform duration-500 ease-[var(--ease-settle)] group-data-[active]:translate-x-2" style={{ color: 'var(--hs-text)' }}>
                      {destination.name}
                    </span>
                    <span className="tabular text-small" style={{ color: 'var(--hs-muted)' }}>
                      {destination.country} <span aria-hidden="true">/</span> ≈ {formatMoney(destination.dailyTotalMinor, destination.currency, { compact: true })} a day
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link to="/destinations?style=mountains" className="group mt-8 inline-flex items-center gap-2 font-semibold" style={{ color: 'var(--hs-text)' }}>
            <span className="underline underline-offset-4" style={{ textDecorationColor: 'var(--hs-border)' }}>All mountain destinations</span>
            <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      {active ? (
        <p className="page-x container-wide pb-8 text-micro md:text-right" style={{ color: 'var(--hs-muted)' }}>
          {active.name}. Photo by{' '}
          <a href={active.heroImage.credit.url} target="_blank" rel="noopener noreferrer" className="underline decoration-current/40 underline-offset-2 hover:decoration-current">
            {active.heroImage.credit.name}
          </a>{' '}
          on Unsplash.
        </p>
      ) : null}
    </section>
  );
}
