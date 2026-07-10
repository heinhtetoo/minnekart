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
- [x] Pick + integrate real email provider; verified sender
      (Brevo provisioned + Vercel envs set — live and working)

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
- [x] Create real private R2 bucket + API token; set env/secrets
      (R2 bucket + token provisioned, `STORAGE_DRIVER=r2` in prod — live and
      working; build/tests still use the in-memory adapter)
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
- [x] Trip detail page: story, highlight, details sidebar, photo grid + lightbox (`/trip/[id]`)
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

- [x] Real email provider behind `sendEmail()` — provider-agnostic nodemailer
      SMTP transport (`smtp` branch, injectable for tests) + `SMTP_*`/`EMAIL_FROM`
      env; `console`/`memory` unchanged. Brevo sender provisioning + Vercel envs
      are ops steps in `docs/OPS.md`
- [x] Backup tooling: `scripts/backup-neon.sh` (`pg_dump` over TLS → gzip +
      retention prune) with cron + restore-drill runbook in `docs/OPS.md`.
      Installing the cron on the OCI box is a user/ops step
- [x] Vercel env audit — full prod-vs-preview checklist + the two footguns
      (`STORAGE_DRIVER=r2` default, `smtp` requires all `SMTP_*`) in `docs/OPS.md`.
      Setting the envs + checking Neon/R2 quotas is a user/ops step
- [x] Invite-first-users runbook in `docs/OPS.md` (existing `create-owner`/
      `create-invite` CLIs); actually sending invites is a user step
- [x] Post-launch backlog groomed → `BACKLOG.md` (PRD deferred items + non-goals + build follow-ups)
- Repo-side Phase 11 deliverables are done. Remaining launch tasks are external
  actions (provision Brevo + set Vercel envs, provision R2, install the OCI cron,
  send the first invites), each documented in `docs/OPS.md`

## Post-launch bugs (reported 2026-07-07)

- [x] **iOS Safari — sign-in/sign-up taps need repeating.** On iPhone Safari,
      buttons AND text fields on the sign-in/sign-up form took 2–3 taps to
      respond (focus, then another tap for the caret; even "Sign in" needed a
      double tap). Only that form — every form after login was fine. Real root
      cause: the form shares the logged-out home with the globe, whose idle
      auto-spin redraws all ~177 country paths **every frame, forever** (nothing
      resets `lastInteraction` while you tap the card, not the globe). That
      continuous main-thread work starves iOS Safari's tap/click dispatch for the
      whole page. Fixed by disabling the globe's auto-spin on touch devices
      (`matchMedia('(pointer: coarse)')`) — desktop spin unchanged; drag-to-spin
      still works on touch. (The earlier 16px `.field`/`.linkInput` change,
      `b047a43`, was a correct anti-focus-zoom improvement but not this cause.)
      Confirmed fixed on iPhone Safari — single-tap focus and actions.
- [x] **Globe not zoomable on mobile (iOS Safari + Android Chrome).** Pinch-to-
      zoom did nothing on touch devices — `Globe.tsx` only wired zoom to the
      `wheel` event (mouse/trackpad), with no touch pinch handler. Fixed by adding
      two-finger `touchstart`/`touchmove`/`touchend` handlers that drive the same
      `view.scale` clamp and `redraw()` the wheel path uses (via a shared `zoomTo`
      helper), guarding drag-rotation during a pinch. `touch-action: pan-y` kept,
      so single-finger spin and page scroll are unaffected. Hint updated to
      "pinch or scroll to zoom". A follow-up (`0976b99`) registers the touch
      handlers before d3-drag, whose `touchstart` `stopImmediatePropagation()`
      was blocking them. Confirmed working on Android Chrome.
