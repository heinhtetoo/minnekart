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
- **"On this page" list for Terms and Privacy.** Both run to 9–12 sections,
  about 3,000 px on desktop and over 4,000 on phones, with no way to see the
  outline. A list of the section headings linking down the page would help.
  Noted during the redesign (task 35) and left out as a new feature.
- Social features (comments, likes, follows), mobile apps, i18n — long tail.

## Engineering follow-ups (from the build)

- **Signup validation gives no field-level feedback.** A too-short username (min
  3 chars, `usernameSchema` in `src/lib/auth/validation.ts`) or any other schema
  miss collapses into a generic `invalid_request` 400, and the signup form lets
  it through to the server without inline validation — a 2-char username just
  fails opaquely. Add client-side field validation and/or return which field
  failed (e.g. `username_too_short`) so the form can show a useful message.
- **A failed invite revoke shows nothing.** On `/admin`, if the revoke request
  fails, `InviteList.tsx` just re-enables the Revoke button: no message, and the
  row still reads Unused. Creating an invite already shows "Could not create an
  invite."; revoke should say something similar. Noted during task 35.
- **A refused clipboard copy shows nothing.** On `/admin`, Copy calls
  `navigator.clipboard.writeText` without handling a refusal, so if the browser
  blocks it the promise rejects unhandled and "Copied" never appears. The link
  stays visible in its field, so it can still be copied by hand. Catch the
  rejection and say so, or select the link text. Noted during task 35.
- **Paid members are told to upgrade on Pricing.** Signed in, the paid plans'
  buttons read "Upgrade in settings", but the page only knows whether you're
  signed in, not your plan, so someone already on Annual sees it too. Pass the
  plan through and show something like "Your plan" instead. Noted during
  task 35.
- **Unconfirmed accounts get two different headers.** Signed in with the email
  not yet confirmed, the public globe shows "My globe →", while Pricing and the
  content pages show the visitor's "Sign in / Sign up". Pick one treatment for
  unconfirmed sessions and use it everywhere. Noted during task 35.
