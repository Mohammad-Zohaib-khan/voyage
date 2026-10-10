import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { body, createTestContext, destinationIdBySlug, TestClient, type TestContext } from './helpers.js';

interface Activity {
  id: string;
  title: string;
  category: string;
  time: string | null;
  estimatedCostMinor: number;
  order: number;
}
interface Day {
  id: string;
  date: string;
  dayNumber: number;
  activities: Activity[];
}
interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  travelerCount: number;
  currency: string;
  destinations: Array<{ slug: string }>;
  days: Day[];
  budget: {
    byCategory: Record<string, number>;
    totalMinor: number;
    perPersonMinor: number;
    targetMinor: number;
    remainingMinor: number;
    byDay: Array<{ dayId: string; totalMinor: number }>;
  };
}

let ctx: TestContext;
let client: TestClient;
let kyotoId: string;

beforeAll(async () => {
  ctx = await createTestContext();
  client = new TestClient(ctx.app);
  await client.register('planner@example.com');
  kyotoId = await destinationIdBySlug('kyoto');
});

afterAll(async () => {
  await ctx.close();
});

const validTrip = () => ({
  title: 'Autumn in Kyoto',
  destinationIds: [kyotoId],
  startDate: '2026-11-10',
  endDate: '2026-11-13',
  travelerCount: 2,
  currency: 'INR',
  budgetTargetMinor: 20_000_000,
  notes: '',
});

async function createTrip(overrides: Record<string, unknown> = {}) {
  const res = await client.post('/api/v1/trips', { ...validTrip(), ...overrides });
  expect(res.status).toBe(201);
  return body<Trip>(res).data;
}

