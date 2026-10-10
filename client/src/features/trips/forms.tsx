import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type FieldPath, type UseFormSetError } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { FormError, Skeleton } from '../../components/ui/Feedback';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Form';
import { ApiError, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS, CURRENCIES, CURRENCY_CODES, TRIP_LIMITS, type CurrencyCode } from '../../lib/constants';
import { inclusiveDays, todayIso, addDaysIso, formatDate, weekday } from '../../lib/dates';
import { minorToInput, parseMoneyToMinor } from '../../lib/money';
import type { Activity, ItineraryDay, TripSummary } from '../../lib/types';
import { useAllDestinations } from '../destinations/api';
import { CATEGORY_ICONS } from './categories';
import type { ActivityInput, TripInput } from './api';

/** Copy server-side field errors onto the form so they appear next to the right control. */
function applyServerErrors<T extends Record<string, unknown>>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]): boolean {
  if (!(error instanceof ApiError) || error.details.length === 0) return false;
  let applied = false;
  for (const issue of error.details) {
    const field = issue.path.split('.')[0] ?? '';
    const mapped = field === 'budgetTargetMinor' ? 'budget' : field === 'estimatedCostMinor' ? 'cost' : field;
    if (fields.includes(mapped)) {
      setError(mapped as FieldPath<T>, { message: issue.message });
      applied = true;
    }
  }
  return applied;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

const tripSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the trip a name').max(120, 'Use 120 characters or fewer'),
    destinationIds: z.array(z.string()).max(TRIP_LIMITS.maxDestinations, `Choose up to ${TRIP_LIMITS.maxDestinations} destinations`),
    startDate: isoDate,
    endDate: isoDate,
    travelerCount: z
      .number({ error: 'Enter the number of travellers' })
      .int('Use a whole number')
      .min(1, 'At least one traveller')
      .max(TRIP_LIMITS.maxTravelers, `Up to ${TRIP_LIMITS.maxTravelers} travellers`),
    currency: z.enum(CURRENCY_CODES),
    budget: z.string().max(20),
    notes: z.string().max(2000, 'Use 2,000 characters or fewer'),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate) {
      const days = inclusiveDays(value.startDate, value.endDate);
      if (days < 1) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' });
      else if (days > TRIP_LIMITS.maxDays) ctx.addIssue({ code: 'custom', path: ['endDate'], message: `Trips can be up to ${TRIP_LIMITS.maxDays} days long` });
    }
    if (parseMoneyToMinor(value.budget, value.currency) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['budget'],
        message: CURRENCIES[value.currency].digits === 0 ? 'Enter a whole amount, e.g. 150000' : 'Enter an amount, e.g. 2500 or 2500.50',
      });
    }
  });

type TripFormValues = z.infer<typeof tripSchema>;
const TRIP_FIELDS = ['title', 'destinationIds', 'startDate', 'endDate', 'travelerCount', 'currency', 'budget', 'notes'] as const;

interface TripFormProps {
  initial?: TripSummary;
  defaultCurrency: CurrencyCode;
  initialDestinationIds?: string[];
  submitLabel: string;
  onSubmit: (input: TripInput) => Promise<unknown>;
  onCancel?: () => void;
}

