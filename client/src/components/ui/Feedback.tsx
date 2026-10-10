import { AlertCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Spinner({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className={cn('inline-flex', className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-[2px]', className)} />;
}

export function InlineError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-small text-danger">
      <AlertCircle aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 border-l-2 border-danger bg-danger-soft px-4 py-3 text-small text-ink">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      <div>{children}</div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Visual mark: a small route line, drawn rather than an emoji or stock icon. */
  mark?: boolean;
}

export function EmptyState({ title, children, action, className, mark = true }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-start gap-4 border-t border-line py-12', className)}>
      {mark ? (
        <svg width="72" height="24" viewBox="0 0 72 24" aria-hidden="true" className="text-accent-fill">
          <path d="M4 18 C 20 18, 22 6, 36 6 S 54 14, 68 6" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" />
          <circle cx="4" cy="18" r="3" fill="currentColor" />
          <circle cx="68" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      ) : null}
      <h2 className="font-serif text-h3 text-ink">{title}</h2>
      {children ? <div className="measure text-muted">{children}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

interface RetryPanelProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

export function RetryPanel({ title = 'This didn’t load', message, onRetry, retrying = false, className }: RetryPanelProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-start gap-3 border-t border-line py-10', className)}>
      <h2 className="font-serif text-title text-ink">{title}</h2>
      <p className="measure text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-1 inline-flex items-center gap-2 text-small font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-current disabled:opacity-60"
      >
        <RotateCw aria-hidden="true" className={cn('size-4', retrying && 'animate-spin')} />
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}
