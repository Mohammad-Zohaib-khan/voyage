import { toCsv } from '../../lib/csv.js';
import { minorToDecimalString, type CurrencyCode } from '../../lib/money.js';
import type { TripDetailDto } from './trips.service.js';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  accommodation: 'Accommodation',
  food: 'Food',
  activities: 'Activities',
  miscellaneous: 'Miscellaneous',
};

/** Build the itinerary + budget CSV for a trip. Values are escaped by toCsv. */
export function buildTripCsv(trip: TripDetailDto): string {
  const currency: CurrencyCode = trip.currency;
  const money = (minor: number) => minorToDecimalString(minor, currency);

  const rows: Array<Array<string | number>> = [
    ['Trip', trip.title],
    ['Dates', `${trip.startDate} to ${trip.endDate}`],
    ['Travellers', trip.travelerCount],
    ['Currency', currency],
    ['Note', 'Planning estimates only. Nothing in this file is a booking or a confirmed price.'],
    [],
    ['Day', 'Date', 'Order', 'Time', 'Category', 'Activity', 'Location', 'Notes', `Estimated cost (${currency})`],
  ];

  for (const day of trip.days) {
    if (day.activities.length === 0) {
      rows.push([day.dayNumber, day.date, '', '', '', 'No activities planned', '', '', '']);
      continue;
    }
    for (const activity of day.activities) {
      rows.push([
        day.dayNumber,
        day.date,
        activity.order + 1,
        activity.time ?? '',
        CATEGORY_LABELS[activity.category] ?? activity.category,
        activity.title,
        activity.location,
        activity.notes,
        money(activity.estimatedCostMinor),
      ]);
    }
  }

  const { budget } = trip;
  rows.push([], ['Budget summary', `Amount (${currency})`]);
  for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
    rows.push([label, money(budget.byCategory[category as keyof typeof budget.byCategory])]);
  }
  rows.push(['Total estimate', money(budget.totalMinor)]);
  rows.push(['Per person', money(budget.perPersonMinor)]);
  rows.push(['Budget target', money(budget.targetMinor)]);
  if (budget.remainingMinor >= 0) {
    rows.push(['Remaining', money(budget.remainingMinor)]);
  } else {
    rows.push(['Over budget by', money(Math.abs(budget.remainingMinor))]);
  }

  return toCsv(rows);
}
