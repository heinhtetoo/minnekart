# Minnekart — Post-Launch Backlog

Regroomed 15 October 2026. The parked work: items from the PRD's deferred list,
its non-goals, and follow-up notes left through the build. Nothing here is
scheduled — the numbered, ordered work lives in `progress.md`. Roughly ordered
by likely value.

## Product

- **Multi-stop journey grouping.** A pin is one place-visit; add a grouping
  layer over trips (no schema pain expected).
- **Original-resolution photo archival.** Web-optimised only today; `original_key`
  is reserved in the schema for a future opt-in.
- **Map fine-tune pin placement** — let users nudge a pin off the geocoded point.
  Task 20's Mapbox study bears on it: real zoom and coastlines would make
  nudging practical.
- **Globe auto-spin as a `/settings` toggle.** The spin already follows the OS
  `prefers-reduced-motion` setting (task 27), which is the right default. A
  toggle would go further: stop the spin without changing an OS-wide setting,
  or keep it while reducing motion everywhere else. Undecided, and not free —
  it needs a `users` column beside `globe_public` (`src/db/schema.ts`) and a
  card on `/settings` following `GlobeVisibility`, and a new `users` column
  downs every logged-in request until Migrate Neon runs. Revisit once we know
  whether anyone wants the override. The settings row is also the only place a
  "following your system Reduce Motion setting" explanation belongs — task 27
  deliberately keeps it off the globe itself.
- **Metrics dashboard on `/admin`** _(parked 12 August 2026)_. Task 31 shipped
  `collectMetrics()` and `npm run metrics`, and deliberately stopped short of a
  UI. Rendering today's numbers as a card is genuinely small — the data layer
  is done and tested, `/admin` already has the owner gate and `AppPage`, and
  `StatCell` is close to the display pattern. Call it half a day.
  **The cost is not in the card, it is in trends.** Every query returns a
  point-in-time scalar, so a card would show "27% activation" with no sense of
  direction — barely better than the CLI. Charting means bucketed
  (`date_trunc`) queries, each needing its own tests, a date-range concept
  threaded through, and rendering: there is **no chart library** in the
  project and only `d3-geo`/`d3-drag`/`d3-selection` (no `d3-scale`, no
  `d3-shape`), so it is either a new dependency in a repo that is deliberately
  spare about them, or hand-rolled SVG. Several days, not hours.
  **Two frictions worth knowing before starting.** The repo has no component
  tests (`environment: 'node'`, no jsdom), so only extracted pure formatting
  would be testable — the same trade every UI here already makes. And the
  queries would move onto a request path: `collectMetrics()` currently awaits
  six queries **sequentially**, so that is six Neon round trips per render,
  and the percentile and group-by queries do full table scans. Trivial to fix
  with `Promise.all` and irrelevant at current size, but it becomes a problem
  quietly rather than loudly.
  **The trigger for revisiting**: once `plan_events` has enough rows that
  conversion and time-to-convert stop returning null. That is the point trends
  exist, which is the point a UI beats a text report. Before then a dashboard
  is a nicer-looking way to read the same zeros, and it invites daily checking
  of numbers that cannot move yet.
  **Cheap thing to consider first**: have the CLI append each run's numbers to
  a snapshot table or JSON file. Costs almost nothing and means charts have
  history to plot on day one — the same reasoning that made shipping
  `plan_events` early worth it, since data only accumulates from the day you
  start collecting it.
- **"On this page" list for Terms and Privacy.** Both run to 9–12 sections,
  about 3,000 px on desktop and over 4,000 on phones, with no way to see the
  outline. A list of the section headings linking down the page would help.
  Noted during the redesign (task 35) and left out as a new feature.
- Social features (comments, likes, follows), mobile apps, i18n — long tail.

## Engineering follow-ups (from the build)

- **Refactor sweep after the redesign** _(logged 15 October 2026)_. Seven
  code files are over the 300-line rule (`Globe.tsx` 602, `PageSkeleton.tsx`
  441, `AuthCard.tsx` 415, `LoggedInHome.tsx` 360, `TripForm.tsx` 346,
  `metrics/queries.ts` 327, `LoggedOutHome.tsx` 323), plus three test files
  and nine CSS modules. Scope it rather than "the whole repo": an audit listing targets and
  payoff first, then one area per PR. **Wait for task 39 to ship** — it rewrites
  the home and public-globe files and takes the duplicated globe-stage code
  with it. The repo has no component tests, so rerun the screen-check tooling
  from the separate design repo against each step; any `Globe.tsx` change needs
  the owner's sign-off first. Best timed at a phase boundary.
- **Refresh `docs/BUSINESS.md`** _(logged 15 October 2026)_. Pricing still
  matches, but the roadmap (§5) and launch sequence (§4.4) were written on 10
  July, before billing, the domain, open signup and analytics shipped. Kept
  apart from task 40's factual PRD/README pass because its content — launch
  timing, the GTM plan — is the owner's call.
- **Signup validation gives no field-level feedback.** A too-short username (min
  3 chars, `usernameSchema` in `src/lib/auth/validation.ts`) or any other schema
  miss collapses into a generic `invalid_request` 400, and the signup form lets
  it through to the server without inline validation — a 2-char username just
  fails opaquely. Add client-side field validation and/or return which field
  failed (e.g. `username_too_short`) so the form can show a useful message.
