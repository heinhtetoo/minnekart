# Minnekart — Product Requirements Document

_Revised 8 August 2026. This document describes the product **as built**._
_Live at `minnekart.com`. Production signup is invite-only_
_(`OPEN_SIGNUP=false`); open signup is built, flag-gated, and proven on the_
_preview. Billing is code-complete and configured in production; live_
_checkout depends on Paddle's live-account approval._
_Build history lives in `progress.md`; the_
_commercial reasoning lives in `docs/BUSINESS.md`; operations in `docs/OPS.md`._

## Problem Statement

Travel memories scatter across camera rolls, chat threads, and fading
recollection. Minnekart ("memory map" in Norwegian) is a personal travel
memory site: an interactive globe where every pin is a place you've stood,
opening into the story, dates, and photographs of that visit — a memory
palace you can spin.

It started as the owner's personal site and is multi-user from day one, so
invited friends and family keep their own globes.

## Goals

- A beautiful, interactive globe of pinned place-visits per user.
- Each pin opens a rich trip page: story, highlight quote, dates, photos.
- Gallery and timeline views across all of a user's memories.
- Private by default, with deliberate, revocable sharing.
- Near-zero marginal cost per user on free infrastructure tiers, with a
  paid tier that funds the running costs. Owner-operated, minimal moving
  parts.

## Non-Goals (for now — revisit later)

- Multi-stop journey grouping (pin = one place-visit; grouping layer can
  be added later without schema pain).
- Original-resolution photo archival (web-optimised only; `original_key`
  reserved in schema for a future opt-in).
- Social features (comments, likes, follows), mobile apps, i18n.
- Multi-tier paid plans. One paid tier removes the cap; richer tiers are a
  post-PMF decision that needs usage data (`docs/BUSINESS.md` §3.1).
- Analytics of any kind that runs script in the browser. The published
  privacy promise rules it out — see F12.

## Users

- **Owner** (Hein): admin role — manages invites, has own globe.
- **Members**: invited friends and family with their own private globes.
- **Visitors**: see the marketing home with a demo globe, the public
  content pages, and any content explicitly shared with them via links.

Every user also carries a **plan** (`free` or `paid`) that governs the
capacity limits in F11. Two cohorts hold `paid` with no subscription and
must never see subscription controls: founding-member buyers, and the
**grandfathered invite cohort** — migration `0002` backfilled every
pre-existing user to `paid` on the decision that the people who were here
when it was a personal project are never capped. New signups default to
`free`.

## Design Reference

Claude Design project "Atlas Travel Site" (`Atlas Travel Site.dc.html`),
plus two later imports: `Travel Globe Mobile Prototype.dc.html` and
`Atlas Travel Site - Redesign.dc.html`.

Visual language: cream/forest-green palette, **EB Garamond** + DM Sans
(the serif was Playfair Display until 5 August 2026), card style,
responsive bottom nav.

Branding is Minnekart in the design itself — two-tone wordmark ("Minne"
forest green, "kart" accent). The logged-out surface is deliberately thin:
nav links (desktop, mobile bottom nav, footer Explore column) render only
when logged in, and Timeline and Gallery are logged-in-only routes.
Signing out returns to the logged-out home.

The mobile prototype contributed the bottom nav with line icons and an
elevated centre "Add" FAB, the sticky mobile auth header on the logged-out
home, and the inset rounded stats card on small screens. The redesign
contributed the larger, photo-bearing globe pins.

The design contains no editing screens; all CRUD UI is designed by us in
the same visual language.

## Features

### F1 — Home / Globe

- D3 orthographic SVG globe (topojson world atlas): drag to spin,
  scroll **or two-finger pinch** to zoom, clickable pins.
- Palette is a value inversion — pale parchment continents on a dark
  forest sea, the same `--forest` as the stats band and footer — with a
  graticule, a warm vignette, and no atmosphere rim. Both globes read
  their palette from `src/lib/globe/world.ts` so they cannot drift.
