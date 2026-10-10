import type { Preferences } from '../../lib/types';
import { useSession } from './session';

const DEFAULTS: Preferences = { currency: 'INR', dateFormat: 'd MMM yyyy', theme: 'system', reducedMotion: 'system' };

export function usePreferences(): Preferences {
  const { user } = useSession();
  return user?.preferences ?? DEFAULTS;
}