- [x] **Slow client-side page transitions (all devices).** Root cause: no
      `loading.tsx` boundaries (old page stayed mounted until the server render
      finished), sequential per-page DB round-trips, and raw `pg` TCP pooling on
      serverless. Fixed in code: added `PageSkeleton` + `loading.tsx` for all app
      routes (instant skeleton + dynamic-route prefetch) and parallelised the
      per-page queries with `Promise.all` (home, timeline, trip detail, about).
      DB baseline documented in `docs/OPS.md` (Neon **pooled** `-pooler` endpoint).
      Resolved by the skeletons + parallel queries. Pooled `DATABASE_URL` was
      already set in Vercel, so no change there; remaining cold-start latency is
      Neon free-tier autosuspend, accepted for now.
- [x] **Home detail card docked (design match).** The logged-in home peek card
      floated over the globe and overlapped the forest-green stats band. Replaced
      it with the design's docked inspector card (`Atlas Travel Site.dc.html`)
      below the pins list — empty + filled states, "Reset view" and "Open
      journey →". Capped the pins list height so both fit; the list's overflow
      fade is unchanged. The logged-out globe now zooms only on pin click (no
      card). Public globe (`/u/<username>`) left unchanged.
- [x] **Public globe detail card floated again.** The claim above that the public
      globe was "left unchanged" held for its TSX but not for the stylesheet it
      shared: docking the home card deleted `.peek` from `Home.module.css`, and
      `PeekPanel` — used only by `PublicGlobe` — still read `styles.peek`. It
      resolved to `undefined`, so the card lost all positioning and became a flex
      item beside the globe (`.globeLayer` is `display: flex`), squeezing the
      globe to a marble on mobile. Restored the rule verbatim and co-located it
      as `public/PeekPanel.module.css`, moving `PeekPanel` out of `home/` so a
      home refactor can't silently take its layout again. Also wired the
      `focusId` prop that `PublicGlobe` never passed (added to `Globe` in
      `7c56c1e`, only ever used by `LoggedInHome`) — the public globe now flies
      to the selected pin and resets on close, like the logged-in one. Neither
      `Globe.tsx` nor `.globeLayer` was touched. Nothing caught this because
      Next types `*.module.css` as `{ [key: string]: string }`, so a missing
      class still typechecks, and the suite has no component tests.
- [x] **Mobile design polish (from the Claude Design prototype).** Compared the
      imported `Travel Globe Mobile Prototype.dc.html` to the live site and pulled
      across the worthwhile bits, globe untouched throughout:
      (1) Bottom nav (logged-in only) now has line icons over labels, accent-active
      tabs, and an elevated centre "Add" FAB (`Globe · Timeline · [＋] · Gallery ·
About`); the redundant top-bar "+ New memory" is hidden on mobile. New
      `nav/navIcons.tsx`; `NavLinks`, `navItems`, `Nav.module.css`.
      (2) Sticky mobile-only auth header on the logged-out home (wordmark + Sign in
      /Sign up) that smooth-scrolls to the `AuthCard` and switches its mode
      (added `openLogin()` to `AuthCardHandle`).
      (3) Community/personal stats become an inset rounded forest card on mobile;
      full-bleed band kept on desktop (CSS-only on `.band`/`.stats`).
      (4) Footer's nav row (a duplicate of the bottom nav) hidden < 720px; kept on
      desktop.
      (5) Public-globe peek gained a "Sign up to save places like this →" hook
      (→ `/`) for signed-out viewers only.
- [x] **Home + public-globe follow-up tweaks.** (a) Highlight/detail card moved
      **above** the pins list on the logged-in home (both breakpoints) so it's in
      view straight after a pin tap and the list's bottom fade reads as the column
      end. (b) Public globe top bar gained a "Sign up" button beside "Sign in"
      (text + filled pill, both → `/`); for signed-in viewers both are replaced by
      a single "My globe →" pill (→ `/`), and the peek signup hook stays hidden —
      threaded `viewerLoggedIn` through the shared `PublicChrome` (also `about`,
      `PublicTripView`, and the trip / share-token pages). (c) Fixed a real bug:
      the `1fr auto 1fr` top bars relied on grid auto-placement, so when the middle
      column was `display:none` on mobile the right group (avatar / sign-in) fell
      into the centre column — pinned each child to an explicit `grid-column`.
      (d) Lowered the public peek card on mobile (`bottom: 2%`) so it clears more of
      the globe.