- Pins are large enough to hold the trip's own photograph.
- **Idle auto-spin is page-scoped.** It is off under
  `prefers-reduced-motion`, and off on touch devices for any page that
  passes `spinOnTouch={false}` — today only the logged-out home, whose
  auth card sits beside the globe. The decision is the pure
  `shouldAutoSpin` in `src/lib/globe/spin.ts`. Drag-to-spin is never
  gated: a drag is motion the user asked for.
- **Logged out:** marketing hero, inline sign-in/sign-up card, product
  stats band, "how it works" cards. The globe shows a **canned demo
  dataset** (fictional trips from a bundled JSON file, also the dev seed);
  clicking a pin zooms to it.
- **Logged in:** the user's own pins, a docked inspector card above the
  pins list (empty and filled states, "Reset view" and "Open journey"),
  personal stats band, and a "Featured journeys" row driven by
  `trips.is_featured`.

### F2 — Memory (trip) CRUD

- Pin = **one place-visit**: place name, country, lat/lng, date or date
  range, highlight quote, story text, photos.
- Location set via **geocoding search** (Nominatim, free, debounced),
  by **EXIF GPS from a photo**, or by accepting the reverse-geocoded
  place the photo suggests.
- "Start from a photo" on `/trip/new` reads a photo once, shows a
  downscaled preview thumbnail, and prefills date and place. Typed
  values always win over photo-derived ones; the provenance rules live in
  the pure reducer `src/components/trips/seed-fields.ts`.
- A non-interactive 112px `MiniGlobe` sits beside the pin row so "pin set"
  shows _where_. It is a pure function of lat/lng — no effects, no refs —
  so it cannot drift from the coordinates.
- Create, edit, delete. Multiple pins at the same location are fine
  (Tokyo three times = three pins).

### F3 — Photos

- Browser uploads go **directly to R2 via presigned PUT URLs** (never
  through Vercel functions — avoids the 4.5MB body limit).
- **Client-side processing before upload:** resize to ~2560px display
  version + small thumbnail; HEIC converted in-browser; EXIF stripped by
  the re-encode (capture date and GPS read into the DB first).
- **WebP with a JPEG fallback.** Only Chromium honours
  `canvas.toBlob(..., 'image/webp', q)`; Safari and Firefox silently
  return PNG and ignore the quality argument, which inflated uploads ~2x
  until it was caught. The encoder checks the blob's _actual_ type and
  re-encodes as JPEG when the browser lied; the content type is threaded
  through presign, object key, PUT header and the record route's check.
- **Web-optimised only** stored; `original_key` exists, null until an
  opt-in originals feature is wanted.
- **Private bucket + short-lived signed GET URLs (~1h)** for all image
  reads, owners and share pages alike: un-sharing a trip genuinely
  revokes access within the hour.
- **Reorder** by drag-and-drop on the trip edit page — free for every
  plan, since the paywall is capacity-based by decision. The server takes
  the full ordered ID list and rejects anything that is not exactly the
  trip's photo set; deletion re-packs positions.
- Storage sits behind an `ObjectStorage` port with `r2` and `memory`
  adapters (`STORAGE_DRIVER` selects), so the presign and photo-record
  APIs are fully tested without R2 credentials.

### F4 — Gallery

- Masonry photo grid across all the user's memories; country filter chips
  derived from a distinct query, not from what happens to be loaded.
  Accepts `?country=` deep links (validated against the user's real
  country list). Pages at 25 photos. Logged-in-only route.

### F5 — Timeline

- Chronological list of memories, newest first, year markers.
  Logged-in-only route.

### F6 — Trip detail

- Story paragraphs, highlight quote, details sidebar (destination,
  country, dates, photo count), photo grid with lightbox, and a "View
  full gallery" primary that deep-links to the trip's country. Edit is an
  owner-only link — public views never render it.

### F7 — Auth (hand-rolled)

- Email + password signup. **Invite-gated by default**; when
  `OPEN_SIGNUP=true` the invite becomes optional (still validated and
  consumed when present, so the admin invite page keeps working).
