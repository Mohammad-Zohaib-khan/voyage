import { cn } from '../../lib/cn';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'inverse-outline' | 'danger';
export type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none rounded-[3px] transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-voyage)] active:translate-y-px disabled:opacity-55 disabled:active:translate-y-0 aria-disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:bg-[color-mix(in_oklab,var(--ink)_86%,var(--accent-fill))]',
  secondary: 'border border-line-strong text-ink hover:border-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-sunken',
  inverse: 'bg-paper text-inkfixed hover:bg-white',
  'inverse-outline': 'border border-[rgb(245_242_234/0.5)] text-paper hover:border-paper hover:bg-[rgb(245_242_234/0.08)]',
  danger: 'bg-danger text-canvas hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-small',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-13 px-7 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
