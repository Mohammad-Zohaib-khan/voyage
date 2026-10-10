import { Moon, Sun } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'voyage.home-theme';
const THEME_CHANGE_EVENT = 'voyage:theme-change';

function getStoredTheme(): AppTheme {
  try {
    const domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme === 'light' || domTheme === 'dark') return domTheme;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'dark';
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function useTheme(): { theme: AppTheme; isLight: boolean; isDark: boolean; toggleTheme: () => void; setTheme: (t: AppTheme) => void } {
  const theme = useSyncExternalStore<AppTheme>(
    (callback) => {
      window.addEventListener(THEME_CHANGE_EVENT, callback);
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
      };
    },
    () => getStoredTheme(),
    () => 'dark',
  );

  const toggleTheme = () => {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  return {
    theme,
    isLight: theme === 'light',
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: applyTheme,
  };
}

/**
 * Global Sun/Moon toggle that sets data-theme on <html>.
 * Reads from localStorage on mount so the preference persists across visits.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  // Ensure DOM has theme set on mount
  useEffect(() => {
    const domTheme = document.documentElement.getAttribute('data-theme');
    if (!domTheme) {
      applyTheme(getStoredTheme());
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`theme-toggle ${className ?? ''}`}
    >
      {theme === 'dark' ? (
        <Sun aria-hidden="true" className="size-[1.1rem]" />
      ) : (
        <Moon aria-hidden="true" className="size-[1.1rem]" />
      )}
    </button>
  );
}
