import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DESTINATIONS } from '../seed/destinations.data.js';
import { body, createTestContext, type TestContext } from './helpers.js';

interface Card {
  id: string;
  slug: string;
  name: string;
  region: string;
  travelStyles: string[];
  bestMonths: number[];
  dailyTotalMinor: number;
  budgetBand: string;
}

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

const list = (query = '') => request(ctx.app).get(`/api/v1/destinations${query}`);

describe('GET /api/v1/destinations', () => {
  it('returns published destinations in featured order with pagination meta', async () => {
    const res = await list().expect(200);
    const { data, meta, error } = body<Card[]>(res);
    expect(error).toBeNull();
    expect(data).toHaveLength(9);
    expect(data[0]?.slug).toBe('kyoto');
    expect(meta).toEqual({ page: 1, limit: 9, total: DESTINATIONS.length, totalPages: 2 });
  });

  it('pages through results without overlap', async () => {
    const first = body<Card[]>(await list('?limit=6&page=1').expect(200)).data;
    const second = body<Card[]>(await list('?limit=6&page=2').expect(200)).data;
    const ids = new Set([...first, ...second].map((item) => item.id));
    expect(ids.size).toBe(12);
  });

  it('combines filters: region OR within, AND across categories', async () => {
    const res = await list('?region=asia,europe&style=mountains&limit=24').expect(200);
    const { data } = body<Card[]>(res);
    expect(data.length).toBeGreaterThan(0);
    for (const item of data) {
      expect(['asia', 'europe']).toContain(item.region);
      expect(item.travelStyles).toContain('mountains');
    }
    const slugs = data.map((item) => item.slug).sort();
    expect(slugs).toEqual(['ladakh', 'scottish-highlands', 'zermatt']);
  });

  it('filters by budget band and season', async () => {
    const { data } = body<Card[]>(await list('?budget=essential&season=jun-aug&limit=24').expect(200));
    expect(data.map((item) => item.slug)).toEqual(['ladakh']);
    for (const item of data) expect(item.budgetBand).toBe('essential');
  });

  it('searches name, country and summary case-insensitively', async () => {
    const byCountry = body<Card[]>(await list('?q=india&limit=24').expect(200)).data.map((item) => item.slug).sort();
    expect(byCountry).toEqual(['kerala-backwaters', 'ladakh', 'udaipur']);
    const byName = body<Card[]>(await list('?q=KYOTO').expect(200)).data;
    expect(byName.map((item) => item.slug)).toEqual(['kyoto']);
  });

  it('treats regex characters in search as literal text', async () => {
    const res = await list(`?q=${encodeURIComponent('.*')}`).expect(200);
    expect(body<Card[]>(res).data).toHaveLength(0);
  });

  it('sorts by estimated cost', async () => {
    const { data } = body<Card[]>(await list('?sort=cost-asc&limit=24').expect(200));
    const totals = data.map((item) => item.dailyTotalMinor);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    const desc = body<Card[]>(await list('?sort=cost-desc&limit=3').expect(200)).data;
    expect(desc[0]?.slug).toBe('zermatt');
  });

  it('returns an empty list with meta when nothing matches', async () => {
    const res = await list('?region=oceania&style=culture').expect(200);
    expect(body<Card[]>(res).data).toEqual([]);
    expect(body<Card[]>(res).meta).toMatchObject({ total: 0, totalPages: 1 });
  });

  it.each([
    ['unknown region', '?region=atlantis'],
    ['unknown sort (no rating sort exists)', '?sort=rating'],
    ['oversized page size', '?limit=500'],
    ['unknown parameter', '?published=false'],
    ['operator injection', '?region[$ne]=asia'],
    ['overlong search', `?q=${'a'.repeat(200)}`],
  ])('rejects %s', async (_label, query) => {
    const res = await list(query).expect(400);
    expect(body(res).error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/);
  });
});

describe('GET /api/v1/destinations/:slug', () => {
  it('returns details with gallery, costs and related places', async () => {
    const res = await request(ctx.app).get('/api/v1/destinations/ladakh').expect(200);
    const { data } = body<{
      slug: string;
      highlights: unknown[];
      tips: unknown[];
      gallery: unknown[];
      costs: { currency: string; assumptions: string };
      related: Card[];
    }>(res);
    expect(data.slug).toBe('ladakh');
    expect(data.highlights.length).toBeGreaterThan(0);
    expect(data.tips.length).toBeGreaterThan(0);
    expect(data.gallery).toHaveLength(2);
    expect(data.costs.currency).toBe('USD');
    expect(data.costs.assumptions).toMatch(/illustrative/i);
    expect(data.related).toHaveLength(3);
    expect(data.related.map((item) => item.slug)).not.toContain('ladakh');
  });

  it('returns 404 for unknown slugs and 400 for malformed ones', async () => {
    expect(body(await request(ctx.app).get('/api/v1/destinations/atlantis').expect(404)).error?.code).toBe('NOT_FOUND');
    await request(ctx.app).get('/api/v1/destinations/Bad%20Slug!').expect(400);
  });
});

describe('GET /api/v1/destinations/facets', () => {
  it('counts destinations per travel style and region from real tags', async () => {
    const { data } = body<{ styles: Array<{ value: string; count: number }>; total: number }>(
      await request(ctx.app).get('/api/v1/destinations/facets').expect(200),
    );
    expect(data.total).toBe(DESTINATIONS.length);
    const expectedCoast = DESTINATIONS.filter((item) => item.travelStyles.includes('coast')).length;
    expect(data.styles.find((item) => item.value === 'coast')?.count).toBe(expectedCoast);
  });
});

describe('health', () => {
  it('reports database connectivity', async () => {
    const res = await request(ctx.app).get('/api/v1/health').expect(200);
    expect(body<{ status: string }>(res).data.status).toBe('ok');
  });
});
