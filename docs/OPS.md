# Minnekart — Ops Runbook

Launch and day-two operations. The app is on Vercel, Postgres on Neon, photos on
Cloudflare R2, CI on GitHub Actions.

## Environments

Two, and only two. `main` is production; `dev` is the preview. Work flows
`feature → dev → PR → main`.

| Branch    | Vercel     | Database          | Photos          | Paddle  |
| --------- | ---------- | ----------------- | --------------- | ------- |
| `main`    | Production | Neon prod         | prod bucket     | live    |
| `dev`     | Preview    | Neon `dev` branch | `minnekart-dev` | sandbox |
| any other | no deploy  | —                 | —               | —       |

`vercel.json` pins `git.deploymentEnabled` so only those two branches deploy.
Feature branches still run CI; they just don't get a preview URL — which is
deliberate, because a preview's origin has to be known in advance to be listed in
the R2 CORS policy, the Turnstile hostnames and the Paddle webhook destination.
`dev` has a stable alias (`minnekart-git-dev-<scope>.vercel.app`) that all three
point at; a feature branch's URL changes every push.

CI migrates whichever database matches the branch: a push to `main` runs
`drizzle-kit migrate` against `secrets.DATABASE_URL`, a push to `dev` against
`secrets.DATABASE_URL_DEV`. Both are Neon's **direct** (unpooled) host.

The Neon `dev` branch is copy-on-write off production, so it starts as a full
copy of prod data and costs almost nothing. When it drifts — a migration you
rewrote, test data you don't want — reset it from prod in the Neon dashboard
rather than untangling it.

**Don't turn on Vercel Deployment Protection for previews.** It 401s every
unauthenticated request, Paddle's sandbox webhook included, and billing on `dev`
would fail silently with no obvious cause.

## Environment variables

Validated at boot by `src/lib/env.ts` — a missing/invalid required var throws on
startup. Vercel scopes each var per environment, and the dashboard ticks all
environments by default: **the vars below must differ between Production and
Preview**, or the preview writes to production's data. Everything else can be
shared.

| Var               | Production        | Preview (`dev`)                                                                           |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Neon prod, pooled | Neon `dev` branch, pooled                                                                 |
| `APP_URL`         | prod domain       | the `dev` branch alias                                                                    |
| `EMAIL_TRANSPORT` | `resend`          | `console` — OTPs, resets and invites go to the Vercel function logs; nothing real is sent |
| `R2_BUCKET`       | prod bucket       | `minnekart-dev`                                                                           |
| `PADDLE_ENV`      | `production`      | unset (defaults to `sandbox`)                                                             |
| `PADDLE_*` ids    | live              | sandbox (ids differ between accounts)                                                     |
| `OPEN_SIGNUP`     | deliberate        | `true`, to exercise it                                                                    |
| `TURNSTILE_*`     | live keys         | the always-pass test keys                                                                 |
| `LEGAL_ENTITY_*`  | real values       | unset → placeholders                                                                      |

Full reference for every var:

