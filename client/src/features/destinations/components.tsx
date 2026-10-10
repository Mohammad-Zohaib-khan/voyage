import { Bookmark, BookmarkCheck, Search, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { IconButton } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Feedback';
import { Checkbox } from '../../components/ui/Form';
import { TiltSurface } from '../../components/effects/TiltCard';
import { useTilt } from '../../components/effects/useTilt';
import { SmartImage } from '../../components/ui/SmartImage';
import { cn } from '../../lib/cn';
import {
  BUDGET_BANDS,
  BUDGET_HINTS,
  BUDGET_LABELS,
  MONTH_INITIALS,
  MONTH_NAMES,
  REGION_LABELS,
  REGIONS,
  SEASON_KEYS,
  SEASON_LABELS,
  STYLE_LABELS,
  TRAVEL_STYLES,
  type TravelStyle,
} from '../../lib/constants';
import { formatMoney } from '../../lib/money';
import type { DestinationCard as Destination, DestinationFilters as Filters } from '../../lib/types';
import { toggleValue } from './filters';

export function SaveDestinationButton({
  destination,
  saved,
  pending,
  onToggle,
  tone = 'onImage',
}: {
  destination: Destination;
  saved: boolean;
  pending: boolean;
  onToggle: (destination: Destination, saved: boolean) => void;
  tone?: 'onImage' | 'default';
}) {
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <IconButton
      label={saved ? `Remove ${destination.name} from saved places` : `Save ${destination.name}`}
      aria-pressed={saved}
      tone={tone}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        onToggle(destination, saved);
      }}
    >
      <Icon aria-hidden="true" className={cn('size-[18px]', saved && 'fill-current text-accent')} strokeWidth={1.75} />
    </IconButton>
  );
}