export function TripForm({ initial, defaultCurrency, initialDestinationIds = [], submitLabel, onSubmit, onCancel }: TripFormProps) {
  const start = initial?.startDate ?? addDaysIso(todayIso(), 30);
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: initial?.title ?? '',
      destinationIds: initial?.destinations.map((item) => item.id) ?? initialDestinationIds,
      startDate: start,
      endDate: initial?.endDate ?? addDaysIso(start, 4),
      travelerCount: initial?.travelerCount ?? 2,
      currency: initial?.currency ?? defaultCurrency,
      budget: initial ? minorToInput(initial.budgetTargetMinor, initial.currency) : '',
      notes: initial?.notes ?? '',
    },
  });
  const { register, handleSubmit, control, formState, setError } = form;
  const [formError, setFormError] = useState<string | null>(null);
  const [startDate, endDate, currency] = useWatch({ control, name: ['startDate', 'endDate', 'currency'] });
  const dayCount = startDate && endDate ? inclusiveDays(startDate, endDate) : 0;

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    const budgetTargetMinor = parseMoneyToMinor(data.budget, data.currency) ?? 0;
    try {
      await onSubmit({
        title: data.title.trim(),
        destinationIds: data.destinationIds,
        startDate: data.startDate,
        endDate: data.endDate,
        travelerCount: data.travelerCount,
        currency: data.currency,
        budgetTargetMinor,
        notes: data.notes.trim(),
      });
    } catch (error) {
      if (!applyServerErrors(error, setError, TRIP_FIELDS)) setFormError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-7">
      {formError ? <FormError>{formError}</FormError> : null}

      <Field label="Trip name" error={formState.errors.title?.message}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} placeholder="Autumn in Kyoto" autoComplete="off" {...register('title')} />
        )}
      </Field>

      <Controller
        control={control}
        name="destinationIds"
        render={({ field, fieldState }) => <DestinationPicker value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start date" error={formState.errors.startDate?.message}>
          {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} {...register('startDate')} />}
        </Field>
        <Field
          label="End date"
          error={formState.errors.endDate?.message}
          hint={dayCount > 0 && dayCount <= TRIP_LIMITS.maxDays ? `${dayCount} ${dayCount === 1 ? 'day' : 'days'} in the itinerary` : undefined}
        >
          {({ id, describedBy, invalid }) => <Input id={id} type="date" min={startDate} aria-describedby={describedBy} invalid={invalid} {...register('endDate')} />}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr_1.4fr]">
        <Controller
          control={control}
          name="travelerCount"
          render={({ field, fieldState }) => (
            <Field label="Travellers" error={fieldState.error?.message}>
              {({ id, describedBy, invalid }) => (
                <div className="flex h-11 items-center rounded-[3px] border border-line-strong bg-surface">
                  <button
                    type="button"
                    aria-label="Fewer travellers"
                    onClick={() => field.onChange(Math.max(1, (field.value || 1) - 1))}
                    disabled={field.value <= 1}
                    className="grid h-full w-10 place-items-center text-muted hover:text-ink disabled:opacity-40"
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </button>
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={TRIP_LIMITS.maxTravelers}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                    onBlur={field.onBlur}
                    className="tabular h-full w-12 border-x border-line bg-transparent text-center text-ink focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label="More travellers"
                    onClick={() => field.onChange(Math.min(TRIP_LIMITS.maxTravelers, (field.value || 0) + 1))}
                    disabled={field.value >= TRIP_LIMITS.maxTravelers}
                    className="grid h-full w-10 place-items-center text-muted hover:text-ink disabled:opacity-40"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </button>
                </div>
              )}
            </Field>
          )}
        />
        <Field label="Currency" error={formState.errors.currency?.message}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} invalid={invalid} {...register('currency')}>
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}, {CURRENCIES[code].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Budget target" optional hint="Your total for the whole trip. Leave empty for no target." error={formState.errors.budget?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-small font-semibold text-faint">{currency}</span>
              <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} placeholder="0" className="tabular pl-14" {...register('budget')} />
            </div>
          )}
        </Field>
      </div>

      <Field label="Notes" optional error={formState.errors.notes?.message}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} rows={3} aria-describedby={describedBy} invalid={invalid} placeholder="Anything to remember while planning" {...register('notes')} />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={formState.isSubmitting} size="lg">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" size="lg" onClick={onCancel} disabled={formState.isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Searchable multi-select of published destinations. */
