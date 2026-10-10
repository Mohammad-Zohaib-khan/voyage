import { Router, type Request } from 'express';
import { z } from 'zod';
import type { RateLimiters } from '../../middleware/rateLimits.js';
import { issueCsrfToken } from '../../middleware/auth.js';
import { HttpError, sendData } from '../../lib/http.js';
import { lineText, parseInput } from '../../lib/validation.js';
import { PASSWORD_MAX, PASSWORD_MIN, burnVerifyTime, hashPassword, passwordProblem, verifyPassword } from './password.js';
import { UserModel, toUserDto } from './user.model.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Use 254 characters or fewer')
  .pipe(z.email('Enter a valid email address'));

const registerSchema = z
  .object({
    displayName: lineText(60),
    email: emailSchema,
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer`),
  })
  .strict()
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value.password, value.email);
    if (problem) ctx.addIssue({ code: 'custom', path: ['password'], message: problem });
  });

const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX),
  })
  .strict();

const INVALID_LOGIN = new HttpError(401, 'INVALID_CREDENTIALS', 'That email and password combination did not match.');

/** Issue a fresh session ID on every privilege change to prevent session fixation. */
function regenerate(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error: unknown) => {
      if (error) reject(error instanceof Error ? error : new Error('Session error'));
      else resolve();
    });
  });
}

function save(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error: unknown) => {
      if (error) reject(error instanceof Error ? error : new Error('Session error'));
      else resolve();
    });
  });
}

async function startSession(req: Request, userId: string): Promise<string> {
  await regenerate(req);
  req.session.userId = userId;
  const csrfToken = issueCsrfToken(req);
  await save(req);
  return csrfToken;
}

export function authRouter(limiters: RateLimiters, cookie: { name: string; options: Record<string, unknown> }): Router {
  const router = Router();

  router.get('/csrf', async (req, res) => {
    const csrfToken = issueCsrfToken(req);
    await save(req);
    res.set('Cache-Control', 'no-store');
    sendData(res, { csrfToken });
  });

  router.post('/register', limiters.register, async (req, res) => {
    const input = parseInput(registerSchema, req.body);
    const existing = await UserModel.exists({ email: input.email });
    if (existing) {
      // Revealing that an address is registered is unavoidable without email verification;
      // the endpoint is rate limited to make enumeration slow. See SECURITY.md.
      throw new HttpError(409, 'EMAIL_UNAVAILABLE', 'An account already uses this email. Sign in instead.');
    }
    const user = await UserModel.create({
      displayName: input.displayName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    const csrfToken = await startSession(req, user._id.toString());
    res.set('Cache-Control', 'no-store');
    sendData(res, { user: toUserDto(user), csrfToken }, 201);
  });

  router.post('/login', limiters.login, async (req, res) => {
    const input = parseInput(loginSchema, req.body);
    const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      await burnVerifyTime(input.password);
      throw INVALID_LOGIN;
    }
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) throw INVALID_LOGIN;
    const csrfToken = await startSession(req, user._id.toString());
    res.set('Cache-Control', 'no-store');
    sendData(res, { user: toUserDto(user), csrfToken });
  });

  router.post('/logout', async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error: unknown) => {
      if (error) reject(error instanceof Error ? error : new Error('Session error'));
      else resolve();
    });
    });
    res.clearCookie(cookie.name, cookie.options);
    res.set('Cache-Control', 'no-store');
    sendData(res, { signedOut: true });
  });

  router.get('/me', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const userId = req.session.userId;
    if (!userId) {
      sendData(res, null);
      return;
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      // The account no longer exists; end the orphaned session.
      delete req.session.userId;
      await save(req);
      sendData(res, null);
      return;
    }
    sendData(res, toUserDto(user));
  });

  return router;
}
