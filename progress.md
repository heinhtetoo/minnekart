# Minnekart — Project Progress

Phases build on each other; each ends with tests green and typecheck/
lint clean. See PRD.md for the decisions behind everything here.

## Phase 1 — Project Scaffolding

- [x] `git init`, `.gitignore`, first commit (repo isn't git yet)
- [x] Scaffold Next.js (App Router) + TypeScript with npm
- [x] ESLint + Prettier configured (2 spaces, single quotes, 80 cols)
- [x] Vitest set up with one smoke test
- [x] Env config module (typed, validates required vars at boot)
- [x] Drizzle + drizzle-kit wired to Postgres (local Docker for dev;
      host port 5433 — 5432 is taken by another local project)
- [x] `docker-compose.yml` for local dev Postgres
- [x] GitHub repo + Actions CI: lint → typecheck → test (with
      `postgres:16` service container)
- [x] Create Neon project; `DATABASE_URL` in Vercel + GitHub secrets
      (user action — needs Neon account)
- [x] Vercel project linked to repo, auto-deploy on `main`
      (user action — needs Vercel account)
- [x] Delete `sample_ci.yml`, `sample_app.js`, `sample_deployment.md`
      once their patterns are absorbed

## Phase 2 — Database Schema & Seed

- [x] Drizzle schema: `users`, `sessions`, `auth_tokens`, `invites`,
      `trips`, `photos`, `rate_limits` (per PRD data model)
- [x] Initial migration generated and applied (local + Neon via CI
      migrate job)
- [x] Migration step added to CI on `main` (runs in parallel with
      Vercel's deploy, so migrations stay additive)
- [x] Canned demo dataset JSON (fictional trips; photos join in
      Phase 5)
- [x] Seed script loading demo data into local dev DB

## Phase 3 — Auth

- [ ] Password hashing (argon2) + user creation
- [ ] DB-backed sessions: httpOnly cookie, create/verify/revoke,
      sliding expiry
- [ ] `sendEmail()` abstraction (console transport in dev; provider
      decision deferred to this phase)
- [ ] Signup gated by invite token (validate, consume, mark used)
- [ ] Email OTP verification: 6-digit code, hashed, 10-min expiry,
      single-use, attempt limit, resend throttle
- [ ] Login / logout
- [ ] Forgot password → hashed single-use reset token (30-min expiry)
      → reset form → revoke all other sessions
- [ ] DB-backed rate limiting on all auth endpoints (per-IP +
      per-account)
- [ ] Auth API integration tests (full flows, expiry, abuse cases)
- [ ] Pick + integrate real email provider; verified sender

## Phase 4 — Memory (Trip) CRUD

- [ ] Trips API: create/read/update/delete with ownership checks
- [ ] Geocoding search endpoint (Nominatim/Photon proxy, debounced,
      1 req/s cap, results cached)
- [ ] Add/Edit Memory form (Atlas visual language): place search
      autofill, date or range, highlight, story
- [ ] Delete with confirmation
- [ ] Integration tests: CRUD, authz, validation

## Phase 5 — Photo Pipeline

- [ ] R2 bucket (private) + API credentials; S3 client wired
- [ ] Presigned PUT endpoint (auth'd, per-trip, size/type limits)
- [ ] Client-side processing: resize → WebP display (~2560px) +
      thumbnail; HEIC conversion; EXIF strip after reading taken_at
- [ ] Upload UI: multi-select, progress, reorder, delete
- [ ] Photo records API (create after upload, position, delete —
      including R2 object cleanup)
- [ ] Signed GET URLs (~1h) minted at render for all photo reads
- [ ] Integration tests: presign authz, record lifecycle

## Phase 6 — Globe & Home

- [ ] D3 orthographic globe component: topojson world, drag to spin,
      scroll zoom, pins, click → trip
- [ ] Logged-out home: hero, demo globe (canned data), sample trip
      peek, inline sign-in/sign-up card with wordmark above it, stats
      band, how-it-works (nav links hidden when logged out)
- [ ] Logged-in home: own pins on globe, pins list, highlight card,
      personal stats (countries, cities, photos, years)

## Phase 7 — Trip Detail, Timeline, Gallery

- [ ] Trip detail page: story, highlight, details sidebar, photo grid
- [ ] Timeline page: newest first, year markers, logged-in-only
      route (redirect to home when logged out)
- [ ] Gallery page: masonry grid, filter chips (All + countries),
      lightbox view, logged-in-only route (redirect to home)

## Phase 8 — Sharing

- [ ] Per-trip share toggle → unguessable `share_token`; revoke
      regenerates/nulls token
- [ ] Public trip page `/t/<token>` (SSR + Open Graph tags)
- [ ] Username public globe `/u/<username>` (opt-in `globe_public`,
      public trips only, SSR + OG)
- [ ] Visibility integration tests (private/shared/public matrix)

## Phase 9 — Admin Invites

- [ ] Owner role gate + `/admin` page
- [ ] Generate one-time invite links with expiry; list used/unused;
      revoke unused
- [ ] Integration tests: invite lifecycle, non-owner denied

## Phase 10 — Polish & Chrome

- [ ] Static About page (Minnekart story, design's warm tone)
- [ ] Footer, responsive pass, mobile bottom nav (nav links in all
      three render only for logged-in users); two-tone Minnekart
      wordmark in nav, auth panel, footer
- [ ] Empty states (new user, no photos), error/loading states
- [ ] Accessibility pass (focus states, alt text, contrast)

## Phase 11 — Ops & Launch

- [ ] OCI box cron: scheduled `pg_dump` from Neon → local backups,
      retention policy; restore drill once
- [ ] Vercel env audit (prod vs preview), Neon/R2 quotas checked
- [ ] Invite first users; monitor email deliverability
- [ ] Post-launch backlog groomed from PRD "Deferred / open items"
