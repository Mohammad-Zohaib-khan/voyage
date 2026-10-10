# Security

This describes the controls Voyage implements and their limits. It is a baseline aligned with the OWASP Cheat Sheet Series, not a formal certification or audit.

## Authentication

- **Passwords** are hashed with **Argon2id** (`argon2` package; 19 MiB memory, t=2, p=1, the OWASP minimum profile). Plain passwords are never stored or logged.
- **Policy**: 10–128 characters, no composition rules, a short list of common passwords is rejected, and passwords containing the email name are rejected.
- **Generic failures**: unknown email and wrong password return the same 401 message. When the email does not exist, a dummy Argon2 verification runs so timing does not reveal registered addresses.
- **Registration enumeration**: registering an existing email returns 409 "already uses this email". This is unavoidable without an email-verification flow; registration is rate limited to slow enumeration.

## Sessions

- Server-side sessions (`express-session`) stored in MongoDB (`connect-mongo`, `sessions` collection, TTL index removes expired records).
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`; in production `Secure` and named `__Host-voyage.sid` (no `Domain`). Verified by an automated test behind a simulated TLS proxy.
- **Expiry**: sliding, `SESSION_TTL_HOURS` (default 7 days) after the last request.
- **Fixation**: the session ID is regenerated on login and registration.
- **Logout** destroys the server-side record and clears the cookie; a test replays the old cookie and confirms it no longer authenticates. The client clears every cached query on logout.

## CSRF

Synchronizer token: `GET /api/v1/auth/csrf` issues a random 256-bit token stored in the session; every POST/PATCH/DELETE must echo it in `X-CSRF-Token` (constant-time comparison). Login and registration are covered too (login CSRF). The token rotates with the session on sign-in. `SameSite=Lax` and the origin guard are additional layers.

## Authorization and isolation

- The owner ID is always taken from the session (`currentUserId(req)`); request bodies cannot carry `userId` (strict schemas reject unknown fields).
- Every trip query includes `{ _id, userId }`; saved places are queried by `userId`. A trip owned by someone else returns **404**, indistinguishable from one that does not exist.
- `isolation.test.ts` registers two real users and proves User B cannot read, list, edit, delete, add/edit/delete/reorder activities on, or export User A's trip, and cannot see or affect User A's saved places. The Playwright journey repeats this in a browser.

## Input handling and database safety

- Every `params`, `query` and `body` is parsed with **Zod** strict schemas (unknown keys rejected, lengths and ranges bounded, control characters rejected, real calendar dates, 24-hex ObjectIds).
- Updates are **allowlisted** field by field; `req.body` is never passed to the database.
- **NoSQL injection**: three layers. (1) Middleware rejects any key starting with `$`, containing `.`, or named `__proto__`/`constructor`/`prototype`, at any depth, in the body or query. (2) Schemas only accept primitives where primitives are expected. (3) Mongoose runs with `sanitizeFilter`, and the few operator objects the server builds itself are wrapped in `mongoose.trusted()`. Express 5's `simple` query parser means query strings never become nested objects.
- Search text is regex-escaped. Limits: 32 KB JSON bodies, 60 days per trip, 25 activities per day, 100 trips per user, 8 destinations per trip, 200 saved places, page size ≤ 24 / 50.
- State-changing requests with a body must be `application/json` (415 otherwise).
- No `dangerouslySetInnerHTML`; React escapes all output.

## CSV export

Generated on the server from the owner-scoped trip. Every cell is quoted with embedded quotes doubled, and any cell starting with `=`, `+`, `-`, `@`, tab or carriage return is prefixed with `'` (OWASP CSV injection guidance). The file name is reduced to letters, digits and dashes. A negative "remaining" figure is written as a positive "Over budget by" amount so it is not mangled by the prefix rule.

## HTTP hardening

- **Helmet** with a restrictive CSP: `default-src 'self'`, scripts and styles from `'self'` only (no inline scripts; the theme bootstrap is an external file), images from `'self'` and `images.unsplash.com`, fonts from `'self'` (Vite is configured never to inline fonts), `frame-ancestors 'none'`, `object-src 'none'`. HSTS in production. `X-Powered-By` removed. The Playwright journey fails on any CSP violation.
- **Origin guard + CORS**: exact allowlist from `CORS_ORIGINS`; a request whose `Origin` is not allowed (and is not the server's own origin) is rejected with 403, not just left without CORS headers. Credentialed CORS never uses a wildcard; production requires `https://` origins.
- **Rate limits** (express-rate-limit): login 10 failed attempts / 15 min / IP, registration 5 / 15 min / IP, all API 600 / 15 min / IP, CSV export 60 / 15 min.
- **Errors**: one JSON envelope; 5xx responses say only "Something went wrong"; no stack traces or database messages reach clients.
- **Logging** (pino): method, path (without query string) and status only; headers, cookies, CSRF tokens and bodies are never logged, with redaction paths as a second guard.
- **Environment** validated at startup with Zod; production refuses to start with a short or placeholder secret, missing or non-https origins. `.env` is git-ignored; `.env.example` holds placeholders. The client has no environment variables, so no secret can reach the bundle.
- **Seeds** upsert destinations by slug only and never modify users, trips, saved places or sessions; the demo user is created only if absent, with a password supplied via environment.

## Dependency review

Run `npm run audit:prod` to audit production dependencies. Dependencies are mainstream, maintained packages (Express, Mongoose, Helmet, argon2, React, TanStack Query, React Hook Form, Zod, Motion, Lucide).

## Known limitations

- Rate limiting uses an in-memory store: limits are per process and reset on restart. Multi-instance deployments should use a shared store (e.g. Redis).
- No email verification, password reset, MFA or account deletion.
- No account lockout beyond IP rate limiting (to avoid lockout-based denial of service).