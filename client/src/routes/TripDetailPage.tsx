import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '../components/ui/Button';
import { ConfirmDialog, Dialog } from '../components/ui/Dialog';
import { EmptyState, RetryPanel, Skeleton } from '../components/ui/Feedback';
import { SmartImage } from '../components/ui/SmartImage';
import { useToast } from '../components/ui/toastContext';
import { usePreferences } from '../features/auth/usePreferences';
import {
  downloadTripCsv,
  type ActivityInput,
  moveToDay,
  moveWithinDay,
  useAddActivity,
  useDeleteActivity,
  useDeleteTrip,
  useReorder,
  useTrip,
  useUpdateActivity,
  useUpdateTrip,
} from '../features/trips/api';
import { BudgetBreakdown, BudgetSummaryLine, TravelerCount, TripDateRange, TripStatusBadge } from '../features/trips/display';
import { ActivityForm, TripForm } from '../features/trips/forms';
import { ItineraryTimeline, type TimelineHandlers } from '../features/trips/ItineraryTimeline';
import { ApiError, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { formatDate, weekday } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { Activity, ItineraryDay, Trip } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

export default function TripDetailPage() {
  const { tripId = '' } = useParams();
  const query = useTrip(tripId);
  useDocumentTitle(query.data?.title ?? 'Trip');

  if (query.isPending) return <TripSkeleton />;
  if (query.isError) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
    return (
      <div className="page-x container-wide py-20">
        {missing ? (
          <EmptyState title="We couldn’t find that trip" action={<ButtonLink to="/app/trips">Back to my trips</ButtonLink>}>
            It may have been deleted, or it belongs to a different account.
          </EmptyState>
        ) : (
          <RetryPanel message={errorMessage(query.error, 'This trip didn’t load.')} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
        )}
      </div>
    );
  }
  return <TripView trip={query.data} />;
}

type ActivityDialogState = { mode: 'add'; day: ItineraryDay } | { mode: 'edit'; day: ItineraryDay; activity: Activity } | null;

