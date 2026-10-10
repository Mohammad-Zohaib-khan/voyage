import argon2 from 'argon2';

/** Argon2id with OWASP's recommended minimum profile (19 MiB, t=2, p=1). */
const HASH_OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/** A short list of the most common passwords that satisfy the length rule. */
const COMMON_PASSWORDS = new Set([
  '1234567890',
  '12345678910',
  '0123456789',
  'qwertyuiop',
  'password123',
  'password1234',
  'passwordpassword',
  'iloveyou123',
  'abcdefghij',
  'qwerty12345',
  '1q2w3e4r5t',
  'q1w2e3r4t5',
  'letmein1234',
  'welcome123',
  'administrator',
  'football123',
  'baseball123',
  'sunshine123',
  'princess123',
  'aaaaaaaaaa',
  '1111111111',
  'zaq12wsxcde',
  'voyage1234',
  'travel1234',
]);

export function passwordProblem(password: string, email: string): string | null {
  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) return 'This password is too common. Choose something less predictable.';
  if (/^(.)\1+$/.test(password)) return 'Avoid repeating a single character.';
  const localPart = email.split('@')[0]?.toLowerCase() ?? '';
  if (localPart.length >= 4 && lowered.includes(localPart)) return 'Avoid using your email address in your password.';
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // A malformed stored hash must never authenticate; treat it as a mismatch.
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/** Spend comparable time when the account does not exist, so response timing does not reveal registered emails. */
export async function burnVerifyTime(password: string): Promise<void> {
  dummyHash ??= argon2.hash('voyage-timing-equaliser', HASH_OPTIONS);
  await verifyPassword(await dummyHash, password);
}
