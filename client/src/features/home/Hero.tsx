import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { supportsWebGL, useAllowMotion, useFinePointer } from '../../components/effects/preferences';
import { SmartImage } from '../../components/ui/SmartImage';
import { api } from '../../lib/api';
import { MONTH_NAMES } from '../../lib/constants';
import { formatMoney } from '../../lib/money';
import type { DestinationCard } from '../../lib/types';
import { HeroSearch, type SearchOutcome } from './HeroSearch';
import { HeroScene } from './orb/HeroScene';
import { OrbController, type OrbScene } from './orb/orbController';
import posterTall from './poster/orb-poster-tall.jpg';
import posterWide from './poster/orb-poster-wide.jpg';

const SCENE_LABEL = 'A glowing amber orb hanging low between two dark, craggy mountain ridges.';

/** Where the orb sits for each search outcome: it rises as matches are found and sinks when none are. */
function liftFor(outcome: SearchOutcome): number {
  switch (outcome.state) {
    case 'results':
      return 0.3 + Math.min(outcome.count, 6) * 0.06;
    case 'searching':
      return 0.15;
    case 'empty':
    case 'error':
      return -0.75;
    default:
      return 0;
  }
}

type Pick = { state: 'idle' } | { state: 'choosing' } | { state: 'chosen'; destination: DestinationCard } | { state: 'failed' };

/**
 * The homepage hero, built around an interactive three.js scene of an orb between mountain ridges.
 * - A light follows the pointer, and the orb and ridges sway with it.
 * - The search is live: the orb rises as places match and sinks behind the ridge when none do.
 * - "Let the orb choose" picks a real destination, with the orb swelling as it decides.
 * Reduced motion and devices without WebGL get the same controls over a drawn poster whose orb
 * moves with the same state.
 */
