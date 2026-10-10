import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { HttpError, sendError } from '../lib/http.js';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return error instanceof Error && typeof (error as BodyParserError).type === 'string';
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'NOT_FOUND', 'Not found'));
}

/** Converts every error into the standard envelope. Internals never reach the client. */
export function createErrorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof HttpError) {
      sendError(res, error);
      return;
    }
    if (isBodyParserError(error)) {
      if (error.type === 'entity.too.large') {
        sendError(res, new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'));
        return;
      }
      sendError(res, new HttpError(400, 'BAD_REQUEST', 'Request body could not be read'));
      return;
    }
    if (error instanceof mongoose.Error.CastError || error instanceof mongoose.Error.ValidationError) {
      sendError(res, new HttpError(400, 'BAD_REQUEST', 'Request contains invalid values'));
      return;
    }
    if (error instanceof mongoose.Error.VersionError) {
      sendError(res, new HttpError(409, 'CONFLICT', 'This item changed in another tab. Reload and try again.'));
      return;
    }
    if (isDuplicateKeyError(error)) {
      sendError(res, new HttpError(409, 'CONFLICT', 'That already exists'));
      return;
    }
    logger.error({ err: error, method: req.method, path: req.path }, 'Unhandled request error');
    sendError(res, new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Try again in a moment.'));
  };
}