export function DestinationTags({ styles, className }: { styles: TravelStyle[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-3 gap-y-1 text-small text-olive', className)} aria-label="Travel styles">
      {styles.map((style) => (
        <li key={style}>{STYLE_LABELS[style]}</li>
      ))}
    </ul>
  );
}

export function CostEstimate({ amountMinor, currency, className }: { amountMinor: number; currency: string; className?: string }) {
  return (
    <p className={cn('text-small text-muted', className)}>
      <span className="tabular font-semibold text-ink">≈ {formatMoney(amountMinor, currency, { compact: true })}</span>
      <span> a day per person</span>
      <span className="sr-only">, an illustrative estimate</span>
    </p>
  );
}

/** Twelve-month strip highlighting the best months to visit, with a text equivalent. */
export function SeasonStrip({ months, className }: { months: number[]; className?: string }) {
  const best = new Set(months);
  const names = [...months].sort((a, b) => a - b).map((month) => MONTH_NAMES[month - 1]);
  return (
    <div className={className}>
      <p className="sr-only">Best months: {names.join(', ')}.</p>
      <ol aria-hidden="true" className="grid grid-cols-12 gap-1">
        {MONTH_INITIALS.map((initial, index) => {
          const active = best.has(index + 1);
          return (
            <li key={MONTH_NAMES[index]} className="flex flex-col items-center gap-1.5">
              <span className={cn('h-1.5 w-full rounded-full', active ? 'bg-accent-fill' : 'bg-line')} />
              <span className={cn('text-micro', active ? 'font-semibold text-ink' : 'text-faint')}>{initial}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface DestinationCardProps {
  destination: Destination;
  saved: boolean;
  savePending: boolean;
  onToggleSave: (destination: Destination, saved: boolean) => void;
  priority?: boolean;
  /** Give the photo a view-transition name so it morphs into the guide's hero. Unique per page only. */
  sharedTransition?: boolean;
}

/** Editorial destination card: photograph first, quiet metadata, no box. */
export function DestinationCard({ destination, saved, savePending, onToggleSave, priority = false, sharedTransition = false }: DestinationCardProps) {
  const tilt = useTilt(4);
  return (
    <article className="group relative flex flex-col" {...tilt.handlers}>
      <TiltSurface tilt={tilt} className="relative">
        <Link to={`/destinations/${destination.slug}`} viewTransition tabIndex={-1} aria-hidden="true" className="block">
          <SmartImage
            image={destination.heroImage}
            ratio={4 / 5}
            sizes="(min-width: 80rem) 28vw, (min-width: 40rem) 45vw, 92vw"
            priority={priority}
            maxWidth={1280}
            fallbackLabel={destination.name}
            decorative
            className="shadow-[0_1px_0_rgb(0_0_0/0.02)] transition-shadow duration-500 group-hover:shadow-[0_28px_60px_-34px_rgb(20_33_29/0.55)]"
            imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-settle)] group-hover:scale-[1.035]"
            transitionName={sharedTransition ? `destination-${destination.slug}` : undefined}
          />
        </Link>
        <div className="absolute top-3 right-3 z-10 [transform:translateZ(30px)]">
          <SaveDestinationButton destination={destination} saved={saved} pending={savePending} onToggle={onToggleSave} />
        </div>
      </TiltSurface>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-small text-faint">
          {destination.country}, {REGION_LABELS[destination.region]}
        </p>
        <h3 className="mt-1 font-serif text-[2rem] leading-[1.05] text-ink">
          <Link
            to={`/destinations/${destination.slug}`}
            viewTransition
            className="decoration-1 underline-offset-[0.18em] after:absolute after:inset-0 hover:underline"
          >
            {destination.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-muted">{destination.summary}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
          <DestinationTags styles={destination.travelStyles} />
          <CostEstimate amountMinor={destination.dailyTotalMinor} currency={destination.currency} />
        </div>
      </div>
    </article>
  );
}

export function DestinationCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-4 h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  );
}

/** Search box that commits on submit and after a short pause while typing. */
export function DestinationSearch({ value, onChange, className, size = 'md' }: { value: string; onChange: (value: string) => void; className?: string; size?: 'md' | 'lg' }) {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const id = useId();

  // Adopt outside changes (e.g. "Clear all" or back/forward navigation) without an effect.
  if (value !== committed) {
    setCommitted(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 350);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
      className={cn('relative', className)}
    >
      <label htmlFor={id} className="sr-only">
        Search destinations
      </label>
      <Search aria-hidden="true" className={cn('pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-muted', size === 'lg' ? 'size-6' : 'size-5')} />
      <input
        id={id}
        type="search"
        value={draft}
        maxLength={80}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search places or countries"
        autoComplete="off"
        className={cn(
          'w-full border-0 border-b border-line-strong bg-transparent pr-10 text-ink placeholder:text-faint focus-visible:border-ink focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'h-14 pl-9 font-serif text-[1.375rem] md:h-16 md:pl-10 md:text-[1.75rem]' : 'h-12 pl-8 text-lead',
        )}
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          className="absolute top-1/2 right-0 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </form>
  );
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  counts?: Partial<Record<string, number>>;
}

/** Grouped filters. OR within a group, AND across groups — the same rule the API applies. */
export function DestinationFilters({ filters, onChange, counts }: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Travel style</legend>
        {TRAVEL_STYLES.map((style) => (
          <Checkbox
            key={style}
            label={
              <span className="flex w-full justify-between gap-4">
                {STYLE_LABELS[style]}
                {counts?.[style] !== undefined ? <span className="tabular text-faint">{counts[style]}</span> : null}
              </span>
            }
            checked={filters.style.includes(style)}
            onChange={() => onChange({ ...filters, style: toggleValue(filters.style, style) })}
            className="[&>span:last-child]:flex-1"
          />
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Region</legend>
        {REGIONS.map((region) => (
          <Checkbox
            key={region}
            label={REGION_LABELS[region]}
            checked={filters.region.includes(region)}
            onChange={() => onChange({ ...filters, region: toggleValue(filters.region, region) })}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Daily estimate</legend>
        {BUDGET_BANDS.map((band) => (
          <Checkbox
            key={band}
            label={BUDGET_LABELS[band]}
            description={BUDGET_HINTS[band]}
            checked={filters.budget.includes(band)}
            onChange={() => onChange({ ...filters, budget: toggleValue(filters.budget, band) })}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Best time to go</legend>
        {SEASON_KEYS.map((season) => (
          <Checkbox
            key={season}
            label={SEASON_LABELS[season]}
            checked={filters.season.includes(season)}
            onChange={() => onChange({ ...filters, season: toggleValue(filters.season, season) })}
          />
        ))}
      </fieldset>
    </div>
  );
}

/** Removable chips for each active filter, plus a reset. */
export function ActiveFilterChips({ filters, onChange, onReset }: { filters: Filters; onChange: (next: Filters) => void; onReset: () => void }) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...(filters.q.trim() ? [{ key: 'q', label: `“${filters.q.trim()}”`, remove: () => onChange({ ...filters, q: '' }) }] : []),
    ...filters.style.map((value) => ({ key: `s-${value}`, label: STYLE_LABELS[value], remove: () => onChange({ ...filters, style: toggleValue(filters.style, value) }) })),
    ...filters.region.map((value) => ({ key: `r-${value}`, label: REGION_LABELS[value], remove: () => onChange({ ...filters, region: toggleValue(filters.region, value) }) })),
    ...filters.budget.map((value) => ({ key: `b-${value}`, label: BUDGET_LABELS[value], remove: () => onChange({ ...filters, budget: toggleValue(filters.budget, value) }) })),
    ...filters.season.map((value) => ({ key: `t-${value}`, label: SEASON_LABELS[value], remove: () => onChange({ ...filters, season: toggleValue(filters.season, value) }) })),
  ];
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Active filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong pr-2.5 pl-3.5 text-small text-ink transition-colors hover:border-ink hover:bg-surface"
        >
          {chip.label}
          <X aria-hidden="true" className="size-3.5 text-muted" />
        </button>
      ))}
      <button type="button" onClick={onReset} className="ml-1 text-small font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-current">
        Clear all
      </button>
    </div>
  );
}
