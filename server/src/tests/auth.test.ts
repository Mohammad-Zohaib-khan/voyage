import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { body, createTestContext, TestClient, type TestContext } from './helpers.js';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

const sessionCookie = (res: { headers: Record<string, unknown> }) =>
  ([] as string[]).concat((res.headers['set-cookie'] as string[] | undefined) ?? []).find((cookie) => cookie.startsWith('voyage.sid='));

describe('CSRF protection', () => {
  it('rejects state-changing requests without a token', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({ displayName: 'Ana', email: 'ana@example.com', password: 'a-long-unique-passphrase' })
      .expect(403);
    expect(body(res).error?.code).toBe('CSRF_INVALID');
  });

  it('rejects a token that belongs to a different session', async () => {
    const attacker = new TestClient(ctx.app);
    const token = await attacker.csrf();
    const victim = request.agent(ctx.app);
    await victim.get('/api/v1/auth/csrf').expect(200);
    await victim
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'ana@example.com', password: 'whatever-it-is' })
      .expect(403);
  });
});

describe('registration', () => {
  it('creates an account, starts a session and never returns the password hash', async () => {
    const client = new TestClient(ctx.app);
    const res = await client.register('Priya@Example.com ');
    expect(res.status).toBe(201);
    const { data } = body<{ user: Record<string, unknown>; csrfToken: string }>(res);
    expect(data.user.email).toBe('priya@example.com');
    expect(data.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(res.body)).not.toMatch(/argon2/);
    expect(data.user.preferences).toEqual({ currency: 'INR', dateFormat: 'd MMM yyyy', theme: 'system', reducedMotion: 'system' });

    const me = await client.get('/api/v1/auth/me').expect(200);
    expect(body<{ email: string }>(me).data.email).toBe('priya@example.com');
  });

  it('rejects duplicate emails', async () => {
    const client = new TestClient(ctx.app);
    const res = await client.register('priya@example.com');
    expect(res.status).toBe(409);
    expect(body(res).error?.code).toBe('EMAIL_UNAVAILABLE');
  });

  it.each([
    ['short password', { displayName: 'A', email: 'a1@example.com', password: 'short' }],
    ['common password', { displayName: 'A', email: 'a2@example.com', password: 'password123' }],
    ['invalid email', { displayName: 'A', email: 'not-an-email', password: 'a-long-unique-passphrase' }],
    ['missing name', { displayName: '   ', email: 'a3@example.com', password: 'a-long-unique-passphrase' }],
    ['extra field (mass assignment)', { displayName: 'A', email: 'a4@example.com', password: 'a-long-unique-passphrase', role: 'admin' }],
    ['operator object', { displayName: 'A', email: { $gt: '' }, password: 'a-long-unique-passphrase' }],
  ])('rejects %s', async (_label, payload) => {
    const client = new TestClient(ctx.app);
    const res = await client.post('/api/v1/auth/register', payload);
    expect(res.status).toBe(400);
  });
});

describe('login, session restoration and logout', () => {
  it('rotates the session ID on login and restores the user', async () => {
    const client = new TestClient(ctx.app);
    const csrfRes = await client.agent.get('/api/v1/auth/csrf').expect(200);
    client.setCsrf(body<{ csrfToken: string }>(csrfRes).data.csrfToken);
    const before = sessionCookie(csrfRes);
    const login = await client.login('priya@example.com');
    expect(login.status).toBe(200);
    const after = sessionCookie(login);
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after?.split(';')[0]).not.toBe(before?.split(';')[0]);
    expect(after).toMatch(/HttpOnly/i);
    expect(after).toMatch(/SameSite=Lax/i);

    const me = await client.get('/api/v1/auth/me').expect(200);
    expect(body<{ email: string }>(me).data.email).toBe('priya@example.com');
  });

  it('uses one generic message for unknown emails and wrong passwords', async () => {
    const client = new TestClient(ctx.app);
    const wrongPassword = await client.post('/api/v1/auth/login', { email: 'priya@example.com', password: 'not-the-password' });
    const unknownUser = await client.post('/api/v1/auth/login', { email: 'nobody@example.com', password: 'not-the-password' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(body(wrongPassword).error).toEqual(body(unknownUser).error);
  });

  it('logout destroys the server session, so the old cookie stops working', async () => {
    const client = new TestClient(ctx.app);
    const login = await client.login('priya@example.com');
    const cookie = sessionCookie(login)?.split(';')[0] ?? '';
    expect((await client.post('/api/v1/auth/logout')).status).toBe(200);

    const replay = await request(ctx.app).get('/api/v1/auth/me').set('Cookie', cookie).expect(200);
    expect(body(replay).data).toBeNull();
    await request(ctx.app).get('/api/v1/trips').set('Cookie', cookie).expect(401);
  });

  it('reports no user for anonymous visitors', async () => {
    const res = await request(ctx.app).get('/api/v1/auth/me').expect(200);
    expect(body(res).data).toBeNull();
  });
});

describe('rate limiting', () => {
  it('limits repeated failed logins from one client', async () => {
    const limited = await createTestContext({ RATE_LIMIT_LOGIN_MAX: '4' });
    const client = new TestClient(limited.app);
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await client.post('/api/v1/auth/login', { email: 'priya@example.com', password: `wrong-password-${attempt}` });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 4).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(4)).toEqual([429, 429]);
    await limited.close();
  });

  it('limits account creation from one client', async () => {
    const limited = await createTestContext({ RATE_LIMIT_REGISTER_MAX: '2' });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await new TestClient(limited.app).register(`burst${attempt}@example.com`)).status);
    }
    expect(statuses).toEqual([201, 201, 429]);
    await limited.close();
  });
});

