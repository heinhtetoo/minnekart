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

- [x] Password hashing (argon2) + user creation
- [x] DB-backed sessions: httpOnly cookie, create/verify/revoke,
      sliding expiry
- [x] `sendEmail()` abstraction (console transport in dev; memory
      transport in tests; real provider deferred to Phase 11)
- [x] Signup gated by invite token (validate, consume, mark used)
- [x] Email OTP verification: 6-digit code, hashed, 10-min expiry,
      single-use, attempt limit, resend throttle
- [x] Login / logout
- [x] Forgot password → hashed single-use reset token (30-min expiry)
      → reset form → revoke all other sessions
- [x] DB-backed rate limiting on all auth endpoints (per-IP +
      per-account)
- [x] Auth API integration tests (full flows, expiry, abuse cases)
- [x] Owner bootstrap + one-time invite CLI scripts (admin UI is
      Phase 9)
- [ ] Pick + integrate real email provider; verified sender
      (deferred — this is the same task as Phase 11 below)

## Phase 4 — Memory (Trip) API + Geocoding (backend-only)

- [x] Trips API: create/read/update/delete with ownership checks
      (verified-session gated)
- [x] Geocoding search endpoint (Nominatim proxy, per-user rate cap,
      injectable fetch; Photon documented fallback)
- [x] Integration tests: CRUD, authz, validation
- [x] Add/Edit Memory form + delete confirmation — delivered in Phase 7
      (`TripForm.tsx`, routes `/trip/new` and `/trip/[id]/edit`; geocoding
      autofill, date/range validation, `window.confirm` delete)

## Phase 5 — Photo Pipeline (backend-only)

- [x] Object storage port + R2 adapter (S3 API) + in-memory adapter;
      `STORAGE_DRIVER` env selects (memory for dev/CI)
- [x] Presigned PUT endpoint (auth'd, per-trip ownership, webp-only,
      rate-limited)
- [x] Photo records API (create with prefix + size + count checks,
      list, delete — with object cleanup); trip delete purges objects
- [x] Signed GET URLs (~1h) minted at render for photo reads
- [x] Integration tests: presign authz, record lifecycle, cleanup
- [ ] Create real private R2 bucket + API token; set env/secrets
      (user action, ops-only — code is switch-ready via `STORAGE_DRIVER`;
      build/tests use the in-memory adapter until then. Tracked under the
      Phase 11 env audit)
- [x] Client-side processing (resize → WebP + thumbnail, HEIC, EXIF
      strip) + upload UI (multi-select, progress) — delivered in Phase 7
      (`process.ts`, `PhotoUploader.tsx`). Reorder stays deferred (no
      backend endpoint — see the Phase 7 note below)

## Phase 6 — Globe & Home

- [x] D3 orthographic globe component: topojson world, drag to spin,
      scroll zoom, pins, click → zoom-to + peek; full-bleed layout
- [x] Logged-out home: hero, demo globe (canned data), sample trip
      peek, inline sign-in/sign-up card with wordmark above it, stats
      band, how-it-works (nav links hidden when logged out)
- [x] Auth flow UI: inline login/signup/forgot card + full-screen
      email-verify (OTP) screen for logged-in-but-unverified sessions
- [x] Logged-in home: own pins on globe, pins list, highlight peek,
      personal stats (countries, years, photos); empty state for new
      users; top nav + mobile bottom nav + sign-out
- [x] Docs + final gate + commit

## Phase 7 — Trip Detail, Timeline, Gallery

- [x] Add/Edit Memory form: geocoding place search autofill, date or
      range, highlight, story; delete with confirmation (consumes the
      Phase 4 trips + geocode APIs). Routes `/trip/new`, `/trip/[id]/edit`
- [x] Photo upload UI + client-side processing (Canvas resize → WebP
      display ~2560px + thumbnail, HEIC conversion via heic2any, EXIF
      capture date via exifr then stripped); multi-select, per-file
      progress, delete (consumes the Phase 5 presign + photo-records APIs)
- [x] Trip detail page: story, highlight, details sidebar, photo grid
      + lightbox (`/trip/[id]`)
- [x] Timeline page: newest first, year markers, logged-in-only route
      (redirect to home when logged out)
- [x] Gallery page: masonry grid, filter chips (All + countries),
      lightbox view, logged-in-only route (redirect to home)