- **Cloudflare Turnstile** gates signup whenever `TURNSTILE_SECRET_KEY` is
  set — note it keys off that variable, **not** `OPEN_SIGNUP`, and runs
  before the invite lookup, so a half-set key pair fails every signup
  closed. Fail-closed by design.
- **Signup quotas:** 5/hour and 20/day per IP, plus a global 100/day
  kill-valve, on top of email OTP.
- **6-digit email OTP verification** after signup.
- Login / logout; forgot password to emailed reset link to new password.
- **DB-backed sessions**: random session token in an httpOnly cookie,
  stored only as a hash — instantly revocable, and a reset kills other
  sessions.
- **Outbound email via the Resend HTTP API** (`EMAIL_TRANSPORT=resend`),
  chosen over SMTP because the OTP send blocks a user's signup and SMTP
  pays a TLS handshake plus round trips on every cold invocation. A
  non-2xx response **throws** rather than resolving quietly. Sending
  domain is the subdomain `send.minnekart.com` with SPF/DKIM/DMARC, so
  bulk sending cannot damage the root domain's reputation; every message
  carries `Reply-To: $SUPPORT_EMAIL` because that subdomain has no inbox.
  `console`, `memory` and provider-agnostic `smtp` transports remain.
- Security requirements (acceptance criteria, not afterthoughts):
  - Passwords hashed with argon2id.
  - OTP/reset tokens stored **hashed**, single-use, short expiry
    (OTP ~10 min, reset ~30 min), attempt-limited.
  - Resend throttling and per-IP/per-account rate limiting on all auth
    endpoints (DB-backed counters — no Redis dependency).

### F8 — Sharing & visibility

- Everything **private by default**.
- Per-trip share: unguessable token URL `/t/<token>`; revocable.
- Opt-in public globe page: `/u/<username>` (username chosen at signup)
  showing only that user's public trips, with its own peek panel and a
  sign-up hook for signed-out viewers.
- Public pages are SSR'd with branded 1200x630 Open Graph cards rendered
  by `ImageResponse` (`src/lib/og/`): a photo card for trips, a stats card
  for a globe, and a site-wide brand card default. Photos are re-encoded
  to JPEG via `sharp` first — satori cannot embed WebP data URIs.
  Visibility is enforced by the tested helpers in `src/lib/trips/sharing.ts`:
  private trips, unknown users and revoked tokens all 404.
- **`robots.txt` must not disallow `/t/`.** Link-preview crawlers obey
  robots.txt, so disallowing it silently killed every share-link preview,
  and `Disallow` does not reliably prevent indexing anyway. Indexing is
  prevented per-page with `robots: { index: false, follow: false }`;
  secrecy comes from the unguessable token and revocation. A regression
  test on `robots.ts` pins this, with the reason inline.

### F9 — Admin invites

- Owner-only `/admin` page: generate one-time invite links with expiry,
  see used/unused, revoke unused. Also the owner-only route for deleting
  a member's account on an emailed request.

### F10 — About + chrome

- `/about` is the **company** page — product story, privacy stance,
  funding, and business identity from env config.
- Responsive layout; mobile bottom nav with a centre "Add" FAB; footer
  with a brand block plus Explore and Company columns, and an
  always-visible legal row. Explore is logged-in and desktop-only, since
  the bottom nav covers it on mobile.
- All text colours meet WCAG AA (4.5:1). The palette itself was moved to
  clear the bar rather than patching sites: `--muted` and `--accent` each
  dropped ~7.6% in lightness with hue and saturation kept.

### F11 — Billing & plans

- **Paddle as Merchant of Record.** Paddle is the legal seller and remits
  VAT/GST, which is the point: the target user is scattered across tax
  jurisdictions, and raw Stripe would create filing obligations that are
  unsafe for a solo operator. This is the one part of the stack to buy.