describe('protected routes', () => {
  it.each([
    ['get', '/api/v1/trips'],
    ['get', '/api/v1/saved'],
  ])('%s %s requires authentication', async (_method, path) => {
    const res = await request(ctx.app).get(path).expect(401);
    expect(body(res).error?.code).toBe('UNAUTHENTICATED');
  });

  it('requires authentication for writes even with a valid CSRF token', async () => {
    const client = new TestClient(ctx.app);
    expect((await client.post('/api/v1/trips', {})).status).toBe(401);
    expect((await client.patch('/api/v1/users/me', { displayName: 'X' })).status).toBe(401);
  });
});

describe('request hardening', () => {
  it('rejects unknown origins and allows the configured one', async () => {
    const blocked = await request(ctx.app).get('/api/v1/destinations').set('Origin', 'https://evil.example').expect(403);
    expect(body(blocked).error?.code).toBe('ORIGIN_NOT_ALLOWED');
    const allowed = await request(ctx.app).get('/api/v1/destinations').set('Origin', 'http://localhost:5173').expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects oversized bodies, non-JSON bodies and malformed JSON without leaking internals', async () => {
    const client = new TestClient(ctx.app);
    const token = await client.csrf();
    const huge = await client.agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'a@b.co', password: 'x'.repeat(40_000) });
    expect(huge.status).toBe(413);

    const form = await client.agent.post('/api/v1/auth/login').set('X-CSRF-Token', token).type('form').send('email=a@b.co');
    expect(form.status).toBe(415);

    const malformed = await client.agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', token)
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(malformed.body)).not.toMatch(/stack|SyntaxError|node_modules/);
  });

  it('sets security headers', async () => {
    const res = await request(ctx.app).get('/api/v1/destinations').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Scripts and data: only our own origin. Never inline or eval.
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toMatch(/connect-src 'self'(;|$)/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns JSON 404s for unknown API routes', async () => {
    const res = await request(ctx.app).get('/api/v1/admin').expect(404);
    expect(body(res).error?.code).toBe('NOT_FOUND');
  });
});

describe('production cookie flags', () => {
  it('issues a __Host- Secure HttpOnly cookie behind a TLS-terminating proxy', async () => {
    const prod = await createTestContext({ NODE_ENV: 'production', TRUST_PROXY: '1', CORS_ORIGINS: 'https://voyage.example' });
    try {
      const res = await request(prod.app).get('/api/v1/auth/csrf').set('X-Forwarded-Proto', 'https').expect(200);
      const cookie = ([] as string[]).concat((res.headers['set-cookie'] as string[] | undefined) ?? [])[0] ?? '';
      expect(cookie.startsWith('__Host-voyage.sid=')).toBe(true);
      expect(cookie).toMatch(/; Secure/i);
      expect(cookie).toMatch(/; HttpOnly/i);
      expect(cookie).toMatch(/; Path=\//i);
      expect(cookie).not.toMatch(/Domain=/i);
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    } finally {
      await prod.close();
    }
  });
});
