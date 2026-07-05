# Minnekart — Product Requirements Document

## Problem Statement

Travel memories scatter across camera rolls, chat threads, and fading
recollection. Minnekart ("memory map" in Norwegian) is a personal travel
memory site: an interactive globe where every pin is a place you've stood,
opening into the story, dates, and photographs of that visit — a memory
palace you can spin.

It starts as the owner's personal site but is built multi-user from day
one so invited friends and family can keep their own globes.

## Goals

- A beautiful, interactive globe of pinned place-visits per user.
- Each pin opens a rich trip page: story, highlight quote, dates, photos.
- Gallery and timeline views across all of a user's memories.
- Private by default, with deliberate, revocable sharing.
- Runs at $0/month on free tiers, owner-operated, minimal moving parts.

## Non-Goals (for now — revisit later)

- Open public signup (invite-only first; architecture allows opening up).
- Multi-stop journey grouping (pin = one place-visit; grouping layer can
  be added later without schema pain).
- Original-resolution photo archival (web-optimised only; `original_key`
  reserved in schema for a future opt-in).
- Social features (comments, likes, follows), mobile apps, i18n.
- Custom domain (stay on `minnekart.vercel.app`; drop-in later — all URLs
  from env config, email behind one abstraction).

## Users

- **Owner** (Hein): admin role — manages invites, has own globe.
- **Members**: invited friends & family with their own private globes.
- **Visitors**: see the marketing home with a demo globe; can view
  content explicitly shared with them via links.

## Design Reference

Claude Design project "Atlas Travel Site" (`Atlas Travel Site.dc.html`).
Visual language: cream/forest-green palette, Playfair Display + DM Sans,
card style, responsive bottom nav. The design is in progress — ideas and
features stay the same.

Design update (2026-07-03): branding is now Minnekart in the design
itself — two-tone wordmark ("Minne" forest green, "kart" accent). The
logged-out surface was reduced: nav links (desktop, mobile bottom nav,
footer) render only when logged in, the sign-in gate cards for Timeline
and Gallery were removed (those views are logged-in only now), and a
wordmark block sits above the logged-out sign-in card. Signing out
returns to the logged-out home.

The design contains no editing screens; all CRUD UI (below) is designed
by us in the same visual language.

## Features

### F1 — Home / Globe

- D3 orthographic SVG globe (topojson world atlas): drag to spin,
  scroll to zoom, clickable pins.
- **Logged out:** marketing hero, inline sign-in/sign-up card (with
  wordmark above it), product stats band, "how it works" cards. Globe
  shows a **canned demo dataset** (fictional trips from a bundled JSON
  file — also used as dev seed data); clicking a pin opens a read-only
  sample trip. Per the updated design, nav links are hidden when
  logged out — this page (plus shared/public links) is the whole
  visitor surface.
- **Logged in:** user's own pins on the globe, pins list beside it,
  highlight card, personal stats band (countries, cities, photos,
  years — computed from their data).
- _Shipped Phase 6:_ the globe (full-bleed layout), logged-out home,
  inline auth card, and the logged-in home (own pins, places list,
  highlight peek, stats, empty state, top/bottom nav + sign-out). The
  Add/Edit trip form and photo UI follow in Phase 7.

### F2 — Memory (trip) CRUD _(not in design — we design it)_

- Pin = **one place-visit**: place name, country, lat/lng, date or date
  range, highlight quote, story text, photos.
- Location set via **geocoding search** (Nominatim/Photon, free):
  type a place, pick a suggestion, name/country/coords autofill.
- Create, edit, delete. Multiple pins at the same location are fine
  (e.g. Tokyo three times = three pins).
- Built backend-first: the trips API and geocoding proxy ship in
  Phase 4 (ownership-scoped, verified-session gated); the Add/Edit
  form UI that consumes them ships with the globe/auth chrome in
  Phase 6/7.

### F3 — Photos

- Browser uploads go **directly to R2 via presigned PUT URLs** (never
  through Vercel functions — avoids the 4.5MB body limit).
- **Client-side processing before upload:** resize to ~2560px WebP
  display version + small thumbnail; HEIC converted in-browser; EXIF
  stripped (capture date read into the DB first).
- **Web-optimised only** stored for now; `original_key` column exists,
  null until an opt-in originals feature is wanted.
- **Private bucket + short-lived signed GET URLs (~1h)** for all image
  reads, owners and share pages alike: un-sharing a trip genuinely
  revokes access within the hour.
