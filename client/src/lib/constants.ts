export const REGIONS = ['asia', 'europe', 'africa', 'americas', 'oceania', 'middle-east'] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABELS: Record<Region, string> = {
  asia: 'Asia',
  europe: 'Europe',
  africa: 'Africa',
  americas: 'The Americas',
  oceania: 'Oceania',
  'middle-east': 'Middle East',
};

export const TRAVEL_STYLES = ['coast', 'mountains', 'culture', 'outdoors', 'slow-travel'] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];
export const STYLE_LABELS: Record<TravelStyle, string> = {
  coast: 'Coast',
  mountains: 'Mountains',
  culture: 'Culture',
  outdoors: 'Outdoors',
  'slow-travel': 'Slow travel',
};
export const STYLE_DESCRIPTIONS: Record<TravelStyle, string> = {
  coast: 'Cliff villages, black-sand beaches and morning swims.',
  mountains: 'High passes, glacier light and cold, clear air.',
  culture: 'Old quarters, sacred sites and long, careful meals.',
  outdoors: 'Trails, lakes and wide open country to walk through.',
  'slow-travel': 'Fewer places, longer stays, more time on the water.',
};

export const BUDGET_BANDS = ['essential', 'comfortable', 'indulgent'] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];
export const BUDGET_LABELS: Record<BudgetBand, string> = {
  essential: 'Essential',
  comfortable: 'Comfortable',
  indulgent: 'Indulgent',
};
export const BUDGET_HINTS: Record<BudgetBand, string> = {
  essential: 'Under $120 a day',
  comfortable: '$120 – $250 a day',
  indulgent: 'Over $250 a day',
};

export const SEASON_KEYS = ['dec-feb', 'mar-may', 'jun-aug', 'sep-nov'] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];
export const SEASON_LABELS: Record<SeasonKey, string> = {
  'dec-feb': 'Dec – Feb',
  'mar-may': 'Mar – May',
  'jun-aug': 'Jun – Aug',
  'sep-nov': 'Sep – Nov',
};

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name', label: 'Name, A–Z' },
  { value: 'cost-asc', label: 'Estimate, low to high' },
  { value: 'cost-desc', label: 'Estimate, high to low' },
] as const;

export const ACTIVITY_CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'miscellaneous'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  transport: 'Transport',
  accommodation: 'Stay',
  food: 'Food',
  activities: 'Experiences',
  miscellaneous: 'Other',
};

export const CURRENCIES = {
  INR: { digits: 2, label: 'Indian rupee' },
  USD: { digits: 2, label: 'US dollar' },
  EUR: { digits: 2, label: 'Euro' },
  GBP: { digits: 2, label: 'British pound' },
  JPY: { digits: 0, label: 'Japanese yen' },
  AUD: { digits: 2, label: 'Australian dollar' },
  CAD: { digits: 2, label: 'Canadian dollar' },
  SGD: { digits: 2, label: 'Singapore dollar' },
  AED: { digits: 2, label: 'UAE dirham' },
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

export const DATE_FORMATS = [
  { value: 'd MMM yyyy', example: '9 Oct 2026' },
  { value: 'MMM d, yyyy', example: 'Oct 9, 2026' },
  { value: 'yyyy-MM-dd', example: '2026-10-09' },
] as const;

export const TRIP_LIMITS = { maxDays: 60, maxActivitiesPerDay: 25, maxTravelers: 20, maxDestinations: 8 } as const;

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
