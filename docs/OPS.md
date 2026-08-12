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
| `R2_ACCESS_KEY_ID`      | when r2      | R2 token key id. **Prod and Preview take different tokens**, each scoped to its own bucket — see § Object storage. A shared token lets a preview deploy delete production photos.                                                                                                                            |
| `R2_SECRET_ACCESS_KEY`  | when r2      | R2 token secret. Pairs with the key id above; a mismatched pair gives `403 SignatureDoesNotMatch` on every upload.                                                                                                                                                                                           |
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
- [ ] `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` are a **different token** in
      Preview than in Production, each scoped to that environment's bucket only
      (§ Object storage). Pointing `R2_BUCKET` at the dev bucket is the
      convention; a bucket-scoped token is what actually enforces it. Verify
      with the negative `rclone` checks — the preview token must fail to list
      the prod bucket.
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
a presigned `PUT`. Three settings are required beyond the `R2_*` env vars — the
first two bit us at launch; check all of them when creating a new bucket, adding
a domain, or minting a token:

1. **Bucket CORS policy.** The upload is a cross-origin `PUT` from the site to
   `…r2.cloudflarestorage.com`, so the browser sends a CORS preflight. Without a
   policy the preflight is blocked and the `PUT` never leaves the browser (Network
   tab shows status `—`, no response). In Cloudflare → R2 → bucket → Settings →
   CORS Policy, add:

   ```json
   [
     {
       "AllowedOrigins": ["https://minnekart.com"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   That is the production apex; `www` 308-redirects to it, so the browser's
   origin is always the apex. Add each further origin you need (the `dev` branch
   alias on the dev bucket, or `http://localhost:3000` if you ever run the real
   R2 driver locally). Thumbnails render via `<img src>`, which isn't
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

3. **API token scope.** Cloudflare → R2 → **Manage API tokens**. The UI does not
   default to least privilege — "Admin Read & Write" across every bucket is two
   clicks away and looks unremarkable — so this is easy to get wrong and hard to
   notice afterwards. Four consumers, four tokens, each **scoped to one bucket**:

   | Token                   | Permission          | Bucket          | Used by                   |
   | ----------------------- | ------------------- | --------------- | ------------------------- |
   | `minnekart-app-prod`    | Object Read & Write | `minnekart`     | Vercel, Production scope  |
   | `minnekart-app-preview` | Object Read & Write | `minnekart-dev` | Vercel, Preview scope     |
   | `minnekart-backup-ro`   | Object Read only    | `minnekart`     | `backup-r2.sh` on the box |
   | `minnekart-reap-rw`     | Object Read & Write | `minnekart`     | `reap-orphaned-photos.sh` |

   Always pick **"Apply to specific buckets only"** and name the single bucket;
   never "all buckets in this account". **No app operation needs Admin** —
   `R2Storage` only ever issues `PutObject`, `GetObject`, `HeadObject` and
   `DeleteObject`, all of which Object-level permission covers. Admin adds
   bucket creation and deletion, which nothing here does.

   The one that matters most is `minnekart-app-preview`. A Preview deploy
   holding a prod-capable token can delete production photos — the same
   env-scoping landmine the audit checklist calls out for `DATABASE_URL`, one
   layer down. Separate tokens make that impossible at the credential level
   rather than by convention.

   The backup token being **read-only** is deliberate: `backup-r2.sh` is a
   one-way pull, and a backup job that can write is a backup job that can
   destroy the thing it is backing up. The reap job needs write purely because
   deleting is its whole purpose — hence its own token, revocable alone.

**Rotating a token** invalidates every presigned URL signed with the old key.
Display URLs live 1h and are cached ~30 min in `src/lib/photos/sign.ts`, so
already-rendered pages lose their images until reload; new signatures are issued
immediately and the rest self-heals. Harmless when traffic is low, visible when
it isn't — rotate deliberately, and do the box and Preview before Production so
a mistake surfaces somewhere cheap.

If an upload fails: status `—`/no response = CORS; `403 SignatureDoesNotMatch`
with a body = credentials (`R2_SECRET_ACCESS_KEY` not matching the key id) or the
checksum setting; `403 AccessDenied` on an operation that used to work = token
scope (wrong bucket, or read-only where write was needed).

### Verifying token scope

The dashboard shows what you _selected_; these show what a token can actually
**do**. Most are negative tests — the pass condition is a failure. Same
`RCLONE_CONFIG_R2_*` env-var pattern the cron scripts use, so no secret touches
a config file or argv:

```sh
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ENDPOINT="https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_REGION=auto
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="<token key id>"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="<token secret>"

rclone lsf R2:minnekart          # preview token → must fail AccessDenied
rclone lsf R2:minnekart-dev      # prod token    → must fail AccessDenied
rclone lsd R2:                   # any token     → must not list the account
rclone touch R2:minnekart/scope-probe.txt   # backup token → must fail
                                            # reap token   → must succeed,
                                            # then: rclone delete R2:minnekart/scope-probe.txt
```

If `lsf` against the other environment's bucket **succeeds**, that token is
over-scoped — remint it before going further.

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

## Backups (OCI box)

