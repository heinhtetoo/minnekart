# Minnekart — Post-Launch Backlog

Groomed at Phase 11 launch. Nothing here blocks launch; it's the parked work
from the PRD's deferred list, its non-goals, and follow-up notes left through
the build. Roughly ordered by likely value.

## Deliverability & domain

- **Custom domain + DKIM-signed email.** Buy a domain, move off
  `minnekart.vercel.app`, and verify it in Resend so mail is DKIM-signed (all
  URLs already come from `APP_URL`, email from one abstraction — drop-in).
- **R2 photo backup job.** `rclone` sync R2 → the OCI box, alongside the Neon
  `pg_dump` cron. DB backups ship in Phase 11; photos are still single-copy.

## Product

- **Multi-stop journey grouping.** A pin is one place-visit; add a grouping
  layer over trips (no schema pain expected).
- **Original-resolution photo archival.** Web-optimised only today; `original_key`
  is reserved in the schema for a future opt-in.
- **Editable per-user bio.** The `/about` page, portrait card, and real stats
  already ship; in production the bio body is a "Coming soon" placeholder. What
  remains is letting the owner edit their own name/tagline/bio (stored per user,
  then drop the `NODE_ENV` gate). Tracked in progress.md.
- **Map fine-tune pin placement** — let users nudge a pin off the geocoded point.
- **EXIF GPS pin suggestions** — prefill coordinates from photo GPS on upload.
- Social features (comments, likes, follows), mobile apps, i18n — long tail.

## Engineering follow-ups (from the build)

- **Photo reorder.** `position` is only set at upload time; photos render in
  upload order. Needs a reorder endpoint + UI (progress.md Phase 5/7).
- **Muted-text contrast → WCAG AA.** Muted text sits ~3.4:1 by design; bump to
  meet strict AA if wanted (progress.md Phase 10).