- Overlay checkout from the `/settings` Billing card via
  `@paddle/paddle-js`: annual primary, monthly secondary, founding-member
  gated on `PADDLE_PRICE_LIFETIME` so retiring the offer is an env change.
  The whole card hides when Paddle env is absent.
- `POST /api/webhooks/paddle` is the single source of truth for plan
  state: raw-body HMAC-SHA256 verification with a 60s timestamp
  tolerance, `webhook_events` insert-or-skip dedupe, then `subscription.*`
  handled off `data.status` — `active`/`trialing` to paid, `past_due`
  **stays paid** because Paddle dunning is the grace period,
  `paused`/`canceled` to free. `transaction.completed` grants lifetime
  paid when the items include the lifetime price. Unmatched events are
  acked 200 to avoid retry storms.
- **In-app cancel, resume and update-card**, so cancelling is as easy as
  subscribing. The subscription id is read from the logged-in user's row,
  never from the request body. Cancellation is always
  `next_billing_period`, never immediate, because `/terms` promises the
  paid period is honoured. Renewal and end dates are stored from webhook
  payloads and formatted server-side, so `/settings` renders with no API
  call.
- **Capacity limits** (`src/lib/billing/limits.ts`), enforced server-side
  in the API routes off `guard.user.plan`:

  | Limit              | Free | Paid                 |
  | ------------------ | ---- | -------------------- |
  | Trips (memories)   | 15   | Unlimited            |
  | Photos per trip    | 6    | 50                   |
  | Photos per account | 90   | 5,000 (unadvertised) |

  The paid ceiling is an abuse valve, not a marketed number. Clients
  surface the limits honestly — the photo counter reads `n / 6` on free,
  and hitting the trip cap names the upgrade path.

- Prices, the reasoning behind them, and the founding-member offer's
  expiry live in `docs/BUSINESS.md` §3 — deliberately not duplicated here.

### F12 — Marketing, legal & content

- `/pricing`, `/terms`, `/privacy`, `/refunds` on a shared `ContentPage`
  shell, linked from the footer legal row. Paddle requires all four before
  it approves a live account.
- `/guides` hub plus evergreen articles (`/guides/private-travel-map`,
  `/guides/polarsteps-alternative`), `sitemap.ts` and `robots.ts`.
- **Business identity is configuration, not content.** The repo is public,
  so `LEGAL_ENTITY_NAME`, `LEGAL_ENTITY_ABN` and `SUPPORT_EMAIL` come from
  env (`src/lib/legal.ts`) and never enter git history. `SUPPORT_EMAIL` is
  **required** — a deploy without it fails the build, because a silently
  missing support address is worse than a loud failure.
- Pricing copy reads the real limits from `limits.ts`, and every claim on
  the policy pages is grounded in the code: EXIF stripped by the
  browser-side re-encode, one essential cookie, Paddle as merchant of
  record, and the current sub-processor list.
- **"No analytics" is a published commitment**, stated in six places. It
  is a product constraint on everything downstream: any measurement must
  come from the app's own database or from search-console-style data, not
  from a script in the browser.

### F13 — Account & profile

- `/profile` is the person — name, tagline, headline, bio, and stats
  beside their globe. Logged-in only. A logged-out visitor to `/about`
  sees the company page; there is no public profile except `/u/<username>`.
- All four profile fields are editable from `/settings`, per user. The
  profile card photo is chosen from the user's **own photo library**
  through a paged picker (25 per page).
- Globe-public toggle lives in `/settings`.
- **Self-serve account deletion** in a Danger Zone card, gated on typing
  the username _and_ re-entering the password. It is a **hard delete**:
  indefinite retention would contradict the privacy brand and the
  published promise, so friction is the accident guard instead. One shared
  service (`src/lib/account/delete.ts`) backs both the self-serve and
  owner-admin routes so they cannot drift; R2 keys are captured before the
  DB cascade, and any Paddle subscription is cancelled **immediately** so
  billing stops with the account. Neither route can delete the owner.

## System Design

### Topology

