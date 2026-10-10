import { useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { PointerEvent } from 'react';
import { useAllowMotion, useFinePointer } from './preferences';

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/**
 * Pointer-driven tilt state (after Aceternity's 3D card, re-implemented with Motion). Attach
 * `handlers` to the element that should track the pointer (often the whole card, so overlay links
 * keep working) and render <TiltSurface> around the part that should tilt. Only transforms change,
 * so layout never shifts. Disabled for touch, reduced motion and keyboard-only use.
 */
export function useTilt(maxTilt = 5) {
  const allowMotion = useAllowMotion();
  const finePointer = useFinePointer();
  const enabled = allowMotion && finePointer;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), SPRING);
  const glareX = useTransform(px, (value) => `${value * 100}%`);
  const glareY = useTransform(py, (value) => `${value * 100}%`);
  const glareOpacity = useSpring(0, SPRING);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.28), transparent 55%)`;

  const handlers = enabled
    ? {
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
          if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
          const target = event.currentTarget.querySelector('[data-tilt-surface]') ?? event.currentTarget;
          const rect = target.getBoundingClientRect();
          px.set(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
          py.set(Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)));
          glareOpacity.set(1);
        },
        onPointerLeave: () => {
          px.set(0.5);
          py.set(0.5);
          glareOpacity.set(0);
        },
      }
    : {};

  return { enabled, handlers, rotateX, rotateY, glare, glareOpacity };
}

export type TiltState = ReturnType<typeof useTilt>;

