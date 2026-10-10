import { ChevronDown, ChevronUp, GripVertical, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, Reorder, useDragControls, useScroll, useSpring } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAllowMotion } from '../../components/effects/preferences';
import { IconButton } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { CATEGORY_LABELS } from '../../lib/constants';
import { formatDate, weekday } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { Activity, ItineraryDay, Preferences } from '../../lib/types';
import { CATEGORY_ICONS, CATEGORY_TONES } from './categories';

export interface TimelineHandlers {
  onAdd: (day: ItineraryDay) => void;
  onEdit: (day: ItineraryDay, activity: Activity) => void;
  onDelete: (day: ItineraryDay, activity: Activity) => void;
  onMove: (day: ItineraryDay, activity: Activity, direction: -1 | 1) => void;
  onReorder: (day: ItineraryDay, activityIds: string[]) => void;
}

interface TimelineProps {
  days: ItineraryDay[];
  currency: string;
  format: Preferences['dateFormat'];
  dayTotals?: Map<string, number>;
  /** Edit mode shows controls; preview mode is read-only (used on the home page). */
  handlers?: TimelineHandlers;
  busy?: boolean;
}

export function ItineraryTimeline({ days, currency, format, dayTotals, handlers, busy = false }: TimelineProps) {
  const list = (
    <ol className="flex flex-col">
      {days.map((day) => (
        <ItineraryDayView key={day.id} day={day} currency={currency} format={format} total={dayTotals?.get(day.id)} handlers={handlers} busy={busy} />
      ))}
    </ol>
  );
  return handlers && days.length > 1 ? <TracedTimeline>{list}</TracedTimeline> : list;
}

/**
 * A thin line down the edge of a long itinerary that fills as you scroll through it, so you can
 * see how far into the trip you are. Purely decorative; hidden when motion is reduced.
 */
