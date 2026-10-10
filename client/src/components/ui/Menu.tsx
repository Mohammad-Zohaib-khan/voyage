import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface MenuProps {
  trigger: (props: { 'aria-expanded': boolean; 'aria-controls': string; onClick: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * A small disclosure menu: a button that reveals a list of links or actions. It closes on
 * Escape (returning focus to the trigger), on outside click, and when focus leaves it.
 */
export function Menu({ trigger, children, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>('[aria-controls]')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {trigger({ 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((value) => !value) })}
      <div
        id={id}
        hidden={!open}
        className={cn(
          'absolute top-[calc(100%+0.5rem)] z-50 min-w-56 rounded-[4px] border border-line bg-canvas py-2 text-ink shadow-[0_18px_50px_-20px_rgb(0_0_0/0.4)]',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}

export const menuItemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.9375rem] text-ink transition-colors hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none';
