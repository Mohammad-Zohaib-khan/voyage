# Voyage

A travel discovery and trip-planning application: browse eighteen destinations, save the ones you like, and shape trips into day-by-day itineraries with a running budget. MERN + TypeScript, no AI features, no bookings or payments.

All destination costs are illustrative estimates written for this project. Nothing in Voyage is a live price, a quote or a booking.

## What's included

- **Public**: editorial homepage, destination discovery (search, combined filters, sort, load more, URL-synced), destination guides (highlights, best months, cost breakdown, practical notes, related places), privacy and terms.
- **Accounts**: register, sign in, sign out, session restore, profile and preferences (currency, date format, light/dark/system theme, motion).
- **Planning**: trips with dates, travellers, currency and a budget target; an itinerary day per date; activities with category, time, place, notes and cost; reorder by drag or keyboard buttons; move between days; budget by category, per person and against the target; CSV export with formula-injection protection.
- **Dashboard and saved places**, built only from persisted records.

## Requirements

- Node.js **22.22 or newer** (React Router 8 requires it), npm 10
- MongoDB 6+ locally (or `docker compose up -d`) or MongoDB Atlas

## Setup

```bash
npm install                      # installs both workspaces; package-lock.json is committed
cp .env.example .env             # then set SESSION_SECRET (see the comment in the file)
npm run seed                     # upserts the 18 destinations (idempotent)
npm run dev                      # API on :4000, client on http://localhost:5173
```

Optional demo account: set `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `.env`, then `npm run seed:demo`. It creates the account and one sample trip only if that email does not exist yet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) and Vite dev server; Vite proxies `/api` so cookies stay same-origin |
| `npm run lint` | ESLint (type-aware, strict) for server and client |
| `npm run typecheck` | `tsc --noEmit` for both workspaces |
| `npm test` | Server tests (Vitest + Supertest) and client tests (Vitest + Testing Library) |
| `npm run test:e2e` | Playwright journey against the production build (needs MongoDB; run `npx playwright install chromium` once) |
| `npm run build` | Compiles the server to `server/dist` and the client to `client/dist` |
| `npm start` | Runs the compiled API (set `CLIENT_DIST_DIR=client/dist` to serve the app too) |
| `npm run seed` / `seed:demo` | Seed destinations / plus a demo user |
| `npm run audit:prod` | `npm audit` of production dependencies |

Server tests use `MONGODB_URI_TEST` if set, otherwise they start an in-memory MongoDB via `mongodb-memory-server` (downloads a MongoDB binary on first run).

## Architecture

```
voyage/
  server/src/
    config/env.ts          Zod-validated environment, fail-fast in production
    app.ts                 Express app: helmet/CSP, logging, origin guard + CORS, rate limits,
                           JSON-only bodies, operator-key rejection, sessions, CSRF, routes
    middleware/            auth (session, CSRF), origin, rate limits, security, errors
    modules/               auth, users, destinations, trips (budget, CSV), saved
    lib/                   money (integer minor units), dates (date-only), csv, validation, db, logger
    seed/                  destination content (sourced photos, illustrative costs) and runner
    tests/                 unit, destinations, auth/security, trips, two-user isolation, saved/users
  client/src/
    app/router.tsx         data router with code-split routes and an auth-guarded /app section
    components/            layout (shell, header, footer) and ui primitives (button, form, dialog, toast…)
    features/              auth, destinations, trips (api hooks, timeline, forms, budget display)
    routes/                pages
    styles/index.css       design tokens, light/dark themes, reduced-motion rules
  e2e/                     Playwright primary journey
  docs/                    API, data model, QA checklist
```

Security design is in `SECURITY.md`; endpoint contracts in `docs/API.md`; schemas in `docs/DATA_MODEL.md`; Azure deployment in `docs/AZURE_DEPLOYMENT.md`.

### Design

"A considered journey": warm paper and deep forest surfaces, limestone bands, olive and clay accents (with text-safe variants that meet WCAG AA), Instrument Serif for display and Manrope for interface text, both self-hosted. The signature element is a route line: it draws once under the homepage hero, marks the logo, and becomes the spine of the itinerary timeline. Motion is limited to one hero sequence, image reveals and dialog transitions, and all of it switches off under reduced motion (system or account setting).

### Photography

Destination photos are free-licence Unsplash images, hot-linked from `images.unsplash.com` with responsive sizes and a credit linking to each photo page. Every photo ID, photographer and licence was checked against its Unsplash page. If an image fails to load, a designed fallback panel appears instead.

## Deployment

Recommended: one origin. Build, then run the API with `CLIENT_DIST_DIR=client/dist` so it serves the app; the session cookie is then `__Host-voyage.sid`, `Secure`, `HttpOnly`, `SameSite=Lax`.

- **Node host** (Render, Railway, Fly.io, a VM): `npm ci && npm run build && npm start`, health check `GET /api/v1/health`.
- **Environment**: `NODE_ENV=production`, a unique `SESSION_SECRET`, `MONGODB_URI`, `CORS_ORIGINS=https://your.domain`, `TRUST_PROXY=1` behind a TLS-terminating proxy, `CLIENT_DIST_DIR=client/dist`. Startup fails if these are missing or unsafe.
- **MongoDB Atlas**: a database user with readWrite on the Voyage database only, an IP access list, backups enabled. Run `npm run seed` once; it never touches user data.
- Serving the client from a different origin would need `SameSite=None` cookies and a different cookie name; it is not supported out of the box.

- **Azure**: runs on Azure Container Apps from the included `Dockerfile`; see [`docs/AZURE_DEPLOYMENT.md`](docs/AZURE_DEPLOYMENT.md).

## Limitations

There is no account deletion, password reset or email verification, and rate limits are per process (in memory).
