import cors from 'cors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../lib/http.js';

/**
 * Exact-match origin allowlist. Requests that carry an Origin header not on the list are
 * rejected outright (not merely left without CORS headers), so a hostile site cannot use a
 * visitor's cookies even for "simple" requests. Requests without an Origin header (same-origin
 * navigations, server-to-server calls, curl) proceed and still face CSRF checks.
 */
export function createOriginGuard(allowedOrigins: readonly string[]): RequestHandler[] {
  const allowed = new Set(allowedOrigins);

  const guard = (req: Request, _res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin !== undefined && !allowed.has(origin) && !isSameOrigin(req, origin)) {
      next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin not allowed'));
      return;
    }
    next();
  };

  const corsHandler = cors({
    origin: (origin, callback) => {
      callback(null, origin !== undefined && allowed.has(origin) ? origin : false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  });

  return [guard, corsHandler];
}

/** Same-origin requests (when the API also serves the client build) carry their own host as Origin. */
function isSameOrigin(req: Request, origin: string): boolean {
  const host = req.headers.host;
  if (!host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === `${req.protocol}:`;
  } catch {
    return false;
  }
}
