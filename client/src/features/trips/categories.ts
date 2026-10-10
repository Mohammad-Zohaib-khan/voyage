import { BedDouble, Compass, Shapes, TrainFront, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { ActivityCategory } from '../../lib/constants';

export const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  transport: TrainFront,
  accommodation: BedDouble,
  food: UtensilsCrossed,
  activities: Compass,
  miscellaneous: Shapes,
};

/** Category colours are always paired with an icon and a label, never used alone. */
export const CATEGORY_TONES: Record<ActivityCategory, string> = {
  transport: 'var(--olive-fill)',
  accommodation: 'var(--ink)',
  food: 'var(--accent-fill)',
  activities: '#8a9aa0',
  miscellaneous: 'var(--line-strong)',
};
