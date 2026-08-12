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

## Pending work — ranked for implementation by business value

Every open task, ordered. Ranking logic follows `docs/BUSINESS.md`:
distribution and perceived value are the constraints, and revenue needs the
launch milestone (billing + domain + enforcement) shipped as one piece.
Engineering tasks only — the GTM/owner actions (Reddit warm-up, launch posts,
founding-member offer timing) live in `docs/BUSINESS.md` §4 and are not
tracked here. Items marked _(BACKLOG)_ are described in `BACKLOG.md`; this
list is the execution order.

### Tier 1 — the revenue engine (launch-blocking, in dependency order)

- [x] **1. Custom domain + DKIM email** _(BACKLOG; deferred →
      launch-blocking)_. First even though it's mostly ops: checkout under
      `vercel.app` costs trust at the worst moment, OTP/reset deliverability
      improves, and the SEO clock (domain authority) only starts once it
      exists — ranking on `vercel.app` and migrating later throws away equity.
      Domain `minnekart.com` bought 13 July 2026, live 14 July. Apex is the
      **primary** domain in Vercel and `www` 308-redirects to it, with
      `APP_URL=https://minnekart.com` matching — a first pass had www primary
      while `APP_URL` named the apex, so every sitemap entry, share link and OG
      URL the app emitted took a redirect hop to reach itself, and the site was
      telling Google the apex was canonical while serving from www. Email is
      DKIM-signed off the same domain via Resend (1d).
- [x] **1b. Public pricing + policy pages.** Paddle reviews the website before
      it approves a live account, and it requires pricing, terms, privacy and
      refund pages — none existed, so this blocked the whole billing
      milestone. Shipped `/pricing`, `/terms`, `/privacy`, `/refunds` on a
      shared `ContentPage` shell (chrome + the prose scale the app never had;
      `PublicChrome.ownerName` became optional so it works as marketing
      chrome), linked from a new always-visible footer legal row, plus
      `sitemap.ts` + `robots.ts` (which originally disallowed `/t/` — see 2c,
      that turned out to be wrong). Pricing reads the real limits from
      `limits.ts` and
      gates the founding-member tier on `PADDLE_PRICE_LIFETIME`, mirroring
      settings — retiring the offer stays a pure env change. Copy is grounded
      in the code, not boilerplate: EXIF is stripped by the browser-side
      re-encode, one essential cookie, no analytics anywhere, Paddle as
      merchant of record, and the honest admission that account deletion is
      email-only today. Pure `pricing.ts` helpers are unit-tested (7 tests);
      the pages have no render tests, matching the repo's convention. The repo
      is public, so the business identity is **configuration, not content**:
      `src/lib/legal.ts` reads `LEGAL_ENTITY_NAME` / `LEGAL_ENTITY_ABN` from
      env (real values live only in the gitignored `.env` and Vercel) and falls
      back to the obvious `HHO` / `ABN XXXX XXXX XXX` placeholders, so the
      legal name and ABN never enter git history. **Set both in Vercel prod
      before submitting to Paddle.** Two things surfaced on the way: a
      developer's
      `.env` was leaking `TURNSTILE_SECRET_KEY`/`OPEN_SIGNUP` into the test
      run through `dotenv/config` in `vitest.config.ts` (now pinned in the
      test env, which is why 4 signup tests could fail locally but pass in
      CI), and JSX text that follows an inline element loses its leading space
      when the text contains an HTML entity — worked around, worth knowing.
- [x] **1c. Prod/preview environment split.** Everything ran as one
      environment: `main` deployed to production and CI migrated the
      production database on every push, so there was nowhere to try a schema
      change or a half-finished feature against real infrastructure. Now
      `main` is production and a long-lived `dev` branch is the preview
      (`feature → dev → PR → main`). Vercel has no "make this branch the
      preview" switch — every non-production branch already is one — so the
      work was isolating it: `vercel.json` pins `git.deploymentEnabled` to
      `main` + `dev` only, which gives the preview a **stable** alias that the
      R2 CORS policy, the Turnstile hostnames, the Paddle sandbox webhook and
      `APP_URL` can all be configured against (a feature branch's URL changes
      every push, so those deploys would be half-broken by construction). CI
      now runs on both branches and migrates whichever database matches the
      ref (`DATABASE_URL` vs a new `DATABASE_URL_DEV` secret). The landmine
      was Vercel's env-var scoping: it ticks every environment by default, so
      a Preview `DATABASE_URL` left pointing at prod would have had the first
      `dev` deploy writing to production data and CI applying unreleased
      migrations to it — hence the expanded audit checklist in `docs/OPS.md`.
      Preview gets its own Neon branch, its own R2 bucket (`minnekart-dev`),
      sandbox Paddle, and `EMAIL_TRANSPORT=console` so OTPs land in the Vercel
      logs instead of real inboxes. All of it in `docs/OPS.md` § Environments.
      Shipped and verified: both branches green in CI, `dev` migrating its own
      Neon branch while `main`'s run was a no-op against production.
