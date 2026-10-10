import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useCallback, useId, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useAllowMotion } from '../../components/effects/preferences';
import { Reveal } from '../../components/effects/Reveal';
import { IconButton } from '../../components/ui/Button';
import { RetryPanel, Skeleton } from '../../components/ui/Feedback';
import { PhotoCredit, SmartImage } from '../../components/ui/SmartImage';
import { errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { REGION_LABELS } from '../../lib/constants';
import type { DestinationCard } from '../../lib/types';
import { useFeaturedDestinations, useSavedIds, useToggleSave } from '../destinations/api';
import { CostEstimate, DestinationTags, SaveDestinationButton } from '../destinations/components';

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Image-led carousel of featured destinations, following the WAI-ARIA carousel pattern:
 * previous/next buttons, a tab list of thumbnails, arrow-key support, swipe on touch, and a
 * polite live region. It never auto-advances.
 */
export function FeaturedCarousel() {
  const { data, isPending, isError, error, refetch, isRefetching } = useFeaturedDestinations(6);
  const savedIds = useSavedIds();
  const { toggle, pendingId } = useToggleSave();
  const allowMotion = useAllowMotion();
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
  const headingId = useId();
  const slidesId = useId();

  const count = data?.length ?? 0;
  const go = useCallback(
    (next: number, dir?: number) => {
      if (count === 0) return;
      setPage(([current]) => {
        const wrapped = ((next % count) + count) % count;
        return [wrapped, dir ?? (wrapped > current ? 1 : -1)];
      });
    },
    [count],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1, -1);
    }
  };

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1, 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1, -1);
  };

  const slide = data?.[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      className="page-x container-wide py-24 md:py-36"
    >
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <h2 id={headingId} className="font-serif text-h2 md:col-span-7">
          Featured places
        </h2>
        <div className="flex items-end justify-between gap-6 md:col-span-5">
          <p className="max-w-sm text-muted">Each comes with a full guide, an illustrative cost estimate and the months when it is at its best.</p>
          {count > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="tabular mr-2 text-small text-muted" aria-hidden="true">
                {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </span>
              <IconButton label="Previous destination" onClick={() => go(index - 1, -1)} className="border border-line-strong">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton label="Next destination" onClick={() => go(index + 1, 1)} className="border border-line-strong">
                <ArrowRight aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          ) : null}
        </div>
      </div>

      {isError ? (
        <RetryPanel className="mt-12" message={errorMessage(error, 'Featured destinations didn’t load.')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : isPending || !slide ? (
        <div className="mt-14 grid gap-10 md:grid-cols-12">
          <Skeleton className="aspect-[4/5] md:col-span-7 md:aspect-[16/11]" />
          <div className="flex flex-col gap-4 md:col-span-4 md:col-start-9 md:pt-20">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <>
          <div id={slidesId} aria-live="polite" className="mt-14 md:mt-20">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${slide.name}`}
                className="grid gap-10 md:grid-cols-12 md:gap-x-8"
                custom={direction}
                initial={allowMotion ? 'enter' : false}
                animate="center"
                exit={allowMotion ? 'exit' : undefined}
                variants={{
                  enter: { opacity: 1 },
                  center: { opacity: 1 },
                  exit: { opacity: 0, transition: { duration: 0.25 } },
                }}
              >
                <motion.div
                  className="relative touch-pan-y md:col-span-7"
                  drag={allowMotion ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={onDragEnd}
                >
                  <motion.div
                    initial={allowMotion ? { clipPath: direction >= 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' } : false}
                    animate={{ clipPath: 'inset(0 0 0 0%)', transition: { duration: 0.9, ease: EASE } }}
                  >
                    <motion.div initial={allowMotion ? { scale: 1.08 } : false} animate={{ scale: 1, transition: { duration: 1.4, ease: EASE } }}>
                      <SmartImage
                        image={slide.heroImage}
                        sizes="(min-width: 48rem) 58vw, 100vw"
                        fallbackLabel={slide.name}
                        decorative
                        className="pointer-events-none aspect-[4/5] select-none md:aspect-[16/11]"
                      />
                    </motion.div>
                  </motion.div>
                  <div className="absolute top-4 right-4 z-10">
                    <SaveDestinationButton destination={slide} saved={savedIds.has(slide.id)} pending={pendingId === slide.id} onToggle={toggle} />
                  </div>
                </motion.div>

                <motion.div
                  className="flex flex-col md:col-span-4 md:col-start-9 md:justify-end"
                  initial={allowMotion ? { opacity: 0, y: 24 } : false}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.15, ease: EASE } }}
                >
                  <p className="text-small text-faint">
                    {slide.country}, {REGION_LABELS[slide.region]}
                  </p>
                  <h3 className="mt-2 font-serif text-h2 leading-[0.98] text-ink">{slide.name}</h3>
                  <p className="mt-5 text-lead text-muted">{slide.summary}</p>
                  <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
                    <DestinationTags styles={slide.travelStyles} />
                    <CostEstimate amountMinor={slide.dailyTotalMinor} currency={slide.currency} />
                  </div>
                  <Link
                    to={`/destinations/${slide.slug}`}
                    viewTransition
                    className="group mt-8 inline-flex items-center gap-2 self-start font-semibold text-ink"
                  >
                    <span className="link">Read the {slide.name} guide</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                  <PhotoCredit image={slide.heroImage} className="mt-6 text-faint" />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div role="tablist" aria-label="Choose a featured destination" className="scrollbar-none -mx-4 mt-12 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {data.map((item: DestinationCard, itemIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-controls={slidesId}
                tabIndex={itemIndex === index ? 0 : -1}
                onClick={() => go(itemIndex)}
                className={cn(
                  'group w-28 shrink-0 text-left transition-opacity sm:w-36',
                  itemIndex === index ? 'opacity-100' : 'opacity-60 hover:opacity-100',
                )}
              >
                <Reveal>
                  <SmartImage image={item.heroImage} ratio={3 / 2} sizes="9rem" decorative maxWidth={480} fallbackLabel={item.name} />
                </Reveal>
                <span className={cn('mt-2 block h-px w-full origin-left bg-ink transition-transform duration-500', itemIndex === index ? 'scale-x-100' : 'scale-x-0')} />
                <span className="mt-2 block truncate text-small font-semibold text-ink">{item.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
