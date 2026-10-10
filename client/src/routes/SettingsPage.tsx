import { zodResolver } from '@hookform/resolvers/zod';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Form';
import { useToast } from '../components/ui/toastContext';
import { useSession, useUpdateProfile } from '../features/auth/session';
import { errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { CURRENCIES, CURRENCY_CODES, DATE_FORMATS } from '../lib/constants';
import type { Preferences, User } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter a name').max(60, 'Use 60 characters or fewer'),
  currency: z.enum(CURRENCY_CODES),
  dateFormat: z.enum(['d MMM yyyy', 'MMM d, yyyy', 'yyyy-MM-dd']),
  theme: z.enum(['system', 'light', 'dark']),
  reducedMotion: z.enum(['system', 'reduce', 'full']),
});
type Values = z.infer<typeof schema>;

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user } = useSession();
  if (!user) return null;
  return <SettingsForm user={user} />;
}

function SettingsForm({ user }: { user: User }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user.displayName, ...user.preferences },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const { displayName, ...preferences } = values;
    try {
      const saved = await update.mutateAsync({ displayName, preferences });
      reset({ displayName: saved.displayName, ...saved.preferences });
      toast.success('Settings saved.');
    } catch (error) {
      setFormError(errorMessage(error, 'Your settings weren’t saved. Try again.'));
    }
  });

  return (
    <div className="page-x container-wide grid gap-12 pt-14 pb-24 md:pt-20 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <h1 className="font-serif text-h1">Settings</h1>
        <p className="mt-4 max-w-sm text-muted">Your name and how Voyage shows dates, money and motion. Preferences apply on every device you sign in on.</p>
      </header>

      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-12 lg:col-span-7 lg:col-start-6">
        {formError ? <FormError>{formError}</FormError> : null}

        <section aria-labelledby="profile-heading" className="flex flex-col gap-6">
          <h2 id="profile-heading" className="border-b border-line pb-3 text-small font-semibold text-ink">
            Profile
          </h2>
          <Field label="Display name" error={formState.errors.displayName?.message}>
            {({ id, describedBy, invalid }) => <Input id={id} autoComplete="name" aria-describedby={describedBy} invalid={invalid} {...register('displayName')} />}
          </Field>
          <div>
            <p className="text-small font-semibold text-ink">Email</p>
            <p className="mt-1 text-muted">{user.email}</p>
          </div>
        </section>

        <section aria-labelledby="prefs-heading" className="flex flex-col gap-8">
          <h2 id="prefs-heading" className="border-b border-line pb-3 text-small font-semibold text-ink">
            Preferences
          </h2>
          <Field label="Default currency for new trips">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} {...register('currency')}>
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}, {CURRENCIES[code].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Controller
            control={control}
            name="dateFormat"
            render={({ field }) => (
              <ChoiceGroup
                legend="Date format"
                name={field.name}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                options={DATE_FORMATS.map((format) => ({ value: format.value, label: format.example }))}
              />
            )}
          />

          <Controller
            control={control}
            name="theme"
            render={({ field }) => (
              <ChoiceGroup<Preferences['theme']>
                legend="Appearance"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'system', label: 'Match device', icon: Monitor },
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                ]}
              />
            )}
          />

          <Controller
            control={control}
            name="reducedMotion"
            render={({ field }) => (
              <ChoiceGroup<Preferences['reducedMotion']>
                legend="Motion"
                hint="Reduce turns off image reveals, the route animation and slide transitions."
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'system', label: 'Match device' },
                  { value: 'reduce', label: 'Reduce' },
                  { value: 'full', label: 'Full' },
                ]}
              />
            )}
          />
        </section>

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <Button type="submit" size="lg" loading={formState.isSubmitting} disabled={!formState.isDirty && !formState.isSubmitting}>
            Save settings
          </Button>
          {!formState.isDirty ? <span className="text-small text-faint">No unsaved changes</span> : null}
        </div>
      </form>
    </div>
  );
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  hint?: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
}

/** A row of radio buttons styled as segmented choices; arrow keys move between them natively. */
function ChoiceGroup<T extends string>({ legend, hint, name, value, onChange, options }: ChoiceGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-small font-semibold text-ink">{legend}</legend>
      {hint ? <p className="-mt-1 mb-3 text-small text-faint">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className={cn(
                'inline-flex h-11 cursor-pointer items-center gap-2 rounded-[3px] border px-4 text-[0.9375rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]',
                checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink hover:border-ink',
              )}
            >
              <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
