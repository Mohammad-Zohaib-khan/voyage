import { Router } from 'express';
import { z } from 'zod';
import { currentUserId, requireAuth } from '../../middleware/auth.js';
import { notFound, sendData } from '../../lib/http.js';
import { CURRENCY_CODES } from '../../lib/money.js';
import { lineText, parseInput } from '../../lib/validation.js';
import { DATE_FORMATS, MOTION_PREFERENCES, THEMES, UserModel, toUserDto } from '../auth/user.model.js';

/** Allowlisted, individually validated profile fields. Email and password are not editable here. */
const updateMeSchema = z
  .object({
    displayName: lineText(60).optional(),
    preferences: z
      .object({
        currency: z.enum(CURRENCY_CODES).optional(),
        dateFormat: z.enum(DATE_FORMATS).optional(),
        theme: z.enum(THEMES).optional(),
        reducedMotion: z.enum(MOTION_PREFERENCES).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => value.displayName !== undefined || (value.preferences && Object.keys(value.preferences).length > 0), {
    message: 'Nothing to update',
  });

export function usersRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.patch('/me', async (req, res) => {
    const input = parseInput(updateMeSchema, req.body);
    const update: Record<string, string> = {};
    if (input.displayName !== undefined) update.displayName = input.displayName;
    for (const [key, value] of Object.entries(input.preferences ?? {})) {
      update[`preferences.${key}`] = value;
    }
    const userId = currentUserId(req);
    const result = await UserModel.updateOne({ _id: userId }, { $set: update }, { runValidators: true });
    if (result.matchedCount !== 1) throw notFound('Account');
    const user = await UserModel.findById(userId);
    if (!user) throw notFound('Account');
    sendData(res, toUserDto(user));
  });

  return router;
}
