import { Link } from 'react-router';
import { cn } from '../../lib/cn';

export function RouteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 20" aria-hidden="true" className={cn('h-[0.9em] w-auto', className)}>
      <path d="M3 16 C 11 16, 12 4, 20 4 S 29 10, 33 6" fill="none" stroke="var(--accent-fill)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="3" cy="16" r="2.4" fill="currentColor" />
      <circle cx="33" cy="6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Wordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Voyage, home"
      className={cn('inline-flex items-center gap-2 font-serif text-[1.85rem] leading-none tracking-[-0.01em]', onDark ? 'text-paper' : 'text-ink', className)}
    >
      <RouteMark />
      <span>Voyage</span>
    </Link>
  );
}
