import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CURRENCY_CODES } from '../../lib/money.js';

export const DATE_FORMATS = ['d MMM yyyy', 'MMM d, yyyy', 'yyyy-MM-dd'] as const;
export const THEMES = ['system', 'light', 'dark'] as const;
export const MOTION_PREFERENCES = ['system', 'reduce', 'full'] as const;

const userSchema = new Schema(
  {
    displayName: { type: String, required: true, maxlength: 60 },
    /** Normalised (trimmed, lower-cased) email. */
    email: { type: String, required: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    preferences: {
      currency: { type: String, enum: CURRENCY_CODES, default: 'INR' },
      dateFormat: { type: String, enum: DATE_FORMATS, default: 'd MMM yyyy' },
      theme: { type: String, enum: THEMES, default: 'system' },
      reducedMotion: { type: String, enum: MOTION_PREFERENCES, default: 'system' },
    },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel = model('User', userSchema);

/** The only shape in which a user leaves the server. passwordHash is never included. */
export function toUserDto(user: UserDocument | (User & { _id: { toString(): string } })) {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    preferences: {
      currency: user.preferences?.currency ?? 'INR',
      dateFormat: user.preferences?.dateFormat ?? 'd MMM yyyy',
      theme: user.preferences?.theme ?? 'system',
      reducedMotion: user.preferences?.reducedMotion ?? 'system',
    },
    createdAt: user.createdAt.toISOString(),
  };
}
