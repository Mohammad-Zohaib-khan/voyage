import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http.js';

const MAX_DEPTH = 8;

/** True when a key could be interpreted as a MongoDB operator or a dotted path. */
function isUnsafeKey(key: string): boolean {
  return key.startsWith('$') || key.includes('.') || key.includes('$') || key === '__proto__' || key === 'constructor' || key === 'prototype';
}

export function findUnsafeKey(value: unknown, depth = 0): string | null {
  if (depth > MAX_DEPTH) return '(nesting too deep)';
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUnsafeKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (isUnsafeKey(key)) return key;
      const found = findUnsafeKey(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Defense in depth against NoSQL operator injection: reject any request whose body or
 * query contains keys such as "$gt", "$where" or "a.b". Schemas are strict as well, and
 * Mongoose runs with sanitizeFilter, so this is one of three independent layers.
 */
export function rejectOperatorKeys(req: Request, _res: Response, next: NextFunction): void {
  const unsafe = findUnsafeKey(req.query) ?? findUnsafeKey(req.body as unknown);
  if (unsafe) {
    next(new HttpError(400, 'BAD_REQUEST', 'Request contains unsupported field names'));
    return;
  }
  next();
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** State-changing requests that carry a body must be JSON. */
export function requireJsonBody(req: Request, _res: Response, next: NextFunction): void {
  if (!STATE_CHANGING.has(req.method)) {
    next();
    return;
  }
  const length = Number(req.headers['content-length'] ?? 0);
  const hasBody = length > 0 || req.headers['transfer-encoding'] !== undefined;
  if (hasBody && !req.is('application/json')) {
    next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send request bodies as application/json'));
    return;
  }
  next();
}

export function isStateChanging(method: string): boolean {
  return STATE_CHANGING.has(method);
}
