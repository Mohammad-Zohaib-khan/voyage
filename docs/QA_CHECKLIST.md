# QA checklist

Status key: **Auto** = covered by an automated test that was run and passed; **Visual** = checked in headless Chromium screenshots in the build environment; **Manual** = to be checked by a person on real devices.

## Functionality
| Check | Status |
| --- | --- |
| Destinations: search, combined filters, sort, load more, URL sync, reset, empty state | Auto (API + client + E2E), Visual |
| Destination detail: overview, highlights, months, costs + assumptions, tips, related, 404 | Auto (API), Visual |
| Save / unsave destination; saved list; signed-out save redirects to sign-in | Auto (API + E2E) |
| Register, login, logout, session restore, generic login error | Auto (API + client + E2E) |
| Create / edit / delete trip; date validation; date-change reconciliation | Auto (API + client) |
| Add / edit / delete activity; reorder via buttons; move between days | Auto (API + client + E2E for buttons) |
| Drag-to-reorder with pointer | Manual (implemented with Motion Reorder; not automated) |
| Budget totals, per person, remaining, over-budget wording | Auto (unit + API + client + E2E) |
| Reload persists everything | Auto (API + E2E) |
| CSV export downloads and is formula-safe | Auto (API + E2E) |
| Dashboard and saved places reflect persisted data; new-user empty states | Auto (E2E for empty states), Visual |
| Settings: name, currency, date format, theme, motion persist | Auto (API), Visual |

## Responsive
| Check | Status |
| --- | --- |
| 390 px phone, 768 px tablet, 1280–1440 px desktop: no horizontal overflow on any page | Visual (automated sweep of 13 pages × 2 widths, scrollWidth check) |
| Mobile navigation drawer, filters drawer, collapsible budget, scrollable day rail | Visual |
| Real devices (iOS Safari, Android Chrome) | Manual |

## Accessibility
| Check | Status |
| --- | --- |
| Landmarks, one h1 per page, skip link moves focus to main | Auto (E2E), Visual |
| Labels and linked errors (`aria-describedby`, `aria-invalid`) on every field | Auto (client tests) |
| Icon-only buttons have names; toggles expose `aria-pressed` | Auto (client tests) |
| Keyboard alternative to drag (move earlier / later) | Auto (client + E2E) |
| Dialogs: native `<dialog>` focus trap, Escape closes, focus returns | Manual |
| Visible focus ring on every interactive element | Visual |
| Colour never sole carrier of meaning (budget states use words) | Auto (client test) |
| Contrast: text tokens chosen for ≥ 4.5:1 on their surfaces, light and dark | Manual measurement recommended |
| 200% zoom | Manual |
| Reduced motion (system and account setting) disables animations | Visual (implementation), Manual |
| Screen reader pass (VoiceOver / NVDA) | Manual |

## Security
| Check | Status |
| --- | --- |
| Unauthenticated access denied | Auto |
| User B cannot read/edit/delete/export/reorder User A's trip or see saved places | Auto (API + E2E) |
| Invalid IDs, payloads, dates, operators, unknown fields rejected | Auto |
| Login and registration rate limits | Auto |
| Production cookie flags (`__Host-`, Secure, HttpOnly, SameSite) | Auto |
| CSRF required, token bound to session | Auto |
| Unknown CORS origin rejected | Auto |
| Error responses reveal no internals | Auto |
| CSP: no violations across the journey | Auto (E2E) |
| CSV formula injection | Auto |
| No secrets in client bundle / git | Auto (grep scan) |
| Dependency audit | Run (`npm run audit:prod`) |