```
Browser ── minnekart.com (Next.js: UI + API route handlers, on Vercel)
              │            │              │
              ▼            ▼              ▼
   Neon Postgres    Cloudflare R2    Paddle (checkout + webhooks)
     (free tier)    (photos, private)
                      ▲ presigned PUT (upload)
Browser ──────────────┘ signed GET (~1h) for display

Resend ── transactional email from send.minnekart.com

OCI box (Tailscale-only, zero open ports):
  cron → pg_dump from Neon → local backups
  cron → rclone sync R2 → local mirror + dated archive
  Not in the request path.
```

### Stack

| Layer      | Choice                                               |
| ---------- | ---------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19, TypeScript strict |
| Hosting    | Vercel free tier                                     |
| Database   | Neon serverless Postgres (free tier, pooled TLS)     |
| Data layer | Drizzle ORM + drizzle-kit migrations                 |
| Photos     | Cloudflare R2 free tier (10GB), S3 API, presigned    |
| Auth       | Hand-rolled: DB sessions, argon2id, OTP, invites     |
| Bot gate   | Cloudflare Turnstile on signup                       |
| Billing    | Paddle (Merchant of Record) + signed webhooks        |
| Email      | Abstracted `sendEmail()`; Resend HTTP API in prod,   |
|            | SMTP transport as escape hatch, console in dev       |
| Geocoding  | Nominatim (free, rate-limited, debounced)            |
| Globe      | D3 + topojson-client, orthographic SVG projection    |
| Images     | `sharp` server-side (OG cards); Canvas in-browser    |
| UI         | CSS Modules, `@dnd-kit` for reorder, zod validation  |
| Testing    | Vitest, integration-first against real Postgres      |

### Environments

Two long-lived branches, each a real environment:

- **`main` → production** (`minnekart.com`): production Neon database, the
  `minnekart` R2 bucket, live Paddle, Resend.
- **`dev` → preview**: its own Neon branch, its own R2 bucket
  (`minnekart-dev`), Paddle sandbox, and `EMAIL_TRANSPORT=console` so OTPs
  land in the Vercel logs instead of real inboxes.

`vercel.json` pins `git.deploymentEnabled` to those two branches only.
That is what gives the preview a **stable alias** for the R2 CORS policy,
the Turnstile hostnames, the Paddle sandbox webhook and `APP_URL` to be
configured against — a feature branch's URL changes every push, so those
deploys would be half-broken by construction. Flow is
`feature → dev → PR → main`.

**The landmine is Vercel's env-var scoping**, which ticks every
environment by default: a Preview `DATABASE_URL` left pointing at
production would have `dev` deploys writing to real data and CI applying
unreleased migrations to it. The audit checklist is in `docs/OPS.md`.

### Data model

Seven migrations, `0000`–`0006`, all in `drizzle/`. Schema of record is
`src/db/schema.ts`.

- `users` — id, email, username, name, **tagline, headline, bio**,
  password_hash, email_verified_at, role (owner/member), globe_public,
  **plan** (`free`/`paid`), **subscription_status** (null for free and for
  non-subscription paid), **paddle_customer_id**,
  **paddle_subscription_id**, **subscription_renews_at**,
  **subscription_ends_at**, **profile_photo_id**, created_at.
- `sessions` — token_hash, user_id, expires_at, created_at.
- `auth_tokens` — user_id, type (verify_otp/reset), token_hash,
  expires_at, consumed_at, attempts.
- `invites` — token_hash, created_by, note, expires_at, used_by (set null
  on user delete), used_at, revoked_at.
- `trips` — id, user_id, place_name, country, lat, lng, date_start,
  date_end (nullable), highlight, story, is_public, **is_featured**,
  share_token (nullable until shared), created_at, updated_at.
- `photos` — id, trip_id, user_id, display_key, thumb_key, original_key
  (nullable, reserved), width, height, taken_at (nullable), position,
  created_at.
- `webhook_events` — event_id (unique), event_type, received_at. Webhook
  idempotency.
