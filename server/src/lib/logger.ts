import { pino, type Logger } from 'pino';

/**
 * Paths that must never reach log output. Request bodies are never logged at all,
 * so passwords and trip contents are excluded by construction; these paths cover
 * headers and any object that might be logged explicitly.
 */
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'headers.cookie',
  'headers.authorization',
  '*.password',
  '*.passwordHash',
  '*.currentPassword',
  '*.token',
  '*.csrfToken',
  '*.sessionId',
];

export function createLogger(level: string, pretty = false): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    base: undefined,
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  });
}
