import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { useSession } from './session';

function remember(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable; the attribute on <html> still applies for this visit.
  }
}

/**
 * Applies the signed-in user's theme and motion preferences to the document, and wraps the app
 * in a MotionConfig so Motion animations follow the same setting as CSS transitions.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const theme = user?.preferences.theme ?? null;
  const motion = user?.preferences.reducedMotion ?? null;

  useEffect(() => {
    if (theme === null) return;
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    remember('voyage.theme', theme === 'system' ? null : theme);
  }, [theme]);

  useEffect(() => {
    if (motion === null) return;
    const root = document.documentElement;
    if (motion === 'system') root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', motion);
    remember('voyage.motion', motion === 'system' ? null : motion);
  }, [motion]);

  const reducedMotion = motion === 'reduce' ? 'always' : motion === 'full' ? 'never' : 'user';
  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
