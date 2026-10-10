import type { Response } from 'express';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'CSRF_INVALID'
  | 'FORBIDDEN'
  | 'ORIGIN_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMAIL_UNAVAILABLE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'LIMIT_REACHED'
  | 'INTERNAL_ERROR';

export interface FieldIssue {
  path: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: FieldIssue[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found`);

export function sendData(res: Response, data: unknown, status = 200, meta: Record<string, unknown> | null = null): void {
  res.status(status).json({ data, error: null, meta });
}

export function sendError(res: Response, error: HttpError): void {
  res.status(error.status).json({
    data: null,
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    meta: null,
  });
}
