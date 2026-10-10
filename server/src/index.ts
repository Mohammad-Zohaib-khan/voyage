import mongoose from 'mongoose';
import { createApp } from './app.js';
import { EnvValidationError, loadEnv } from './config/env.js';
import { connectDatabase, createSessionStore } from './lib/db.js';
import { createLogger } from './lib/logger.js';

async function main(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      process.stderr.write(`${error.message}\nCopy .env.example to .env and fill in the values.\n`);
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');
  await connectDatabase(env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const app = createApp({ env, logger, sessionStore: createSessionStore(env) });
  const server = app.listen(env.PORT, () => {
    logger.info(`Voyage API listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

main().catch((error: unknown) => {
  process.stderr.write(`Failed to start: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exit(1);
});