function TripView({ trip }: { trip: Trip }) {
  const { dateFormat } = usePreferences();
  const navigate = useNavigate();
  const toast = useToast();
  const [activityDialog, setActivityDialog] = useState<ActivityDialogState>(null);
  const [pendingDelete, setPendingDelete] = useState<{ day: ItineraryDay; activity: Activity } | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const addActivity = useAddActivity(trip.id);
  const updateActivity = useUpdateActivity(trip.id);
  const deleteActivity = useDeleteActivity(trip.id);
  const reorder = useReorder(trip.id);
  const updateTrip = useUpdateTrip(trip.id);
  const deleteTrip = useDeleteTrip();

  const dayTotals = useMemo(() => new Map(trip.budget.byDay.map((entry) => [entry.dayId, entry.totalMinor])), [trip.budget.byDay]);
  const busy = reorder.isPending || deleteActivity.isPending;

  const runReorder = (layout: Parameters<typeof reorder.mutate>[0], message: string) => {
    reorder.mutate(layout, {
      onSuccess: () => setAnnouncement(message),
      onError: (error) => toast.error(errorMessage(error, 'That change didn’t save, so the previous order is back.')),
    });
  };

  const handlers: TimelineHandlers = {
    onAdd: (day) => setActivityDialog({ mode: 'add', day }),
    onEdit: (day, activity) => setActivityDialog({ mode: 'edit', day, activity }),
    onDelete: (day, activity) => setPendingDelete({ day, activity }),
    onMove: (day, activity, direction) => {
      const layout = moveWithinDay(trip, day.id, activity.id, direction);
      if (layout) runReorder(layout, `Moved ${activity.title} ${direction === -1 ? 'earlier' : 'later'} on day ${day.dayNumber}.`);
    },
    onReorder: (day, activityIds) => runReorder([{ dayId: day.id, activityIds }], `Reordered day ${day.dayNumber}.`),
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await downloadTripCsv(trip.id);
      toast.success(`Downloaded ${filename}.`);
    } catch (error) {
      toast.error(errorMessage(error, 'The export didn’t download. Try again.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pb-24">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <header className="border-b border-line">
        <div className="page-x container-wide pt-10 pb-10 md:pt-14">
          <Link to="/app/trips" className="inline-flex items-center gap-2 text-small text-muted hover:text-ink">
            <ArrowLeft aria-hidden="true" className="size-4" /> My trips
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <TripStatusBadge startDate={trip.startDate} endDate={trip.endDate} />
              <h1 className="mt-2 font-serif text-h1 break-words">{trip.title}</h1>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-muted">
                <TripDateRange startDate={trip.startDate} endDate={trip.endDate} format={dateFormat} />
                <span>
                  {trip.dayCount} {trip.dayCount === 1 ? 'day' : 'days'}
                </span>
                <TravelerCount count={trip.travelerCount} />
              </p>
              {trip.destinations.length ? (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Destinations">
                  {trip.destinations.map((destination) => (
                    <li key={destination.id}>
                      <Link
                        to={`/destinations/${destination.slug}`}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong py-1 pr-3.5 pl-1 text-small text-ink hover:border-ink"
                      >
                        <SmartImage image={destination.heroImage} ratio={1} sizes="28px" decorative maxWidth={480} className="size-7 rounded-full" />
                        {destination.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditingTrip(true)} icon={<Pencil aria-hidden="true" className="size-3.5" />}>
                Edit trip
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void exportCsv()} loading={exporting} icon={<Download aria-hidden="true" className="size-3.5" />}>
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeletingTrip(true)} icon={<Trash2 aria-hidden="true" className="size-3.5" />}>
                Delete
              </Button>
            </div>
          </div>
          {trip.notes ? <p className="measure mt-8 border-l-2 border-accent-fill pl-4 whitespace-pre-line text-muted">{trip.notes}</p> : null}
        </div>
      </header>

      <div className="page-x container-wide mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[10.5rem_minmax(0,1fr)_19rem] xl:grid-cols-[12rem_minmax(0,1fr)_21rem] xl:gap-14">
        <details className="group min-w-0 rounded-[3px] border border-line bg-surface p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span className="text-small font-semibold text-ink">Budget</span>
            <span className="tabular text-small text-muted">
              {formatMoney(trip.budget.totalMinor, trip.currency)}
              <span className="ml-2 text-faint group-open:hidden">Show</span>
              <span className="ml-2 hidden text-faint group-open:inline">Hide</span>
            </span>
          </summary>
          <div className="mt-4">
            <BudgetSummaryLine budget={trip.budget} currency={trip.currency} />
            <div className="mt-6">
              <BudgetBreakdown budget={trip.budget} currency={trip.currency} travelerCount={trip.travelerCount} />
            </div>
          </div>
        </details>

        <nav aria-label="Days" className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <ol className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0">
            {trip.days.map((day) => {
              const total = dayTotals.get(day.id) ?? 0;
              return (
                <li key={day.id} className="shrink-0">
                  <a
                    href={`#day-${day.id}`}
                    className="flex min-w-24 flex-col rounded-[3px] border border-line px-3 py-2 transition-colors hover:border-ink lg:min-w-0 lg:flex-row lg:items-baseline lg:justify-between lg:rounded-none lg:border-0 lg:border-b lg:px-0 lg:py-2.5"
                  >
                    <span className="text-small font-semibold text-ink">
                      Day {day.dayNumber}
                      <span className="ml-1.5 font-normal text-faint">{weekday(day.date)}</span>
                    </span>
                    <span className={cn('tabular text-micro', day.activities.length ? 'text-muted' : 'text-faint')}>
                      {day.activities.length ? formatMoney(total, trip.currency, { compact: true }) : formatDate(day.date, dateFormat).replace(/,? \d{4}$/, '')}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="itinerary-heading" className="min-w-0">
          <h2 id="itinerary-heading" className="sr-only">
            Itinerary
          </h2>
          {trip.budget.activityCount === 0 ? (
            <div className="mb-2 flex flex-col gap-3 rounded-[3px] bg-sunken p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">Your days are ready. Add the first activity to start the budget.</p>
              {trip.days[0] ? (
                <Button size="sm" onClick={() => trip.days[0] && setActivityDialog({ mode: 'add', day: trip.days[0] })}>
                  Add to day 1
                </Button>
              ) : null}
            </div>
          ) : null}
          <ItineraryTimeline days={trip.days} currency={trip.currency} format={dateFormat} dayTotals={dayTotals} handlers={handlers} busy={busy} />
          <p className="mt-6 border-t border-line pt-4 text-small text-faint">
            Drag an activity by its handle, or use the arrow buttons to move it. Costs are your own estimates, not bookings.
          </p>
        </section>

        <aside aria-label="Budget" className="hidden lg:block">
          <div className="sticky top-28">
            <BudgetBreakdown budget={trip.budget} currency={trip.currency} travelerCount={trip.travelerCount} />
          </div>
        </aside>
      </div>

      <ActivityDialog
        state={activityDialog}
        trip={trip}
        onClose={() => setActivityDialog(null)}
        onSave={async ({ dayId, input }) => {
          if (!activityDialog) return;
          if (activityDialog.mode === 'add') {
            await addActivity.mutateAsync({ dayId: activityDialog.day.id, input });
            toast.success(`Added ${input.title} to day ${activityDialog.day.dayNumber}.`);
          } else {
            const updated = await updateActivity.mutateAsync({ dayId: activityDialog.day.id, activityId: activityDialog.activity.id, input });
            if (dayId !== activityDialog.day.id) {
              const layout = moveToDay(updated, activityDialog.day.id, dayId, activityDialog.activity.id);
              if (layout) await reorder.mutateAsync(layout);
              const target = updated.days.find((day) => day.id === dayId);
              toast.success(`Moved ${input.title} to day ${target?.dayNumber ?? ''}.`);
            } else {
              toast.success(`Saved ${input.title}.`);
            }
          }
          setActivityDialog(null);
        }}
        pending={addActivity.isPending || updateActivity.isPending || reorder.isPending}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this activity?"
        confirmLabel="Delete activity"
        pending={deleteActivity.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteActivity.mutate(
            { dayId: pendingDelete.day.id, activityId: pendingDelete.activity.id },
            {
              onSuccess: () => {
                toast.success(`Deleted ${pendingDelete.activity.title}.`);
                setPendingDelete(null);
              },
              onError: (error) => toast.error(errorMessage(error, 'The activity wasn’t deleted. Try again.')),
            },
          );
        }}
      >
        “{pendingDelete?.activity.title}” will be removed from day {pendingDelete?.day.dayNumber}, and its estimate taken off the budget.
      </ConfirmDialog>

      <Dialog open={editingTrip} onClose={() => setEditingTrip(false)} title="Edit trip" size="lg">
        <TripForm
          initial={trip}
          defaultCurrency={trip.currency}
          submitLabel="Save changes"
          onCancel={() => setEditingTrip(false)}
          onSubmit={async (input) => {
            await updateTrip.mutateAsync(input);
            toast.success('Trip updated.');
            setEditingTrip(false);
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={deletingTrip}
        title="Delete this trip?"
        confirmLabel="Delete trip"
        pending={deleteTrip.isPending}
        onClose={() => setDeletingTrip(false)}
        onConfirm={() =>
          deleteTrip.mutate(trip.id, {
            onSuccess: () => {
              toast.success(`Deleted ${trip.title}.`);
              void navigate('/app/trips', { replace: true });
            },
            onError: (error) => toast.error(errorMessage(error, 'The trip wasn’t deleted. Try again.')),
          })
        }
      >
        “{trip.title}” and its {trip.budget.activityCount} {trip.budget.activityCount === 1 ? 'activity' : 'activities'} will be permanently deleted. This can’t be undone.
      </ConfirmDialog>
    </div>
  );
}

function ActivityDialog({
  state,
  trip,
  onClose,
  onSave,
  pending,
}: {
  state: ActivityDialogState;
  trip: Trip;
  onClose: () => void;
  onSave: (values: { dayId: string; input: ActivityInput }) => Promise<void>;
  pending: boolean;
}) {
  const formId = 'activity-form';
  const title = state?.mode === 'edit' ? 'Edit activity' : 'Add an activity';
  return (
    <Dialog
      open={state !== null}
      onClose={onClose}
      title={title}
      description={state ? `Day ${state.day.dayNumber}, ${weekday(state.day.date, 'long')} ${formatDate(state.day.date)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {state?.mode === 'edit' ? 'Save activity' : 'Add activity'}
          </Button>
        </>
      }
    >
      {state ? (
        <ActivityForm
          key={state.mode === 'edit' ? state.activity.id : `new-${state.day.id}`}
          formId={formId}
          currency={trip.currency}
          days={trip.days}
          dayId={state.day.id}
          initial={state.mode === 'edit' ? state.activity : undefined}
          onSubmit={onSave}
        />
      ) : null}
    </Dialog>
  );
}

function TripSkeleton() {
  return (
    <div className="page-x container-wide pt-14 pb-24" aria-busy="true" aria-label="Loading trip">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-8 h-16 w-1/2" />
      <Skeleton className="mt-4 h-5 w-1/3" />
      <div className="mt-14 grid gap-10 lg:grid-cols-[10.5rem_1fr_19rem]">
        <Skeleton className="hidden h-64 lg:block" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="hidden h-96 lg:block" />
      </div>
    </div>
  );
}
