import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { InlineError } from './Feedback';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label, hint and error wiring for any control. Errors are linked with aria-describedby. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-small font-semibold text-ink">
        <span>{label}</span>
        {optional ? <span className="font-normal text-faint">Optional</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-small text-faint">
          {hint}
        </p>
      ) : null}
      {error ? <InlineError id={errorId}>{error}</InlineError> : null}
    </div>
  );
}

const control =
  'w-full rounded-[3px] border bg-surface px-3.5 text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:border-ink focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--focus)_28%,transparent)] disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-11', invalid ? 'border-danger' : 'border-line-strong', className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'min-h-24 py-2.5 leading-relaxed', invalid ? 'border-danger' : 'border-line-strong', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, 'h-11 appearance-none pr-10', invalid ? 'border-danger' : 'border-line-strong', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn('group flex cursor-pointer items-start gap-3 py-1.5', className)}>
      <span className="relative mt-[3px] inline-flex size-[18px] shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer size-[18px] cursor-pointer appearance-none rounded-[2px] border border-line-strong bg-surface transition-colors checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          {...rest}
        />
        <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-3 text-canvas opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col">
        <span className="text-[0.9375rem] text-ink">{label}</span>
        {description ? <span className="text-small text-faint">{description}</span> : null}
      </span>
    </label>
  );
});