- `rate_limits` — key, window_start, count (DB-backed throttling).

### Key decisions & rationale

From the original grilling, 2026-07-02:

1. **Personal-first, multi-user-capable** — friends and family use it, so
   real auth from day one; user ownership runs through the data model.
2. **Invite-only signup** — skips bot/abuse tooling; opening up is a
   config change (and now is one — see 13).
3. **Private + shareable links** — matches the design's privacy gates
   while allowing "here's my atlas".
4. **Vercel + Neon + R2, OCI box out of the request path** — the box is
   Tailscale-only with zero open ports. Neon keeps that posture intact;
   the DB is tiny since photos live on R2.
5. **Hand-rolled auth over libraries** — owner preference; DB sessions
   over stateless JWT for revocation.
6. **Web-optimised photos only** — 10GB free is tens of thousands of
   photos; the user's photo library remains the archive.
7. **Signed URLs everywhere** — honours "your photos are private" for
   real; revocation actually revokes.
8. ~~No custom domain yet~~ — **reversed 13 July 2026, see 10.**
9. **Vercel + Neon reaffirmed over all-Cloudflare (2026-07-03)** —
   Workers' free-tier ~10ms CPU cap conflicts with argon2 hashing; D1 has
   batch-only transactions, which the auth flows rely on; Next.js on
   Workers depends on a community adapter with feature lag. Cloudflare
   stays scoped to R2 (and Turnstile), so either side is swappable.

Since:

10. **Domain first, before checkout (13 July 2026).** `minnekart.com`,
    apex primary with `www` 308-redirecting and `APP_URL` matching.
    Checkout under a `vercel.app` URL costs trust at the worst possible
    moment, OTP deliverability improves, and the SEO clock only starts
    once the domain exists — ranking on `vercel.app` and migrating later
    throws the equity away.
11. **Paddle over Stripe (July 2026)** — buying out a legal liability,
    not a technical one. See F11.
12. **Resend over SMTP (July 2026)** — the OTP send is inside the request
    that blocks a signup; SMTP's handshake on every cold invocation is a
    latency tax on the most fragile moment in the funnel.
13. **Open signup behind a flag (14 July 2026)** — `OPEN_SIGNUP` decouples
    the deploy from the launch moment. Flag off preserves invite-only
    exactly, and the whole path is proven on the preview, so launching is
    one environment variable.
14. **The invite cohort is grandfathered (July 2026)** — backfilled to
    `paid`, never capped. The founding-member offer stays voluntary
    support, not a ransom.
15. **Hard delete, not soft delete (July 2026)** — indefinite retention
    would contradict the privacy brand, the published promise, and
    APP/GDPR erasure. Friction guards against accidents instead.
16. **A real preview environment (July 2026)** — `main`/`dev` split, so a
    schema change or a half-finished feature has somewhere to run against
    real infrastructure. See Environments.

## Deployment & CI/CD

- **Vercel** deploys `main` to production and `dev` to the preview alias;
  no other branch deploys.
- **GitHub Actions** on push/PR to both branches: format, lint, typecheck,
  then the Vitest suite against a throwaway `postgres:16` service
  container.
- **Migrations**: drizzle-kit migrates whichever database matches the ref
  — `DATABASE_URL` on `main`, `DATABASE_URL_DEV` on `dev`.
- **Migrations must stay additive and backwards-compatible.** Vercel's
  deploy starts in parallel with the Actions run (the Git integration
  cannot be gated without losing auto-deploy), so new code can reach
  production before the column it needs exists. Two operational
  consequences, both learnt the hard way:
  - a `users` column that Vercel serves before Neon has it takes down
    **every authenticated request**, not just the new feature;
  - a **cancelled** CI check silently skips the migrate step, so the
    deploy lands without its migration and nothing says so.
- **Backups** on the OCI box, neither in the request path: `pg_dump` over
  TLS for Neon, and an `rclone` mirror of R2 — `current/` an exact mirror
  plus `archive/<ts>/` for anything a sync would delete or replace, pruned
  after `RETENTION_DAYS`. That gives a deletion-recovery window, bounded
  on disk.