describe('trip creation', () => {
  it('creates a trip with one itinerary day per date', async () => {
    const trip = await createTrip();
    expect(trip.dayCount).toBe(4);
    expect(trip.days.map((day) => day.date)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    expect(trip.destinations.map((item) => item.slug)).toEqual(['kyoto']);
    expect(trip.budget.totalMinor).toBe(0);
    expect(trip.budget.remainingMinor).toBe(20_000_000);
  });

  it.each([
    ['end before start', { startDate: '2026-11-13', endDate: '2026-11-10' }, 'endDate'],
    ['too long', { startDate: '2026-01-01', endDate: '2026-03-15' }, 'endDate'],
    ['impossible date', { startDate: '2026-02-30' }, 'startDate'],
    ['zero travellers', { travelerCount: 0 }, 'travelerCount'],
    ['fractional travellers', { travelerCount: 1.5 }, 'travelerCount'],
    ['unsupported currency', { currency: 'XYZ' }, 'currency'],
    ['negative budget', { budgetTargetMinor: -1 }, 'budgetTargetMinor'],
    ['fractional minor units', { budgetTargetMinor: 10.5 }, 'budgetTargetMinor'],
    ['duplicate destinations', { destinationIds: ['0'.repeat(24), '0'.repeat(24)] }, 'destinationIds'],
    ['malformed destination id', { destinationIds: ['not-an-id'] }, 'destinationIds.0'],
    ['client-supplied owner', { userId: '0'.repeat(24) }, ''],
    ['update operator in body', { title: { $set: 'x' } }, ''],
  ])('rejects %s', async (_label, overrides, path) => {
    const res = await client.post('/api/v1/trips', { ...validTrip(), ...overrides });
    expect(res.status).toBe(400);
    if (path) expect(body(res).error?.details?.map((issue) => issue.path)).toContain(path);
  });

  it('rejects destinations that do not exist', async () => {
    const res = await client.post('/api/v1/trips', { ...validTrip(), destinationIds: ['0'.repeat(24)] });
    expect(res.status).toBe(400);
    expect(body(res).error?.details?.[0]?.path).toBe('destinationIds');
  });
});

describe('itinerary activities and budget', () => {
  let trip: Trip;

  beforeAll(async () => {
    trip = await createTrip({ travelerCount: 3, budgetTargetMinor: 10_000 });
  });

  const day = (index: number) => trip.days[index] as Day;
  const activitiesPath = (dayIndex: number) => `/api/v1/trips/${trip.id}/days/${day(dayIndex).id}/activities`;

  it('adds activities and recalculates the budget on the server', async () => {
    const first = await client.post(activitiesPath(0), { title: 'Train from Osaka', category: 'transport', time: '08:30', estimatedCostMinor: 4000 });
    expect(first.status).toBe(201);
    expect((await client.post(activitiesPath(0), { title: 'Kaiseki dinner', category: 'food', estimatedCostMinor: 5001 })).status).toBe(201);
    const res = await client.post(activitiesPath(1), { title: 'Temple tickets', category: 'activities', estimatedCostMinor: 1000 });
    trip = body<Trip>(res).data;

    expect(day(0).activities.map((item) => item.title)).toEqual(['Train from Osaka', 'Kaiseki dinner']);
    expect(day(0).activities[1]?.time).toBeNull();
    expect(trip.budget.byCategory).toMatchObject({ transport: 4000, food: 5001, activities: 1000, accommodation: 0, miscellaneous: 0 });
    expect(trip.budget.totalMinor).toBe(10_001);
    expect(trip.budget.perPersonMinor).toBe(3334); // 10001 / 3 = 3333.67
    expect(trip.budget.remainingMinor).toBe(-1);
    expect(trip.budget.byDay[0]).toEqual({ dayId: day(0).id, totalMinor: 9001 });
  });

  it.each([
    ['missing title', { category: 'food' }],
    ['unknown category', { title: 'X', category: 'shopping' }],
    ['bad time', { title: 'X', category: 'food', time: '25:00' }],
    ['negative cost', { title: 'X', category: 'food', estimatedCostMinor: -100 }],
    ['float cost', { title: 'X', category: 'food', estimatedCostMinor: 12.34 }],
    ['oversized notes', { title: 'X', category: 'food', notes: 'n'.repeat(1001) }],
  ])('rejects activity with %s', async (_label, payload) => {
    expect((await client.post(activitiesPath(0), payload)).status).toBe(400);
  });

  it('updates an activity with allowlisted fields only', async () => {
    const target = day(0).activities[1] as Activity;
    const path = `${activitiesPath(0)}/${target.id}`;
    expect((await client.patch(path, { estimatedCostMinor: 5000, order: 0 })).status).toBe(400);
    const res = await client.patch(path, { estimatedCostMinor: 5000, time: '19:00' });
    expect(res.status).toBe(200);
    trip = body<Trip>(res).data;
    expect(day(0).activities[1]).toMatchObject({ estimatedCostMinor: 5000, time: '19:00' });
    expect(trip.budget.totalMinor).toBe(10_000);
    expect(trip.budget.remainingMinor).toBe(0);
  });

  it('reorders activities within a day', async () => {
    const ids = day(0).activities.map((item) => item.id).reverse();
    const res = await client.patch(`/api/v1/trips/${trip.id}/itinerary/reorder`, { days: [{ dayId: day(0).id, activityIds: ids }] });
    expect(res.status).toBe(200);
    trip = body<Trip>(res).data;
    expect(day(0).activities.map((item) => item.id)).toEqual(ids);
    expect(day(0).activities.map((item) => item.order)).toEqual([0, 1]);
  });

  it('moves an activity between days', async () => {
    const [first, second] = day(0).activities as [Activity, Activity];
    const res = await client.patch(`/api/v1/trips/${trip.id}/itinerary/reorder`, {
      days: [
        { dayId: day(0).id, activityIds: [first.id] },
        { dayId: day(1).id, activityIds: [second.id, ...day(1).activities.map((item) => item.id)] },
      ],
    });
    expect(res.status).toBe(200);
    trip = body<Trip>(res).data;
    expect(day(0).activities).toHaveLength(1);
    expect(day(1).activities[0]?.id).toBe(second.id);
    expect(trip.budget.totalMinor).toBe(10_000);
  });

  it('refuses reorders that would drop, duplicate or invent activities', async () => {
    const path = `/api/v1/trips/${trip.id}/itinerary/reorder`;
    const dayOne = day(1);
    const ids = dayOne.activities.map((item) => item.id);
    expect((await client.patch(path, { days: [{ dayId: dayOne.id, activityIds: ids.slice(1) }] })).status).toBe(409);
    expect((await client.patch(path, { days: [{ dayId: dayOne.id, activityIds: [...ids, ids[0]] }] })).status).toBe(409);
    expect((await client.patch(path, { days: [{ dayId: dayOne.id, activityIds: [...ids.slice(1), 'a'.repeat(24)] }] })).status).toBe(409);
    expect((await client.patch(path, { days: [{ dayId: 'b'.repeat(24), activityIds: [] }] })).status).toBe(404);
  });

  it('deletes an activity', async () => {
    const target = day(0).activities[0] as Activity;
    const res = await client.delete(`${activitiesPath(0)}/${target.id}`);
    expect(res.status).toBe(200);
    trip = body<Trip>(res).data;
    expect(day(0).activities).toHaveLength(0);
    expect((await client.delete(`${activitiesPath(0)}/${target.id}`)).status).toBe(404);
  });

  it('persists across reloads', async () => {
    const res = await client.get(`/api/v1/trips/${trip.id}`).expect(200);
    expect(body<Trip>(res).data).toEqual(trip);
  });
});

describe('editing trip dates', () => {
  it('shifts days with their activities when the length is unchanged', async () => {
    const trip = await createTrip({ startDate: '2026-12-01', endDate: '2026-12-02' });
    await client.post(`/api/v1/trips/${trip.id}/days/${trip.days[1]?.id}/activities`, { title: 'Day two plan', category: 'food' });
    const res = await client.patch(`/api/v1/trips/${trip.id}`, { startDate: '2026-12-08', endDate: '2026-12-09' });
    expect(res.status).toBe(200);
    const updated = body<Trip>(res).data;
    expect(updated.days.map((item) => item.date)).toEqual(['2026-12-08', '2026-12-09']);
    expect(updated.days[1]?.activities[0]?.title).toBe('Day two plan');
  });

  it('extends and shortens by date, refusing to drop days that hold activities', async () => {
    const trip = await createTrip({ startDate: '2027-01-01', endDate: '2027-01-03' });
    const lastDay = trip.days[2] as Day;
    await client.post(`/api/v1/trips/${trip.id}/days/${lastDay.id}/activities`, { title: 'Final dinner', category: 'food' });

    const extended = body<Trip>(await client.patch(`/api/v1/trips/${trip.id}`, { endDate: '2027-01-05' })).data;
    expect(extended.dayCount).toBe(5);
    expect(extended.days[2]?.activities[0]?.title).toBe('Final dinner');

    const blocked = await client.patch(`/api/v1/trips/${trip.id}`, { endDate: '2027-01-02' });
    expect(blocked.status).toBe(409);
    expect(body(blocked).error?.message).toMatch(/1 day with 1 planned activity/);

    expect((await client.patch(`/api/v1/trips/${trip.id}`, { endDate: '2026-12-31' })).status).toBe(400);
  });

  it('updates basic fields and rejects unknown ones', async () => {
    const trip = await createTrip();
    const res = await client.patch(`/api/v1/trips/${trip.id}`, { title: 'Kyoto, slowly', travelerCount: 1, currency: 'JPY', budgetTargetMinor: 150000 });
    expect(res.status).toBe(200);
    expect(body<Trip>(res).data).toMatchObject({ title: 'Kyoto, slowly', travelerCount: 1, currency: 'JPY' });
    expect((await client.patch(`/api/v1/trips/${trip.id}`, { userId: '0'.repeat(24) })).status).toBe(400);
    expect((await client.patch(`/api/v1/trips/${trip.id}`, {})).status).toBe(400);
  });
});

describe('CSV export', () => {
  it('exports the itinerary and budget with formula injection neutralised', async () => {
    const trip = await createTrip({ title: '=HYPERLINK("http://evil.example")', currency: 'USD', travelerCount: 2, budgetTargetMinor: 1000 });
    const dayPath = `/api/v1/trips/${trip.id}/days/${trip.days[0]?.id}/activities`;
    await client.post(dayPath, { title: '@SUM(1+1)', category: 'food', location: '+cmd', notes: '-2', estimatedCostMinor: 1550 });

    const res = await client.get(`/api/v1/trips/${trip.id}/export.csv`).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="hyperlinkhttpevilexample\.csv"/);
    const csv = res.text;
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(csv).toContain(`"'@SUM(1+1)"`);
    expect(csv).toContain(`"'+cmd"`);
    expect(csv).toContain(`"'-2"`);
    expect(csv).toContain('"15.50"');
    expect(csv).toContain('"Over budget by","5.50"');
    expect(csv).toMatch(/Nothing in this file is a booking/);
    // No cell may begin with a raw formula character.
    for (const cell of csv.replace(/^\uFEFF/, '').split(/,|\r\n/)) {
      expect(cell).not.toMatch(/^"[=+\-@\t\r]/);
    }
  });
});

describe('trip list and deletion', () => {
  it('lists trips sorted by start date and deletes them', async () => {
    const res = await client.get('/api/v1/trips').expect(200);
    const { data, meta } = body<Trip[]>(res);
    expect(data.length).toBeGreaterThanOrEqual(5);
    const starts = data.map((item) => item.startDate);
    expect(starts).toEqual([...starts].sort());
    expect(data[0]).not.toHaveProperty('days');
    expect(meta).toMatchObject({ page: 1 });

    const target = data[0] as Trip;
    expect((await client.delete(`/api/v1/trips/${target.id}`)).status).toBe(204);
    await client.get(`/api/v1/trips/${target.id}`).expect(404);
    expect((await client.delete(`/api/v1/trips/${target.id}`)).status).toBe(404);
  });

  it('rejects malformed trip IDs', async () => {
    await client.get('/api/v1/trips/not-an-id').expect(400);
    await client.get('/api/v1/trips/%7B%22%24ne%22%3A1%7D').expect(400);
  });
});