- [x] **1d. Move outbound email to Resend.** Email is the one dependency whose
      failure is invisible and fatal — a signup OTP that never arrives means the
      user never gets in, and nothing in the app reports it. Brevo was the
      placeholder while there was no domain; moving now, before any DNS is
      committed, is the cheapest moment. Resend is transactional-first (its
      sending reputation isn't shared with newsletter traffic), gives per-send
      logs, and adds no "Sent with Brevo" footer to a password-reset email.
      Went via Resend's **HTTP API, not SMTP**: the OTP send sits inside the
      request blocking a user's signup, and SMTP pays a TLS handshake plus
      several protocol round trips on every cold serverless invocation. New
      `EMAIL_TRANSPORT=resend` branch + `RESEND_API_KEY` in `src/lib/email.ts`,
      with an injectable `fetch` mirroring `captcha.ts`/`paddle-api.ts`; a
      non-2xx response **throws** rather than resolving quietly, since a
      swallowed 422 is exactly how you lose a signup. The `smtp` transport
      stays as the provider-agnostic escape hatch the README advertises, so
      nothing is locked in. Also updated the **privacy page's sub-processor
      list** — it named Brevo, and that's a published commitment, not a
      comment. Shipped dark (the transport is unreachable until
      `EMAIL_TRANSPORT=resend` is set), then cut over: domain verified in Resend
      with MX/SPF/DKIM/DMARC at Porkbun, `RESEND_API_KEY` + `EMAIL_FROM` +
      `SUPPORT_EMAIL` set in Vercel, and Production flipped to `resend`. Live
      and sending. **Leftovers:** delete the old Brevo DNS records and the now
      unused `SMTP_*` vars from Vercel — dead config, not a blocker.
      **Reply-To (found during DNS setup).** Resend wants a verified sending
      domain, and the safe choice is a subdomain (`send.minnekart.com`) so bulk
      sending can't damage the root domain's reputation — but that subdomain has
      no inbox, so a user who simply hits reply to their verification code was
      writing into a void. Every message now carries
      `Reply-To: $SUPPORT_EMAIL` (Resend's `reply_to`; nodemailer's `replyTo` on
      the SMTP fallback too, so falling back doesn't silently break replies).
      `SUPPORT_EMAIL` was a hardcoded constant in `legal.ts`; it is now a
      **required** env var (`z.email()`, like `DATABASE_URL` — a default would
      just be the hardcode relocated) feeding both the seven `mailto:` links on
      the policy pages and the Reply-To header, so the address the site promises
      answers at is provably the address replies land in. Being required means a
      deploy without it **fails the build** (`sitemap.ts`/`robots.ts` parse env
      at build time) — loud beats a silently missing header, but it must be set
      in Vercel Production **and** Preview before this merges.
- [x] **2. Stable OG-image route + public-globe shareability polish.** OG
      previews used the ~1h-signed R2 URL (dead after expiry) and the globe
      page had no preview image at all. Shipped branded 1200×630 cards via the
      `opengraph-image.tsx` convention + `ImageResponse` (`next/og`): trip
      card (framed photo on parchment, Playfair place name, country · dates,
      wordmark; deterministic `coverGradient` fallback when the photo can't
      be fetched) on `/u/<user>/<trip>` and `/t/<token>`, and a stats card
      (countries · places · years) on `/u/<user>`. Shared module
      `src/lib/og/` (cards, committed OFL TTFs, `firstPhotoDataUri`);
      `metadataBase` + `twitter:card summary_large_image` in the root layout;
      signed URL removed from `public-meta.ts`. Visibility enforced by the
      tested `sharing.ts` helpers — private trips, unknown users, and revoked
      tokens all 404. Two satori gotchas: it can't embed WebP data URIs
      (crashes) and can't take numeric JSX children — photos are sniffed and
      re-encoded to downscaled JPEG via `sharp` (now a declared dependency;
      it already shipped transitively under `next`), which also handles the
      legacy PNG-as-webp objects, and stat values are stringified. All cards
      measured 36–520KB, under WhatsApp's ~600KB ceiling. Also lowered the
      mobile peek card (`bottom: 1%`, `max-height: 46%` — the height cap is
      what frees globe on content-heavy cards); desktop untouched. Verified:
      direct card renders + all routes E2E (statuses, meta tags, 1200×630),
      prod-mode build serves the route with fonts, 187 tests green.
- [x] **2b. Post-deploy link-preview QA.** Validate the live previews once per
      platform: X card validator, Facebook/Meta sharing debugger, WhatsApp,
      iMessage, Slack — both a trip link and the globe link; confirm images stay
      live past the old 1h window and that Vercel's file tracing bundled the
      `src/lib/og/fonts` TTFs.
      **Confirmed on `minnekart.com`:** the globe card (name + stats) and, after
      the 2c fix, the trip card in iMessage/SMS. That proves the whole path —
      crawler fetch, OG tags, `ImageResponse` render, bundled fonts. The **X card
      validator** and the **Meta sharing debugger** were then run via third-party
      preview checkers (to avoid signing up for X/Meta developer accounts) and
      both rendered the 1200×630 card cleanly — no missing-tag or dimension
      errors. Link previews are verified across the paths that matter.
- [x] **2c. Share links never previewed — `robots.txt` was blocking the
      crawlers.** Found on the live domain: `/u/<user>` produced a rich card but
      a `/t/<token>` share link produced nothing. `robots.ts` carried
      `Disallow: /t/`, added in 1b to keep secret share links out of search —
      but **link-preview crawlers obey robots.txt** (Twitterbot,
      `facebookexternalhit`, Slackbot, WhatsApp), so they never fetched the page
      and never saw the OG tags. The OG plumbing was fine all along. `Disallow`
      was simply the wrong tool: it blocks the _fetch_, and it doesn't even
      reliably prevent indexing — a disallowed URL can still be listed if it's
      linked. Fixed by removing `/t/` from the disallow list and putting
      `robots: { index: false, follow: false }` on the share page's metadata,
      which actually prevents indexing while still letting a card render. Share
      links were never protected by robots.txt anyway — secrecy comes from the
      unguessable token and revocation. Regression test on `robots.ts` asserts
      `/t/` stays out of the disallow list, with the reason inline.
- [x] **3. Billing schema & data model.** `users` gained `plan`
      (`user_plan` enum, default `free`), nullable `subscription_status`
      (`active`/`trialing`/`past_due`/`paused`/`canceled` — null for free
      users and non-subscription paid), and a nullable unique
      `paddle_customer_id`; plus a `webhook_events` table (unique
      `event_id`) for webhook idempotency. Migration `0002_perpetual_loa`
      also backfills **all pre-existing users to `paid`** (decided: the
      invite cohort is grandfathered — never capped; the founding-member
      offer stays voluntary support). New signups default to `free`
      (verified both ways on the local DB). `SessionUser` infers from the
      schema, so `user.plan` is available on every guard automatically.
- [x] **4. Paddle checkout + subscription webhook handler.** Paddle as
      Merchant of Record. `POST /api/webhooks/paddle`: raw-body HMAC-SHA256
      verification of the `Paddle-Signature` header (`timingSafeEqual`,
      60s timestamp tolerance), `webhook_events` insert-or-skip dedupe,
      then `subscription.*` handled generically off `data.status`
      (`active`/`trialing` → paid, `past_due` → stays paid — Paddle
      dunning is the grace period, `paused`/`canceled` → free) and
      `transaction.completed` grants lifetime paid when the items include
      `PADDLE_PRICE_LIFETIME`. Users matched by checkout
      `custom_data.userId` first, then stored `paddle_customer_id`;
      unmatched/unknown events are acked 200 (no retry storms). New
      `src/lib/billing/` (signature + webhook), settings **Billing card**
      (plan badge, past-due warning, overlay checkout via
      `@paddle/paddle-js` with annual primary / monthly secondary /
      env-gated lifetime buttons; hides checkout entirely when Paddle env
      is absent), all six `PADDLE_*` env vars optional-at-parse in
      `env.ts`, and a `## Billing (Paddle)` runbook in `docs/OPS.md`
      (sandbox setup, test flow, go-live checklist). Verified: 8 signature
      units + 13 webhook integration tests (TDD), settings card
      screenshot-checked with and without Paddle config; 208 tests green.
      Real sandbox checkout → webhook round-trip is an ops step
      (needs the Paddle sandbox account — see OPS.md).
- [x] **4b. In-app subscription management.** Cancel, resume and update-card
      from the settings Billing card, so a paid user never has to go hunting
      through a receipt email — and cancelling is as easy as subscribing.
      Three routes under `/api/account/subscription/` on a new
      `src/lib/billing/paddle-api.ts` (injectable `fetch`, mirroring
      `captcha.ts`, so it unit-tests without network); new secret
      `PADDLE_API_KEY` gates the whole feature — unset, the controls hide and
      the routes 503, exactly as the checkout buttons already hide without
      `PADDLE_PRICE_ANNUAL`. **Security model:** the subscription id is read
      from the logged-in user's row, never from the request body (tested — a
      body-supplied id is ignored). Cancellation is always
      `next_billing_period`, never immediate: `/terms` promises the paid period
      is honoured, so the API had no free choice here. Rejected Paddle's hosted
      `management_urls` — their tokens are temporary, absent from webhook
      payloads, and would cost an API round-trip on every `/settings` render.
      Schema gained `paddle_subscription_id` (the webhook already received it
      and threw it away), plus `subscription_renews_at` and
      `subscription_ends_at`, both fed by the webhook from
      `current_billing_period` and `scheduled_change` — so the card can say
      "Renews on 9 January" and "Ends on 3 August" with **no API call on
      render**. Dates are formatted server-side (`en-AU`) to keep locale out of
      hydration. **The two states that must show no controls** — founding-member
      buyers and the grandfathered invite cohort, both paid with no subscription
      — are gated on a null subscription id and explicitly tested. 26 new tests
      (10 API client, 5 webhook, 11 route).
- [x] **5. Free-tier enforcement.** Server-side caps in the API routes,
      driven by `guard.user.plan` and shared constants in
      `src/lib/billing/limits.ts`: trip creation blocked at 15 for free
      users (`trip_limit_reached` 409, new check), photos per trip 6 free /
      50 paid (the existing `photo_limit_reached` check made plan-aware),
      and an unadvertised 5,000-photo account ceiling on paid as the abuse
      valve (same generic error). Client: `TripForm` maps
      `trip_limit_reached` to "You've used your 15 free memories. Upgrade
      in Settings for unlimited."; `PhotoUploader`'s hardcoded 50 became a
      plan prop (counter shows `n / 6` on free, pre-check + banner mention
      upgrading). Integration tests cover the full matrix incl. the
      upgrade path (free blocked at 15 → flipped to paid → 201);
      `createMember` fixture gained a `plan` override. Grandfathered
      (paid) accounts are untouched by any of it.
- [x] **6. Open signup + CAPTCHA/quotas** _(BACKLOG → shipped)_. Behind
      **`OPEN_SIGNUP=true`** (default false) so the deploy and the launch
      moment stay decoupled — flag off preserves invite-only exactly.
      When open: `invite` is optional (still validated + consumed when
      present, so the admin invite page keeps working), and signups are
      gated by Cloudflare **Turnstile** when `TURNSTILE_SECRET_KEY` is set
      (raw siteverify call in `src/lib/auth/captcha.ts`, fail-closed,
      injectable fetch; widget in `AuthCard` via the new
      `src/components/auth/Turnstile.tsx`, reset on failed submits).
      Quotas: 5/hour + 20/day per IP and a global 100/day kill-valve on
      top of email OTP. `/signup` without an invite now lands on the
      signup tab (`/?signup=1`) instead of bouncing home. Env vars +
      Cloudflare setup + launch/rollback runbook in `docs/OPS.md`;
      BACKLOG.md item removed (along with the stale OG-image entry that
      shipped in task 2). Tests: 6 captcha units + 6 open-mode route tests
      (`vi.mock`ing the new `signup-mode` gate) + a closed-mode
      missing-invite test; existing signup tests unchanged.
      **Verified end-to-end on the `dev` preview (14 July 2026):** the live
      Turnstile widget renders against real keys and an open-mode signup
      completes. Note the CAPTCHA gate keys off `TURNSTILE_SECRET_KEY`, **not**
      `OPEN_SIGNUP`, and runs before the invite lookup — so once the Turnstile
      vars are set, invite signups go through Turnstile too, and a half-set pair
      of keys fails every signup closed (a valid invite still returns
      `captcha_failed`). Both keys plus the `minnekart.com` hostname are set in
      Production.
      **Production is still `OPEN_SIGNUP=false` — invite-only.** Everything is
      proven on the real code path; public launch is now a single env var.

### Tier 1 status — code complete (15 July 2026)

Every Tier 1 engineering task is shipped, merged to `main`, and verified on the
real code path. All `PADDLE_*` production vars are now set in Vercel
(Production scope). Link previews are validated. What stands between here and
taking money is **not code** — it is three owner/ops gates, none of them
blocking Tier 2 work:

1. **Paddle live-account approval.** Vars are set, but Paddle reviews the live
   site before it enables live transactions. Until that approval lands, live
   checkout won't process. Confirm the live account shows _approved_, then run
   one real end-to-end checkout against production before announcing.
2. **Flip `OPEN_SIGNUP=true`** in Vercel Production — the single env var that
   opens public signup. Do this only when ready to launch.
3. **Dead-config cleanup (non-blocking):** delete the old Brevo DNS records and
   the unused `SMTP_*` vars from Vercel. Housekeeping, not a gate.

### Tier 2 — conversion & trust (post-milestone, pre-launch-post)

- [x] **7. Editable profile.** Each user edits their About `name`, `tagline`,
      `headline`, and `bio` from a new `ProfileCard` in `/settings`; the
      `NODE_ENV` "Coming soon" gate is gone, replaced by a content-driven empty
      state (shown only when both headline and bio are blank). Kept the current
      visual — a distinct serif headline above the bio paragraphs — so
      `headline` is its own field, not folded into `bio` (user-confirmed). Bio
      renders as paragraphs split on blank lines. Fields are stored **per user**
      (three nullable columns, migration `0004_tough_adam_destine.sql`), which
      is coherent with the About page's existing `viewer-or-owner` subject
      logic: a logged-out visitor sees the owner's profile, a logged-in user
      sees and edits their own. New `PATCH /api/account/profile` cloned from the
      globe toggle — `requireVerifiedUser`, id from the session never the body,
      zod length caps, blank optionals normalised to `null`. `name` still flows
      live to nav, `/u/<username>`, and the OG cards. Public globe tagline/bio
      deliberately out of scope. 6 route tests; verified live against the local
      DB (filled → renders all fields, cleared → "Coming soon"). 279 tests
      green.
- [x] **8. R2 photo backup job** _(BACKLOG, elevated)_. `rclone` sync R2 →
      the OCI box beside the Neon `pg_dump` cron. Gives photos the second copy
      the database has had since Phase 11 — charging for "safely kept" while
      photos were single-copy contradicted the value proposition. New
      `scripts/backup-r2.sh` mirrors `backup-neon.sh`'s style (bash,
      `set -euo pipefail`, env-var config, echo logging) and reuses the app's
      own `R2_*` var names, building the rclone remote from `RCLONE_CONFIG_*`
      env vars so no secret hits a config file or the process list.
      **Backup model: mirror + dated archive** — `rclone sync` keeps `current/`
      an exact mirror of R2, `--backup-dir archive/<ts>/` preserves anything a
      sync would delete or replace, pruned after `RETENTION_DAYS` (default 14)
      with the same `find -mtime` idiom as the Neon script; `current/` is never
      pruned. Protects against R2 loss **and** gives a deletion-recovery window,
      bounded on disk. No CORS change (server-side credentialed S3, not a
      browser upload). Verified with `rclone`/`shellcheck` installed locally:
      shellcheck clean; against a local S3 server the env-var remote resolved
      and `rclone check` was 0 differences; the full sync → delete → archive →
      prune cycle behaved; both fail-fast guards (rclone missing, `R2_*` unset)
      fire. Runbook (invocation, staggered 03:30 cron, verify drill) in
      `docs/OPS.md`; `BACKLOG.md` item removed. The live run on the OCI box is a
      user/ops step, like the Neon backup.
