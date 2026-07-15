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
- [ ] **8. R2 photo backup job** _(BACKLOG, elevated)_. `rclone` sync R2 →
      the OCI box beside the Neon `pg_dump` cron. Elevated above its backlog
      slot: charging for "your entire travel history, safely kept" while
      photos are single-copy contradicts the value proposition. Cheap
      relative to the liability.
- [ ] **9. Marketing + SEO base layer.** Privacy as a marketed feature (a
      line on the logged-out home/marketing page). Two evergreen SEO pages to
      start: "how to keep a private record of every place you've travelled"
      and "Polarsteps alternatives that don't track your live location."
      Requires 1 (domain). Slow channel (6–12 months to rank) — ship early,
      leave to compound.

### Tier 3 — product polish (activation & paid experience)

- [ ] **10. EXIF GPS pin suggestions** _(BACKLOG)_. Prefill coordinates from
      photo GPS on upload. Sleeper pick: the ICP's first session is
      backfilling years of trips, and GPS prefill shortens both time-to-aha
      and time-to-hitting-the-15-pin cap.
- [ ] **11. Photo reorder** _(BACKLOG)_. Reorder endpoint + UI; `position` is
      currently set only at upload time. Paid-user quality of life.
- [ ] **12. Muted-text contrast → WCAG AA** _(BACKLOG)_. ~3.4:1 by design;
      bump if strict AA is wanted. Small, do opportunistically.
- [ ] **12b. Self-serve account deletion.** The privacy page promises deletion
      within 30 days of an email to `hello@minnekart.com` — honest, but manual,
      and it becomes a real support cost the moment signup opens. Needs a
      settings flow (confirm → delete user, trips, photos in R2, sessions) plus
      the same job reachable by an admin.

### Tier 4 — hygiene / post-PMF

- [ ] **13. Re-encode the legacy PNG-as-webp objects in R2.** Photos uploaded
      from Safari/Firefox before the JPEG-fallback fix are PNGs stored under
      `.webp` keys with an `image/webp` content-type (~6MB displays, ~200KB
      thumbs). They display fine (browsers sniff the real format) but waste
      storage/bandwidth. One-off script (e.g. sharp server-side); low
      urgency.
- [ ] **14. Investigate `prettier --write` not persisting locally.** During
      the mobile-polish commit, `prettier --write progress.md` reported
      success but `prettier --check` kept failing on the same file. The
      workaround was to redirect prettier's stdout to a temp file and move it
      back over the original. So `--write` may not be writing atomically in
      this dev environment. Check the prettier version and whether it
      reproduces on other files before relying on `npm run format` locally.
- Long tail _(BACKLOG, post-PMF by design)_: journey grouping, originals
  opt-in, map fine-tune pin placement, social/mobile/i18n — deferred until
  real usage data exists.
