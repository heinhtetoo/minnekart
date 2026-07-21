# Minnekart — Post-Launch Backlog

Groomed at Phase 11 launch. Nothing here blocks launch; it's the parked work
from the PRD's deferred list, its non-goals, and follow-up notes left through
the build. Roughly ordered by likely value.

## Deliverability & domain

- **Custom domain + DKIM-signed email.** Buy a domain, move off
  `minnekart.vercel.app`, and verify it in Resend so mail is DKIM-signed (all
  URLs already come from `APP_URL`, email from one abstraction — drop-in).

## Product

- **Multi-stop journey grouping.** A pin is one place-visit; add a grouping
  layer over trips (no schema pain expected).
- **Original-resolution photo archival.** Web-optimised only today; `original_key`
  is reserved in the schema for a future opt-in.
- **Map fine-tune pin placement** — let users nudge a pin off the geocoded point.
- **EXIF GPS pin suggestions** — prefill coordinates from photo GPS on upload.
- Social features (comments, likes, follows), mobile apps, i18n — long tail.

## Engineering follow-ups (from the build)

- **Photo reorder.** `position` is only set at upload time; photos render in
  upload order. Needs a reorder endpoint + UI (progress.md Phase 5/7).
- **Muted-text contrast → WCAG AA.** Muted text sits ~3.4:1 by design; bump to
  meet strict AA if wanted (progress.md Phase 10).
- **Signup validation gives no field-level feedback.** A too-short username (min
  3 chars, `usernameSchema` in `src/lib/auth/validation.ts`) or any other schema
  miss collapses into a generic `invalid_request` 400, and the signup form lets
  it through to the server without inline validation — a 2-char username just
  fails opaquely. Add client-side field validation and/or return which field
  failed (e.g. `username_too_short`) so the form can show a useful message.
