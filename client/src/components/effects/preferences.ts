import { useSyncExternalStore } from 'react';

/**
 * Motion is allowed unless the account preference says "reduce" (data-motion on <html>), or the
 * OS asks for reduced motion and the account has not opted into full motion.
 */
function motionAllowedNow(): boolean {
  if (typeof window === 'undefined') return false;
  const setting = document.documentElement.getAttribute('data-motion');
  if (setting === 'reduce') return false;
  if (setting === 'full') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => {
    query.removeEventListener('change', callback);
    observer.disconnect();
  };
}

export function useAllowMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, motionAllowedNow, () => false);
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function subscribePointer(callback: () => void) {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

/** True for mouse/trackpad users. Hover-only flourishes (tilt, glare) are limited to them. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );
}

/** WebGL availability, checked once. Effects fall back to static artwork when it is missing. */
let webglSupport: boolean | null = null;
export function supportsWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}