- Built backend-first (Phase 5): storage sits behind an `ObjectStorage`
  port with an R2 adapter and an in-memory adapter, so the presign +
  photo-records APIs are fully tested without R2 credentials
  (`STORAGE_DRIVER` selects). Real R2 bucket creation is a user action;
  the client-side processing + upload UI ship in Phase 7.

### F4 — Gallery

- Masonry photo grid across all the user's memories; filter chips
  (All + per-country; year filters later if wanted). Logged-in-only
  route — logged-out visitors are redirected to home (design update
  removed the sign-in gate card).

### F5 — Timeline

- Chronological list of memories, newest first, year markers.
  Logged-in-only route — logged-out visitors are redirected to home
  (design update removed the sign-in gate card).

### F6 — Trip detail

- Story paragraphs, highlight quote, details sidebar (destination,
  country, dates, photo count), photo grid, back-to-globe.

### F7 — Auth (hand-rolled, Hundo-style)

- Email + password signup **gated by a valid invite link**.
- **6-digit email OTP verification** after signup (kept even though
  invite-only: proves reset emails can reach the user; UI is designed;
  ready for open signup later).
- Login / logout; forgot password → emailed reset link → new password.
- **DB-backed sessions**: random session token in an httpOnly cookie,
  sessions table in Postgres — instantly revocable, reset kills other
  sessions.
- Sign-out returns the user to the logged-out home (globe page, login
  card) per the updated design.
- Security requirements (explicit, not afterthoughts):
  - Passwords hashed with argon2 (or bcrypt).
  - OTP/reset tokens stored **hashed**, single-use, short expiry
    (OTP ~10 min, reset ~30 min), attempt-limited.
  - Resend throttling and per-IP/per-account rate limiting on all auth
    endpoints (DB-backed counters — no Redis dependency).
  - Auth overlay UI per the design (login, signup, verify, verified,
    forgot, sent, reset, done states). _Phase 6 shipped the inline
    login/signup/forgot card and the email-verify (OTP) screen for
    logged-in-but-unverified sessions._

### F8 — Sharing & visibility

- Everything **private by default**.
- Per-trip share: unguessable token URL `/t/<token>`; revocable.
- Opt-in public globe page: `/u/<username>` (username chosen at
  signup) showing only that user's public trips.
- Public pages are SSR'd with Open Graph tags for link previews.

### F9 — Admin invites

- Owner-only `/admin` page: generate one-time invite links with
  expiry, see used/unused, revoke unused. Signup requires a valid
  invite token.

### F10 — About + chrome

