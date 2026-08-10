# Minnekart — Post-Launch Backlog

Regroomed 8 August 2026. The parked work: items from the PRD's deferred list,
its non-goals, and follow-up notes left through the build. Nothing here is
scheduled — the numbered, ordered work lives in `progress.md`. Roughly ordered
by likely value.

## Product

- **Multi-stop journey grouping.** A pin is one place-visit; add a grouping
  layer over trips (no schema pain expected).
- **Original-resolution photo archival.** Web-optimised only today; `original_key`
  is reserved in the schema for a future opt-in.
- **Map fine-tune pin placement** — let users nudge a pin off the geocoded point.
- **Globe auto-spin as a `/settings` toggle.** The spin already follows the OS
  `prefers-reduced-motion` setting, which is the right default. A toggle would
  go further: stop the spin without changing an OS-wide setting, or keep it
  while reducing motion everywhere else. Undecided, and not free — it needs a
  `users` column beside `globe_public` and a card on `/settings`, and a new
  `users` column downs every logged-in request until Migrate Neon runs. Revisit
  once we know whether anyone wants the override.
- Social features (comments, likes, follows), mobile apps, i18n — long tail.

## Engineering follow-ups (from the build)

- **Signup validation gives no field-level feedback.** A too-short username (min
  3 chars, `usernameSchema` in `src/lib/auth/validation.ts`) or any other schema
  miss collapses into a generic `invalid_request` 400, and the signup form lets
  it through to the server without inline validation — a 2-char username just
  fails opaquely. Add client-side field validation and/or return which field
  failed (e.g. `username_too_short`) so the form can show a useful message.
