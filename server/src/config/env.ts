import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );

const intFromEnv = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: intFromEnv(4000, 1, 65535),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://127.0.0.1:27017/voyage'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SESSION_TTL_HOURS: intFromEnv(168, 1, 24 * 30),
    CORS_ORIGINS: csv,
    TRUST_PROXY: intFromEnv(0, 0, 5),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CLIENT_DIST_DIR: z.string().optional(),
    RATE_LIMIT_WINDOW_MINUTES: intFromEnv(15, 1, 24 * 60),
    RATE_LIMIT_LOGIN_MAX: intFromEnv(10, 1, 1000),
    RATE_LIMIT_REGISTER_MAX: intFromEnv(5, 1, 1000),
    RATE_LIMIT_API_MAX: intFromEnv(600, 10, 100000),
    SESSION_AUTO_REMOVE: z.enum(['native', 'interval']).default('native'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (/change[-_ ]?me|example|placeholder/i.test(env.SESSION_SECRET)) {
      ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Use a unique random secret in production' });
    }
    if (env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Set at least one exact origin in production' });
    }
    for (const origin of env.CORS_ORIGINS) {
      if (origin === '*' || !origin.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: `Production origins must be exact https origins (got "${origin}")` });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/** Parse and validate environment variables. Throws (fail fast) when invalid. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only report variable names and rule messages, never the values themselves.
    throw new EnvValidationError(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }
  for (const origin of result.data.CORS_ORIGINS) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new EnvValidationError([`CORS_ORIGINS: "${origin}" is not a valid origin`]);
    }
    if (parsed.origin !== origin) {
      throw new EnvValidationError([`CORS_ORIGINS: "${origin}" must be an exact origin like ${parsed.origin}`]);
    }
  }
  return result.data;
}
