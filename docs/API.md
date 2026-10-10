# Voyage API (v1)

Base path `/api/v1`. JSON only. Every response uses one envelope:

```json
{ "data": {}, "error": null, "meta": null }
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention", "details": [{ "path": "endDate", "message": "End date must be on or after the start date" }] }, "meta": null }
```

**Auth**: cookie session. **CSRF**: every POST/PATCH/DELETE needs `X-CSRF-Token` from `GET /auth/csrf` (403 `CSRF_INVALID` otherwise). Bodies on state-changing requests must be `application/json` (415). Unknown body/query keys, keys starting with `$` or containing `.` are rejected (400). Bodies over 32 KB: 413.

Error codes: `BAD_REQUEST` 400, `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `CSRF_INVALID` 403, `ORIGIN_NOT_ALLOWED` 403, `NOT_FOUND` 404, `CONFLICT` 409, `EMAIL_UNAVAILABLE` 409, `LIMIT_REACHED` 409, `PAYLOAD_TOO_LARGE` 413, `UNSUPPORTED_MEDIA_TYPE` 415, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500.

Money is always an integer in the currency's minor unit (`…Minor`): paise, cents, or yen (JPY has no minor unit). Dates are calendar dates `YYYY-MM-DD`.

## Public

### `GET /health`
`200 { status: "ok", database: "connected" }` or `503` with `status: "degraded"`.

### `GET /destinations`
Query (all optional): `q` (≤80 chars, matches name, country, summary), `region` (csv of `asia,europe,africa,americas,oceania,middle-east`), `style` (csv of `coast,mountains,culture,outdoors,slow-travel`), `budget` (csv of `essential,comfortable,indulgent`), `season` (csv of `dec-feb,mar-may,jun-aug,sep-nov`), `sort` (`featured` default, `name`, `cost-asc`, `cost-desc`), `page` (≥1), `limit` (1–24, default 9).
Values within one parameter are OR; different parameters are AND.
`200 data: DestinationCard[]`, `meta: { page, limit, total, totalPages }`. 400 on any invalid or unknown parameter.

`DestinationCard`: `id, slug, name, country, region, summary, heroImage { src, alt, focus, credit { name, url } }, travelStyles[], bestMonths[1-12], suggestedDays { min, max }, dailyTotalMinor, currency ("USD"), budgetBand`.

### `GET /destinations/facets`
`200 { styles: [{ value, count, cover: { name, slug, image } | null }], regions: [{ value, count }], total }` — counts of published destinations.

### `GET /destinations/:slug`
`200 DestinationCard + { description[], gallery[], seasonNote, costs { currency, perPersonPerDayMinor { accommodation, food, transport, activities, miscellaneous }, assumptions }, highlights [{ title, body }], tips[], related: DestinationCard[3] }`. 404 if missing or unpublished; 400 for a malformed slug.

## Auth

| Method | Path | Body | Success | Notes |
| --- | --- | --- | --- | --- |
| GET | `/auth/csrf` | — | `{ csrfToken }` | Creates a session if needed |
| POST | `/auth/register` | `{ displayName ≤60, email, password 10–128 }` | 201 `{ user, csrfToken }` | 409 `EMAIL_UNAVAILABLE`; rate limited |
| POST | `/auth/login` | `{ email, password }` | 200 `{ user, csrfToken }` | 401 generic; failed attempts rate limited |
| POST | `/auth/logout` | — | 200 `{ signedOut: true }` | Destroys the server session, clears cookie |
| GET | `/auth/me` | — | 200 `User` or `null` | |

Login and register regenerate the session ID and return a new CSRF token.
`User`: `id, displayName, email, preferences { currency, dateFormat, theme, reducedMotion }, createdAt`. Never includes the password hash.

### `PATCH /users/me` (auth)
Body: `{ displayName?, preferences?: { currency?, dateFormat?: "d MMM yyyy" | "MMM d, yyyy" | "yyyy-MM-dd", theme?: "system"|"light"|"dark", reducedMotion?: "system"|"reduce"|"full" } }`. Email and password cannot be changed here. 200 `User`.

## Trips (auth, owner only)

A trip that does not exist **or belongs to another user** returns 404.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/trips?page&limit≤50` | — | 200 `TripSummary[]` + meta, sorted by start date |
| POST | `/trips` | `TripInput` | 201 `Trip` |
| GET | `/trips/:tripId` | — | 200 `Trip` |
| PATCH | `/trips/:tripId` | partial `TripInput` | 200 `Trip` |
| DELETE | `/trips/:tripId` | — | 204 |
| POST | `/trips/:tripId/days/:dayId/activities` | `ActivityInput` | 201 `Trip` |
| PATCH | `/trips/:tripId/days/:dayId/activities/:activityId` | partial `ActivityInput` | 200 `Trip` |
| DELETE | `/trips/:tripId/days/:dayId/activities/:activityId` | — | 200 `Trip` |
| PATCH | `/trips/:tripId/itinerary/reorder` | `{ days: [{ dayId, activityIds[] }] }` | 200 `Trip` |
| GET | `/trips/:tripId/export.csv` | — | 200 `text/csv` attachment |

`TripInput`: `title ≤120, destinationIds ≤8 (published, unique), startDate, endDate (start ≤ end, ≤ 60 days), travelerCount 1–20, currency (INR, USD, EUR, GBP, JPY, AUD, CAD, SGD, AED), budgetTargetMinor ≥0, notes ≤2000`.
`ActivityInput`: `title ≤120, category (transport|accommodation|food|activities|miscellaneous), time "HH:MM" | null, location ≤120, notes ≤1000, estimatedCostMinor ≥0` (cost is for the whole party).

- Creating a trip creates one itinerary day per date.
- Changing dates: if the length is unchanged, days shift with their activities; otherwise days are matched by date, and removing a day that still has activities returns **409** with a message.
- Reorder: the listed days must contain exactly the activities they currently hold between them (moves between listed days are allowed; drops, duplicates or unknown IDs return 409).
- Optimistic concurrency: a write based on a stale version returns 409.

`Trip`: `TripSummary + days: [{ id, date, dayNumber, activities: [{ id, title, category, time, location, notes, estimatedCostMinor, order }] }]`.
`TripSummary`: `id, title, destinations [{ id, slug, name, country, heroImage }], startDate, endDate, dayCount, travelerCount, currency, budgetTargetMinor, notes, budget, createdAt, updatedAt`.
`budget` (computed on the server): `byCategory, byDay [{ dayId, totalMinor }], totalMinor, perPersonMinor (rounded half up), targetMinor, remainingMinor (negative when over), usedBasisPoints | null, activityCount`.

CSV: header rows (trip, dates, travellers, currency, "planning estimates only" note), one row per activity (or "No activities planned"), then the budget summary. Formula-leading cells are prefixed with `'`.

## Saved places (auth)

| Method | Path | Success |
| --- | --- | --- |
| GET | `/saved` | 200 `[{ savedAt, destination: DestinationCard }]`, newest first; unpublished destinations are omitted |
| POST | `/saved/:destinationId` | 201 created, 200 if already saved (idempotent); 404 if not a published destination |
| DELETE | `/saved/:destinationId` | 204 (idempotent) |

## Rate limits

Per client IP and window (`RATE_LIMIT_WINDOW_MINUTES`, default 15): failed logins 10, registrations 5, all API requests 600, CSV exports 60. Exceeding returns 429 `RATE_LIMITED` with `RateLimit` headers.