- [x] **9. Marketing + SEO base layer.** Privacy is now a marketed feature — a
      sharpened line on the logged-out home's "Yours, kept close" card ("no ad
      trackers, no analytics, and it never follows your live location"). Shipped
      a `/guides` hub-and-spoke: an index page plus two evergreen articles,
      `/guides/private-travel-map` ("how to keep a private record of everywhere
      you've travelled") and `/guides/polarsteps-alternative` ("a Polarsteps
      alternative that doesn't track your live location"), all on the existing
      `ContentPage` shell with claims kept consistent with `/privacy` and
      `/terms`. Branded 1200×630 OG cards via the `opengraph-image.tsx`
      convention: a new `brandCard` in `src/lib/og/card.tsx` reusing the
      wordmark/palette/fonts, wired as a **site-wide default**
      (`src/app/opengraph-image.tsx` — also upgrades pricing/terms/privacy/
      refunds/about/guides from text-only) with per-article overrides. The home
      finally has its own `metadata` export (it inherited the bare root layout
      before); footer gained Guides + About links; sitemap lists the three new
      URLs. No schema/migration — static build only. Verified live: build clean,
      all three OG routes 200 `image/png` 1200×630, all three pages 200 with
      correct title/description/og:image/prose/cross-links, sitemap and home
      privacy line confirmed; 279 tests green. Confirmed on the `dev` preview.
      Requires 1 (domain). Slow channel (6–12 months to rank) — ship early,
      leave to compound.

### Tier 3 — product polish (activation & paid experience)

- [x] **10. EXIF GPS pin suggestions** _(28–29 July 2026)_. "Prefill on upload"
      could not work as written: `PhotoUploader` only renders on the edit
      page, so by upload time the pin already exists. The suggestion moved to
      trip creation instead, which is where it saves the place search.
      `/trip/new` gained a "Start from a photo" picker: `readPhotoExif`
      (`src/lib/photos/exif.ts`) reads capture date and coordinates in one
      pass, a new `reverseGeocode` + `/api/geocode/reverse` (Nominatim
      `/reverse`, own rate bucket) turns those coordinates into a place name
      and country, and place/country/pin/date all arrive as editable
      suggestions. That photo is then uploaded to the new memory after create
      and before navigating, via `uploadPhoto`
      (`src/components/photos/upload.ts`) lifted out of `PhotoUploader` so
      both paths share one pipeline. Every failure degrades to the ordinary
      search flow. GPS never reaches storage — the canvas re-encode already
      strips EXIF. No schema change.
      **Android caveat, learned the hard way.** Android redacts EXIF
      _location_ from anything in the media collection unless the caller
      holds `ACCESS_MEDIA_LOCATION`, which Chrome does not — and Samsung's My
      Files serves `DCIM` through a MediaStore-backed provider, so Gallery
      and My Files are both redacted. Only a photo taken from the camera at
      pick time keeps its location. Redaction is location-only, so Android
      still auto-fills the date from any photo. Two consequences worth
      keeping: the seed picker deliberately has **no `accept` filter** (an
      image-only `accept` sends Chrome to the Android Photo Picker, which has
      no camera option — the one path that works), and files are vetted by
      magic bytes in `src/lib/photos/format.ts` instead, which `accept` never
      actually guaranteed. Don't "restore" the accept filter.
      **Which field belongs to whom.** Filling a field only when it was empty
      conflated "the last photo put this here" with "the user typed this", so
      a second photo moved the pin while keeping the first photo's name — the
      globe and the text disagreeing, silently. `TripForm` now tracks which
      fields the photo filled and the user has not since touched (`seedOwned`);
      only those are replaced by the next photo or cleared on remove, and
      typing in a field or choosing from the search releases it. Place name,
      country and pin describe **one place**, so they always move together:
      cleared together when a photo carries no location, replaced together
      when it carries one, and adopted together by the "Use the photo's place"
      swap offered when a photo disagrees with a place the user searched for.
      The place search box is cleared at those same points, since it is a
      fourth thing claiming to say where the memory is. A name typed by hand
      survives all of it — that is a label, not a stale reading.
- [x] **11. Photo reorder** — drag-and-drop in the trip edit page, free for
      all plans (the paywall stays capacity-based by decision). Server:
      `PATCH /api/trips/[id]/photos` takes the full ordered photo-ID list,
      rejects anything that isn't exactly the trip's photo set
      (`invalid_order`), and writes positions in a transaction
      (`src/lib/photos/ordering.ts`); photo DELETE now re-packs positions,
      which also fixes a latent bug where a deletion gap let the next upload
      land on a duplicate position. Client: `@dnd-kit` (verified clean with
      React 19.2/Next 16) in new `SortablePhotoGrid.tsx` — 5px mouse
      activation so × clicks never drag, 250ms long-press on touch so grid
      scroll survives, keyboard reorder via Space + arrows; optimistic save
      with banner + refetch on failure. 10 new route tests (TDD, red-first);
      306 total green. Verified on Mac Safari and Android Chrome.
- [x] **12. Muted-text contrast → WCAG AA** _(24 July 2026)_. An audit of
      every text colour found 112 usages below the 4.5:1 AA bar, not just the
      one token the note named. None qualified for the large-text exemption
      (largest declared size 15px), so it became a palette change rather than
      a per-site sweep. `--muted` `#8a8070 → #756c5f` (3.39 → 4.51) and
      `--accent` `#c4693a → #a55931` (3.38 → 4.50), hue and saturation kept,
      only lightness dropped ~7.6% to the least-dark values that clear the
      bar; `--accent-soft` moved in step. Five hardcoded greys collapsed into
      `var(--muted)` (worst was the globe hint at 2.06, the 10px bottom-nav
      labels at 2.29); the footer's `.heading`/`.copy` lightened to `#88807a`
      instead, since dark text on the near-black footer is the one place
      `var(--muted)` is wrong. Kept the rest of the palette in step so
      nothing renders the old orange: the pinCard glow, the Wordmark
      fallback, the OG card constants, and the globe's pin fill and halo
      (touched deliberately, for consistency). Every `--muted`/`--accent`
      text usage now verified ≥4.5:1 on both cream and white; the active
      gallery chip's white label improved 3.87 → 5.16 as a bonus. No logic
      changed, 323 tests green. Signed off on the preview eyeball pass,
      OG images included.
- [x] **17. Profile empty-state copy.** Replaced the `/profile` "Coming soon"
      placeholder (shown when the user hasn't written a headline/bio) with an
      inviting empty state that points to the editor: a `serif` heading "Your
      story, in your words", a muted line ("Add a headline and a few lines
      about your travels — they'll live here, beside your globe."), and a
      "Write your story →" accent link to `/settings`. "Coming soon" read as
      unfinished product, but the editable-bio feature already ships — the
      user simply hadn't filled it in. Own-profile view only
      (`requireVerifiedPageUser`); public `/u/[username]` unaffected. Two CSS
      classes mirror existing patterns (`.body`, `.featuredSeeAll`); no new
      tokens. 309 tests green, build clean.
- [x] **19. Paged photo loading (picker + gallery)** _(21 July 2026, folded
      into 18 before its first commit)_. The task-18 picker first loaded a
      fixed slice of the newest photos, which silently hid older ones — a
      free account tops out at 90 photos (15 trips × 6) and paid at 5000, so
      even modest libraries had unreachable photos. Both surfaces now page at
      **25 per page** (`PHOTO_PAGE_SIZE`). New `GET /api/account/photos`
      (`offset`, optional `country`) returns `{ photos, hasMore }` and is
      scoped to the caller by construction — it only ever passes
      `guard.user.id` — with `hasMore` derived by fetching one extra row
      instead of a count query. The client sends no limit, so no caller can
      request an unbounded page. Picker: the settings page no longer loads
      the library at all (most visits never open it) and now costs one signed
      URL for the current pick; page 1 is fetched when "Choose from library"
      is clicked, with "Load more" appending. Gallery: the unbounded load is
      gone; the country filter is now **server-side**, so the chips can no
      longer be derived from loaded photos and come from a new
      `userPhotoCountries` distinct query (piped through the existing
      `distinctCountries` so blank-trimming and `localeCompare` ordering are
      unchanged). `?country=` is still validated against the real list before
      querying, preserving task 16's behaviour. Offset paging with an
      append-time de-dupe by id covers the one real race (an upload in
      another tab shifting the offset). The lightbox pages too: stepping past
      the last loaded photo fetches the next 25 and continues, instead of
      silently wrapping to the first (`(index + 1) % count`), which would
      have made a paged gallery look like it ended at 25. It only advances
      once the fetch actually grew the list, and the rendered index is
      clamped, since the photo list and the index live in different
      components. `hasMore`/`onLoadMore` are optional on `PhotoGrid`, so the
      trip and public grids keep the plain wrap behaviour. 8 new route tests
      (paging, offset, country filter, never-another-user's-photos,
      401/403); 323 green.
- [x] **18. Profile card photo from the user's library** _(21 July 2026)_.
      Let the user pick one of their already-uploaded
      photos as the `/profile` portrait card image, falling back to today's
      forest gradient when none is chosen. Decisions taken: the picker lives
      in `/settings` beside the existing profile editor (`/profile` stays a
      read view); the card keeps the photo behind a bottom scrim with the
      existing avatar/name/tagline block on top; free on all plans (the
      paywall stays capacity-based, per the reorder decision). Schema:
      `users.profile_photo_id` → `photos.id` with **`on delete set null`**
      (precedent: `invites.usedBy`, migration `0005`), so deleting the photo
      reverts the card to the gradient instead of blocking the delete — one
      drizzle-kit migration. API: extend `profileSchema` in
      `src/app/api/account/profile/route.ts` with `profilePhotoId` (uuid,
      nullable), saved by the existing "Save profile" submit, no new
      endpoint — but the handler **must verify the photo belongs to the
      caller** (reject `400 invalid_photo`), otherwise a user could point at
      a stranger's photo id and be handed a signed URL to it. Library query:
      `src/app/gallery/page.tsx` already runs exactly the needed join
      (`photos` × `trips` for the user, signed via `signPhoto` +
      `toSignedPhotoDTO`) — extract it to a shared
      `src/lib/photos/library.ts` `userLibrary(userId)` used by both gallery
      and settings rather than duplicating. Render: use **`displayUrl`, not
      `thumbUrl`** — thumbs cap at 400px (`THUMB_MAX`) while the card renders
      ~350–400px wide at 4/5, so a thumb looks soft on retina (picker tiles
      still use `thumbUrl`); CSS keeps `.card`'s gradient as fallback and
      adds `background-size: cover` plus a bottom scrim so `.cardName`/
      `.cardTagline` stay readable (`.card` is already
      `align-items: flex-end`, so no layout change). Tests (TDD): 5 added to
      `src/app/api/account/profile/route.test.ts` — owned photo saves,
      another user's photo rejected, unknown id rejected, `null` clears,
      photo delete nulls the column. The ownership check was **verified by
      mutation**: with it removed, the foreign-photo test returns 200 (the FK
      gives no protection, since the other user's photo genuinely exists) and
      the unknown-id case crashes with a raw Postgres FK violation instead of
      a clean 400. Both rejection paths return the same `invalid_photo`, so
      the endpoint is no id-enumeration oracle. Also added an
      account-deletion test for a user whose card photo is their own photo —
      that delete has to cascade the photo **and** set-null a reference on the
      very row being deleted; it works, but it was worth pinning rather than
      assuming, since failure would have blocked account deletion (a
      compliance surface) for exactly the users who had set a photo. Public
      `/u/[username]` has no such card, so it's unaffected. Migration
      `0006_stormy_rage.sql`; the circular `users ↔ photos` reference needs an
      `AnyPgColumn` annotation to typecheck.
- [x] **12b. Self-serve account deletion.** A "Danger zone" card in `/settings`
      (hidden for the owner) lets a member delete their account after typing
      their username **and** re-entering their password; on success the client
      lands back on `/` with the session cookie cleared. The deletion logic is a
      single shared service `src/lib/account/delete.ts` —
      `deleteAccount(db, storage, user)` — so the self-serve route
      (`DELETE /api/account`) and the owner-only admin route
      (`DELETE /api/admin/users/[id]`, for honouring email requests) can't drift.
      The service captures the user's R2 keys **before** the DB delete, then a
      single `DELETE FROM users` cascades sessions/authTokens/trips/photos and
      `deletePhotoObjects` purges the objects. An active Paddle subscription is
      cancelled **immediately** (new `effectiveFrom` arg on `cancelSubscription`)
      so billing stops the moment the account is gone; a Paddle failure is logged
      but never strands a user (local data still deletes). Both routes refuse to
      delete an **owner** (the About subject / invite creator must persist).
      One migration (`0005_safe_mattie_franklin`) flips `invites.usedBy` to
      `ON DELETE SET NULL` — the only FK that blocked deleting a member who had
      used an invite; safe because invite "used" status keys off `usedAt`, not
      `usedBy`. Privacy page's "no self-serve delete yet" paragraph rewritten to
      match. Decided **hard delete, not soft-delete/deactivate** (user-confirmed):
      indefinite retention would contradict the privacy brand + the published
      promise + APP/GDPR erasure, so friction (type-username + password) is the
      accident guard instead. 17 new tests (route matrix incl. owner-block, wrong
      password, invite-null, immediate Paddle cancel; admin matrix; service unit
      test); 296 tests green; build clean.

- [x] **15. About/Profile split + columned footer** _(design update,
      16 July 2026)_. The old `/about` was really a profile page wearing an
      "About" label — the updated design's footer (Company column) exposed the
      collision. Split shipped: `/about` is now a company About page on the
      `ContentPage` shell (product story, privacy stance, funding, env-based
      identity via `legalEntity()`); the profile page moved to `/profile`
      (logged-in-only via `requireVerifiedPageUser`, nav label "Profile", the
      old person glyph kept; skeleton variant renamed `about` → `profile`).
      Footer restructured to the design's brand block (© line stacked under the
      wordmark) + Explore/Company link columns — Explore is logged-in and
      desktop-only (bottom nav covers it on mobile, a deliberate deviation).
      Sitemap keeps `/about`, doesn't list `/profile`. Done pre-launch on
      purpose: URL semantics churn is free while `OPEN_SIGNUP` is off.
      Verified live and on preview; merged via PR #6.
- [x] **16. Design sync: gallery deep-link + trip sidebar + polish** _(design
      update, 16 July 2026)_. Trip detail sidebar per design: "View full
      gallery" as the solid primary, deep-linking
      `/gallery?country=<trip country>`; "Edit this memory" demoted to an
      accent text link — both hrefs passed only by the owner page, so public
      `/t/`/`/u/` views can't render them. Gallery accepts `?country=`,
      validated against the user's real country list (unknown → All; value
      renders only as React text; security dig found no exposure — the filter
      runs client-side over the viewer's own photos and referrer policy keeps
      the query string off third parties). Polish: the four app H1s to
      `clamp(34px,5vw,50px)`/-1.2px, card headings to real `<h2>`s at 16px,
      18px card radius + the design's horizontal padding clamp (vertical
      rhythm per card preserved), TripForm no-pin prompt ("Search above to
      drop a pin…"). The design's pin line and Save `flex:1` turned out to
      already match. Verified live and on preview; merged via PR #6.
- [x] **22. Seed photo preview on the new-trip page** _(3 August 2026)_. "Start
      from a photo" confirmed a pick with a filename and nothing else; it now
      shows a 72px thumbnail beside the filename and status note.
      `createPreviewUrl` (`src/lib/photos/preview.ts`) decodes the buffer
      already read at pick time, downscales to 320px via the existing
      `scaledDimensions`, and returns an object URL — measured in real
      Chromium at 3840×2160/1.39MB in → 320×180/10.5KB out. **Downscaling is
      the point, not an optimisation:** pointing an `<img>` at the file costs
      no decode but holds the full raster for as long as the form is open
      (~48MB for a 12MP photo), which is the retention trade-off task 21
      warns about. It wraps the buffer, never the `File`, so nothing re-reads
      the `content://` URI — that read is what broke EXIF on Android. The
      object URL's lifetime lives in one effect keyed on the URL, so replace,
      Remove and unmount are covered without any call site remembering; a
      preview whose pick went stale is revoked on the spot, since it never
      reaches state for the effect to see. Returns `null` where the browser
      has no decoder (HEIC in Chrome and Firefox, verified) and the card shows
      a one-line note instead. `.seed` became a flex row with `.seedBody`
      holding the old contents, so with no thumbnail it collapses to exactly
      its previous appearance. No unit test — `createImageBitmap` and
      `<canvas>` do not exist under vitest's `environment: 'node'`, the same
      reason `process.ts` has none; verified by bundling the real module with
      esbuild and running it in headless Chromium.
- [x] **23. Small non-interactive globe beside the pin on the new-trip page**
      _(3 August 2026)_. `Pin set · 35.012, 135.768` was the only feedback
      that a pin existed and it never said where; a 112px globe centred on
      the pin now sits beside it. Display only — no drag, zoom or click.
      `MiniGlobe` (`src/components/globe/MiniGlobe.tsx`) is a **pure function
      of `lat`/`lng`**: no effect, no refs, no cleanup. That is what
      satisfies "must react to every source that moves the pin" for free —
      `coords` is already the single source of truth for the place search,
      the photo's EXIF, "Use the photo's place" and clearing, so a component
      rendering from it cannot drift. Rotating to `[-lng, -lat, 0]` puts the
      pin at the centre by definition, leaving no projection maths to get
      wrong; unpinned it renders at the angle the home globe opens at.
      **It deliberately does not reuse `Globe.tsx`** — adding a
      non-interactive mode there would thread conditionals through the drag,
      pinch, wheel and auto-spin paths (the code behind the iOS
      tap-starvation and pinch-ordering bugs) to inherit features this globe
      does not want. Two notes for later. (a) The task text said "a second
      Three.js canvas" — **there is no Three.js in this project**;
      `Globe.tsx` is d3-geo drawing an orthographic projection into SVG. The
      real cost was `src/data/world-110m.json` (105KB), and it is not a
      second copy: the topology stays in one chunk shared with the home page,
      so `/trip/new` added ~12KB and `next/dynamic` was not needed. (b) The
      topology derivation and palette moved to `src/lib/globe/world.ts` so
      the two globes cannot drift on colour — the only edit to `Globe.tsx`,
      and proven a true no-op by rendering both versions in headless Chromium
      and comparing the SVG (identical, 197,071 chars). `Globe.tsx` still
      hardcodes its gradient ids, so `MiniGlobe` uses `useId()` (sanitised —
      React's format is not safe inside `url(#…)`) and the two can share a
      page later without colliding. No unit test: `projection.ts` already
      covers the only pure logic and the rest is SVG output, verified by
      server-rendering Kyoto, Sydney, Tromsø, null island and the unpinned
      state and reading the screenshots.
- [x] **24. Bigger globe pins with a photo inside** _(5 August 2026)_.
      Scaled back from the design file's lollipop; shipped on
      `design/age-of-sail`.
      **What was dropped, and why the phases changed.** The imported design
      (`Atlas Travel Site - Redesign.dc.html`, `_heartTexture`) specified a
      circular head on a glowing white stem with the tip on the coordinate, a
      pulsing additive halo and a hover tooltip. None of that shipped. The
      logged phases were: A shape and ink, B photo, C public globes. **Phase A
      was cancelled** — the pin keeps its existing concentric-circle form and
      only its radius changed. **Phase B is what landed.** **Phase C stays
      deferred**: the public globes are untouched.
      **Sizes.** Dot `r` 6 → **11** (22px across), halo 15 → 20, hover 9 → 14.
      Below about r=10 a thumbnail is indistinguishable from a colour swatch;
      above r=13 a clustered group like a European tour starts to overlap
      badly on a sphere that rests at ~209px radius.
      **The white rim stays — correcting what this task used to say here.** It
      instructed replacing the rim with a sepia ink rule. That was right
      against the parchment palette task 26 first tried, and wrong after task
      26 settled on a dark `#2c4e46` sea, where the white reads as a crisp
      highlight and earns its place. Verified by rendering.
      **`GlobePin` gained `thumbUrl` and `gradientSeed`, both optional.**
      `id` could not be reused for either: all three call sites pass the
      array index and read it back in
      `onSelect={(id) => setSelected(Number(id))}`. Optional fields mean
      `LoggedOutHome` and `PublicGlobe` needed no edit and keep plain accent
      pins. `LoggedInHome` passes `item.thumbUrl` and `item.id` and nothing
      else moved — `HomeTrip` already carries the thumb because
      `src/app/page.tsx` fetches `tripCovers()` for the "Your Pins" cards, so
      the pin is the same URL the card requests, a browser cache hit, no extra
      query and no extra network. Pin and card therefore always show the same
      photo.
      **`coverGradientPair(seed)` added to `src/lib/photos/gradient.ts`.** SVG
      needs `<linearGradient>` stops, not a CSS string; `coverGradient` now
      builds its string from the same function so `GRAD_PAIRS` stays one
      source of truth, with a test asserting the pair's colours are the ones
      the CSS embeds. The angle is deliberately not exported — every real call
      site takes the default index, so the `ANGLES` variation is effectively
      dead, and at 22px it is imperceptible.
      **Images live in `<defs>` and are created once.** `drawPins` wipes and
      rebuilds the pin layer every frame and the desktop rAF loop re-arms
      unconditionally, so appending an `<image>` per pin per frame would
      re-decode thumbnails at 60fps. `ensurePinFills` appends a
      `<linearGradient>` and a `<pattern>` the first time it sees a pin and
      skips them thereafter. It is called from `drawPins`, not from one-shot
      setup in the effect body, because `pins` changes through `pinsRef`
      without re-running the effect. **This is what let the hot loop stay
      untouched — no data-join refactor, and nothing near the drag, pinch,
      wheel or auto-spin paths.**
      **Three stacked circles, gradient under photo.** A thumbnail that is
      still loading, or whose signed URL has expired after its hour
      (`READ_EXPIRY_SECONDS`), simply reveals the gradient beneath it, so
      there is no `onerror` handling to get wrong. Each pin is now a `<g>` so
      hover grows the whole face; the ring carries `pointer-events="all"`
      because with `fill: none` only its 2px stroke would otherwise be
      clickable.
      **Def ids are namespaced per instance** off `useId()`, sanitised the way
      `MiniGlobe` does. `globe-vignette` and `globe-shadow` were hardcoded, so
      two globes on one page would have collided; per-pin ids would have made
      that worse.
      **Verification.** Rendered the real `Globe.tsx` in Chromium with a mixed
      set — a clustered European group, photo pins and photo-less pins.
      Structural check: 4 images, all 4 inside `<defs>`, 4 patterns, 8
      gradients, 12 faces, and the image count does not grow with redraws.
      Hover measured `[20, 11, 11, 11] → [20, 14, 14, 14] → back`, so both
      faces and the ring grow while the halo holds. Click round-tripped
      `selectedId: "2"` for the third pin, which is the index contract most
      likely to break. Gates green: format, lint, typecheck, 370 tests, build.
      **Harness note for next time:** under Chrome's `--virtual-time-budget`,
      rAF fires exactly once and `performance.now()` never advances, so the
      globe's 950ms focus animation can never complete and anything behind it
      silently no-ops. Interaction tests need real time and a `fetch` back to
      a logging server; static screenshots are fine under virtual time.
- [x] **25. Typography — Playfair Display → EB Garamond** _(5 August 2026)_.
      DM Sans stays. One serif site-wide, two faces total. Landed on
      `design/age-of-sail`, not `dev`.
      **Why this and not the design file's pairing.** The imported design
      proposes Cinzel + Nunito Sans; both rejected. Cinzel is inscriptional
      Roman capitals — no true lowercase, effectively no descenders, and no
      italic at all — so it cannot carry sentence-length headings. Nunito Sans
      was a lateral move from DM Sans that bought a change of flavour for a
      full-app migration. IM Fell was considered for the age-of-sail direction
      and rejected on two mechanical grounds: every cut is `latin` only with no
      `latin-ext`, so Central and Eastern European place names (Gdańsk, Łódź,
      Plzeň, Košice) would render half in a fallback; and it ships one weight
      with no bold, so it cannot express hierarchy. Fraunces lost on period —
      its Windsor/Cooper lineage is 1900s–20s soft display, which argues with
      engraved cartography rather than supporting it. EB Garamond is the right
      family tree for the era, has a true chancery italic (load-bearing for
      task 26), a variable weight axis, and `latin-ext` and beyond so no place
      name breaks.
      **Correction — it does _not_ have small caps.** The Google Fonts build
      exposes only `dnom frac liga locl numr pnum rlig tnum`; there is no
      `smcp`. An earlier note here claimed real OpenType small caps as a reason
      for choosing it. That was wrong, and task 26 has been amended. The italic
      was the larger reason and is unaffected, so the choice stands.
      **Correction — figures are oldstyle with no lining alternate.** Digits
      3, 5, 7 and 9 descend below the baseline across seven distinct heights,
      and there is no `lnum` feature to switch. `.otpCell` therefore moved to
      `--font-sans`: six boxed digits at seven heights reads as a rendering bug
      on the login flow. `.statValue` and `.priceValue` kept the serif.
      **Cost: +6 KB, measured.** `latin` woff2, like for like — Playfair roman
      38.5 KB → EB Garamond roman 44.2 KB. The earlier "the swap makes the site
      lighter" claim was true of the Cinzel/Nunito pairing only and does not
      carry over. The italic is a separate +47.8 KB, deferred to task 26. The
      OG asset went the other way: `playfair-700.ttf` 123.5 KB →
      `eb-garamond-600.ttf` 54.6 KB.
      **What changed.** `layout.tsx` swapped `Playfair_Display` for
      `EB_Garamond` and both CSS variables were renamed by role —
      `--font-playfair` → `--font-serif`, `--font-dm-sans` → `--font-sans`,
      across 13 CSS references in `globals.css` and the `profile`, `timeline`,
      `pricing`, `ContentPage` and `Nav` module CSS. The rename is the point:
      the next serif change is now one line in `layout.tsx`.
      **The optical pass — 38 sizes, from measured metrics not guesswork.**
      EB Garamond's x-height is 0.418 em against Playfair's 0.517 and DM Sans's
      0.504; cap height 0.654 against 0.708. So matching x-height needs ×1.24
      but matching cap height needs only ×1.08 — lowercase headings and the
      single-capital avatars want very different corrections. Rendering every
      real string at its real size in both faces and comparing settled the
      bands actually used: **≥36px ×1.10, 22–30px ×1.15, ≤20px ×1.18, and
      ×1.08 for the two avatar initials** (`Nav .avatar` 15→16,
      `profile .avatar` 26→28), which are cap-height-only sites. 23 sizes in
      module CSS, 15 inline in TSX.
      **No weight bumps.** The plan called for 500 rather than 400 near body
      text. The render says otherwise — at the corrected sizes the strokes are
      already proportionally thicker, and w500/w600 read heavier than Playfair
      did. Every weight is unchanged.
      **OG cards.** `fonts.ts` now loads `eb-garamond-600.ttf` as
      `'EB Garamond'` weight 600 (`OgFont['weight']` widened from
      `400 | 500 | 700` to `400 | 500 | 600`), and the four
      `'Playfair Display'` literals in `card.tsx` became `'EB Garamond'` with
      `fontWeight` 700 → 600. Satori will not take a variable font — the
      shipped TTFs have no `fvar` — so the static cut is sourced by asking
      Google Fonts with a UA that supports neither woff nor woff2
      (`curl -A "Mozilla/5.0 (Linux; U; Android 4.0.3; …)" "https://fonts.googleapis.com/css?family=EB+Garamond:600"`
      returns a TTF URL). Verified by rendering all three data-free routes and
      measuring the ink: the heading sets 690px wide against EB Garamond's
      701px and Playfair's 805px, so the swap took. Eyeballing alone had me
      call it wrong — measure this one.
      **The hero italic is unchanged, not regressed.** `layout.tsx` never
      requested Playfair's italic either, so `LoggedOutHome`'s "mapped." and
      `timeline .endNote` were already synthesised obliques. Rendered all three
      side by side: EB Garamond's synthesised oblique is no worse than
      Playfair's was, and the true chancery italic is a marked upgrade — which
      is task 26's to deliver.
      Gates green: format, lint, typecheck, 367 tests, build.
- [x] **26. Give the globe a distinct, polished look** _(5 August 2026)_.
      Retitled from "age-of-sail treatment": the literal chart styling was
      tried and mostly abandoned. What landed is a palette inversion and the
      chancery italic. On `design/age-of-sail`, on top of task 25.
      **The palette is the whole thing, and value beat hue.** Both the
      original green and the sepia this task first shipped put land and sea at
      almost the same lightness, so the continents never resolved — which is
      why the sepia read faded rather than considered. Eight palettes were
      rendered on the real globe and compared; every one that looked polished
      inverted the value. Chosen: **pale continents on a dark sea.** Water
      `#9ecdb6` → `#2c4e46`, coastlines and borders `#66a07e` → `#1c3a33`,
      graticule `#86b89a` → parchment `#e4dcd0` at 0.16 opacity (a pale line
      on a dark sea wants a fraction of the opacity a green one did). Land
      stays `#e4dcd0`. The sea is **`--forest`, already the stats band, the
      footer and the sign-in button**, so the globe adds no new colour to the
      product and now rhymes with the page instead of sitting apart from it.
      **The white atmosphere rim is gone.** `appendAtmosphere` — a white
      radial glow at 0.22 opacity — and its circle are deleted. That is what
      made the globe read as a backlit sphere. The vignette carries the
      dimension instead, warmed and deepened to `rgba(0,0,0,.28)`, and the
      shadow ellipse now casts in forest, `rgba(44,78,70,.22)`.
      **Correction to what this task used to claim.** It said
      `GLOBE_COLORS.stroke` (`#fff`) was "the single most contemporary thing on
      the page". It is not a globe outline — it is used in exactly two places,
      `Globe.tsx` and `MiniGlobe.tsx`, and both are the _pin's_ rim. See the
      note to task 24 below.
      **The vignette stops moved into `world.ts`** as `GLOBE_VIGNETTE`. They
      were duplicated between `Globe.tsx` and `MiniGlobe.tsx`; centralising is
      what stops the two globes drifting, the same reason `GLOBE_COLORS`
      exists. `MiniGlobe` took the whole palette with no other edit, verified
      at 112px for Kyoto, Sydney, Tromsø and unpinned.
      **Rhumb lines were built, then reverted.** A full portolan wind-rose
      network shipped first: `src/lib/globe/rhumb.ts` with great circles from
      the destination-point formula, emitted as a MultiLineString because
      `geoPath` under `clipAngle(90)` closes a Polygon along the limb, plus 9
      unit tests. It was reverted on the call that a rhumb network is a _chart_
      device — on a globe it converges on an arbitrary point and reads as
      decoration, where a graticule is the honest geometry of a sphere. The
      graticule is back exactly as it was, at the new colour and opacity, and
      `rhumb.ts` is deleted. Recorded here because the reasoning is worth more
      than the code was: if it is ever revisited, draw it _over_ the land, not
      under, or the lines stop dead at every coastline and read as a clipping
      bug.
      **No compass rose, no cartouche.** Not wanted.
      **The chancery italic now loads** — one line in `layout.tsx`
      (`style: ['normal', 'italic']`). No per-site work was needed:
      `.detailPrompt`, `.detailQuote`, `timeline .endNote`,
      `TripDetailBody .quote` and `LoggedOutHome`'s hero "mapped." were already
      `font-style: italic` on the serif and were rendering synthesised
      obliques. All five upgraded at once, confirmed on the hero. Not a
      universal cost either — the browser fetches the italic only on pages that
      render italic.
      **Verification.** The globe does not render in the headless _page_
      harness (blank on the task-25 screenshots too, before any globe change),
      so everything visual was checked by bundling the real `Globe.tsx` and
      `MiniGlobe.tsx` with esbuild and rendering them in Chromium. Gates green:
      format, lint, typecheck, 367 tests, build.
      **Task 24 got easier, not harder.** Against sepia the pins' white rims
      looked conspicuously modern. Against the dark sea they read as a crisp
      highlight — the terracotta pops where before it competed with a mid-tone
      sea. The pin redesign no longer has to fight the palette.
- [ ] **27. Globe does not auto-spin on Android Chrome** _(fix shipped to `dev`
      7 August 2026; OPEN pending iOS)_. The
      globe sat still on a phone until you dragged it. Not a
      mystery — `Globe.tsx:428` skipped the idle spin whenever
      `matchMedia('(pointer: coarse)')` matches, so it is off on **every** touch
      device, not just Android. That guard is the fix for the iOS Safari
      tap-starvation bug in "Post-launch bugs": the spin redraws all ~177
      country paths every frame forever (nothing resets `lastInteraction` while
      you tap the page rather than the globe), and that continuous main-thread
      work starved tap/click dispatch on the sign-in form. So **do not just
      delete the guard** — that reintroduces a confirmed, much worse bug.
      **The fix is to scope the guard to the page that broke.** The harm was
      never the globe; it was a globe sharing a page with a _form_. There are
      three call sites and only `LoggedOutHome.tsx:134` has one — the auth
      card. `LoggedInHome.tsx:96` and `PublicGlobe.tsx:68` have no form at all,
      and the logged-in home is almost certainly where this was noticed. So:
      move the coarse-pointer skip out of `Globe.tsx` and behind a prop, and
      set it only on the logged-out home. About five lines. The spin returns on
      Android _and_ iOS everywhere except the one page with a confirmed bug,
      which keeps exactly the fix that works today. Note `autoSpin` already
      exists as a prop and no call site passes it, so it is dead as written —
      `autoSpin={false}` is too blunt here because it would also kill the
      desktop spin on that page.
      **Rejected: detecting iOS Safari and skipping only there.** It does not
      say what it means — every browser on iOS is WebKit, so Chrome and Firefox
      on iPhone starve identically and the real condition is "iOS", not
      "Safari". iOS is also hard to detect now: iPadOS 13+ reports as
      `Macintosh`, so `/iPad/` silently fails and needs a
      `maxTouchPoints > 1 && /Macintosh/` limb, a check that rots quietly and
      **fails open** — the worst direction, since it brings the tap bug back on
      a device we cannot test. It would also grant something never verified: we
      know Android Chrome did not show that symptom, not that a permanent 60fps
      redraw of ~177 country paths is acceptable there on battery.
      **Shipped alongside, not deferred: the root-cause fix.** Page scoping was
      logged on the strength of the old bug entry's "only that form — every form
      after login was fine". That evidence does not hold: every form after login
      (`/trip/new`, `/settings`) sits on a page with **no spinning globe**, since
      `MiniGlobe` has no animation loop at all. The observation is explained by
      "no spin on those pages", not by immunity — so the logged-in home's pin
      list and bottom nav were never actually tested under a spinning globe, and
      page scoping alone would have switched a 60fps loop back on over them.
      So `lastInteraction` is now also reset by a document-level `pointerdown`,
      and the spin parks whenever the user touches anything anywhere. All six
      previous writes were inside globe handlers, which is exactly why it never
      stopped while you tapped a form. Capture phase, because d3-drag stops
      propagation on the events it handles; **coarse pointers only**, so desktop
      keeps today's behaviour rather than stalling on every click.
      **Honour `prefers-reduced-motion` in the same change.** It gates the same
      switch from the other side and is one extra condition once you are already
      in there. The Phase 10 accessibility pass reaches CSS only —
      `globals.css:183` turns off `scroll-behavior` and the `.fade` animation —
      but the spin is `Globe.tsx:418` mutating a rotation inside a
      `requestAnimationFrame` loop, so no media query touches it. Someone with
      Reduce Motion on gets no fades and no smooth scrolling, and then the
      largest moving thing on the site rotating for as long as the tab is open.
      Add `matchMedia('(prefers-reduced-motion: reduce)').matches` beside the
      pointer check. **Drag-to-spin must keep working** — the setting means "do
      not move things at me unprompted", not "disable motion", and a drag is
      motion the user asked for, so this gates the idle auto-spin only. **No
      on-screen notice** explaining why it stopped: nothing looks broken, the
      globe still drags, and a label on the hero explains a deliberate OS
      setting back to the person who chose it.
      **Shape of the change.** `Globe` gains `spinOnTouch` (default true), set
      false only at `LoggedOutHome.tsx:134`, the one call site with the auth
      card beside it; `LoggedInHome` and `PublicGlobe` are untouched and get the
      spin back. The three-way decision moved to `shouldAutoSpin` in
      `src/lib/globe/spin.ts` — a pure predicate with 7 tests, following
      `projection.ts` next door. Worth extracting: three booleans is eight cases
      and exactly the shape that gets inverted later, and it is the only part of
      this task a test can reach.
      **Verified in a real browser, not just by gates.** The task looked
      untestable — no jsdom in the suite, and starvation itself cannot be
      reproduced headlessly — but the _spin decisions_ can be. Bundled the real
      `Globe.tsx` with esbuild and drove Playwright's cached Chromium over CDP,
      using `Emulation.setEmulatedMedia` for Reduce Motion and
      `setTouchEmulationEnabled` for `pointer: coarse`, then sampled the
      `.borders` path `d` attribute 600ms apart to tell moving from still.
      12/12: spins on desktop; does not under Reduce Motion; **drag still turns
      it** under Reduce Motion; touch emulation really does give
      `pointer: coarse`; spins on touch; a tap elsewhere parks it; the
      `spinOnTouch={false}` globe stays still on touch; a desktop click does
      _not_ park it (proving the listener is coarse-only); and
      `DOMDebugger.getEventListeners` shows one `pointerdown` listener on
      `document` after four remounts and zero after unmount, so the cleanup's
      `capture: true` is right — without it removal silently no-ops.
      One check failed first time and was **my harness, not the code**: a
      synthetic `MouseEvent` with no `view`, which d3-drag reads to bind its
      move/up listeners, so no drag ever started.
      **Confirmed working on Android Chrome** on the `dev` preview (7 August
      2026). **Still open: iOS Safari has not been tested**, which is the whole
      reason the guard existed — emulated coarse pointers prove the branching,
      not that WebKit's tap dispatch survives a spinning globe. Two things to
      check before ticking this: the logged-out sign-in taps have not regressed,
      and the logged-in home's pin list and bottom nav respond on the first tap
      while the globe turns. If either is flaky, the fallback is one line —
      `spinOnTouch={false}` on `LoggedInHome` too.

### Tier 4 — hygiene / post-PMF

- [ ] **13. Re-encode the legacy PNG-as-webp objects in R2.** Photos uploaded
      from Safari/Firefox before the JPEG-fallback fix are PNGs stored under
      `.webp` keys with an `image/webp` content-type (~6MB displays, ~200KB
      thumbs). They display fine (browsers sniff the real format) but waste
      storage/bandwidth. One-off script (e.g. sharp server-side); low
      urgency.
- [x] **14. Investigate `prettier --write` not persisting locally**
      _(24 July 2026 — could not reproduce; no defect)_. The original report:
      during the mobile-polish commit `prettier --write progress.md` reported
      success but `prettier --check` kept failing on the same file, and the
      workaround was to redirect stdout to a temp file and move it back.
      Re-tested end to end and none of it reproduces. `--write` persists (the
      file's md5 changes); the exact reported cycle works (perturb →
      `format:check` flags `progress.md` → `format` → `format:check` clean);
      and prettier is idempotent on `progress.md`, on its content as of the
      mobile-polish commit `b63e824`, and on adversarial markdown (deeply
      nested lists, mixed 2/4/6/8-space continuations, loose ordered items, a
      pipe table with backticked pipes). Crucially the version is not a
      factor: `b63e824` locked prettier `3.9.4`, the same version running
      now — so no since-fixed upgrade explains it. Nothing intercepts writes
      either: no git hooks, no husky/lint-staged, no Claude hooks. The likely
      cause was environmental — a dirty VS Code buffer for `progress.md`
      re-saved over the CLI's write — which no code change can prevent.
      **`npm run format` is trustworthy locally; the workaround is retired.**
      Two findings came out of it. (a) The VS Code Prettier extension
      (`esbenp.prettier-vscode` v12.4.0) bundles prettier `3.7.4` while the
      repo locks `3.9.4`. Output is byte-identical today, but format-on-save
      drifting from `format:check` is exactly this bug's shape, so
      `.vscode/settings.json` now pins `prettier.prettierPath` to
      `./node_modules/prettier`. (b) Prettier 3 reads `.gitignore` as a
      default ignore path, not just `.prettierignore` — verified by probe.
      So the `book/` line in `.prettierignore` is **not** redundant with
      `/book/` in `.gitignore`: the extension's `prettier.ignorePath`
      defaults to `.prettierignore` alone, making that line the only thing
      stopping format-on-save reflowing the book chapters. Don't delete it.
- [ ] **20. Feasibility study — Mapbox GL globe vs the current custom globe**
      _(RESEARCH)_. Evaluate replacing the in-house globe
      (`src/components/globe/Globe.tsx` — d3-geo drawing an orthographic
      projection into SVG; there is no Three.js in this project, only in the
      design mocks) with a Mapbox GL JS globe-projection
      map. Study only — no swap, and the full-bleed globe stays exactly as-is
      until the study says otherwise. Weigh: bundle size and runtime cost vs
      the current renderer; Mapbox pricing at expected map-load volume (free
      tier limits and per-load cost past them); real coastlines/labels/zoom
      against the current stylised look; the pin, halo and accent-colour
      styling we'd have to re-create; SSR and `opengraph-image` compatibility
      (Mapbox GL is client-only, so the OG share cards can't use it); access
      token / secrets handling; and offline and mobile performance. Deliver a
      recommendation plus a rough migration cost. Low urgency.
- [ ] **21. Seed photo is read and parsed twice.** `TripForm.readSeedPhoto`
      does `arrayBuffer()` → `sniffImageFormat()` → `readPhotoExif()` at pick
      time, and `processImage` (`src/lib/photos/process.ts`) repeats all three
      at save time, so a 15MB photo is loaded and its EXIF parsed twice.
      Harmless — the reads are sequential, and only the concurrent case ever
      broke anything — but it is duplicated work. Note the obvious fix is the
      wrong one: holding the buffer in React state while the form is open
      trades a transient spike for sustained retention, which is worse on a
      phone. Pass forward only the cheap results (sniffed format and
      `takenAt`) so `processImage` can skip `readPhotoExif` while still
      reading the bytes it needs to decode. Low urgency.
- [x] **28. Refactor `TripForm.tsx` — 688 lines against the repo's 300-line
      rule** _(6 August 2026)_. One file held the whole add/edit memory flow: a
      root component
      with 14 `useState` and 3 `useRef`, plus `PhotoSeed`, `PlaceSearch` and
      `Field` defined below it. It splits along seams that already exist.
      `PlaceSearch` (~75 lines) is self-contained — its own query state,
      debounce and result list, talking to the parent through one `onPick`.
      `Field` is presentational. The seed-photo flow is the big one (~300
      lines across `readSeedPhoto`, `fillFromPhoto`, `useSeedLocation`,
      `clearSeedPhoto`, the `seedPick`/`seedOwned` refs and the `PhotoSeed`
      view) and wants to be a hook plus a component, not more sub-components in
      the same file. What is left is a form that submits.
      **The risk is the provenance rules, not the line count.** `seedOwned`
      tracks which fields the photo filled versus which the user typed, so a
      later edit releases the right ones — those rules are written up under
      task 10 and are exactly the kind of thing a mechanical extraction
      silently inverts. `readSeedPhoto`'s `isStale()` guard against a second
      pick landing first is the same shape of hazard.
      **There is not one test on this file** (`src/components/trips/` has no
      test at all) and both `/trip/new` and `/trip/[id]/edit` render it, so
      characterisation tests over the provenance and staleness behaviour came
      first — extract second.
      **Done as a pure-logic extraction, no new dependencies.** The provenance
      rules became a reducer (`seed-fields.ts`) and the photo read became an
      async sequence with its collaborators injected (`seed-photo.ts`), both
      plain modules testable under the existing node vitest setup — the same
      shape as `src/components/home/format.ts`. `vitest.config.ts` and
      `package.json` are untouched. The alternative, jsdom plus Testing
      Library, would have stood up a whole component-test stack for one file
      when the risk we actually named is pure logic.
      **The reducer is what retired the refs.** `fillFromPhoto`'s functional
      `setValue((current) => …)` existed only to read fresh state after an
      await, and `coordsRef` mirrored `coords` for the same reason; a reducer
      gets both for free, so `shouldOfferSwap(state)` is now an exported
      predicate. `seedPick` stays a ref in the component and reaches the
      sequence as an injected `isStale()`, which is what makes the
      abandoned-pick path assertable — including that a preview belonging to a
      superseded pick is revoked, since state never reached it and the cleanup
      effect will never see it.
      **34 new tests** (367 → 401, 59 → 61 files) over both the rules and every
      branch of the read. The one they exist for: a photo read defers to a
      hand-typed place name, but "Use the photo's place" deliberately overwrites
      it — one action away from each other and easy to collapse by accident.
      **One behaviour changed, deliberately.** Picking an over-50MB file while
      an earlier read was still in flight used to leave `seedBusy` true, so
      "Reading the photo…" hung there forever; the size-check branch cleared
      the file and note but never the busy flag. It was not a targeted fix: the
      old code had two rejection branches clearing different subsets of the same
      four fields, and collapsing them into one `photoRejected` action means
      deciding what "rejected" is as a state, which is all four cleared. A test
      starting from a mid-read state pins it, and was checked by reverting the
      one word and watching it — and only it — fail. Everything else is
      byte-for-byte the same behaviour, note strings included.
      **Result**: `TripForm.tsx` 688 → 287 lines, and six files beside it, all
      under 300. `PlaceFields.tsx` was not in the plan — the extraction alone
      landed at 340 because inline `dispatch` objects are longer than the old
      setters, so the search box, place name, country and pin row moved out
      together as the one place a location gets set. Gates green: format, lint,
      typecheck, 400 tests, build, and `/trip/new` serving 200 in dev.
      **Not verified by a human in a browser** — the photo-pick flows in the
      plan's manual pass need a real device and a logged-in session.
- [x] **30. Optimise for AI answer engines and search (GEO/SEO)**
      _(11 August 2026)_. Task 9 built
      the base layer — `/guides` hub-and-spoke, branded OG cards, per-page
      `metadata`, sitemap, robots. This is the layer above it, aimed at being
      **quoted** by ChatGPT, Claude, Perplexity and AI Overviews rather than
      just ranked. Audited the current state and scoped it to three phases.
      **Deliberately excluded, after scoping**: new `/guides` spokes (the only
      item with an ongoing content cost, and speculative), and rewriting the
      existing statement-shaped H2s into questions (marginal gain, and it makes
      good prose worse — "Why private, and not a public feed" beats "Why should
      a travel map be private?"). An `llms.txt` rides along as an optional
      passenger, never as a deliverable — no engine commits to honouring it.
      **Phase A — decisions and hygiene, one sitting.** The crawler policy comes
      first and nothing else ships before it. `robots.ts` names no AI crawler,
      so the catch-all allows every one. Split them by purpose rather than
      treating "AI crawler" as one switch: the **citation** bots
      (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`) are the entire
      point of this task, while the **training** bots (`GPTBot`, `ClaudeBot`,
      `CCBot`, `Google-Extended`, `Applebot-Extended`) cost approximately
      nothing measurable to refuse. Note that `Google-Extended` gates Gemini
      training **only, not Google Search indexing** — the usual mistake is
      leaving it open believing SEO depends on it. Decision: allow citation
      bots, refuse training bots, and close `/u/[username]` to both. That is
      on-message for a privacy product — cite us, do not train on our users —
      and `/u/` being opt-in public meant "someone can visit my globe", not "my
      travel history is in a training corpus". **Do not oversell it**:
      robots.txt is advisory and stops only the compliant. Bot names rot, so
      verify each against its vendor's docs at implementation time.
      Also in phase A: `alternates.canonical` per page, since only
      `metadataBase` is set (`layout.tsx:22`) and the home page takes
      `?invite=` and `?signup=`, so signals split today. And `sitemap.ts` sets
      `lastModified: new Date()` on all nine routes, so every deploy claims
      every page changed, which trains crawlers to distrust the field entirely.
      Drop the blanket value; hardcode real dates on the guides only, where
      freshness actually means something.
      **Phase B — JSON-LD, the largest single gap.** `grep schema.org` returns
      nothing. This is how an answer engine learns what the product is, what it
      costs and who publishes it. Wants `Organization` plus `WebSite` at the
      root, `SoftwareApplication` with `offers` on `/pricing`, and `Article`
      plus `BreadcrumbList` on the guides. No dependency — a `<script>` tag in
      the existing layouts. **Generate the offers from `pricingTiers()`**
      (`src/lib/billing/pricing.ts`), already the single source of truth for
      free, $39 annual, $5 monthly and $99 lifetime, so the schema cannot drift
      from the page — and mismatched JSON-LD is worse than none, since Google
      reads it as a quality signal. `PricingTier.price` holds a display string
      with a currency symbol, so add numeric amount and currency fields to the
      tier rather than parsing that string, which would be exactly the
      fragility worth avoiding.
      Builders are pure functions, so they test under the existing node vitest
      setup the way `src/lib/globe/spin.ts` does.
      **Phase C — two bounded edits to pages that already exist.** Not a content
      programme. (a) A comparison **table** on
      `/guides/polarsteps-alternative`, which already makes the comparison in
      prose — tables get extracted verbatim, so this is the highest-yield hour
      in the task. Competitor claims must stay factually current; they age
      badly and cost trust when they do. (b) An FAQ section on `/pricing`,
      roughly six questions already answered in support, with claims consistent
      with `/privacy` and `/terms` per task 9's house rule. **Note on
      `FAQPage` schema**: Google restricted FAQ rich results to government and
      health sites in 2023, so it will not produce snippets here. The FAQ earns
      its place as content answer engines parse, not as markup — do not add the
      schema expecting rich results.
      **Expectation setting.** A and B make the site _eligible_ to be quoted; C
      is what gives an engine something to quote. AI citations have no reliable
      measurement yet, so no dashboard will confirm any of this worked. Same
      6–12 month clock task 9 noted. Static build only, no schema or migration.
      **Found while auditing, deliberately not in scope**: `/pricing` and both
      guides are `export const dynamic = 'force-dynamic'`, because they call
      `getServerSessionUser()` for the nav — so every crawler hit does a DB
      session lookup and nothing is CDN-cached. That hurts TTFB and crawl
      budget, but fixing it means splitting the viewer-dependent nav out so the
      shell can be static. Real refactor risk for a performance win, not a GEO
      one. Its own task if it is worth doing.
      **Shipped as four commits** (`07cccd1`, `76a30e2`, `c457ba3`,
      `210f07c`), 437 tests green, no schema or migration.
      **A.** `robots.ts` now splits crawlers by purpose. The trap worth
      remembering: a crawler obeys exactly one group — its most specific
      `User-agent` match — and inherits nothing from `*`, so the citation group
      has to repeat the private-route disallow list or naming those bots
      _grants_ them what the catch-all keeps out. Tests pin that inversion, and
      the rendered `robots.txt` was read group by group rather than trusted
      from source. Canonicals added everywhere (the home page's `?invite=` /
      `?signup=` were splitting signals); `sitemap.ts` stopped claiming every
      page changed on every deploy, with the two guide dates moved into a new
      `src/lib/seo/guides.ts` so the sitemap and `Article` schema read one
      source.
      **B.** JSON-LD via pure builders in `src/lib/seo/schema.ts`. `offers`
      generate from the same `pricingTiers()` the page renders — verified both
      ways, with and without `PADDLE_PRICE_LIFETIME`, so schema can never
      advertise a tier the page hides.
      **The bug worth recording**: the first version emitted a bare top-level
      array where a page had several entities. Valid JSON-LD, badly supported —
      a consumer reading `parsed['@context']` gets `undefined` on an array and
      throws, which it did, in the browser console on a dev run. The `curl`
      checks had confirmed the content was correct and never that it was
      _consumable_; reading valid-looking JSON is not the same as checking
      something can parse it. Now `jsonLdDocument()` builds a real document —
      one top-level `@context`, `@graph` for several entities, a lone entity
      inlined.
      **C — verification first, and it found more than expected.** Four
      inaccuracies on live pages, three of them corrected in `07cccd1`:
      `/privacy` claimed the capture date was "the one thing we read" from EXIF
      (untrue since task 10 added GPS pin suggestions); `/privacy` and both
      guides described the share link as the only path to visibility, omitting
      the two-switch public globe; `/terms` still said deletion was email-only,
      contradicting `/privacy`, which task 12b had already updated.
      **And we had mischaracterised Polarsteps.** The guide called them "a
      public trip profile"; their own support docs say the default is
      **Followers**, with "Only me" and "Public" as the alternatives, and the
      live dot is hideable. Overstating a competitor's publicness on a page
      whose entire argument is a privacy contrast is the one claim a reader
      would check. Reframed to social-vs-solitary — accurate, and a sharper
      contrast anyway, since the real difference is that they are built around
      an audience and we have no social graph at all.
      Then the content: a five-row table (each row traceable to their docs,
      with a dated "checked on" note, and the planned EXIF row **dropped**
      because their EXIF handling was never verified and an unsourced
      competitor claim is not worth a row), and six FAQ answers cross-checked
      against `/terms`, `/privacy` and `/refunds`. `ContentPage.module.css` had
      no table styles; the table scrolls in its own wrapper, verified in
      headless Chromium at 360px — 520px table in a 320px container, document
      still 360 and not scrolling sideways.
- [x] **31. Analytics — measure the product without breaking the promise**
      _(12 August 2026)_.
      **The constraint comes first, because it rules out most of the market.**
      The site publishes "no analytics" in six places, and `/privacy` makes it
      specific and checkable: "There is no Google Analytics, no pixel, no
      session recorder. The only third-party code that ever loads is Cloudflare
      Turnstile on the signup form and Paddle on the checkout." `/about` says
      privacy is "the reason the product is shaped the way it is", and
      `/guides/polarsteps-alternative` leans on it against a named competitor.
      **Any client-side analytics script breaks that literally**, however
      privacy-respecting the vendor. Google Analytics is named as absent, so it
      is not a candidate at all.
      **What that leaves is better than it sounds**, because most of what is
      worth knowing is already in Postgres and needs no new collection.
      **Part 1 — product metrics, shipped as a tested library, not saved SQL.**
      The task originally said "ship it as saved SQL first" — deviated on
      purpose, because a metric nobody can verify is worse than none, and the
      repo already has the integration-test harness to prove each one against
      seeded rows. `src/lib/metrics/queries.ts` + `npm run metrics`
      (`scripts/metrics.ts`, following `create-invite.ts`'s pattern). Reports
      plan mix, activation (first memory within 24h), free-ceiling pressure,
      median trips/photos per user, activity retention, and conversion.
      **A real bug the tests caught, not just exercised.** Three metrics
      (`depth`, `activityRetention`) failed on first run with medians and
      counts of zero. Cause: Drizzle qualifies column names for tables in the
      query's FROM/JOIN graph, but a table referenced only inside a raw `sql`
      subquery gets **bare** names — so `trips.userId = users.id` rendered as
      `"user_id" = "id"`, both resolving to `trips`, silently comparing the
      table to itself. No error, just a confidently wrong number. Fixed by
      rewriting both as joined derived tables instead of correlated
      subqueries; `activation`, `capPressure`, `planMix` and `conversion` were
      checked and were already correctly qualified. This is the argument for
      tested code over a `.sql` file settled in code, not in principle — a
      plain script would have shipped the bug.
      **Conversion needed a schema addition the task hadn't scoped**:
      `users.plan` is current state only, so "time to convert" was
      uncomputable from anything stored. New `plan_events` table
      (`id, user_id, from_plan, to_plan, reason, created_at`), appended by
      `updateBilling` in `src/lib/billing/webhook.ts` — **only on an actual
      plan change**, tested explicitly: `past_due` keeps a user paid and must
      not manufacture a conversion, `canceled` does record one. A table, not a
      `users` column: nothing in the session path selects it, so a deploy
      landing before the migration degrades to "the webhook can't append" for
      a moment rather than the outage a new `users` column causes. `user_id`
      is `ON DELETE CASCADE`, with a dedicated test — this is task 12b's
      `invites.used_by` bug, and a new FK referencing `users` is exactly where
      it would come back.
      **Migration `0002`'s grandfathered cohort would have flattered every
      number computed carelessly.** It backfilled every pre-existing user to
      `paid`; they never made a decision. `planMix` reports them as their own
      segment, and `conversion`'s denominator excludes them explicitly, with a
      test asserting the exclusion.
      **Three places the report refuses to print a misleading number.**
      Grandfathered accounts are labelled, not folded into "paid". Retention is
      labelled activity, not logins — `sessions` renews in place on a sliding
      30-day expiry and deletes logged-out rows, so it cannot answer "did they
      come back"; creating a memory or photo can. And an empty `plan_events`
      prints "no plan changes recorded yet", never `0%` — a confident wrong
      number is the actual failure mode for a metrics tool, more than a
      missing one.
      **Part 2 — Google Search Console, verified 12 August 2026.** DNS TXT
      record on a Domain property (covers apex, `www`, and both protocols in
      one verification; also the only method a Domain property offers, which
      is the point — no token committed to the public repo, no route to
      serve it). Sitemap submitted. This is the feedback loop task 30 needed —
      without it the JSON-LD and the guides ship with no way to tell whether
      they worked.
      Docs in `docs/OPS.md` § Measuring the product. 455 tests green (18 new),
      gates clean, no schema surprise: `plan_events` is additive, generated via
      `drizzle-kit generate`, checked into `drizzle/0007_clumsy_ultimates.sql`.
      **The blind spot, stated honestly.** Neither part can see anyone who
      visited and left without signing up, which is most people. Non-search
      referrals — Reddit, a newsletter, an AI engine's citation link — are
      invisible. That is the real price of the privacy claim, and it is
      accepted deliberately rather than overlooked.
      **Rejected**: Umami, Plausible, Cloudflare's beacon and Vercel Web
      Analytics. All are decent and some are free, but every one injects a
      script and would force rewriting the claim across six pages including the
      privacy policy — a weaker, less checkable claim on a product whose pitch
      is that it does not do this. Not worth a page-view count.
      **Worth a look if acquisition data ever becomes urgent**: Cloudflare Web
      Analytics is server-side and needs no beacon when the domain is proxied
      through Cloudflare. We already hold a Cloudflare account for Turnstile and
      R2, so the only question is whether DNS routes through their proxy.
      Free, zero code, and it would not touch the claim.
- [x] **32. Presigned photo uploads have no size ceiling and no orphan
      cleanup** _(10 August 2026)_. `R2Storage.presignPut` signed no
      `Content-Length` condition, so a verified user could `PUT` an
      arbitrarily large object straight to R2; the 8MB/1MB caps only got
      checked after the fact, and only if the client ever called back to
      `POST /photos` to record it. An object from a client that never called
      back — crash, or deliberately — had no DB row pointing at it and sat in
      R2 forever, with no lifecycle policy and no reconciliation.
      Shipped as two independent fixes rather than the staged-key +
      lifecycle-rule idea first sketched here. **Size binding**: the client
      already knows both blob sizes before requesting a presign; it now sends
      them, the server rejects anything over cap before a single byte moves,
      and the accepted size is bound into the R2 signature via
      `unhoistableHeaders: new Set(['content-length'])` — a real upload whose
      `Content-Length` diverges from what was declared gets
      `SignatureDoesNotMatch` from R2 itself, verified live against the real
      `dev` bucket (matching-size PUT succeeds, mismatched-size PUT rejected).
      **Orphan reaping**: new `scripts/reap-orphaned-photos.sh`, matching the
      existing two OCI-box cron scripts' style exactly, diffs R2's object
      listing under `photos/` against every `display_key`/`thumb_key` the
      `photos` table references and removes whatever's unreferenced and old
      enough that no legitimate upload could still be mid-flight;
      `DRY_RUN=true` by default since it runs unattended against real user
      data. A pure R2 lifecycle rule was rejected — it can't tell an orphan
      from a real photo under the current (unstaged) key layout — and so was
      restructuring the key scheme, which would add a Copy+Delete to every
      successful upload to solve what the cron already solves without
      touching the hot path. `docs/OPS.md` documents the script and gives it
      its **own** R2 token, separate from the backup job's read-only one, per
      task 33's least-privilege finding. Verified: gates green (410 tests),
      `shellcheck` clean, the diff/delete logic proven against the real local
      DB and a local filesystem standing in for R2 (seeded one real photo row
      plus matching files, added an unreferenced third file, confirmed only
      the true orphan was flagged and then removed), and a real upload
      through `/trip/new` on the `dev` preview confirmed the happy path is
      unchanged.
      **Correction, found running it on the real box (11 August 2026).** The
      script claimed psql was "already required by the other two scripts" —
      true of `rclone`, not psql; the OCI box has no native postgres client.
      Fixed to match `backup-neon.sh`'s own pattern instead of assuming a
      dependency that wasn't there: the DB query now runs inside a disposable
      `postgres:18` container (`DATABASE_URL` forwarded by reference via `-e`,
      expanded inside the container by a single-quoted `sh -c` so the secret
      never touches the host's own process list), rather than requiring a
      native client install. First real run on the box came back clean —
      connected to the real bucket and the real Neon database, reported "no
      orphaned photos found". Installed on the OCI cron at 03:45
      (`DRY_RUN=true`, staggered after both backups) — staying in dry-run for
      a few nights and watching `logs/reap.log` before flipping to
      `DRY_RUN=false`, rather than trusting unattended deletion against real
      data on the first pass.
- [x] **33. R2 API token scope isn't documented or
      asserted** _(11 August 2026)_. The R2 section of `docs/OPS.md` covered
      the CORS policy and the SDK checksum footgun but never said what
      **permissions** a token should carry. Cloudflare's token UI does not default to least privilege —
      "Admin Read & Write" across every bucket is two clicks away and looks
      unremarkable — so a token minted without guidance can reach far beyond
      the one bucket the app needs.
      **Split into four scoped tokens**, one per consumer, each Object-level
      (never Admin — `R2Storage` only issues `PutObject`, `GetObject`,
      `HeadObject`, `DeleteObject`) and each applied to a single bucket:
      `minnekart-app-prod` (RW, prod) and `minnekart-app-preview` (RW,
      `minnekart-dev`) in the matching Vercel scopes, `minnekart-backup-ro`
      (**read only**, prod) and `minnekart-reap-rw` (RW, prod) on the OCI box.
      The one that matters is app-preview: a Preview deploy holding a
      prod-capable token can delete production photos — the same env-scoping
      landmine the audit checklist already flags for `DATABASE_URL`, one layer
      down. Separate tokens make it impossible at the credential level rather
      than by convention. The backup token is read-only deliberately: a backup
      job that can write is a backup job that can destroy what it backs up.
      **Docs**: § Object storage gained an "API token scope" item with the
      four-token table, a new § Verifying token scope with negative `rclone`
      probes, and a note that rotating invalidates outstanding presigned URLs
      (1h signature, ~30min cache in `src/lib/photos/sign.ts`) so already-
      rendered pages lose images until reload — done now precisely because
      that costs nothing pre-launch. Env-var rows, the prod-vs-preview audit
      checklist and the `backup.env` comments all updated to match.
      **Verified on the real credentials**: prod key cannot reach the dev
      bucket and the preview key cannot reach prod, each confirmed by hand;
      backup token read-only and both box tokens prod-scoped, confirmed at
      mint time; Vercel redeployed after each env change. Surfaced en route
      that preview photos for rows copied from prod now fail to load — the
      expected and correct consequence of real bucket isolation, since the
      Neon `dev` branch is copy-on-write off prod and carries photo rows whose
      objects only exist in the prod bucket. No code change: token scope is a
      Cloudflare-side property, invisible to `src/lib/storage/r2.ts`.
- [ ] **34. Public pages are all `force-dynamic`, so nothing is CDN-cached.**
      Noted while auditing for task 30 and deliberately left out of it. **Eight
      public pages** carry `export const dynamic = 'force-dynamic'`:
      `/about`, `/pricing`, `/privacy`, `/terms`, `/refunds`, `/guides` and
      both guide articles. (`/profile` has it too, but that one is
      logged-in-only and legitimately dynamic — not part of this.)
      **Why they're dynamic**: each calls `getServerSessionUser()` to decide
      whether `ContentPage` renders `TopNav` or `PublicChrome`. That reads
      cookies, which forces dynamic rendering whether or not the export is
      there — so deleting the line alone changes nothing.
      **What it costs**: every crawler hit does a DB session lookup for a page
      whose content is identical for every signed-out visitor, and nothing sits
      on the CDN. That is worst exactly where it matters most now — these are
      the pages task 30 just spent its effort making quotable, and they are the
      slowest ones we serve. Bad for TTFB, and crawl budget is finite.
      **The fix is a real refactor, which is why it isn't a one-liner**: the
      viewer-dependent chrome has to come out of the static shell. Either the
      nav becomes a client component hydrating from `/api/auth/me`, or it sits
      behind a Suspense boundary so the shell prerenders and only the nav
      streams. Next 16's Partial Prerendering is the obvious thing to evaluate
      first, since it is built for this exact shape. Watch the logged-out flash
      of the wrong nav in either approach — that trade is the whole design
      question.
      Worth measuring before committing to it: check the actual TTFB difference
      on the `dev` preview rather than assuming, since Neon's pooled connection
      may already make the session lookup cheap enough not to matter.
      Performance work, not GEO work — ranking does not depend on it.
- Globe auto-spin as a `/settings` toggle _(BACKLOG, idea)_. Task 27 makes the
  spin follow the OS `prefers-reduced-motion` preference, which is the right
  default. An in-app toggle would go further: stop the spin without changing an
  OS-wide setting, or keep it while reducing motion everywhere else. Undecided,
  and not free — it needs a `users` column beside `globe_public`
  (`src/db/schema.ts:38`) and a card on `/settings` following
  `GlobeVisibility`, and a new `users` column downs every logged-in request
  until Migrate Neon runs. Revisit once the media query has shipped and we know
  whether anyone actually wants the override. The settings row is also the only
  place a "following your system Reduce Motion setting" explanation belongs —
  task 27 deliberately keeps it off the globe itself.
- Long tail _(BACKLOG, post-PMF by design)_: journey grouping, originals
  opt-in, map fine-tune pin placement, social/mobile/i18n — deferred until
  real usage data exists.
