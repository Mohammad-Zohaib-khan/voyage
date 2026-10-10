import { useInView } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Wipes its content into view (bottom-up clip) the first time it scrolls on screen. The space is
 * reserved from the start, so nothing shifts; reduced motion makes the wipe instant via CSS.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  return (
    <div ref={ref} data-revealed={inView} className={cn('reveal-mask', className)}>
      {children}
    </div>
  );
}
