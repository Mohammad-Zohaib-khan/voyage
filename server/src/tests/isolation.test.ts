import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { body, createTestContext, destinationIdBySlug, TestClient, type TestContext } from './helpers.js';

/**
 * Horizontal privilege escalation: two real accounts, User B attempts every operation on
 * User A's private records. Every attempt must fail without revealing that the record exists.
 */

interface Trip {
  id: string;
  title: string;
  days: Array<{ id: string; activities: Array<{ id: string }> }>;
}

let ctx: TestContext;
let alice: TestClient;
let bob: TestClient;
let aliceTrip: Trip;
let lisbonId: string;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = new TestClient(ctx.app);
  bob = new TestClient(ctx.app);
  expect((await alice.register('alice@example.com')).status).toBe(201);
  expect((await bob.register('bob@example.com')).status).toBe(201);
  lisbonId = await destinationIdBySlug('lisbon');

  const created = await alice.post('/api/v1/trips', {
    title: 'Alice in Lisbon',
    destinationIds: [lisbonId],
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    travelerCount: 1,
    currency: 'EUR',
    budgetTargetMinor: 100_000,
    notes: 'Private notes',
  });
  aliceTrip = body<Trip>(created).data;
  const withActivity = await alice.post(`/api/v1/trips/${aliceTrip.id}/days/${aliceTrip.days[0]?.id}/activities`, {
    title: 'Fado night',
    category: 'activities',
    estimatedCostMinor: 3500,
  });
  aliceTrip = body<Trip>(withActivity).data;
  expect((await alice.post(`/api/v1/saved/${lisbonId}`)).status).toBe(201);
});

afterAll(async () => {
  await ctx.close();
});

const expectNotFound = (res: { status: number; body: unknown }) => {
  expect(res.status).toBe(404);
  expect(JSON.stringify(res.body)).not.toContain('Alice in Lisbon');
  expect(JSON.stringify(res.body)).not.toContain('Private notes');
};

describe('User B cannot reach User A’s trip', () => {
  const tripPath = () => `/api/v1/trips/${aliceTrip.id}`;
  const dayId = () => aliceTrip.days[0]?.id ?? '';
  const activityId = () => aliceTrip.days[0]?.activities[0]?.id ?? '';

  it('cannot read it', async () => {
    expectNotFound(await bob.get(tripPath()));
  });

  it('does not see it in their list', async () => {
    const list = body<Trip[]>(await bob.get('/api/v1/trips').expect(200)).data;
    expect(list).toEqual([]);
  });

  it('cannot edit it', async () => {
    expectNotFound(await bob.patch(tripPath(), { title: 'Hijacked' }));
  });

  it('cannot add, edit, delete or reorder its activities', async () => {
    expectNotFound(await bob.post(`${tripPath()}/days/${dayId()}/activities`, { title: 'Injected', category: 'food' }));
    expectNotFound(await bob.patch(`${tripPath()}/days/${dayId()}/activities/${activityId()}`, { title: 'Changed' }));
    expectNotFound(await bob.delete(`${tripPath()}/days/${dayId()}/activities/${activityId()}`));
    expectNotFound(await bob.patch(`${tripPath()}/itinerary/reorder`, { days: [{ dayId: dayId(), activityIds: [activityId()] }] }));
  });

  it('cannot export it', async () => {
    expectNotFound(await bob.get(`${tripPath()}/export.csv`));
  });

  it('cannot delete it', async () => {
    expectNotFound(await bob.delete(tripPath()));
  });

  it('leaves User A’s data unchanged after every attempt', async () => {
    const trip = body<Trip & { notes: string }>(await alice.get(tripPath()).expect(200)).data;
    expect(trip.title).toBe('Alice in Lisbon');
    expect(trip.notes).toBe('Private notes');
    expect(trip.days[0]?.activities).toHaveLength(1);
  });

  it('cannot claim ownership by sending a userId', async () => {
    const res = await bob.post('/api/v1/trips', {
      title: 'Spoofed',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      travelerCount: 1,
      currency: 'EUR',
      budgetTargetMinor: 0,
      userId: '0'.repeat(24),
    });
    expect(res.status).toBe(400);
  });
});

describe('saved places are per user', () => {
  it('does not show User A’s saved places to User B', async () => {
    const bobSaved = body<unknown[]>(await bob.get('/api/v1/saved').expect(200)).data;
    expect(bobSaved).toEqual([]);
  });

  it('User B removing the same destination does not affect User A', async () => {
    expect((await bob.delete(`/api/v1/saved/${lisbonId}`)).status).toBe(204);
    const aliceSaved = body<Array<{ destination: { id: string } }>>(await alice.get('/api/v1/saved').expect(200)).data;
    expect(aliceSaved.map((item) => item.destination.id)).toEqual([lisbonId]);
  });
});