| Var                     | Required     | Notes                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | yes          | Neon **pooled** connection string (host contains `-pooler`) for the Vercel runtime — see the pooling note below. Prod and Preview point at different Neon branches. Also two GitHub Actions secrets for the migrate job, `DATABASE_URL` and `DATABASE_URL_DEV` (use the direct/unpooled host in both).       |
| `APP_URL`               | yes in prod  | Public base URL; builds invite/share/reset links. Defaults to `http://localhost:3000`. In Preview, the stable `dev` branch alias — **not** a per-deployment URL, or emailed and shared links point at a deploy that has moved on.                                                                            |
| `NODE_ENV`              | auto         | Vercel sets `production`.                                                                                                                                                                                                                                                                                    |
| `SUPPORT_EMAIL`         | **yes**      | The address users reach you at. Printed on `/terms`, `/privacy`, `/refunds` **and** set as `Reply-To` on every outbound email. **Required in every environment** — a missing value fails the build (`sitemap.ts`/`robots.ts` parse env at build time). Must be a real inbox; registrar forwarding is enough. |
| `EMAIL_TRANSPORT`       | yes in prod  | `console` \| `memory` \| `resend` \| `smtp`. **`resend` in prod**, `console` in Preview.                                                                                                                                                                                                                     |
| `RESEND_API_KEY`        | when resend  | Resend API key (`re_…`). Secret. Sending access is all it needs.                                                                                                                                                                                                                                             |
| `EMAIL_FROM`            | when sending | e.g. `Minnekart <noreply@send.minnekart.com>` — the domain **must** be verified in Resend, or every send is rejected. This is the _sending_ address; replies go to `SUPPORT_EMAIL`.                                                                                                                          |
| `SMTP_HOST`             | when smtp    | Only for the fallback SMTP transport; unused on Resend.                                                                                                                                                                                                                                                      |
| `SMTP_PORT`             | when smtp    | `587` (STARTTLS — works from Vercel serverless).                                                                                                                                                                                                                                                             |
| `SMTP_USER`             | when smtp    | SMTP login.                                                                                                                                                                                                                                                                                                  |
| `SMTP_PASS`             | when smtp    | SMTP key (not an account password).                                                                                                                                                                                                                                                                          |
| `STORAGE_DRIVER`        | yes in prod  | `r2` \| `memory`. **Defaults to `r2`.**                                                                                                                                                                                                                                                                      |
| `R2_ACCOUNT_ID`         | when r2      | Cloudflare account id.                                                                                                                                                                                                                                                                                       |
| `R2_ACCESS_KEY_ID`      | when r2      | R2 token key id.                                                                                                                                                                                                                                                                                             |
| `R2_SECRET_ACCESS_KEY`  | when r2      | R2 token secret.                                                                                                                                                                                                                                                                                             |
| `R2_BUCKET`             | when r2      | Private bucket name.                                                                                                                                                                                                                                                                                         |
| `PADDLE_ENV`            | no           | `sandbox` \| `production`. **Defaults to `sandbox`** — set `production` when going live.                                                                                                                                                                                                                     |
| `PADDLE_WEBHOOK_SECRET` | for billing  | Notification destination secret (`pdl_ntfset_…`). Without it the webhook returns 503 and no plan changes apply.                                                                                                                                                                                              |
| `PADDLE_CLIENT_TOKEN`   | for billing  | Client-side token (`live_…`/`test_…`). Public-safe; enables the checkout overlay.                                                                                                                                                                                                                            |
| `PADDLE_API_KEY`        | for billing  | Server-side API key. **Secret — never expose it to the browser.** Powers in-app cancel / resume / update-card; without it those controls stay hidden and the routes return 503. Needs `subscription.read` + `subscription.write`. Sandbox key in Preview, live key in Production — never cross them.         |
| `PADDLE_PRICE_ANNUAL`   | for billing  | Price id (`pri_…`) for $39/yr. Checkout buttons hide without it.                                                                                                                                                                                                                                             |
| `PADDLE_PRICE_MONTHLY`  | no           | Price id for ~$5/mo. Optional secondary button.                                                                                                                                                                                                                                                              |
| `PADDLE_PRICE_LIFETIME` | no           | Price id for the $99 founding-member one-off. Set it to show the offer; **unset it to retire the offer** (time-boxed by env, no code change).                                                                                                                                                                |
| `OPEN_SIGNUP`           | no           | `true` \| `false`. **Defaults to `false`** (invite-only). Setting `true` in Vercel is the public-launch moment — see the open-signup section.                                                                                                                                                                |
| `TURNSTILE_SITE_KEY`    | for launch   | Cloudflare Turnstile site key (public-safe). Renders the CAPTCHA on the signup form.                                                                                                                                                                                                                         |
| `TURNSTILE_SECRET_KEY`  | for launch   | Turnstile secret. When set, signups without a valid CAPTCHA token are rejected. **Set both Turnstile vars or neither.**                                                                                                                                                                                      |
| `LEGAL_ENTITY_NAME`     | for billing  | Legal/trading name printed on `/terms`, `/privacy`, `/refunds`. **Kept out of the (public) repo — set here, never in code.** Falls back to the placeholder `HHO`.                                                                                                                                            |
| `LEGAL_ENTITY_ABN`      | for billing  | ABN printed beside the legal name. Same rule. Falls back to `ABN XXXX XXXX XXX`.                                                                                                                                                                                                                             |

