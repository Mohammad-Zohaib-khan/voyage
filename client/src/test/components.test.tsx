import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCsrfToken } from '../lib/api';
import { ActiveFilterChips, DestinationFilters } from '../features/destinations/components';
import { EMPTY_FILTERS } from '../features/destinations/filters';
import { BudgetBreakdown } from '../features/trips/display';
import { ActivityForm, TripForm } from '../features/trips/forms';
import { ItineraryTimeline, type TimelineHandlers } from '../features/trips/ItineraryTimeline';
import type { Budget, DestinationFilters as Filters, ItineraryDay } from '../lib/types';
import LoginPage from '../routes/LoginPage';
import { mockApi, ok, renderWithProviders } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(null);
});

function FilterHarness() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  return (
    <>
      <DestinationFilters filters={filters} onChange={setFilters} />
      <ActiveFilterChips filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />
      <output data-testid="state">{JSON.stringify(filters)}</output>
    </>
  );
}

describe('destination filters', () => {
  it('combines filters, shows removable chips and resets', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterHarness />);
    await user.click(screen.getByRole('checkbox', { name: /Mountains/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Asia' }));
    await user.click(screen.getByRole('checkbox', { name: /Essential/ }));
    const state = () => JSON.parse(screen.getByTestId('state').textContent) as Filters;
    expect(state()).toMatchObject({ style: ['mountains'], region: ['asia'], budget: ['essential'] });

    await user.click(screen.getByRole('button', { name: 'Remove filter: Asia' }));
    expect(state().region).toEqual([]);
    expect(screen.getByRole('checkbox', { name: 'Asia' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(state()).toEqual(EMPTY_FILTERS);
  });
});

const destinations = [
  { id: 'a'.repeat(24), slug: 'kyoto', name: 'Kyoto', country: 'Japan' },
  { id: 'b'.repeat(24), slug: 'lisbon', name: 'Lisbon', country: 'Portugal' },
];

describe('trip form', () => {
  it('validates dates, travellers and budget before submitting', async () => {
    mockApi((url) => (url.includes('/destinations?') ? ok(destinations, { page: 1, limit: 24, total: 2, totalPages: 1 }) : undefined));
    const onSubmit = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();
    renderWithProviders(<TripForm defaultCurrency="INR" submitLabel="Create trip" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByText('Give the trip a name')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Trip name'), 'Monsoon in Kerala');
    const start = screen.getByLabelText('Start date');
    const end = screen.getByLabelText('End date');
    await user.clear(start);
    await user.type(start, '2026-12-10');
    await user.clear(end);
    await user.type(end, '2026-12-08');
    await user.type(screen.getByLabelText(/Budget target/), '12,500.555');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    expect(await screen.findByText('End date must be on or after the start date')).toBeInTheDocument();
    expect(screen.getByText(/Enter an amount/)).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(end);
    await user.type(end, '2026-12-12');
    await user.clear(screen.getByLabelText(/Budget target/));
    await user.type(screen.getByLabelText(/Budget target/), '12,500.50');
    await user.click(await screen.findByRole('checkbox', { name: /Kyoto/ }));
    await user.click(screen.getByRole('button', { name: 'More travellers' }));
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Monsoon in Kerala',
      destinationIds: ['a'.repeat(24)],
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      travelerCount: 3,
      currency: 'INR',
      budgetTargetMinor: 1250050,
      notes: '',
    });
  });

  it('shows server field errors next to the right field', async () => {
    mockApi((url) => (url.includes('/destinations?') ? ok(destinations, { page: 1, limit: 24, total: 2, totalPages: 1 }) : undefined));
    const { ApiError } = await import('../lib/api');
    const onSubmit = vi.fn(() => Promise.reject(new ApiError(400, 'VALIDATION_ERROR', 'Some fields need attention', [{ path: 'title', message: 'Contains unsupported characters' }])));
    const user = userEvent.setup();
    renderWithProviders(<TripForm defaultCurrency="USD" submitLabel="Create trip" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Trip name'), 'Somewhere');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByText('Contains unsupported characters')).toBeInTheDocument();
  });
});

const days: ItineraryDay[] = [
  {
    id: 'd1',
    date: '2026-11-12',
    dayNumber: 1,
    activities: [
      { id: 'a1', title: 'Temple walk', category: 'activities', time: '07:00', location: 'Fushimi', notes: '', estimatedCostMinor: 0, order: 0 },
      { id: 'a2', title: 'Market lunch', category: 'food', time: '12:30', location: '', notes: '', estimatedCostMinor: 240000, order: 1 },
    ],
  },
  { id: 'd2', date: '2026-11-13', dayNumber: 2, activities: [] },
];

describe('activity form', () => {
  it('converts the cost to minor units and validates time', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ActivityForm formId="f" currency="INR" days={days} dayId="d1" onSubmit={onSubmit} />
        <button type="submit" form="f">
          Save
        </button>
      </>,
    );
    await user.type(screen.getByLabelText('What’s the plan?'), 'Tea ceremony');
    await user.click(screen.getByRole('radio', { name: 'Food' }));
    await user.type(screen.getByLabelText(/Estimated cost/), '1,800.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      dayId: 'd1',
      input: { title: 'Tea ceremony', category: 'food', time: null, location: '', notes: '', estimatedCostMinor: 180050 },
    });
  });
});

describe('itinerary timeline', () => {
  it('offers keyboard reorder controls that respect the edges', async () => {
    const handlers: TimelineHandlers = { onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onMove: vi.fn(), onReorder: vi.fn() };
    const user = userEvent.setup();
    renderWithProviders(<ItineraryTimeline days={days} currency="INR" format="d MMM yyyy" handlers={handlers} />);

    expect(screen.getByRole('button', { name: 'Move Temple walk earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Market lunch later' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Market lunch earlier' }));
    expect(handlers.onMove).toHaveBeenCalledWith(days[0], days[0]?.activities[1], -1);

    await user.click(screen.getByRole('button', { name: 'Add activity to day 2' }));
    expect(handlers.onAdd).toHaveBeenCalledWith(days[1]);
    await user.click(screen.getByRole('button', { name: 'Delete Temple walk' }));
    expect(handlers.onDelete).toHaveBeenCalledWith(days[0], days[0]?.activities[0]);
    expect(screen.getByText('Nothing planned yet. A free day is a plan too.')).toBeInTheDocument();
  });

  it('renders read-only without controls in preview mode', () => {
    renderWithProviders(<ItineraryTimeline days={days} currency="INR" format="d MMM yyyy" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Market lunch')).toBeInTheDocument();
  });
});

describe('budget breakdown', () => {
  it('states overspend in words, not colour alone', () => {
    const budget: Budget = {
      byCategory: { transport: 0, accommodation: 30000, food: 25000, activities: 0, miscellaneous: 0 },
      byDay: [],
      totalMinor: 55000,
      perPersonMinor: 27500,
      targetMinor: 50000,
      remainingMinor: -5000,
      usedBasisPoints: 11000,
      activityCount: 2,
    };
    renderWithProviders(<BudgetBreakdown budget={budget} currency="USD" travelerCount={2} />);
    expect(screen.getByText('Over target by')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /\$50 over the \$500 target/ })).toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Estimated budget' });
    expect(within(section).getByText(/per person, 2 travellers/)).toBeInTheDocument();
  });
});

describe('login page', () => {
  it('shows the generic error from the server and keeps the typed email', async () => {
    const { calls } = mockApi((url) => {
      if (url.endsWith('/auth/me')) return ok(null);
      if (url.endsWith('/auth/login'))
        return { status: 401, body: { data: null, error: { code: 'INVALID_CREDENTIALS', message: 'That email and password combination did not match.' }, meta: null } };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { path: '/login', route: '/login' });
    await user.type(await screen.findByLabelText('Email'), 'priya@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password combination did not match.');
    expect(screen.getByLabelText('Email')).toHaveValue('priya@example.com');
    const login = calls.find((call) => call.url.endsWith('/auth/login'));
    expect(login?.method).toBe('POST');
    expect(login?.body).toEqual({ email: 'priya@example.com', password: 'wrong-password' });
  });

  it('toggles password visibility accessibly', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? ok(null) : undefined));
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { path: '/login', route: '/login' });
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });
});
