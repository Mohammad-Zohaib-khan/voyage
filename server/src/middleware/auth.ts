import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http.js';
import { isStateChanging } from './security.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}

export function issueCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('base64url');
  }
  return req.session.csrfToken;
}

function tokensMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Synchronizer-token CSRF protection. Every state-changing request must send the
 * per-session token (from GET /auth/csrf) in the X-CSRF-Token header. This applies to
 * login and registration too, which prevents login CSRF.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (!isStateChanging(req.method)) {
    next();
    return;
  }
  const expected = req.session.csrfToken;
  const received = req.get('x-csrf-token');
  if (!expected || !received || !tokensMatch(expected, received)) {
    next(new HttpError(403, 'CSRF_INVALID', 'Your session token is missing or expired. Refresh and try again.'));
    return;
  }
  next();
}

/** Rejects unauthenticated requests. The user ID always comes from the server-side session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue'));
    return;
  }
  next();
}

/** The authenticated user's ID. Only call behind requireAuth. */
export function currentUserId(req: Request): string {
  const userId = req.session.userId;
  if (!userId) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  return userId;
}