**Two footguns to check in the audit:**

1. `STORAGE_DRIVER` defaults to `r2`, and the four `R2_*` vars are schema-optional
   — so a prod deploy with blank R2 creds **passes env validation but fails at
   runtime** on the first upload. Confirm all four are set in prod (or set
   `STORAGE_DRIVER=memory` if you deliberately want no real storage).
2. `EMAIL_TRANSPORT=smtp` needs all four `SMTP_*` vars **and** `EMAIL_FROM`; the
   transport throws a named error if any is missing.

**Neon pooling (page-transition latency):** the Vercel runtime opens short-lived
Postgres connections per serverless invocation, so `DATABASE_URL` must point at
Neon's **pooled** endpoint — the host with `-pooler` in it (PgBouncer,
transaction mode). Using the direct endpoint makes cold navigations pay a fresh
handshake and can exhaust connections. The app's two interactive transactions
(signup, password reset) use plain `BEGIN/COMMIT`, which work under transaction
pooling. The GitHub Actions migrate job should use the **direct** (unpooled)
host — DDL is safest on a session-mode connection.

### Prod-vs-preview audit checklist

Do this **before** the first `dev` push. Vercel ticks every environment when you
add a var, so the danger is a shared value, not a missing one — a Preview
`DATABASE_URL` still pointing at prod means the first `dev` deploy writes to
production and CI applies unreleased migrations to it.

- [ ] `DATABASE_URL` in Vercel points at the Neon **prod** branch in Production
      and the Neon **`dev`** branch in Preview, both on the **pooled**
      (`-pooler`) host. They are different values.
- [ ] GitHub secrets `DATABASE_URL` **and** `DATABASE_URL_DEV` both set, both on
      the direct (unpooled) host.
- [ ] `APP_URL` correct per environment (prod domain vs the stable `dev` alias).
- [ ] `EMAIL_TRANSPORT=smtp` + `SMTP_*` + `EMAIL_FROM` set in prod;
      `console` in preview.
- [ ] `STORAGE_DRIVER=r2` + all four `R2_*` set in prod (or `memory` on purpose),
      and `R2_BUCKET` is the **dev bucket** in Preview — a shared bucket lets a
      preview delete production photos.
- [ ] The dev bucket has its own CORS policy naming the `dev` alias as an
      allowed origin, or uploads fail preflight there.
- [ ] `PADDLE_ENV=production` + prod webhook secret/client token/price ids in
      prod; sandbox values in preview (never mix — sandbox tokens fail against
      live Paddle and vice versa).
- [ ] `OPEN_SIGNUP` deliberate per environment (`true` only once launched);
      both `TURNSTILE_*` keys set together wherever signup is open, with the
      `dev` alias in the widget's hostname list.
- [ ] `LEGAL_ENTITY_NAME` + `LEGAL_ENTITY_ABN` set in prod — otherwise the
      policy pages render the `HHO` / `ABN XXXX XXXX XXX` placeholders and
      Paddle's reviewer sees them.
- [ ] `SUPPORT_EMAIL` set in **both** Production and Preview. It is required, so
      a deploy without it **fails the build** — set it before merging anything
      that carries it. Send yourself an email and confirm the `Reply-To` header
      is this address and that replying to it arrives.
- [ ] Neon and R2 usage within free-tier quotas.

## Email (Resend)

Production sends through the **Resend API** (`EMAIL_TRANSPORT=resend`), not SMTP:
the OTP send sits inside the request that is blocking a user's signup, and SMTP
pays a TLS handshake plus several protocol round trips on every cold serverless
invocation. The `smtp` transport is still there (`src/lib/email.ts`) as a
provider-agnostic escape hatch, so nothing is locked in.

1. Create a Resend account and **add the domain**. A subdomain such as
   `send.minnekart.com` is the safer choice — it keeps the root domain's
   reputation separate from bulk sending.
2. Add the DNS records Resend gives you at Porkbun: **MX**, **SPF** (TXT) and
   **DKIM** (TXT), plus a **DMARC** TXT record. Wait for Resend to show the
   domain as verified — until it does, every send is rejected.
