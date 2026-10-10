import { MongoStore } from 'connect-mongo';
import mongoose from 'mongoose';
import type { Env } from '../config/env.js';

/** Global query hardening. sanitizeFilter wraps untrusted "$" objects in filters in $eq. */
export function configureMongoose(): void {
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  mongoose.set('strict', 'throw');
}

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  configureMongoose();
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 8_000, maxPoolSize: 20 });
}

export function createSessionStore(env: Env): MongoStore {
  return MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
    ttl: env.SESSION_TTL_HOURS * 3600,
    autoRemove: env.SESSION_AUTO_REMOVE,
    stringify: false,
  });
}