- Static About page (Minnekart's story + maker), design's warm tone.
- Two-tone Minnekart wordmark ("Minne" forest, "kart" accent) in nav,
  auth panel, and footer per the updated design.
- Responsive layout; mobile bottom nav per design; footer. Nav links
  (desktop, bottom nav, footer) render only for logged-in users.

## System Design

### Topology

```
Browser ── minnekart.vercel.app (Next.js: UI + API route handlers)
              │                         │
              ▼                         ▼
       Neon Postgres (free)     Cloudflare R2 (photos, private)
                                  ▲ presigned PUT (upload)
Browser ──────────────────────────┘ signed GET (~1h) for display

OCI box (Tailscale-only, zero open ports):
  cron → pg_dump from Neon → local backups. Not in the request path.
```

### Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js (App Router) + TypeScript, single codebase |
| Hosting    | Vercel free tier (auto-deploy from `main`)         |
| Database   | Neon serverless Postgres (free tier, pooled TLS)   |
| Data layer | Drizzle ORM + drizzle-kit migrations               |
| Photos     | Cloudflare R2 free tier (10GB), S3 API, presigned  |
| Auth       | Hand-rolled: DB sessions, argon2, OTP, invites     |
| Email      | Abstracted `sendEmail()`; provider chosen at       |
|            | implementation (Brevo / Gmail SMTP candidates);    |
|            | console output in dev                              |
| Geocoding  | Nominatim or Photon (free, rate-limited)           |
| Globe      | D3 + topojson-client, orthographic SVG projection  |
| Testing    | Vitest, integration-first                          |

### Data model (initial)

- `users` — id, email, username, name, password_hash,
  email_verified_at, role (owner/member), globe_public, created_at.
- `sessions` — token_hash, user_id, expires_at, created_at.
- `auth_tokens` — user_id, type (verify_otp/reset), token_hash,
  expires_at, consumed_at, attempts.
- `invites` — token_hash, created_by, note/email, expires_at,
  used_by, used_at, revoked_at.
- `trips` — id, user_id, place_name, country, lat, lng, date_start,
  date_end (nullable), highlight, story, is_public, share_token
  (nullable until shared), created_at, updated_at.
- `photos` — id, trip_id, user_id, display_key, thumb_key,
  original_key (nullable, reserved), width, height, taken_at
  (nullable), position, created_at.
- `rate_limits` — key, window_start, count (DB-backed throttling).

### Key decisions & rationale (from grilling, 2026-07-02)

1. **Personal-first, multi-user-capable** — friends & family use it,
   so real auth from day one; data model has user ownership
   throughout.
2. **Invite-only signup** — skips bot/abuse tooling; open signup is a
   config change later.
3. **Private + shareable links** — matches the design's privacy gates
   while allowing "here's my atlas".
4. **Vercel + Neon + R2, OCI box out of the request path** — the box
   is Tailscale-only with zero open ports (Hundo uses Tailscale
   Funnel for HTTP; unsuitable for runtime Postgres traffic). Neon
   keeps that posture intact; DB is tiny since photos live on R2.
5. **Hand-rolled auth over libraries** — owner preference, pattern
   known from Hundo; DB sessions chosen over stateless JWT for
   revocation (kick users, reset kills sessions).
6. **Web-optimised photos only** — 10GB free ≈ tens of thousands of
   photos at ~300–500KB; the photo library remains the archive.
7. **Signed URLs everywhere** — honours "your photos are private"
   for real; revocation actually revokes.
8. **No custom domain yet** — vercel.app URLs; consequence: email
   sender is a verified personal address (deliverability mitigated
   with generous resend + long OTP expiry); domain is a drop-in
   upgrade later.
9. **Vercel + Neon reaffirmed over all-Cloudflare (2026-07-03)** —
   considered Workers (OpenNext) + D1 + R2. Rejected because: Workers
   free tier's ~10ms CPU cap conflicts with argon2 hashing in our
   hand-rolled auth (workaround weakens hashing or costs $5/mo); D1
   has batch-only (no interactive) transactions, which the auth flows
   rely on; Next.js on Workers depends on a community adapter with
   feature lag. Cloudflare remains scoped to R2, so either side stays
   independently swappable. Revisit only if Neon cold starts become a
   real annoyance.

## Deployment & CI/CD

- **Vercel** auto-deploys `main` (and preview deploys for PRs) via
  GitHub integration.
- **GitHub Actions** on push/PR: lint → typecheck → Vitest suite
  against a throwaway `postgres:16` service container (Hundo
  pattern).
- **Migrations**: drizzle-kit migration step against Neon runs in the
  Actions pipeline on `main`. Vercel's deploy starts in parallel (the
  Git integration can't be gated without losing auto-deploy), so
  migrations must stay additive/backwards-compatible.
- **Backups**: cron on the OCI box runs scheduled `pg_dump` against
  Neon over TLS; box needs no inbound access. R2 photo backup to box
  via rclone optional later.
- No Docker, no Tailscale step, no SSH needed for Minnekart deploys.

## Testing

Integration-first Vitest suite (run in CI against real Postgres):

- Auth machinery: signup+invite, OTP issue/verify/expiry/attempts,
  login, session revocation, reset flow.
- Authorization: visibility rules (private/shared/public), ownership
  checks on every mutation.
- Trips/photos API: CRUD, share-token lifecycle.
- Unit tests only for genuinely tricky pure logic. No browser e2e for
  now; UI verified manually.

## Costs

$0/month: Vercel free, Neon free (0.5GB), R2 free (10GB), free
geocoding, free email tier, OCI always-free box (already owned).
Watch-items: R2 at ~10GB (pennies beyond), Neon cold starts
(~300–500ms after idle), email deliverability without a domain.

## Risks & mitigations

- **OTP/reset mail in spam** (personal sender, no domain) → resend
  button, long expiry, provider dashboard; buy domain if it bites.
- **Neon free-tier limits** → DB is metadata-only; backups on own box.
- **Nominatim rate limits** → debounced search, 1 req/s cap, Photon
  fallback.
- **Hand-rolled auth mistakes** → security requirements in F7 are
  acceptance criteria; integration tests cover the whole surface.

## Deferred / open items

- Email provider pick (at auth implementation time).
- Custom domain purchase; then DKIM-signed email via Resend/Brevo.
- Open signup + CAPTCHA/quotas; per-user public bios; journey
  grouping; originals opt-in; map fine-tune pin placement; EXIF GPS
  pin suggestions; R2→box photo backup job.