- No Docker, no Tailscale step, no SSH needed for Minnekart deploys.

## Testing

Integration-first Vitest suite, ~400 tests run in CI against real
Postgres:

- Auth machinery: signup + invite, open-mode signup, captcha, OTP
  issue/verify/expiry/attempts, login, session revocation, reset flow.
- Authorization: visibility rules (private/shared/public), ownership
  checks on every mutation.
- Trips/photos API: CRUD, share-token lifecycle, ordering, plan-aware
  limit matrix including the upgrade path.
- Billing: webhook signature units, webhook handling, Paddle API client,
  subscription routes.
- Unit tests for genuinely tricky pure logic (dates, stats, sharing,
  pricing, projection, spin).

**Known gap: there are no component tests.** `vitest.config.ts` runs
`environment: 'node'` and collects only `src/**/*.test.ts`, so no `.tsx`
is ever loaded — there is no jsdom and no Testing Library. Two
consequences worth stating plainly:

- Nothing catches a missing CSS-module class, because Next types
  `*.module.css` as `{ [key: string]: string }` and a typo still
  typechecks. This has caused a real production layout bug.
- The repo's answer is to **extract the decision into a pure module beside
  the component** and test that — `src/lib/globe/spin.ts`,
  `src/components/trips/seed-fields.ts`, `src/components/home/format.ts`.
  Anything genuinely browser-shaped is verified by bundling the real
  component with esbuild and rendering it in headless Chromium.

No browser e2e; UI is verified manually on the preview, on desktop and on
real Android and iOS devices.

## Costs

Not $0/month any more, but close to it: a domain registration, Resend's
free tier for transactional mail, and Paddle's cut of revenue. Vercel,
Neon and R2 all remain on free tiers, and marginal cost per paying user is
effectively zero (fractions of a cent of storage).

Watch-items: R2 at ~10GB (pennies beyond, and the free tier is pooled
across all free accounts — infra cost now scales with free signups, not
just with the owner's own use), and Neon cold starts (~300–500ms after
idle). Full unit economics in `docs/BUSINESS.md` §3.3.

## Risks & mitigations

- **Paddle live-account approval** is a launch gate, not a code gate.
  Confirm the live account shows approved and run one real end-to-end
  checkout against production before announcing.
- **The webhook is the single source of truth for plan state.** A missed
  or unverified event means a paying user on a free plan, or the reverse.
  Mitigated by signature verification, `webhook_events` dedupe, acking
  unmatched events 200, and `past_due` deliberately staying paid.
- **Free-tier storage abuse** (using it as a free photo CDN) →
  unadvertised 5,000-photo ceiling; cost is not the real risk, abuse is.
- **Neon free-tier limits** → the DB is metadata-only; backups on our own
  box.
- **Nominatim rate limits** → debounced search, 1 req/s cap.
- **Hand-rolled auth mistakes** → the F7 security requirements are
  acceptance criteria, and integration tests cover the whole surface.
- **A migration that is not backwards-compatible** takes production down
  for every logged-in user. See Deployment.

## Deferred / open items

Tracked in `progress.md` (numbered tasks) and `BACKLOG.md` (unscheduled).

- Multi-stop journey grouping; original-resolution archival opt-in;
  fine-tune pin placement by nudging a pin off the geocoded point.
- Field-level signup validation — a schema miss currently collapses into a
  generic 400 with no indication of which field failed.
- Re-encode the legacy PNG-as-WebP objects sitting in R2 from before the
  encoder fallback (task 13).
- Feasibility study: Mapbox GL globe vs the current custom one (task 20).
- Optimise for AI answer engines and search, GEO/SEO (task 30).
- Analytics that respects the no-analytics promise — database-derived
  metrics plus Search Console (task 31).
- Globe auto-spin as a `/settings` toggle, if reduced-motion users want
  it back.
