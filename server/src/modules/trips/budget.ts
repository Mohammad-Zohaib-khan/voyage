import { divideRounded } from '../../lib/money.js';
import { ACTIVITY_CATEGORIES, type ActivityCategory } from './trip.model.js';

interface BudgetInput {
  days: ReadonlyArray<{ _id: { toString(): string }; activities: ReadonlyArray<{ category: string; estimatedCostMinor: number }> }>;
  travelerCount: number;
  budgetTargetMinor: number;
}

export interface BudgetSummary {
  byCategory: Record<ActivityCategory, number>;
  byDay: Array<{ dayId: string; totalMinor: number }>;
  totalMinor: number;
  perPersonMinor: number;
  targetMinor: number;
  /** target − total. Negative when over budget. */
  remainingMinor: number;
  /** Share of the target used, in basis points (10000 = 100%). Null when no target is set. */
  usedBasisPoints: number | null;
  activityCount: number;
}

/**
 * Authoritative budget arithmetic. All amounts are integers in minor units; the per-person
 * figure is rounded half up to the nearest minor unit.
 */
export function computeBudget({ days, travelerCount, budgetTargetMinor }: BudgetInput): BudgetSummary {
  const byCategory = Object.fromEntries(ACTIVITY_CATEGORIES.map((category) => [category, 0])) as Record<ActivityCategory, number>;
  let totalMinor = 0;
  let activityCount = 0;
  const byDay = days.map((day) => {
    let dayTotal = 0;
    for (const activity of day.activities) {
      const category = (ACTIVITY_CATEGORIES as readonly string[]).includes(activity.category)
        ? (activity.category as ActivityCategory)
        : 'miscellaneous';
      byCategory[category] += activity.estimatedCostMinor;
      dayTotal += activity.estimatedCostMinor;
      activityCount += 1;
    }
    totalMinor += dayTotal;
    return { dayId: day._id.toString(), totalMinor: dayTotal };
  });

  if (!Number.isSafeInteger(totalMinor)) throw new RangeError('Budget total exceeds safe integer range');

  return {
    byCategory,
    byDay,
    totalMinor,
    perPersonMinor: divideRounded(totalMinor, Math.max(1, travelerCount)),
    targetMinor: budgetTargetMinor,
    remainingMinor: budgetTargetMinor - totalMinor,
    // A display ratio, not a money amount, so a float division is acceptable here.
    usedBasisPoints: budgetTargetMinor > 0 ? Math.round((totalMinor / budgetTargetMinor) * 10_000) : null,
    activityCount,
  };
}