3. Create an **API key** with sending access → `RESEND_API_KEY` (secret).
4. Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` and
   `EMAIL_FROM=Minnekart <noreply@send.minnekart.com>` in Vercel **Production**.
   The from-address domain must be the one you verified.
5. Leave Preview on `EMAIL_TRANSPORT=console` — OTPs land in the Vercel function
   logs and the preview never sends anything real.
6. Monitor sends, bounces and complaints in the Resend dashboard.

### Sent from the subdomain, answered at the root

Mail goes out `From:` the verified sending subdomain, which has no inbox. So
every message also carries `Reply-To: $SUPPORT_EMAIL` — otherwise a user who
simply hits reply to their verification code is writing into a void.

That makes `SUPPORT_EMAIL` load-bearing in two places at once: it is the address
`/terms`, `/privacy` and `/refunds` publish (beside the promise "we answer
email"), and it is where replies actually land. One env var feeds both, so they
cannot drift apart. **Resend sends; it does not receive** — the inbox itself is
a forwarding rule at the registrar, and it has to work.

Local real-send smoke: put `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` and
`EMAIL_FROM` in `.env`, run `npm run dev`, and use forgot-password — a real email
should arrive, and its headers should show DKIM `pass`. (The default `console`
transport just logs the message, so dev works with no provider at all.)

## Object storage (R2)

Photos are stored in a private R2 bucket; the browser uploads directly to R2 via
a presigned `PUT`. Two settings are required beyond the `R2_*` env vars, and
both bit us at launch — check them when creating a new bucket or adding a domain:

1. **Bucket CORS policy.** The upload is a cross-origin `PUT` from the site to
   `…r2.cloudflarestorage.com`, so the browser sends a CORS preflight. Without a
   policy the preflight is blocked and the `PUT` never leaves the browser (Network
   tab shows status `—`, no response). In Cloudflare → R2 → bucket → Settings →
   CORS Policy, add:

   ```json
   [
     {
       "AllowedOrigins": ["https://minnekart.vercel.app"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Add each new origin (custom domain, or `http://localhost:3000` if you ever run
   the real R2 driver locally). Thumbnails render via `<img src>`, which isn't
   CORS-gated — this is only for the upload `fetch`. Takes effect immediately, no
   redeploy.

   Prod and preview use **separate buckets** (`minnekart-dev` for preview), so
   each needs its own policy: the prod bucket allows the prod domain, the dev
   bucket allows the `dev` branch alias.

2. **SDK checksums off** — already handled in code (`src/lib/storage/r2.ts` sets
   `requestChecksumCalculation`/`responseChecksumValidation` to `'WHEN_REQUIRED'`).
   The aws-sdk v3 default bakes checksum headers into the presigned `PUT`'s signed
   headers, which the browser can't reproduce → `SignatureDoesNotMatch`. Leave
   this in place; removing it breaks uploads.

If an upload fails: status `—`/no response = CORS; `403 SignatureDoesNotMatch`
with a body = credentials (`R2_SECRET_ACCESS_KEY` not matching the key id) or the
checksum setting.

## Billing (Paddle)

Paddle is the Merchant of Record — it is the legal seller and remits VAT/GST,
which is the whole reason it was chosen (see `docs/BUSINESS.md` §3.4). The app
side is a webhook (`/api/webhooks/paddle`) that updates `users.plan` /
`users.subscription_status`, and an overlay checkout on `/settings`. Everything
below is dashboard/ops work.

### Sandbox setup (do this first)

1. Create a **sandbox** account at `sandbox-vendors.paddle.com` (separate from
   the live account).
2. Create one product ("Minnekart Paid") with three prices: **$39/year**
   (annual), **$5/month** (monthly), and a **$99 one-time** price for the
   founding-member offer. Copy each `pri_…` id.
3. Create a client-side token (Developer Tools → Authentication) →
   `PADDLE_CLIENT_TOKEN`. On the same page create an **API key** with
   `subscription.read` + `subscription.write` → `PADDLE_API_KEY`. That key is a
   server-side secret and is what powers in-app cancel / resume / update-card;
   without it those controls stay hidden.
4. Create a notification destination (Developer Tools → Notifications):
   - URL: `https://minnekart-git-dev-<scope>.vercel.app/api/webhooks/paddle` —
     the **stable `dev` alias**, which is why previews are restricted to that one
     branch. A per-deployment URL would go stale on the next push.
   - Type: webhook. Subscribe to **all `subscription.*` events and
     `transaction.completed`** (unknown events are acked and ignored, so
     over-subscribing is safe).
   - Copy the secret (`pdl_ntfset_…`) → `PADDLE_WEBHOOK_SECRET`.
5. Set the six `PADDLE_*` vars in Vercel **Preview** (leave `PADDLE_ENV`
   unset — it defaults to `sandbox`).

### Sandbox test flow

1. On the `dev` preview, log in, open `/settings` — the plan card should show
   upgrade buttons.
2. Buy with Paddle's test card `4242 4242 4242 4242` (any future expiry/CVC).
3. Within seconds the webhook should flip the user to `paid` — reload
   `/settings` and check the badge. Paddle's dashboard (Notifications → logs)
   shows delivery attempts + responses for debugging; events can be replayed
   from there (replays are deduped by `event_id`, so they're safe).
4. Back on `/settings`, exercise the in-app management: **Update card** (opens
   the Paddle overlay against a fresh transaction), then **Cancel subscription**
   → the card should show the end date and a **Resume** button, and Paddle's
   dashboard should show a scheduled cancellation. Resume, and confirm it
   clears. Cancellation is always `next_billing_period`, never immediate —
   `/terms` promises the paid period is honoured.
5. Cancel the subscription in the Paddle dashboard and confirm the user drops
   back to `free` after the `subscription.canceled` event.

### Go-live checklist

- [ ] Paddle **live** account approved (Paddle reviews your website before you
      can charge — needs the custom domain, terms, privacy and refund pages).
      The four pages ship at `/pricing`, `/terms`, `/privacy` and `/refunds`,
      linked from the footer. **Before submitting for verification, set
      `LEGAL_ENTITY_NAME` and `LEGAL_ENTITY_ABN` in Vercel prod** — the real
      identity lives only in env (the repo is public), and without them the
      pages show placeholders. They also assume `hello@minnekart.com` receives
      mail.
- [ ] Product + three prices recreated in the live account (ids differ from
      sandbox).
- [ ] Live notification destination pointing at the prod domain; live secret.
- [ ] Vercel prod: `PADDLE_ENV=production` + live token/secret/API key/price ids.
- [ ] One real $39 checkout end-to-end (refund it from the Paddle dashboard —
      also proves the refund path).
- [ ] To retire the founding-member offer later: delete `PADDLE_PRICE_LIFETIME`
      from Vercel prod and redeploy.

Cancelling, resuming and updating a card all happen in-app from `/settings`
(`/api/account/subscription/*`), which needs `PADDLE_API_KEY`. Paddle's own
emails still go out alongside. Users with no subscription — founding-member
buyers and the grandfathered invite cohort — are paid without anything to
manage, so they see no controls.

## Backups (Neon → OCI box)

`scripts/backup-neon.sh` runs on the OCI box (Tailscale-only, no inbound ports).
It `pg_dump`s over TLS, gzips, and prunes old dumps. Needs the postgres client
(`pg_dump`) installed on the box.

```sh
DATABASE_URL="postgres://…neon…" BACKUP_DIR=/var/backups/minnekart \
  RETENTION_DAYS=14 /path/to/minnekart/scripts/backup-neon.sh
```

Cron (daily 03:15):

```cron
15 3 * * * DATABASE_URL="postgres://…neon…" BACKUP_DIR=/var/backups/minnekart RETENTION_DAYS=14 /path/to/minnekart/scripts/backup-neon.sh >> /var/log/minnekart-backup.log 2>&1
```

### Restore drill (do once)

Restore the latest dump into a scratch database and sanity-check it — never
restore over prod:

```sh
createdb minnekart_restore_test
gunzip -c /var/backups/minnekart/minnekart-YYYY-MM-DD-HHMM.sql.gz \
  | psql "postgres://…/minnekart_restore_test"
# spot-check row counts, then drop it
dropdb minnekart_restore_test
```

## Backups (R2 photos → OCI box)

`scripts/backup-r2.sh` runs on the same OCI box, beside the Neon dump, and gives
the photos the second copy the database already has. It `rclone sync`s the R2
photo bucket to local disk: `current/` mirrors R2 exactly, and anything a sync
would delete or replace is moved into a timestamped `archive/<ts>/` first (kept
`RETENTION_DAYS`), so a photo deleted from R2 is still recoverable for a window.
`current/` is never pruned. R2 egress is free, so the pull costs nothing. Needs
`rclone` installed on the box; a **read-only** R2 API token is sufficient and
recommended. The remote is built from the `R2_*` env vars (same names as Vercel)
via `RCLONE_CONFIG_*`, so no secret touches a config file or the process list.

```sh
R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… \
  BACKUP_DIR=/var/backups/minnekart-photos RETENTION_DAYS=14 \
  /path/to/minnekart/scripts/backup-r2.sh
```

Cron (daily 03:30 — staggered after the Neon dump at 03:15):

```cron
30 3 * * * R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… BACKUP_DIR=/var/backups/minnekart-photos RETENTION_DAYS=14 /path/to/minnekart/scripts/backup-r2.sh >> /var/log/minnekart-r2-backup.log 2>&1
```

The bucket CORS policy governs browser uploads only — a credentialed server-side
S3 client like this needs no CORS change.

### Verify drill (do once)

Dry-run first to confirm the remote resolves and see what would transfer, then
run for real, then confirm the mirror matches. Never sync **to** R2 — this is a
one-way pull.

```sh
# same env as above, then:
BACKUP_DIR=/var/backups/minnekart-photos /path/to/scripts/backup-r2.sh   # first real run
# confirm current/ mirrors R2 (0 differences), using the same R2_* env:
RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
  RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  RCLONE_CONFIG_R2_ENDPOINT="https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" \
  RCLONE_CONFIG_R2_REGION=auto \
  rclone check "R2:$R2_BUCKET/photos" /var/backups/minnekart-photos/current
```

To restore a lost object back into R2, copy it up by key (the reverse
direction). `current/` holds the contents of the `photos/` prefix, so a key
looks like `<userId>/<tripId>/<uuid>.webp`:
`rclone copyto /var/backups/minnekart-photos/current/<userId>/<tripId>/<uuid>.webp
"R2:$R2_BUCKET/photos/<userId>/<tripId>/<uuid>.webp"`.

## Open signup (Turnstile)

Signup is invite-only until `OPEN_SIGNUP=true` is set — deploying the code
changes nothing by itself, so billing and the free-tier caps can be tested
with the invite cohort first (BUSINESS.md §4.4). Invites keep working after
opening; they're just no longer required.

### Setup (once, before launch)

1. Cloudflare dashboard → Turnstile → Add widget. Hostnames: the prod domain
   (and preview domains if you want CAPTCHA there). Mode: **Managed**
   (invisible for most humans).
2. Copy the site key → `TURNSTILE_SITE_KEY`, secret → `TURNSTILE_SECRET_KEY`
   in Vercel. Set both or neither: with only the site key the widget renders
   but the server never checks it; with only the secret every signup fails.
3. For a dry run, Turnstile's test keys always pass:
   site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### Launch / rollback

- **Launch:** set `OPEN_SIGNUP=true` in Vercel prod and redeploy (env changes
  need a redeploy to take effect). The signup tab stops requiring an invite
  and shows the free-tier copy; `/signup` is the direct link.
- **Rollback:** set it back to `false` and redeploy — signup is invite-only
  again immediately. Accounts created while open keep working.

### Abuse posture

Signups are throttled at 5/hour and 20/day per IP, plus a global 100/day
kill-valve across all IPs (bump `SIGNUPS_GLOBAL_DAY` in
`src/app/api/auth/signup/route.ts` if launch traffic is real). Every account
still needs email-OTP verification before it can create anything, and free
accounts are capped at 15 memories / 6 photos each.

## Invite the first users

Invites are one-time signup links. Bootstrap the owner once, then mint invites
(headless CLI, or the owner `/admin` page):

```sh
npm run create-owner -- <email> <username> "<name>" "<password>"   # once
npm run create-invite -- "note about who this is for"
```

`create-invite` prints `${APP_URL}/signup?invite=<token>` — share that link.
Watch first-signup deliverability in the Resend dashboard.
