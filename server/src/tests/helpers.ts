import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { loadEnv, type Env } from '../config/env.js';
import { configureMongoose, createSessionStore } from '../lib/db.js';
import { createLogger } from '../lib/logger.js';
import { DestinationModel } from '../modules/destinations/destination.model.js';
import { seedDestinations } from '../seed/seed.js';

export interface TestContext {
  app: Express;
  env: Env;
  close: () => Promise<void>;
}

let memoryServer: MongoMemoryServer | null = null;

/**
 * Connects to MONGODB_URI_TEST when set (any MongoDB-compatible server), otherwise starts an
 * in-memory MongoDB via mongodb-memory-server. Each call uses a fresh, uniquely named database.
 */
async function resolveBaseUri(): Promise<string> {
  const configured = process.env.MONGODB_URI_TEST;
  if (configured) return configured;
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer ??= await MongoMemoryServer.create();
  return memoryServer.getUri();
}

export async function createTestContext(overrides: Record<string, string> = {}): Promise<TestContext> {
  const base = await resolveBaseUri();
  const dbName = `voyage_test_${randomBytes(4).toString('hex')}`;
  const url = new URL(base);
  url.pathname = `/${dbName}`;

  const env = loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: url.toString(),
    SESSION_SECRET: randomBytes(32).toString('hex'),
    CORS_ORIGINS: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
    RATE_LIMIT_LOGIN_MAX: '50',
    RATE_LIMIT_REGISTER_MAX: '50',
    RATE_LIMIT_API_MAX: '5000',
    SESSION_AUTO_REMOVE: process.env.SESSION_AUTO_REMOVE ?? 'native',
    ...overrides,
  });

  configureMongoose();
  // A context created while another is open (e.g. to test production settings) shares its
  // connection and database, and leaves cleanup to the owner.
  const ownsConnection = mongoose.connection.readyState === mongoose.ConnectionStates.disconnected;
  if (ownsConnection) {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  }
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  await seedDestinations();

  const app = createApp({ env, logger: createLogger('silent'), sessionStore: createSessionStore(env) });
  return {
    app,
    env,
    close: async () => {
      if (!ownsConnection) return;
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
      }
    },
  };
}

/** A cookie-carrying client that handles the CSRF token like the browser app does. */
export class TestClient {
  readonly agent: ReturnType<typeof request.agent>;
  private csrfToken: string | null = null;

  constructor(app: Express) {
    this.agent = request.agent(app);
  }

  async csrf(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    const res = await this.agent.get('/api/v1/auth/csrf').expect(200);
    this.csrfToken = (res.body as { data: { csrfToken: string } }).data.csrfToken;
    return this.csrfToken;
  }

  /** Call after login/register so the rotated token is used. */
  setCsrf(token: string | null) {
    this.csrfToken = token;
  }

  get(path: string) {
    return this.agent.get(path);
  }

  async post(path: string, body?: object) {
    const token = await this.csrf();
    const req = this.agent.post(path).set('X-CSRF-Token', token);
    return body === undefined ? req : req.send(body);
  }

  async patch(path: string, body: object) {
    return this.agent.patch(path).set('X-CSRF-Token', await this.csrf()).send(body);
  }

  async delete(path: string) {
    return this.agent.delete(path).set('X-CSRF-Token', await this.csrf());
  }

  async register(email: string, password = 'a-long-unique-passphrase', displayName = 'Test Traveller') {
    const res = await this.post('/api/v1/auth/register', { displayName, email, password });
    if (res.status === 201) this.setCsrf((res.body as { data: { csrfToken: string } }).data.csrfToken);
    return res;
  }

  async login(email: string, password = 'a-long-unique-passphrase') {
    const res = await this.post('/api/v1/auth/login', { email, password });
    if (res.status === 200) this.setCsrf((res.body as { data: { csrfToken: string } }).data.csrfToken);
    return res;
  }
}

export async function destinationIdBySlug(slug: string): Promise<string> {
  const doc = await DestinationModel.findOne({ slug }).lean();
  if (!doc) throw new Error(`Seed destination ${slug} missing`);
  return doc._id.toString();
}

export interface ApiBody<T> {
  data: T;
  error: { code: string; message: string; details?: Array<{ path: string; message: string }> } | null;
  meta: Record<string, unknown> | null;
}

export const body = <T>(res: { body: unknown }) => res.body as ApiBody<T>;
