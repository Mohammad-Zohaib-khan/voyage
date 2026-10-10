# Data model

MongoDB via Mongoose 9. `strict: 'throw'`, `strictQuery`, and `sanitizeFilter` are enabled globally.

## users
| Field | Type | Notes |
| --- | --- | --- |
| displayName | string ≤60 | |
| email | string ≤254 | trimmed, lower-cased; **unique index** |
| passwordHash | string | Argon2id; `select: false`; never serialised (responses use an explicit DTO) |
| preferences.currency | enum | default `INR` |
| preferences.dateFormat | enum | `d MMM yyyy` (default), `MMM d, yyyy`, `yyyy-MM-dd` |
| preferences.theme | enum | `system` (default), `light`, `dark` |
| preferences.reducedMotion | enum | `system` (default), `reduce`, `full` |
| createdAt, updatedAt | date | timestamps |

## destinations (editorial, seeded)
`slug` (**unique**), `name`, `country`, `region` (enum), `summary`, `description[]`, `heroImage` and `gallery[]` (`src` on images.unsplash.com, `alt`, `focus`, `credit { name, url }`), `travelStyles[]` (enum), `bestMonths[]` (1–12), `seasonNote`, `suggestedDays { min, max }`, `costs { currency: "USD", perPersonPerDayMinor { accommodation, food, transport, activities, miscellaneous }, assumptions }`, `dailyTotalMinor` (derived at seed), `budgetBand` (derived: <$120 essential, <$250 comfortable, else indulgent), `highlights[]`, `tips[]`, `featuredRank`, `published`.
Indexes: `{published, featuredRank, name}`, `{published, region}`, `{published, travelStyles}`, `{published, budgetBand}`, `{published, dailyTotalMinor}`. Only `published: true` documents are ever returned.
All costs are **illustrative**, labelled as such in the data (`assumptions`) and the UI.

## trips
| Field | Type | Notes |
| --- | --- | --- |
| userId | ObjectId | **owner, from the session only**; indexed, plus `{userId, startDate}` |
| title | string ≤120 | |
| destinationIds | ObjectId[] ≤8 | must reference published destinations |
| startDate, endDate | `YYYY-MM-DD` string | date-only, no time zone |
| travelerCount | int 1–20 | |
| currency | enum | INR, USD, EUR, GBP, JPY, AUD, CAD, SGD, AED |
| budgetTargetMinor | int ≥0 | minor units |
| notes | string ≤2000 | |
| days | embedded array ≤60 | `{ _id, date, activities[] }`, one per calendar date, ordered |
| days.activities | embedded array ≤25 | `{ _id, title, category, time "HH:MM"|null, location, notes, estimatedCostMinor }`; array position is the order |
| createdAt, updatedAt, __v | | `optimisticConcurrency: true` |

Why embedded: a trip is always read and written as a whole, ownership is checked once per document, a reorder (even across days) is a single atomic document write, and the bounds (60 × 25) keep documents small.

Status (upcoming / under way / completed) is **derived** from the dates in the viewer's local calendar, not stored.

## savedDestinations
`userId`, `destinationId`, timestamps. **Unique compound index `{userId, destinationId}`**, plus `{userId, createdAt: -1}`. Max 200 per user.

## sessions
Managed by `connect-mongo`: `_id` (session ID), `session` (userId, csrfToken), `expires` with a TTL index (`SESSION_AUTO_REMOVE=native`).

## Money strategy
Every amount is a JavaScript safe integer in the currency's minor unit (JPY exponent 0, others 2). Totals are integer sums; per-person = total ÷ travellers rounded half up in integer arithmetic; percentages are display-only. Inputs are parsed from text to minor units with string arithmetic on the client and validated as integers on the server. Single amounts are capped at 10¹¹ minor units so sums stay far below 2⁵³.

## Date strategy
Trip and day dates are stored as `YYYY-MM-DD` strings and handled as UTC midnight for arithmetic and formatting, so a date never shifts across time zones. "Today" is computed in the viewer's local calendar for status labels.