function TracedTimeline({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowMotion = useAllowMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });
  return (
    <div ref={ref} className="relative">
      {allowMotion ? (
        <div aria-hidden="true" className="absolute top-8 bottom-8 -left-3 hidden w-px bg-line md:block lg:-left-6">
          <motion.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-[linear-gradient(to_bottom,var(--color-olive),var(--color-accent))]" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

interface DayProps {
  day: ItineraryDay;
  currency: string;
  format: Preferences['dateFormat'];
  total: number | undefined;
  handlers: TimelineHandlers | undefined;
  busy: boolean;
}

export function ItineraryDayView({ day, currency, format, total, handlers, busy }: DayProps) {
  const headingId = `day-${day.id}-heading`;
  return (
    <li id={`day-${day.id}`} aria-labelledby={headingId} className="scroll-mt-28 border-t border-line first:border-t-0">
      <div className="grid grid-cols-[3.75rem_1fr] gap-x-4 pt-7 pb-6 sm:grid-cols-[5.5rem_1fr] sm:gap-x-6">
        <div className="flex flex-col items-start">
          <span className="text-micro font-semibold text-faint">Day</span>
          <span aria-hidden="true" className="tabular font-serif text-[3rem] leading-[0.85] text-ink sm:text-[3.75rem]">
            {String(day.dayNumber).padStart(2, '0')}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h3 id={headingId} className="text-[1.0625rem] font-semibold text-ink">
              <span className="sr-only">Day {day.dayNumber}, </span>
              {weekday(day.date, 'long')} <span className="font-normal text-muted">{formatDate(day.date, format)}</span>
            </h3>
            <div className="flex items-center gap-3">
              {total !== undefined && total > 0 ? <span className="tabular text-small text-muted">{formatMoney(total, currency)}</span> : null}
              {handlers ? (
                <button
                  type="button"
                  onClick={() => handlers.onAdd(day)}
                  disabled={busy}
                  aria-label={`Add activity to day ${day.dayNumber}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-small font-semibold text-ink transition-colors hover:border-ink hover:bg-surface disabled:opacity-50"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  Add
                </button>
              ) : null}
            </div>
          </div>

          {day.activities.length === 0 ? (
            <p className="mt-4 border-l border-dashed border-line-strong py-1 pl-4 text-small text-faint">
              {handlers ? 'Nothing planned yet. A free day is a plan too.' : 'A free day.'}
            </p>
          ) : handlers ? (
            <EditableActivityList day={day} currency={currency} handlers={handlers} busy={busy} />
          ) : (
            <ol className="relative mt-4">
              <Spine />
              {day.activities.map((activity) => (
                <li key={activity.id}>
                  <ActivityRow activity={activity} currency={currency} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </li>
  );
}

function Spine() {
  return <span aria-hidden="true" className="absolute top-3 bottom-3 left-[calc(3.25rem+0.6rem)] w-px bg-line-strong" />;
}

/**
 * Activities for one day with pointer drag-to-reorder. The local order follows the server data
 * whenever it changes, and stays mounted so moves animate into place, focus stays on the button
 * that was used, and the moved activity is briefly highlighted. Keyboard and screen-reader users
 * use the move buttons instead of dragging.
 */
function EditableActivityList({ day, currency, handlers, busy }: { day: ItineraryDay; currency: string; handlers: TimelineHandlers; busy: boolean }) {
  const [order, setOrder] = useState(day.activities);
  const [seen, setSeen] = useState(day.activities);
  const [flashId, setFlashId] = useState<string | null>(null);
  const pendingMove = useRef<string | null>(null);

  // Adopt new server data (derived state, so there is no flash of the stale order).
  if (seen !== day.activities) {
    setSeen(day.activities);
    setOrder(day.activities);
  }

  useEffect(() => {
    if (!flashId) return;
    const timer = window.setTimeout(() => setFlashId(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  // Highlight an activity once the server has confirmed its new position.
  useEffect(() => {
    const id = pendingMove.current;
    if (id && day.activities.some((activity) => activity.id === id)) {
      pendingMove.current = null;
      setFlashId(id);
    }
  }, [day.activities]);

  const commit = (activityId: string) => {
    const ids = order.map((activity) => activity.id);
    if (ids.join('|') !== day.activities.map((activity) => activity.id).join('|')) {
      pendingMove.current = activityId;
      handlers.onReorder(day, ids);
    }
  };

  return (
    <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} className="relative mt-4">
      <Spine />
      <AnimatePresence initial={false}>
        {order.map((activity, index) => (
          <DraggableActivity
            key={activity.id}
            activity={activity}
            currency={currency}
            isFirst={index === 0}
            isLast={index === order.length - 1}
            highlighted={activity.id === flashId}
            onCommit={() => commit(activity.id)}
            onEdit={() => handlers.onEdit(day, activity)}
            onDelete={() => handlers.onDelete(day, activity)}
            onMove={(direction) => {
              pendingMove.current = activity.id;
              handlers.onMove(day, activity, direction);
            }}
            busy={busy}
          />
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}

interface DraggableProps {
  activity: Activity;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  highlighted: boolean;
  busy: boolean;
  onCommit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

function DraggableActivity({ activity, currency, isFirst, isLast, highlighted, busy, onCommit, onEdit, onDelete, onMove }: DraggableProps) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const earlierRef = useRef<HTMLButtonElement>(null);
  const laterRef = useRef<HTMLButtonElement>(null);
  const movedWith = useRef<'earlier' | 'later' | null>(null);

  // A move to the first or last place disables the button that was used; keep keyboard focus on
  // this activity by handing it to the other move button.
  useEffect(() => {
    const used = movedWith.current;
    if (!used) return;
    if (used === 'earlier' && isFirst) laterRef.current?.focus();
    if (used === 'later' && isLast) earlierRef.current?.focus();
    movedWith.current = null;
  }, [isFirst, isLast]);

  const move = (direction: -1 | 1) => {
    if (busy) return;
    movedWith.current = direction === -1 ? 'earlier' : 'later';
    onMove(direction);
  };

  return (
    <Reorder.Item
      value={activity}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        onCommit();
      }}
      className={cn(
        'relative rounded-[3px] transition-[background-color,box-shadow] duration-700',
        dragging && 'z-10 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)] ring-1 ring-line-strong',
        highlighted && !dragging
          ? 'bg-[color-mix(in_oklab,var(--color-accent)_14%,var(--color-canvas))] ring-1 ring-[color-mix(in_oklab,var(--color-accent)_45%,transparent)]'
          : 'bg-canvas',
      )}
      data-highlighted={highlighted || undefined}
    >
      <ActivityRow
        activity={activity}
        currency={currency}
        actions={
          <div className="flex items-center gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
            <IconButton ref={earlierRef} label={`Move ${activity.title} earlier`} size="sm" onClick={() => move(-1)} disabled={isFirst} aria-disabled={busy || undefined}>
              <ChevronUp aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton ref={laterRef} label={`Move ${activity.title} later`} size="sm" onClick={() => move(1)} disabled={isLast} aria-disabled={busy || undefined}>
              <ChevronDown aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton label={`Edit ${activity.title}`} size="sm" onClick={onEdit} disabled={busy}>
              <Pencil aria-hidden="true" className="size-3.5" />
            </IconButton>
            <IconButton label={`Delete ${activity.title}`} size="sm" tone="danger" onClick={onDelete} disabled={busy}>
              <Trash2 aria-hidden="true" className="size-3.5" />
            </IconButton>
            <span
              aria-hidden="true"
              title="Drag to reorder"
              onPointerDown={(event) => {
                if (!busy) controls.start(event);
              }}
              className="hidden size-8 cursor-grab touch-none place-items-center rounded-full text-faint hover:bg-sunken hover:text-ink active:cursor-grabbing sm:grid"
            >
              <GripVertical className="size-4" />
            </span>
          </div>
        }
      />
    </Reorder.Item>
  );
}

/** One activity on the timeline: time, category marker on the spine, details and cost. */
export function ActivityRow({ activity, currency, actions }: { activity: Activity; currency: string; actions?: ReactNode }) {
  const Icon = CATEGORY_ICONS[activity.category];
  return (
    <div className="group/row grid grid-cols-[3.25rem_1.25rem_1fr] items-start gap-x-2 py-3">
      <span className="tabular pt-0.5 text-small text-muted">{activity.time ?? <span className="text-faint">—</span>}</span>
      <span aria-hidden="true" className="relative z-[1] mt-[0.3rem] grid size-[1.2rem] place-items-center rounded-full bg-canvas">
        <span className="size-2.5 rounded-full ring-[3px] ring-canvas" style={{ background: CATEGORY_TONES[activity.category] }} />
      </span>
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-semibold break-words text-ink">{activity.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              {CATEGORY_LABELS[activity.category]}
            </span>
            {activity.location ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{activity.location}</span>
              </span>
            ) : null}
          </p>
          {activity.notes ? <p className="mt-1.5 text-small leading-relaxed break-words whitespace-pre-line text-faint">{activity.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
          <span className="tabular text-small font-semibold text-ink">
            {activity.estimatedCostMinor > 0 ? formatMoney(activity.estimatedCostMinor, currency) : <span className="font-normal text-faint">No cost</span>}
          </span>
          {actions}
        </div>
      </div>
    </div>
  );
}