All three jobs run on the OCI box (Tailscale-only, no inbound ports; never in
the request path) on a nightly user cron. The box clones the repo and runs the
scripts from it. On-box layout:

```
~/minnekart/
├── repo/            # git clone — scripts live in repo/scripts/ (`git pull` to update)
├── backup.env       # secrets, chmod 600, sourced by cron
├── backups/db/      # Neon dumps
├── backups/photos/  # rclone mirror: current/ + archive/
└── logs/
```

`~/minnekart/backup.env` (chmod 600) holds the shared secrets and is sourced by
every cron line, so nothing sensitive sits in the crontab itself:

```sh
export DATABASE_URL="postgres://…@…neon.tech/minnekart?sslmode=require"  # DIRECT (non-pooler)
export R2_ACCOUNT_ID="…"
export R2_ACCESS_KEY_ID="…"        # minnekart-backup-ro — Object Read only, prod bucket
export R2_SECRET_ACCESS_KEY="…"
export R2_BUCKET="…"               # prod bucket
export RETENTION_DAYS=14
export R2_REAP_ACCESS_KEY_ID="…"       # minnekart-reap-rw — Object Read & Write,
export R2_REAP_SECRET_ACCESS_KEY="…"   # prod bucket; the reap job deletes, the backup job never does
```

Two R2 tokens, not one, and the backup job's is **read-only** on purpose: a
backup job that can write is a backup job that can destroy the thing it is
backing up. The reap job needs write because deleting is its entire purpose, so
it gets its own token, revocable on its own without touching backups. Both are
scoped to the prod bucket alone — see § Object storage for the full four-token
table and the commands to verify a token's real reach.

