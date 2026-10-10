import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Env } from '../config/env.js';
import { HttpError } from '../lib/http.js';

const limitHandler = (message: string) => (_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(429, 'RATE_LIMITED', message));
};

export function createRateLimiters(env: Env) {
  const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60_000;
  const base = { windowMs, standardHeaders: 'draft-8' as const, legacyHeaders: false };

  return {
    /** Applies to every API request. */
    api: rateLimit({ ...base, limit: env.RATE_LIMIT_API_MAX, handler: limitHandler('Too many requests. Slow down and try again shortly.') }),
    /** Login attempts per client IP. Successful logins do not count. */
    login: rateLimit({
      ...base,
      limit: env.RATE_LIMIT_LOGIN_MAX,
      skipSuccessfulRequests: true,
      handler: limitHandler('Too many sign-in attempts. Wait a few minutes before trying again.'),
    }),
    /** Account creation per client IP. */
    register: rateLimit({ ...base, limit: env.RATE_LIMIT_REGISTER_MAX, handler: limitHandler('Too many accounts created from this network. Try again later.') }),
    /** CSV export is comparatively expensive. */
    export: rateLimit({ ...base, limit: 60, handler: limitHandler('Too many exports. Try again shortly.') }),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
