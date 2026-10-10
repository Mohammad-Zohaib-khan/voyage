import { existsSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { type Express } from 'express';
import session, { type Store } from 'express-session';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { Env } from './config/env.js';
import { sendData } from './lib/http.js';
import { csrfProtection } from './middleware/auth.js';
import { createErrorHandler, notFoundHandler } from './middleware/errors.js';
import { createOriginGuard } from './middleware/origin.js';
import { createRateLimiters } from './middleware/rateLimits.js';
import { rejectOperatorKeys, requireJsonBody } from './middleware/security.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { destinationsRouter } from './modules/destinations/destinations.routes.js';
import { savedRouter } from './modules/saved/saved.js';
import { tripsRouter } from './modules/trips/trips.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export interface AppDependencies {
  env: Env;
  logger: Logger;
  sessionStore: Store;
}

export function sessionCookieConfig(env: Env) {
  const production = env.NODE_ENV === 'production';
  return {
    // The __Host- prefix requires Secure, Path=/ and no Domain, binding the cookie to this exact host.
    name: production ? '__Host-voyage.sid' : 'voyage.sid',
    options: { httpOnly: true, secure: production, sameSite: 'lax' as const, path: '/' },
  };
}

export function createApp({ env, logger, sessionStore }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'https://images.unsplash.com', 'blob:', 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: env.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  // gzip/deflate for compressible responses (JS, CSS, HTML, JSON); the client bundles are large.
  app.use(compression());

  app.use(
    pinoHttp({
      logger,
      quietReqLogger: true,
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
      serializers: {
        // Log only what is needed to debug: no headers, bodies, cookies or query strings.
        req: (req: { method: string; url: string; id: unknown }) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  const limiters = createRateLimiters(env);
  const cookie = sessionCookieConfig(env);
  const api = express.Router();

  api.get('/health', (_req, res) => {
    const dbReady = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
    res.set('Cache-Control', 'no-store');
    sendData(res, { status: dbReady ? 'ok' : 'degraded', database: dbReady ? 'connected' : 'unavailable' }, dbReady ? 200 : 503);
  });

  api.use(...createOriginGuard(env.CORS_ORIGINS));
  api.use(limiters.api);
  api.use(requireJsonBody);
  api.use(express.json({ limit: '32kb', strict: true, type: 'application/json' }));
  api.use(rejectOperatorKeys);
  api.use(
    session({
      name: cookie.name,
      secret: env.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      unset: 'destroy',
      cookie: { ...cookie.options, maxAge: env.SESSION_TTL_HOURS * 3_600_000 },
    }),
  );
  api.use(csrfProtection);

  api.use('/destinations', destinationsRouter());
  api.use('/auth', authRouter(limiters, cookie));
  api.use('/trips', tripsRouter(limiters));
  api.use('/saved', savedRouter());
  api.use('/users', usersRouter());
  api.use(notFoundHandler);

  app.use('/api/v1', api);
  app.use('/api', notFoundHandler);

  if (env.CLIENT_DIST_DIR) {
    const distDir = path.resolve(env.CLIENT_DIST_DIR);
    if (!existsSync(path.join(distDir, 'index.html'))) {
      logger.warn(`CLIENT_DIST_DIR has no index.html (resolved to ${distDir}); the web app will not be served`);
    }
    app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