function DestinationPicker({ value, onChange, error }: { value: string[]; onChange: (next: string[]) => void; error?: string | undefined }) {
  const { data, isPending, isError, refetch } = useAllDestinations();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => (data ?? []).filter((item) => value.includes(item.id)), [data, value]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data ?? []).filter((item) => !needle || `${item.name} ${item.country}`.toLowerCase().includes(needle));
  }, [data, query]);

  return (
    <fieldset aria-describedby={error ? 'destination-picker-error' : undefined}>
      <legend className="mb-1.5 flex w-full items-baseline justify-between text-small font-semibold text-ink">
        <span>Destinations</span>
        <span className="font-normal text-faint">Optional, up to {TRIP_LIMITS.maxDestinations}</span>
      </legend>
      {selected.length ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Selected destinations">
          {selected.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== item.id))}
                aria-label={`Remove ${item.name}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink pr-2.5 pl-3.5 text-small text-canvas hover:opacity-90"
              >
                {item.name}
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="rounded-[3px] border border-line-strong bg-surface">
        <div className="relative border-b border-line">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            aria-label="Filter destinations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter places"
            className="h-10 w-full bg-transparent pr-3 pl-10 text-[0.9375rem] text-ink placeholder:text-faint focus-visible:outline-none"
          />
        </div>
        <div className="max-h-56 overflow-y-auto px-3.5 py-2">
          {isPending ? (
            <div className="flex flex-col gap-3 py-2" aria-label="Loading destinations">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : isError ? (
            <p className="py-2 text-small text-muted">
              Destinations didn’t load.{' '}
              <button type="button" className="link font-semibold text-ink" onClick={() => void refetch()}>
                Try again
              </button>
            </p>
          ) : visible.length === 0 ? (
            <p className="py-2 text-small text-faint">No places match “{query}”.</p>
          ) : (
            visible.map((item) => {
              const checked = value.includes(item.id);
              return (
                <Checkbox
                  key={item.id}
                  label={item.name}
                  description={item.country}
                  checked={checked}
                  disabled={!checked && value.length >= TRIP_LIMITS.maxDestinations}
                  onChange={() => onChange(checked ? value.filter((id) => id !== item.id) : [...value, item.id])}
                />
              );
            })
          )}
        </div>
      </div>
      {error ? (
        <p id="destination-picker-error" className="mt-1.5 text-small text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

const activitySchema = z.object({
  title: z.string().trim().min(1, 'Give the activity a title').max(120, 'Use 120 characters or fewer'),
  category: z.enum(ACTIVITY_CATEGORIES, { error: 'Choose a category' }),
  time: z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 09:30')]),
  location: z.string().trim().max(120, 'Use 120 characters or fewer'),
  notes: z.string().max(1000, 'Use 1,000 characters or fewer'),
  cost: z.string().max(20),
  dayId: z.string(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;
const ACTIVITY_FIELDS = ['title', 'category', 'time', 'location', 'notes', 'cost'] as const;

interface ActivityFormProps {
  currency: CurrencyCode;
  days: ItineraryDay[];
  dayId: string;
  initial?: Activity;
  onSubmit: (values: { input: ActivityInput; dayId: string }) => Promise<unknown>;
  formId: string;
}

/** Add or edit an activity. When editing, the day can be changed to move the activity. */
export function ActivityForm({ currency, days, dayId, initial, onSubmit, formId }: ActivityFormProps) {
  const { register, handleSubmit, formState, setError, control, setFocus } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: initial?.title ?? '',
      category: initial?.category ?? 'activities',
      time: initial?.time ?? '',
      location: initial?.location ?? '',
      notes: initial?.notes ?? '',
      cost: initial ? minorToInput(initial.estimatedCostMinor, currency) : '',
      dayId,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFocus('title');
  }, [setFocus]);

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    const cost = parseMoneyToMinor(data.cost, currency);
    if (cost === null) {
      setError('cost', { message: CURRENCIES[currency].digits === 0 ? 'Enter a whole amount' : 'Enter an amount, e.g. 1200 or 1200.50' });
      return;
    }
    try {
      await onSubmit({
        dayId: data.dayId,
        input: {
          title: data.title.trim(),
          category: data.category,
          time: data.time === '' ? null : data.time,
          location: data.location.trim(),
          notes: data.notes.trim(),
          estimatedCostMinor: cost,
        },
      });
    } catch (error) {
      if (!applyServerErrors(error, setError, ACTIVITY_FIELDS)) setFormError(errorMessage(error));
    }
  });

  return (
    <form id={formId} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
      {formError ? <FormError>{formError}</FormError> : null}
      <Field label="What’s the plan?" error={formState.errors.title?.message}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} placeholder="Sunrise at Fushimi Inari" autoComplete="off" {...register('title')} />}
      </Field>

      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Category</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ACTIVITY_CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICONS[category];
                const checked = field.value === category;
                return (
                  <label
                    key={category}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-2 rounded-[3px] border px-3 py-2.5 text-small transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]',
                      checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink',
                    )}
                  >
                    <input type="radio" name={field.name} value={category} checked={checked} onChange={() => field.onChange(category)} className="sr-only" />
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    {CATEGORY_LABELS[category]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time" optional error={formState.errors.time?.message}>
          {({ id, describedBy, invalid }) => <Input id={id} type="time" aria-describedby={describedBy} invalid={invalid} {...register('time')} />}
        </Field>
        <Field label="Estimated cost" optional hint="For the whole party" error={formState.errors.cost?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-small font-semibold text-faint">{currency}</span>
              <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} placeholder="0" className="tabular pl-14" {...register('cost')} />
            </div>
          )}
        </Field>
      </div>

      <Field label="Location" optional error={formState.errors.location?.message}>
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} placeholder="Neighbourhood, venue or address" {...register('location')} />}
      </Field>

      <Field label="Notes" optional error={formState.errors.notes?.message}>
        {({ id, describedBy, invalid }) => <Textarea id={id} rows={3} aria-describedby={describedBy} invalid={invalid} {...register('notes')} />}
      </Field>

      {initial ? (
        <Field label="Day" hint="Choose another day to move this activity there.">
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} {...register('dayId')}>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  Day {day.dayNumber}, {weekday(day.date)} {formatDate(day.date)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
    </form>
  );
}
