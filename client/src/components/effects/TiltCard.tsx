import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { TiltState } from './useTilt';

export function TiltSurface({ tilt, children, className }: { tilt: TiltState; children: ReactNode; className?: string }) {
  if (!tilt.enabled) return <div className={className}>{children}</div>;
  return (
    <div className={cn('[perspective:1100px]', className)}>
      <motion.div data-tilt-surface style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformStyle: 'preserve-3d' }} className="relative will-change-transform">
        {children}
        <motion.div aria-hidden="true" style={{ background: tilt.glare, opacity: tilt.glareOpacity }} className="pointer-events-none absolute inset-0 z-[1] mix-blend-soft-light" />
      </motion.div>
    </div>
  );
}
