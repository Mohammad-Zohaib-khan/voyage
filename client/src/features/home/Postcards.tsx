import { Shuffle } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react';
import { useRef, useState, type MouseEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAllowMotion, useFinePointer } from '../../components/effects/preferences';
import { Button } from '../../components/ui/Button';
import { RetryPanel, Skeleton } from '../../components/ui/Feedback';
import { SmartImage } from '../../components/ui/SmartImage';
import { api, errorMessage } from '../../lib/api';
import type { DestinationCard } from '../../lib/types';

/** Stacking order: the most recently picked-up card sits on top. */
let topZ = 10;

/** Scattered resting places for up to six postcards (percent of the board), and a tilt each. */
const LAYOUTS = [
  [
    { left: 4, top: 10, rotate: -7 },
    { left: 21, top: 30, rotate: 5 },
    { left: 38, top: 6, rotate: -3 },
    { left: 55, top: 28, rotate: 8 },
    { left: 70, top: 4, rotate: -6 },
    { left: 80, top: 34, rotate: 4 },
  ],
  [
    { left: 8, top: 30, rotate: 6 },
    { left: 24, top: 4, rotate: -8 },
    { left: 42, top: 32, rotate: 3 },
    { left: 58, top: 8, rotate: -5 },
    { left: 73, top: 36, rotate: 7 },
    { left: 79, top: 2, rotate: -3 },
  ],
];

function usePostcardDestinations() {
  return useQuery({
    queryKey: ['destinations', 'postcards'],
    queryFn: ({ signal }) => api.get<DestinationCard[]>('/destinations?limit=6&page=2', signal),
    staleTime: 10 * 60_000,
  });
}

/**
 * A board of draggable postcards (after Aceternity's draggable card, re-styled for Voyage).
 * Every card is also a normal link, so dragging is optional. On touch screens the cards become a
 * swipeable row instead, so they never fight with page scrolling.
 */
export function Postcards() {
  const { data, isPending, isError, error, refetch } = usePostcardDestinations();
  const finePointer = useFinePointer();
  const [layout, setLayout] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);

  return (
    <section aria-labelledby="postcards-heading" className="overflow-hidden bg-sunken">
      <div className="page-x container-wide py-24 md:py-32">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h2 id="postcards-heading" className="font-serif text-h2 md:col-span-6">
            Postcards from the collection
          </h2>
          <div className="flex flex-col items-start gap-4 md:col-span-5 md:col-start-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-sm text-muted">
              {finePointer ? 'Pick them up and move them around. Open the ones that stay with you.' : 'Swipe through, and open the ones that stay with you.'}
            </p>
            {finePointer && data ? (
              <Button variant="secondary" size="sm" icon={<Shuffle aria-hidden="true" className="size-4" />} onClick={() => setLayout((value) => value + 1)}>
                Shuffle
              </Button>
            ) : null}
          </div>
        </div>

        {isError ? (
          <RetryPanel className="mt-12" message={errorMessage(error, 'The postcards didn’t load.')} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="mt-14 flex gap-6">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/5] w-56" />
            ))}
          </div>
        ) : finePointer ? (
          <div ref={boardRef} className="relative mt-14 h-[34rem] [perspective:2400px]">
            {data.map((destination, index) => {
              const spot = LAYOUTS[layout % LAYOUTS.length]?.[index] ?? { left: 10 * index, top: 10, rotate: 0 };
              return <Postcard key={`${destination.id}-${layout}`} destination={destination} spot={spot} boardRef={boardRef} />;
            })}
          </div>
        ) : (
          <ul className="scrollbar-none -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6">
            {data.map((destination, index) => (
              <li key={destination.id} className="w-60 shrink-0 snap-center" style={{ rotate: `${index % 2 === 0 ? -2 : 2}deg` }}>
                <PostcardFace destination={destination} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PostcardFace({ destination, onLinkClick }: { destination: DestinationCard; onLinkClick?: (event: MouseEvent) => void }) {
  return (
    <div className="bg-[#fbf9f4] p-3 pb-4 text-inkfixed shadow-[0_24px_50px_-24px_rgb(20_33_29/0.55),0_2px_6px_rgb(20_33_29/0.08)]">
      <SmartImage image={destination.heroImage} ratio={4 / 5} sizes="15rem" decorative maxWidth={720} fallbackLabel={destination.name} className="pointer-events-none select-none" />
      <p className="mt-3 font-serif text-[1.55rem] leading-[1.05]">
        <Link to={`/destinations/${destination.slug}`} onClick={onLinkClick} className="hover:underline" draggable={false}>
          {destination.name}
        </Link>
      </p>
      <p className="mt-1 text-micro text-[#5c6862]">{destination.country}</p>
    </div>
  );
}

function Postcard({
  destination,
  spot,
  boardRef,
}: {
  destination: DestinationCard;
  spot: { left: number; top: number; rotate: number };
  boardRef: RefObject<HTMLDivElement | null>;
}) {
  const allowMotion = useAllowMotion();
  const dragged = useRef(false);
  const [z, setZ] = useState(1);
  const x = useMotionValue(0);
  const velocityX = useVelocity(x);
  // Cards swing slightly in the direction they are thrown, then settle.
  const swing = useSpring(useTransform(velocityX, [-1500, 0, 1500], [-10, 0, 10], { clamp: true }), { stiffness: 140, damping: 18 });
  const rotate = useTransform(swing, (value) => spot.rotate + (allowMotion ? value : 0));

  return (
    <motion.div
      className="absolute w-56 cursor-grab touch-none active:cursor-grabbing xl:w-60"
      style={{ left: `${spot.left}%`, top: `${spot.top}%`, x, rotate, zIndex: z }}
      drag
      dragConstraints={boardRef}
      dragElastic={0.12}
      dragMomentum={allowMotion}
      dragTransition={{ power: 0.25, timeConstant: 260 }}
      whileDrag={allowMotion ? { scale: 1.04 } : undefined}
      whileHover={allowMotion ? { y: -6 } : undefined}
      onDragStart={() => {
        dragged.current = true;
        topZ += 1;
        setZ(topZ);
      }}
      onDragEnd={() => {
        // Let the click that ends a drag pass without navigating.
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      initial={allowMotion ? { opacity: 0, y: 40 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <PostcardFace
        destination={destination}
        onLinkClick={(event) => {
          if (dragged.current) event.preventDefault();
        }}
      />
    </motion.div>
  );
}