- [x] **About page shows "Coming soon" in production.** The `/about` bio was
      hard-coded placeholder prose (an invented headline + two paragraphs) that
      shouldn't face real visitors before editable profiles exist. In production
      (`process.env.NODE_ENV === 'production'`) the headline and both paragraphs
      are replaced by a single "Coming soon" (reusing the `.title` serif style);
      the `About` eyebrow, the portrait card (name initial + tagline), and the
      Countries/Photos/Years stats are unchanged. Dev keeps the original copy so
      it's still visible while iterating. `src/app/about/page.tsx` only.
- [ ] **Editable profile.** Let the owner edit their own About content — name,
      tagline, and bio body (the prose the "Coming soon" placeholder currently
      stands in for), stored per user rather than hard-coded. Once shipped, drop
      the `NODE_ENV` gate above and render the stored bio (with "Coming soon" as
      the empty-state fallback). Likely touches the `users` schema (a bio/tagline
      field + migration), a settings/profile editor, and `src/app/about/page.tsx`.
- [ ] **Push the public-globe peek card further down on mobile.** The mobile peek
      still overlaps the lower third of the globe. Nudge it lower again (public
      globe, mobile only) in `public/PeekPanel.module.css` — desktop stays as-is.
- [x] **Photo uploads: WebP encode silently fell back to PNG on Safari/Firefox.**
      One root cause behind all three logged upload issues ("can't upload large
      photos", ~3MB originals landing in R2 at ~6MB, "Image is too large" on
      ~6MB originals) — and it wasn't the canvas-cap/HEIC speculation recorded
      earlier. `canvas.toBlob(cb, 'image/webp', q)` is only honoured by
      Chromium; Safari and Firefox silently return **PNG and ignore the quality
      argument** (spec-permitted fallback). A 2560px photo as PNG is ~6–12MB,
      so Safari uploads inflated ~2× and bigger originals blew past the 8MB
      `MAX_DISPLAY_BYTES` cap → "Image is too large". Confirmed against prod:
      an R2 "webp" display object was 6,408,546 bytes with PNG magic bytes
      (`89504e47`), and its 400px thumb ~196KB (vs ~20KB expected). Measured in
      WebKit: a 2560px webp request returned `image/png` at 11.49MB; JPEG at
      the same quality was 2.05MB. Nothing checked `blob.type` after encoding,
      and the server only validated the _declared_ PUT content-type, which
      `putBlob` hard-coded to `image/webp`. Fixed with a JPEG fallback:
      `process.ts` tries WebP, checks the blob's actual type, and re-encodes as
      JPEG when the browser lied (detection cached per page); the content type
      is threaded through presign → keys (`.webp`/`.jpg`) → PUT header → the
      record route's type check (`content-type.ts` shared union). Verified
      end-to-end with a 5.44MB 4000px JPEG: Chromium → `.webp` upload, WebKit →
      `.jpg` upload, both 201 + rendered, no "Image is too large". Tests
      176 → 183.
- [ ] **Re-encode the legacy PNG-as-webp objects in R2.** Photos uploaded from
      Safari/Firefox before the JPEG-fallback fix are PNGs stored under `.webp`
      keys with an `image/webp` content-type (~6MB displays, ~200KB thumbs).
      They display fine because browsers sniff the real format, but they waste
      storage and bandwidth. A one-off script (e.g. sharp server-side) could
      re-encode and replace them; low urgency.
- [ ] **Investigate `prettier --write` not persisting locally.** During the
      mobile-polish commit, `prettier --write progress.md` reported success but
      `prettier --check` kept failing on the same file. The workaround was to
      redirect prettier's stdout to a temp file and move it back over the
      original. So `--write` may not be writing atomically in this dev
      environment. Check the prettier version and whether it reproduces on
      other files before relying on `npm run format` locally.
