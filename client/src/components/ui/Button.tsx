import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '../../lib/cn';
import { buttonClasses, type Size, type Variant } from './buttonStyles';
import { Spinner } from './Feedback';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      <span>{children}</span>
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  tone?: 'default' | 'onImage' | 'danger';
  size?: 'sm' | 'md';
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ label, tone = 'default', size = 'md', className, children, type = 'button', ref, ...rest }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        size === 'sm' ? 'size-8' : 'size-10',
        tone === 'default' && 'text-muted hover:bg-sunken hover:text-ink',
        tone === 'danger' && 'text-muted hover:bg-danger-soft hover:text-danger',
        tone === 'onImage' && 'bg-[rgb(245_242_234/0.92)] text-inkfixed shadow-[0_1px_2px_rgb(0_0_0/0.18)] hover:bg-white',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