Replace `/home/ubuntu` in the cron lines below with your real home, and
`1000:1000` with your `id -u`:`id -g` (cron won't expand `$(id -u)`).

### Database (Neon → OCI, via Docker)

`scripts/backup-neon.sh` `pg_dump`s over TLS, gzips, and prunes old dumps. Run it
**inside the official `postgres` image** so `pg_dump` matches Neon's major
version without installing a client on the box — a newer `pg_dump` dumps any
equal-or-older server, so `postgres:18` is safe whichever version Neon runs. Use
the **direct (non-pooler)** Neon URL: `pg_dump` needs a session connection.
`--user` makes the dumps owned by you, not root; your user must be able to run
Docker without `sudo` (add it to the `docker` group once), or the cron fails.

```sh
source ~/minnekart/backup.env
docker run --rm --user "$(id -u):$(id -g)" \
  -v ~/minnekart/repo:/repo:ro -v ~/minnekart/backups/db:/backups \
  -e DATABASE_URL -e BACKUP_DIR=/backups -e RETENTION_DAYS \
  postgres:18 bash /repo/scripts/backup-neon.sh
```

Cron (daily 03:15):

```cron
15 3 * * * . /home/ubuntu/minnekart/backup.env; docker run --rm --user 1000:1000 -v /home/ubuntu/minnekart/repo:/repo:ro -v /home/ubuntu/minnekart/backups/db:/backups -e DATABASE_URL -e BACKUP_DIR=/backups -e RETENTION_DAYS postgres:18 bash /repo/scripts/backup-neon.sh >> /home/ubuntu/minnekart/logs/backup.log 2>&1
```

Quick integrity check: `gunzip -t ~/minnekart/backups/db/minnekart-*.sql.gz`.
Fuller restore drill (do once) — restore the latest dump into a throwaway
container and spot-check; never restore over prod:

```sh
docker run -d --rm --name pg-restore-test -e POSTGRES_PASSWORD=x postgres:18
sleep 5
gunzip -c ~/minnekart/backups/db/minnekart-*.sql.gz \
  | docker exec -i pg-restore-test psql -U postgres
# spot-check row counts, then:
docker rm -f pg-restore-test
```

### Photos (R2 → OCI, native rclone)

Keep this **native** — rclone installs in one line
(`curl https://rclone.org/install.sh | sudo bash`) and has no version-matching
problem, so Docker buys nothing here. `scripts/backup-r2.sh` `rclone sync`s the
R2 photo bucket: `current/` mirrors R2 exactly, and anything a sync would delete
or replace is moved into a timestamped `archive/<ts>/` first (kept
`RETENTION_DAYS`), so a photo deleted from R2 stays recoverable for a window.
`current/` is never pruned. R2 egress is free, so the pull costs nothing. A
**read-only** R2 token suffices. The remote is built from the `R2_*` env vars
(same names as Vercel) via `RCLONE_CONFIG_*`, so no secret touches a config file
or the process list.

```sh
source ~/minnekart/backup.env
BACKUP_DIR=~/minnekart/backups/photos bash ~/minnekart/repo/scripts/backup-r2.sh
```

Cron (daily 03:30 — staggered after the dump):

```cron
30 3 * * * . /home/ubuntu/minnekart/backup.env; BACKUP_DIR=/home/ubuntu/minnekart/backups/photos /home/ubuntu/minnekart/repo/scripts/backup-r2.sh >> /home/ubuntu/minnekart/logs/r2-backup.log 2>&1
```

The bucket CORS policy governs browser uploads only — a credentialed server-side
S3 client like this needs no CORS change.

Verify the mirror matches R2 (expect "0 differences"). Never sync **to** R2 —
this is a one-way pull:

```sh
source ~/minnekart/backup.env
RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
  RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  RCLONE_CONFIG_R2_ENDPOINT="https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" \
  RCLONE_CONFIG_R2_REGION=auto \
  rclone check "R2:$R2_BUCKET/photos" ~/minnekart/backups/photos/current
```

To restore a lost object back into R2 (the reverse direction): `current/` holds
the contents of the `photos/` prefix, so a key looks like
`<userId>/<tripId>/<uuid>.webp`:
`rclone copyto ~/minnekart/backups/photos/current/<userId>/<tripId>/<uuid>.webp
"R2:$R2_BUCKET/photos/<userId>/<tripId>/<uuid>.webp"`.

### Orphaned photos (R2 cleanup, task 32)

A presigned PUT can succeed with no photo record ever following it — a
crashed upload, or (once `OPEN_SIGNUP` is on) a client that hits the presign
endpoint and never calls back on purpose. `scripts/reap-orphaned-photos.sh`
finds objects under `photos/` old enough (`ORPHAN_MIN_AGE_HOURS`, default 24)
that no legitimate in-flight upload could still be mid-sequence, diffs them
against every `display_key`/`thumb_key` the `photos` table actually
references, and removes whatever's left over.

Reads the database via a disposable `postgres:18` container rather than a
native `psql` — same reasoning as the Neon backup job above: no client
version to keep matched to whatever Neon runs. Needs `rclone` (already
required by the R2 mirror job) and Docker (already required by the Neon
dump job) on the box; nothing new to install if both other crons are
already set up.

**Defaults to `DRY_RUN=true`** — it lists candidates and changes nothing
unless you explicitly set `DRY_RUN=false`. This runs unattended on a cron
against real user data; report-only is the safe default, and the first few
runs are worth reading before trusting it to delete anything.

```sh
source ~/minnekart/backup.env
R2_ACCESS_KEY_ID="$R2_REAP_ACCESS_KEY_ID" \
  R2_SECRET_ACCESS_KEY="$R2_REAP_SECRET_ACCESS_KEY" \
  bash ~/minnekart/repo/scripts/reap-orphaned-photos.sh
```

Cron (daily 03:45 — staggered after both backups):

```cron
45 3 * * * . /home/ubuntu/minnekart/backup.env; R2_ACCESS_KEY_ID="$R2_REAP_ACCESS_KEY_ID" R2_SECRET_ACCESS_KEY="$R2_REAP_SECRET_ACCESS_KEY" DRY_RUN=false /home/ubuntu/minnekart/repo/scripts/reap-orphaned-photos.sh >> /home/ubuntu/minnekart/logs/reap.log 2>&1
```

Watch `logs/reap.log` for the first week or so after installing this —
zero orphans found every night is the expected steady state; a nonzero count
every single night (rather than the occasional crashed upload) means
something upstream is generating them faster than expected and is worth
tracing before it's just a cron job quietly deleting things.

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

## Measuring the product

The site publishes "no analytics" in six places and `/privacy` makes it
specific, so **no client-side analytics script is an option here** — not Google
Analytics, not a privacy-respecting alternative. Measurement comes from two
sources that don't touch that claim.

### Product metrics (`npm run metrics`)

Read-only queries over data the app already holds — no collection, nothing new
stored for the sake of measuring. Run it with the **production**
`DATABASE_URL` in the environment:

```sh
DATABASE_URL="postgres://…prod…" npm run metrics
```

Reports plan mix, activation, free-ceiling pressure, depth, retention and
conversion. Three things to read carefully:

- **Grandfathered accounts are not conversions.** Migration `0002` moved every
  pre-existing user to `paid`. They're reported as their own segment and
  excluded from the conversion denominator; a naive "share on paid" would look
  spectacular and mean nothing.
- **Retention is activity, not logins.** `sessions` carries a sliding 30-day
  expiry renewed in place and logged-out rows are deleted, so sessions cannot
  answer "did they come back". The number counts creating a memory or photo.
- **Conversion only exists from the day `plan_events` shipped.** The webhook
  appends to it on real plan transitions; there is no way to reconstruct
  earlier changes, and the report says "none recorded yet" rather than 0%.

### Google Search Console

Free, and it runs **no code on the site** — it reports Google's own index data
rather than watching visitors, so the claim stays true.

Verify `minnekart.com` by **DNS TXT record**, not the HTML-file method: the
file method means committing a verification token into a public repo and
serving a route for it, where a DNS record touches no code and can't drift.
Add the TXT record at the registrar, confirm in Search Console, then submit
`https://minnekart.com/sitemap.xml`.

**Do this before you need it.** Search Console only reports from the day you
verify — there is no backfill. Every day unverified is a day of missing
baseline for the GEO/SEO work.

It answers what the database can't: which queries surface the site, impressions
and clicks per page, average position, and index coverage. It still can't see
non-search referrals (Reddit, a newsletter, an AI engine's citation link) —
that gap is the accepted price of the no-analytics promise.