- [x] Docs + final gate + commit
- ~~Photo reorder~~ deferred — no backend endpoint (position is set at
  upload time only); photos order by upload

## Phase 8 — Sharing

- [x] Per-trip share toggle → unguessable `share_token`; revoke nulls the
      token (POST/DELETE `/api/trips/[id]/share`). Sharing UI on the trip
      edit page (`ShareCard`)
- [x] Public trip page `/t/<token>` (SSR + Open Graph tags); shared
      `TripDetailBody` view, `PublicChrome` header
- [x] Username public globe `/u/<username>` (opt-in `globe_public` via
      `/settings`, public trips only) + public detail `/u/<username>/<id>`;
      all SSR + OG. `PATCH /api/account/globe` toggles the globe
- [x] Visibility integration tests (private/shared/public matrix):
      `sharing.ts` helpers, share + account routes, `isPublic` schema
- [x] Docs + final gate + commit
- No schema/migration change — `share_token`, `is_public`, `globe_public`
  already existed from Phase 2. OG image uses the signed display URL (~1h);
  a stable OG-image route is a documented follow-up

## Phase 9 — Admin Invites

- [x] Owner role gate (`requireOwner` API + `requireOwnerPageUser` page) +
      `/admin` page; owner-only "Admin" link in the account menu
- [x] Generate one-time invite links with expiry; list used/revoked/expired/
      unused; revoke unused (POST/DELETE `/api/admin/invites`). Token shown once
      on create (stays hashed); optional note per invite
- [x] Integration tests: `listInvites`/`revokeInvite`/`inviteStatus`, invite
      lifecycle, non-owner denied (member 403, unverified 403, unauth 401)
- [x] Docs + final gate + commit
- No schema/migration change — `invites` (with `revokedAt`) and `users.role`
  already existed from Phase 2

## Phase 10 — Polish & Chrome

- [x] Public About page `/about` (matched the imported "Atlas Travel Site"
      design: two-column portrait card + story + real owner stats). Owner
      resolved deterministically (earliest-created); prose is source-edited
- [x] Shared dark footer (design's `#1c1917`) across app/logged-out/public
      shells; nav sourced from `navItems.ts` with About added (top nav, mobile
      bottom nav, footer); two-tone wordmark in nav, auth panel, footer
- [x] Empty states — added public-globe zero-trips state (new-user/no-photos
      already existed); error/loading — custom `not-found.tsx` + `error.tsx`
- [x] Accessibility pass — global `:focus-visible` ring, `prefers-reduced-motion`
      on page fades/scroll, Lightbox caption alt (globe left untouched by choice)
- [x] Docs + final gate + commit
- No schema/migration change. Muted-text contrast (~3.4:1) kept as-designed —
      flagged as a follow-up if strict AA is wanted

## Phase 10.5 — Design alignment (UI/UX polish)

- [x] Home "Your Pins" list redesigned to the design's cards (gradient swatch +
      name + `country · date` + photo count); stats band → Countries · Cities ·
      Photos · Years; dark footer added to the globe/home
- [x] "Featured journeys" section (3-card grid under the stats band) driven by a
      new `trips.is_featured` flag; toggled on the trip edit page (ShareCard);
      "See all on the timeline →". Migration `0001_demonic_wiccan.sql`
- [x] Sticky footer — `body` is a flex column + `main { flex: 1 }`, so the footer
      sits at the viewport bottom on short pages (settings/admin/trip-new/about)
- [x] `/about` shows the full nav when logged in (TopNav + BottomNav), public
      header when logged out
- [x] Docs + final gate + commit
- Globe and the click-to-peek card left untouched by request. First schema change
  since Phase 2 (`is_featured`) — CI applies the migration on merge

## Phase 11 — Ops & Launch

- [ ] Pick + integrate real email provider behind `sendEmail()`
      (Brevo/Gmail SMTP candidates); verified sender; swap `console`
      transport for it in production (deferred from Phase 3)
- [ ] OCI box cron: scheduled `pg_dump` from Neon → local backups,
      retention policy; restore drill once
- [ ] Vercel env audit (prod vs preview), Neon/R2 quotas checked
- [ ] Invite first users; monitor email deliverability
- [ ] Post-launch backlog groomed from PRD "Deferred / open items"
