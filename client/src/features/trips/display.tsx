import { useId } from 'react';
import { Link } from 'react-router';
import { SmartImage } from '../../components/ui/SmartImage';
import { cn } from '../../lib/cn';
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS, type ActivityCategory } from '../../lib/constants';
import { formatDate, relativeStart, tripStatus, type TripStatus } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { Budget, Preferences, TripSummary } from '../../lib/types';
import { CATEGORY_ICONS, CATEGORY_TONES } from './categories';

export function CategoryMark({ category, className }: { category: ActivityCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small text-muted', className)}>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

const STATUS_LABELS: Record<TripStatus, string> = { upcoming: 'Upcoming', ongoing: 'Under way', past: 'Completed' };

export function TripStatusBadge({ startDate, endDate, className }: { startDate: string; endDate: string; className?: string }) {
  const status = tripStatus(startDate, endDate);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-small font-semibold',
        status === 'ongoing' ? 'text-accent' : status === 'upcoming' ? 'text-olive' : 'text-faint',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', status === 'ongoing' ? 'bg-accent-fill' : status === 'upcoming' ? 'bg-olive-fill' : 'bg-line-strong')}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TripDateRange({ startDate, endDate, format }: { startDate: string; endDate: string; format: Preferences['dateFormat'] }) {
  return (
    <span className="tabular">
      <time dateTime={startDate}>{formatDate(startDate, format)}</time>
      {startDate !== endDate ? (
        <>
          {' – '}
          <time dateTime={endDate}>{formatDate(endDate, format)}</time>
        </>
      ) : null}
    </span>
  );
}

export function TravelerCount({ count }: { count: number }) {
  return (
    <span>
      {count} {count === 1 ? 'traveller' : 'travellers'}
    </span>
  );
}

/** Horizontal budget meter. Over-budget spend is shown past the target mark, in clay, with text. */
export function BudgetProgress({ budget, currency, size = 'md', onDark = false }: { budget: Budget; currency: string; size?: 'sm' | 'md'; onDark?: boolean }) {
  const hasTarget = budget.targetMinor > 0;
  const used = budget.usedBasisPoints ?? 0;
  const over = hasTarget && budget.remainingMinor < 0;
  // Percent of the bar: spend up to the target in ink; when over, the target sits at target/total.
  const fillPercent = hasTarget ? Math.min(100, used / 100) : 0;
  const targetMark = over ? 1_000_000 / used : 100;
  const label = hasTarget
    ? over
      ? `${formatMoney(budget.totalMinor, currency)} estimated, ${formatMoney(-budget.remainingMinor, currency)} over the ${formatMoney(budget.targetMinor, currency)} target`
      : `${formatMoney(budget.totalMinor, currency)} of ${formatMoney(budget.targetMinor, currency)} target estimated (${Math.round(used / 100)}%)`
    : `${formatMoney(budget.totalMinor, currency)} estimated; no target set`;

  return (
    <div role="img" aria-label={label} className={cn('relative w-full overflow-hidden rounded-full', size === 'sm' ? 'h-1' : 'h-1.5', onDark ? 'bg-white/15' : 'bg-line')}>
      {hasTarget ? (
        <>
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[var(--ease-settle)]', onDark ? 'bg-paper' : 'bg-ink')}
            style={{ width: `${over ? targetMark : fillPercent}%` }}
          />
          {over ? (
            <div className="absolute inset-y-0 right-0 bg-accent-fill" style={{ left: `${targetMark}%` }} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function BudgetSummaryLine({ budget, currency, onDark = false }: { budget: Budget; currency: string; onDark?: boolean }) {
  const over = budget.targetMinor > 0 && budget.remainingMinor < 0;
  return (
    <div className="flex flex-col gap-2">
      <BudgetProgress budget={budget} currency={currency} size="sm" onDark={onDark} />
      <p className={cn('flex justify-between gap-3 text-small', onDark ? 'text-on-forest-muted' : 'text-muted')}>
        <span className="tabular">
          <span className={cn('font-semibold', onDark ? 'text-on-forest' : 'text-ink')}>{formatMoney(budget.totalMinor, currency)}</span> estimated
        </span>
        {budget.targetMinor > 0 ? (
          <span className={cn('tabular', over && (onDark ? 'text-[#e3a184]' : 'text-accent'))}>
            {over ? `${formatMoney(-budget.remainingMinor, currency)} over` : `${formatMoney(budget.remainingMinor, currency)} left`}
          </span>
        ) : (
          <span>No target set</span>
        )}
      </p>
    </div>
  );
}

/** Full budget breakdown: total, per person, target, remaining and the split by category. */
export function BudgetBreakdown({ budget, currency, travelerCount }: { budget: Budget; currency: string; travelerCount: number }) {
  const headingId = useId();
  const over = budget.targetMinor > 0 && budget.remainingMinor < 0;
  const largest = Math.max(1, ...ACTIVITY_CATEGORIES.map((category) => budget.byCategory[category]));
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div>
        <h2 id={headingId} className="text-small font-semibold text-ink">
          Estimated budget
        </h2>
        <p className="tabular mt-2 font-serif text-[2.75rem] leading-none text-ink">{formatMoney(budget.totalMinor, currency)}</p>
        <p className="mt-2 text-small text-muted">
          <span className="tabular">{formatMoney(budget.perPersonMinor, currency)}</span> per person, {travelerCount}{' '}
          {travelerCount === 1 ? 'traveller' : 'travellers'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <BudgetProgress budget={budget} currency={currency} />
        <dl className="grid grid-cols-2 gap-4 text-small">
          <div>
            <dt className="text-faint">Target</dt>
            <dd className="tabular mt-0.5 font-semibold text-ink">{budget.targetMinor > 0 ? formatMoney(budget.targetMinor, currency) : 'Not set'}</dd>
          </div>
          <div className="text-right">
            <dt className="text-faint">{over ? 'Over target by' : 'Remaining'}</dt>
            <dd className={cn('tabular mt-0.5 font-semibold', over ? 'text-accent' : 'text-ink')}>
              {budget.targetMinor > 0 ? formatMoney(Math.abs(budget.remainingMinor), currency) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="sr-only">By category</h3>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {ACTIVITY_CATEGORIES.map((category) => {
            const amount = budget.byCategory[category];
            const Icon = CATEGORY_ICONS[category];
            return (
              <li key={category} className="py-3">
                <div className="flex items-center justify-between gap-3 text-small">
                  <span className="flex items-center gap-2 text-ink">
                    <Icon aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.75} />
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="tabular text-ink">{formatMoney(amount, currency)}</span>
                </div>
                <div aria-hidden="true" className="mt-2 h-[3px] w-full bg-line">
                  <div className="h-full transition-[width] duration-700 ease-[var(--ease-settle)]" style={{ width: `${(amount / largest) * 100}%`, background: CATEGORY_TONES[category] }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-micro text-faint">Totals come from your activity estimates. They are planning figures, not bookings or quotes.</p>
    </section>
  );
}

/** Row-style trip link used in lists and on the dashboard. */
export function TripCard({ trip, format }: { trip: TripSummary; format: Preferences['dateFormat'] }) {
  const cover = trip.destinations[0];
  const upcoming = tripStatus(trip.startDate, trip.endDate) === 'upcoming';
  return (
    <article className="group relative grid grid-cols-[5.5rem_1fr] gap-4 py-5 sm:grid-cols-[9rem_1fr_14rem] sm:gap-6">
      {cover ? (
        <SmartImage image={cover.heroImage} ratio={1} sizes="9rem" decorative className="rounded-[2px]" fallbackLabel={cover.name} maxWidth={480} />
      ) : (
        <div aria-hidden="true" className="aspect-square rounded-[2px] bg-[linear-gradient(150deg,var(--limestone),var(--mist))]" />
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TripStatusBadge startDate={trip.startDate} endDate={trip.endDate} />
          {upcoming ? <span className="text-small text-faint">{relativeStart(trip.startDate)}</span> : null}
        </div>
        <h3 className="mt-1 font-serif text-[1.75rem] leading-tight text-ink">
          <Link to={`/app/trips/${trip.id}`} className="after:absolute after:inset-0 hover:underline hover:decoration-1 hover:underline-offset-4">
            {trip.title}
          </Link>
        </h3>
        <p className="mt-1 text-small text-muted">
          <TripDateRange startDate={trip.startDate} endDate={trip.endDate} format={format} />
          <span aria-hidden="true"> / </span>
          {trip.dayCount} {trip.dayCount === 1 ? 'day' : 'days'}
          {trip.destinations.length ? (
            <>
              <span aria-hidden="true"> / </span>
              {trip.destinations.map((destination) => destination.name).join(', ')}
            </>
          ) : null}
        </p>
      </div>
      <div className="col-span-2 self-center sm:col-span-1">
        <BudgetSummaryLine budget={trip.budget} currency={trip.currency} />
      </div>
    </article>
  );
}
