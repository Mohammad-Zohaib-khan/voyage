import type { ActivityCategory, BudgetBand, CurrencyCode, Region, SeasonKey, TravelStyle } from './constants';

export interface ImageRef {
  src: string;
  alt: string;
  focus: string;
  credit: { name: string; url: string };
}

export interface DestinationCard {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: Region;
  /** Approximate centre of the place, used by the globe. */
  location: { lat: number; lng: number };
  summary: string;
  heroImage: ImageRef;
  travelStyles: TravelStyle[];
  bestMonths: number[];
  suggestedDays: { min: number; max: number };
  dailyTotalMinor: number;
  currency: string;
  budgetBand: BudgetBand;
}

export interface DestinationDetail extends DestinationCard {
  description: string[];
  gallery: ImageRef[];
  seasonNote: string;
  costs: {
    currency: string;
    perPersonPerDayMinor: Record<'accommodation' | 'food' | 'transport' | 'activities' | 'miscellaneous', number>;
    assumptions: string;
  };
  highlights: Array<{ title: string; body: string }>;
  tips: string[];
  related: DestinationCard[];
}

export interface DestinationFilters {
  q: string;
  region: Region[];
  style: TravelStyle[];
  budget: BudgetBand[];
  season: SeasonKey[];
  sort: 'featured' | 'name' | 'cost-asc' | 'cost-desc';
}

export interface Facets {
  styles: Array<{ value: TravelStyle; count: number }>;
  regions: Array<{ value: Region; count: number }>;
  total: number;
}

export interface Preferences {
  currency: CurrencyCode;
  dateFormat: 'd MMM yyyy' | 'MMM d, yyyy' | 'yyyy-MM-dd';
  theme: 'system' | 'light' | 'dark';
  reducedMotion: 'system' | 'reduce' | 'full';
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  preferences: Preferences;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  category: ActivityCategory;
  time: string | null;
  location: string;
  notes: string;
  estimatedCostMinor: number;
  order: number;
}

export interface ItineraryDay {
  id: string;
  date: string;
  dayNumber: number;
  activities: Activity[];
}

export interface Budget {
  byCategory: Record<ActivityCategory, number>;
  byDay: Array<{ dayId: string; totalMinor: number }>;
  totalMinor: number;
  perPersonMinor: number;
  targetMinor: number;
  remainingMinor: number;
  usedBasisPoints: number | null;
  activityCount: number;
}

export interface TripDestination {
  id: string;
  slug: string;
  name: string;
  country: string;
  heroImage: ImageRef;
}

export interface TripSummary {
  id: string;
  title: string;
  destinations: TripDestination[];
  startDate: string;
  endDate: string;
  dayCount: number;
  travelerCount: number;
  currency: CurrencyCode;
  budgetTargetMinor: number;
  notes: string;
  budget: Budget;
  createdAt: string;
  updatedAt: string;
}

export interface Trip extends TripSummary {
  days: ItineraryDay[];
}

export interface SavedItem {
  savedAt: string;
  destination: DestinationCard;
}
