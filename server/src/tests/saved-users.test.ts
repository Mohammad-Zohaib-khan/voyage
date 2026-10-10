import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DestinationModel } from '../modules/destinations/destination.model.js';
import { body, createTestContext, destinationIdBySlug, TestClient, type TestContext } from './helpers.js';

let ctx: TestContext;
let client: TestClient;

beforeAll(async () => {
  ctx = await createTestContext();
  client = new TestClient(ctx.app);
  await client.register('saver@example.com');
});

afterAll(async () => {
  await ctx.close();
});

describe('saved destinations', () => {
  it('saves idempotently, lists newest first and removes', async () => {
    const kyoto = await destinationIdBySlug('kyoto');
    const banff = await destinationIdBySlug('banff');
    expect((await client.post(`/api/v1/saved/${kyoto}`)).status).toBe(201);
    expect((await client.post(`/api/v1/saved/${kyoto}`)).status).toBe(200);
    expect((await client.post(`/api/v1/saved/${banff}`)).status).toBe(201);

    const list = body<Array<{ destination: { slug: string } }>>(await client.get('/api/v1/saved').expect(200)).data;
    expect(list.map((item) => item.destination.slug)).toEqual(['banff', 'kyoto']);

    expect((await client.delete(`/api/v1/saved/${kyoto}`)).status).toBe(204);
    const after = body<Array<{ destination: { slug: string } }>>(await client.get('/api/v1/saved').expect(200)).data;
    expect(after.map((item) => item.destination.slug)).toEqual(['banff']);
  });

  it('validates destination IDs', async () => {
    expect((await client.post('/api/v1/saved/not-an-id')).status).toBe(400);
    expect((await client.post(`/api/v1/saved/${'0'.repeat(24)}`)).status).toBe(404);
  });

  it('hides unpublished destinations from lists and refuses to save them', async () => {
    const lisbon = await destinationIdBySlug('lisbon');
    await client.post(`/api/v1/saved/${lisbon}`);
    await DestinationModel.updateOne({ slug: 'lisbon' }, { $set: { published: false } });
    try {
      const list = body<Array<{ destination: { slug: string } }>>(await client.get('/api/v1/saved').expect(200)).data;
      expect(list.map((item) => item.destination.slug)).not.toContain('lisbon');
      expect((await client.post(`/api/v1/saved/${lisbon}`)).status).toBe(404);
      expect((await client.get('/api/v1/destinations/lisbon')).status).toBe(404);
    } finally {
      await DestinationModel.updateOne({ slug: 'lisbon' }, { $set: { published: true } });
    }
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('updates display name and preferences', async () => {
    const res = await client.patch('/api/v1/users/me', {
      displayName: 'Meera',
      preferences: { currency: 'EUR', dateFormat: 'yyyy-MM-dd', theme: 'dark', reducedMotion: 'reduce' },
    });
    expect(res.status).toBe(200);
    expect(body<{ displayName: string; preferences: Record<string, string> }>(res).data).toMatchObject({
      displayName: 'Meera',
      preferences: { currency: 'EUR', dateFormat: 'yyyy-MM-dd', theme: 'dark', reducedMotion: 'reduce' },
    });
    const partial = await client.patch('/api/v1/users/me', { preferences: { theme: 'light' } });
    expect(body<{ preferences: Record<string, string> }>(partial).data.preferences).toMatchObject({ currency: 'EUR', theme: 'light' });
  });

  it.each([
    ['email change', { email: 'new@example.com' }],
    ['password hash', { passwordHash: 'x' }],
    ['unknown preference', { preferences: { admin: true } }],
    ['invalid currency', { preferences: { currency: 'BTC' } }],
    ['empty update', {}],
  ])('rejects %s', async (_label, payload) => {
    expect((await client.patch('/api/v1/users/me', payload)).status).toBe(400);
  });
});