export function Hero() {
  const allowMotion = useAllowMotion();
  const sceneCanRun = allowMotion && supportsWebGL();
  const finePointer = useFinePointer();
  const queryClient = useQueryClient();
  const sectionRef = useRef<HTMLElement>(null);
  const [controller] = useState(() => new OrbController());
  const [sceneReady, setSceneReady] = useState(false);
  const [searchLift, setSearchLift] = useState(0);
  const [pick, setPick] = useState<Pick>({ state: 'idle' });
  const lastPick = useRef<string | null>(null);
  const pickHeadingRef = useRef<HTMLHeadingElement>(null);

  const lift = pick.state === 'choosing' ? 1 : pick.state === 'chosen' ? 0.62 : searchLift;

  useEffect(() => {
    controller.setLift(lift);
  }, [controller, lift]);

  const onReady = useCallback(
    (scene: OrbScene) => {
      if (controller.attach(scene, { rise: true })) setSceneReady(true);
    },
    [controller],
  );
  useEffect(() => () => controller.detach(), [controller]);

  // Animate the scene objects only while the hero is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!sceneReady || !section) return;
    let frame = 0;
    let last = performance.now();
    let visible = true;
    const loop = (now: number) => {
      controller.step((now - last) / 1000, now);
      last = now;
      if (visible) frame = requestAnimationFrame(loop);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      cancelAnimationFrame(frame);
      if (visible) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [sceneReady, controller]);

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    controller.setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const choose = async () => {
    setPick({ state: 'choosing' });
    controller.pulse();
    try {
      const [all] = await Promise.all([
        queryClient.query({
          queryKey: ['destinations', 'all-for-orb'],
          queryFn: ({ signal }) => api.get<DestinationCard[]>('/destinations?limit=24&sort=name', signal),
          staleTime: 10 * 60_000,
        }),
        // Let the orb rise before revealing the answer; no wait when motion is reduced.
        new Promise((resolve) => window.setTimeout(resolve, allowMotion ? 1100 : 0)),
      ]);
      const pool = all.filter((item) => item.id !== lastPick.current);
      const destination = pool[Math.floor(Math.random() * pool.length)];
      if (!destination) throw new Error('No destinations');
      lastPick.current = destination.id;
      setPick({ state: 'chosen', destination });
    } catch {
      setPick({ state: 'failed' });
    }
  };

  useEffect(() => {
    const heading = pickHeadingRef.current;
    if (pick.state !== 'chosen' || !heading) return;
    heading.focus({ preventScroll: true });
    // On small screens the card lands below the controls; bring it into view.
    heading.closest('article')?.scrollIntoView({ block: 'nearest', behavior: allowMotion ? 'smooth' : 'auto' });
  }, [pick, allowMotion]);

  // Scroll-linked depth: the copy lifts away as the next section arrives.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      onPointerMove={finePointer ? onPointerMove : undefined}
      className="hs-dark relative isolate flex min-h-[max(44rem,100svh)] flex-col overflow-hidden"
    >
      <motion.div className="hero-reveal absolute inset-0 -z-10" style={allowMotion ? { opacity: sceneOpacity } : undefined}>
        <HeroScene
          label={SCENE_LABEL}
          poster={sceneCanRun ? <SceneStill /> : <HeroPoster lift={lift} choosing={pick.state === 'choosing'} />}
          className="absolute inset-0 size-full"
          onReady={onReady}
        />
      </motion.div>
      {/* Scrims keep the copy readable and blend the scene into the page. */}
      <div aria-hidden="true" className="hs-scrim-mobile pointer-events-none absolute inset-0 -z-[5] md:hidden" />
      <div aria-hidden="true" className="hs-scrim-desktop pointer-events-none absolute inset-0 -z-[5] hidden md:block" />
      <div aria-hidden="true" className="hs-scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-56" />

      <motion.div
        className="page-x container-wide pointer-events-none flex flex-1 flex-col justify-end pt-[19rem] pb-10 md:pt-36 md:pb-12"
        style={allowMotion ? { y: copyY } : undefined}
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="pointer-events-auto lg:col-span-6">
            <h1 id="hero-heading" className="font-serif text-display tracking-[-0.025em]">
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="line-rise block" style={{ animationDelay: '250ms' }}>
                  Places worth
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span className="line-rise block" style={{ animationDelay: '380ms' }}>
                  the long way round.
                </span>
              </span>
            </h1>
            <p className="rise mt-6 max-w-[32rem] text-lead" style={{ animationDelay: '620ms', color: 'color-mix(in srgb, var(--hs-text) 80%, transparent)' }}>
              Search eighteen considered destinations, or let the orb choose one. Then shape it into a day‑by‑day plan with an honest estimate of the cost.
            </p>
            <div className="rise mt-9 max-w-[36rem]" style={{ animationDelay: '760ms' }}>
              <HeroSearch onOutcome={(outcome) => setSearchLift(liftFor(outcome))} />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void choose()}
                  disabled={pick.state === 'choosing'}
                  className="group inline-flex h-13 items-center gap-2.5 rounded-[3px] border px-6 font-semibold transition-[background-color,border-color,transform] duration-200 active:translate-y-px disabled:cursor-progress focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    borderColor: 'var(--hs-btn-accent-border)',
                    backgroundColor: 'var(--hs-btn-accent-bg)',
                    color: 'var(--hs-btn-accent-text)',
                  }}
                >
                  {pick.state === 'choosing' ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:rotate-12" />
                  )}
                  {pick.state === 'choosing' ? 'The orb is choosing…' : pick.state === 'chosen' ? 'Choose again' : 'Let the orb choose'}
                </button>
                <Link
                  to="/app/trips/new"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[3px] border px-7 font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-200 active:translate-y-px"
                  style={{
                    borderColor: 'var(--hs-btn-outline-border)',
                    color: 'var(--hs-btn-outline-text)',
                  }}
                >
                  Plan a trip
                </Link>
              </div>
            </div>
          </div>

          <div className="pointer-events-auto lg:col-span-5 lg:col-start-8" aria-live="polite">
            <AnimatePresence mode="wait">
              {pick.state === 'chosen' ? (
                <OrbPick
                  key={pick.destination.id}
                  destination={pick.destination}
                  headingRef={pickHeadingRef}
                  onAgain={() => void choose()}
                  onClose={() => setPick({ state: 'idle' })}
                />
              ) : pick.state === 'failed' ? (
                <motion.p
                  key="failed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hs-card rounded-[6px] border p-5 text-small"
                  style={{ color: 'var(--hs-text)' }}
                >
                  The orb couldn’t reach the destinations just now.{' '}
                  <button type="button" onClick={() => void choose()} className="font-semibold underline underline-offset-4" style={{ color: 'var(--hs-text)' }}>
                    Try again
                  </button>
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-auto mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--hs-btn-accent-text)' }} />
            <p className="text-micro font-medium" style={{ color: 'color-mix(in srgb, var(--hs-text) 70%, transparent)' }}>
              {sceneReady
                ? 'Interactive 3D — move pointer across ridges to direct the mountain light'
                : 'Loading interactive 3D scene…'}
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function bestMonths(months: number[]): string {
  if (months.length === 0) return 'Any time';
  if (months.length >= 11) return 'All year';
  const first = MONTH_NAMES[(months[0] ?? 1) - 1]?.slice(0, 3);
  const last = MONTH_NAMES[(months[months.length - 1] ?? 1) - 1]?.slice(0, 3);
  return first === last ? (first ?? '') : `${first ?? ''}–${last ?? ''}`;
}

function OrbPick({
  destination,
  headingRef,
  onAgain,
  onClose,
}: {
  destination: DestinationCard;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAgain: () => void;
  onClose: () => void;
}) {
  return (
    <motion.article
      aria-labelledby="orb-pick-heading"
      initial={{ opacity: 0, y: 24, clipPath: 'inset(100% 0 0 0 round 6px)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0 round 6px)', transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1] } }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
      className="hs-card relative overflow-hidden rounded-[6px] border shadow-[0_30px_90px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr]">
        <SmartImage image={destination.heroImage} sizes="10rem" decorative maxWidth={480} className="h-full min-h-[11rem]" fallbackLabel={destination.name} />
        <div className="min-w-0 p-5">
          <p className="text-micro font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--hs-btn-accent-text)' }}>The orb chose</p>
          <h2 id="orb-pick-heading" ref={headingRef} tabIndex={-1} className="mt-1.5 font-serif text-[2rem] leading-none outline-none" style={{ color: 'var(--hs-text)' }}>
            {destination.name}
          </h2>
          <p className="mt-1 text-small" style={{ color: 'var(--hs-muted)' }}>{destination.country}</p>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-micro" style={{ color: 'var(--hs-muted)' }}>
            <div className="flex gap-1">
              <dt>Best</dt>
              <dd className="font-semibold" style={{ color: 'var(--hs-text)' }}>{bestMonths(destination.bestMonths)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Stay</dt>
              <dd className="font-semibold" style={{ color: 'var(--hs-text)' }}>
                {destination.suggestedDays.min}–{destination.suggestedDays.max} days
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>About</dt>
              <dd className="tabular font-semibold" style={{ color: 'var(--hs-text)' }}>{formatMoney(destination.dailyTotalMinor, destination.currency, { compact: true })}/day</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/destinations/${destination.slug}`}
              viewTransition
              className="inline-flex h-9 items-center gap-1.5 rounded-[3px] px-4 text-small font-semibold transition-transform hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--hs-btn-primary-bg)',
                color: 'var(--hs-btn-primary-text)',
              }}
            >
              Open {destination.name}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
            <Link
              to={`/app/trips/new?destination=${destination.id}`}
              className="inline-flex h-9 items-center rounded-[3px] border px-4 text-small font-semibold transition-colors"
              style={{
                borderColor: 'var(--hs-btn-outline-border)',
                color: 'var(--hs-btn-outline-text)',
              }}
            >
              Plan it
            </Link>
            <button
              type="button"
              onClick={onAgain}
              aria-label="Let the orb choose again"
              className="grid size-9 place-items-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--hs-muted)' }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss the orb’s choice"
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        style={{ color: 'var(--hs-muted)' }}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </motion.article>
  );
}

/**
 * Drawn stand-in for the 3D scene (phones, reduced motion, no WebGL, or while loading). Its orb
 * follows the same lift as the 3D one, so search and "Let the orb choose" respond here too.
 * Uses CSS custom properties so it matches both light and dark home themes.
 */
/**
 * A still frame rendered from the hero scene itself (wide and tall framings), shown while the
 * scene loads so the hand-off to the live 3D is a near-invisible cross-fade.
 */
function SceneStill() {
  return (
    <picture className="hs-dark absolute inset-0">
      <source media="(max-width: 767px)" srcSet={posterTall} />
      <img src={posterWide} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
    </picture>
  );
}

/** Drawn stand-in for devices that never load the scene (reduced motion, no WebGL); its orb follows the search. */
function HeroPoster({ lift, choosing }: { lift: number; choosing: boolean }) {
  const y = choosing ? -80 : -lift * 60;
  return (
    <div className="hs-dark absolute inset-0 overflow-hidden">
      {/* Ambient glow — warm in dark, cool blush in light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 65% 40%, color-mix(in srgb, var(--hs-bg) 60%, #2a3f38) 0%, var(--hs-bg) 75%)',
        }}
      />
      {/* Glowing celestial orb */}
      <div
        className="absolute left-[62%] top-[38%] size-48 rounded-full transition-transform duration-700 ease-out"
        style={{
          transform: `translate(-50%, calc(-50% + ${y}px)) scale(${choosing ? 1.2 : 1})`,
          background: 'radial-gradient(circle at 35% 35%, #fff5ea 0%, #ffaa60 25%, #d95e20 60%, #4a1c07 92%)',
          boxShadow: '0 0 70px 30px rgba(225, 105, 35, 0.45), 0 0 140px 70px rgba(180, 60, 15, 0.25)',
        }}
      />
      {/* Layered mountain ridges — SVG fill adapts via CSS */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[68%] w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.9 }}
      >
        <path d="M0,600 L0,360 L200,210 L390,320 L580,160 L780,300 L950,170 L1200,320 L1200,600 Z" fill="currentColor" opacity="0.22" />
        <path d="M0,600 L0,420 L160,300 L350,400 L540,250 L740,370 L920,270 L1200,390 L1200,600 Z" fill="currentColor" opacity="0.40" />
        <path d="M0,600 L0,480 L250,370 L480,460 L680,350 L890,440 L1200,370 L1200,600 Z" fill="currentColor" opacity="0.75" />
      </svg>
    </div>
  );
}
