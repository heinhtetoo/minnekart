# Minnekart — Ops Runbook

Launch and day-two operations. The app is on Vercel (auto-deploy `main`,
PR previews), Postgres on Neon, photos on Cloudflare R2, CI on GitHub Actions.

## Environment variables

Validated at boot by `src/lib/env.ts` — a missing/invalid required var throws on
startup. Set these in Vercel for **both** Production and Preview unless noted.

| Var                     | Required    | Notes                                                                                                                                                                                                   |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes         | Neon **pooled** connection string (host contains `-pooler`) for the Vercel runtime — see the pooling note below. Also a GitHub Actions secret for the migrate job (use the direct/unpooled host there). |
| `APP_URL`               | yes in prod | Public base URL; builds invite/share/reset links. Defaults to `http://localhost:3000`. Use the preview URL for Preview.                                                                                 |
| `NODE_ENV`              | auto        | Vercel sets `production`.                                                                                                                                                                               |
| `EMAIL_TRANSPORT`       | yes in prod | `console` \| `memory` \| `smtp`. Set `smtp` in prod.                                                                                                                                                    |
| `SMTP_HOST`             | when smtp   | Brevo: `smtp-relay.brevo.com`.                                                                                                                                                                          |
| `SMTP_PORT`             | when smtp   | `587` (STARTTLS — works from Vercel serverless).                                                                                                                                                        |
| `SMTP_USER`             | when smtp   | Brevo SMTP login.                                                                                                                                                                                       |
| `SMTP_PASS`             | when smtp   | Brevo SMTP key (not your account password).                                                                                                                                                             |
| `EMAIL_FROM`            | when smtp   | e.g. `Minnekart <hello@yourdomain.com>` — must be a Brevo-verified sender.                                                                                                                              |
| `STORAGE_DRIVER`        | yes in prod | `r2` \| `memory`. **Defaults to `r2`.**                                                                                                                                                                 |
| `R2_ACCOUNT_ID`         | when r2     | Cloudflare account id.                                                                                                                                                                                  |
| `R2_ACCESS_KEY_ID`      | when r2     | R2 token key id.                                                                                                                                                                                        |
| `R2_SECRET_ACCESS_KEY`  | when r2     | R2 token secret.                                                                                                                                                                                        |
| `R2_BUCKET`             | when r2     | Private bucket name.                                                                                                                                                                                    |
| `PADDLE_ENV`            | no          | `sandbox` \| `production`. **Defaults to `sandbox`** — set `production` when going live.                                                                                                                |
| `PADDLE_WEBHOOK_SECRET` | for billing | Notification destination secret (`pdl_ntfset_…`). Without it the webhook returns 503 and no plan changes apply.                                                                                         |
| `PADDLE_CLIENT_TOKEN`   | for billing | Client-side token (`live_…`/`test_…`). Public-safe; enables the checkout overlay.                                                                                                                       |
| `PADDLE_PRICE_ANNUAL`   | for billing | Price id (`pri_…`) for $39/yr. Checkout buttons hide without it.                                                                                                                                        |
| `PADDLE_PRICE_MONTHLY`  | no          | Price id for ~$5/mo. Optional secondary button.                                                                                                                                                         |
| `PADDLE_PRICE_LIFETIME` | no          | Price id for the $99 founding-member one-off. Set it to show the offer; **unset it to retire the offer** (time-boxed by env, no code change).                                                           |
| `OPEN_SIGNUP`           | no          | `true` \| `false`. **Defaults to `false`** (invite-only). Setting `true` in Vercel is the public-launch moment — see the open-signup section.                                                           |
| `TURNSTILE_SITE_KEY`    | for launch  | Cloudflare Turnstile site key (public-safe). Renders the CAPTCHA on the signup form.                                                                                                                    |
| `TURNSTILE_SECRET_KEY`  | for launch  | Turnstile secret. When set, signups without a valid CAPTCHA token are rejected. **Set both Turnstile vars or neither.**                                                                                 |

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

- [ ] `DATABASE_URL` set in Vercel (prod + preview), uses the Neon **pooled**
      (`-pooler`) host, and the GitHub migrate secret uses the direct host.
- [ ] `APP_URL` correct per environment (prod domain vs preview URL).
- [ ] `EMAIL_TRANSPORT=smtp` + `SMTP_*` + `EMAIL_FROM` set in prod.
- [ ] `STORAGE_DRIVER=r2` + all four `R2_*` set in prod (or `memory` on purpose).
- [ ] `PADDLE_ENV=production` + prod webhook secret/client token/price ids in
      prod; sandbox values in preview (never mix — sandbox tokens fail against
      live Paddle and vice versa).
- [ ] `OPEN_SIGNUP` deliberate per environment (`true` only once launched);
      both `TURNSTILE_*` keys set together wherever signup is open.
- [ ] Neon and R2 usage within free-tier quotas.

## Email (Brevo)

The transport is provider-agnostic SMTP (`src/lib/email.ts`), so any SMTP
provider works — these steps use Brevo.

1. Create a Brevo account.
2. **Verify a sender** (Senders & IPs → Senders). Without a custom domain, verify
   a single sender email; `EMAIL_FROM` must use that address.
3. Copy the **SMTP** credentials (SMTP & API → SMTP): host `smtp-relay.brevo.com`,
   port `587`, login, and an SMTP key.
4. Set `EMAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`,
   `SMTP_PASS`, `EMAIL_FROM` in Vercel prod.
5. Monitor sends and bounces in the Brevo dashboard.

Local real-send smoke: set the same vars in `.env`, run `npm run dev`, and use
forgot-password — a real email should arrive. (Default `console` transport just
logs the message, so dev works with no provider.)

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
   `PADDLE_CLIENT_TOKEN`.
4. Create a notification destination (Developer Tools → Notifications):
   - URL: `https://<deployment>/api/webhooks/paddle`
   - Type: webhook. Subscribe to **all `subscription.*` events and
     `transaction.completed`** (unknown events are acked and ignored, so
     over-subscribing is safe).
   - Copy the secret (`pdl_ntfset_…`) → `PADDLE_WEBHOOK_SECRET`.
5. Set the five `PADDLE_*` vars in Vercel **Preview** (leave `PADDLE_ENV`
   unset — it defaults to `sandbox`).

### Sandbox test flow

1. On a preview deploy, log in, open `/settings` — the plan card should show
   upgrade buttons.
2. Buy with Paddle's test card `4242 4242 4242 4242` (any future expiry/CVC).
3. Within seconds the webhook should flip the user to `paid` — reload
   `/settings` and check the badge. Paddle's dashboard (Notifications → logs)
   shows delivery attempts + responses for debugging; events can be replayed
   from there (replays are deduped by `event_id`, so they're safe).
4. Cancel the subscription in the Paddle dashboard and confirm the user drops
   back to `free` after the `subscription.canceled` event.

### Go-live checklist

- [ ] Paddle **live** account approved (Paddle reviews your website before you
      can charge — needs the custom domain, terms, privacy and refund pages).
- [ ] Product + three prices recreated in the live account (ids differ from
      sandbox).
- [ ] Live notification destination pointing at the prod domain; live secret.
- [ ] Vercel prod: `PADDLE_ENV=production` + live token/secret/price ids.
- [ ] One real $39 checkout end-to-end (refund it from the Paddle dashboard —
      also proves the refund path).
- [ ] To retire the founding-member offer later: delete `PADDLE_PRICE_LIFETIME`
      from Vercel prod and redeploy.

Cancellations/card updates are handled by Paddle's own emails and checkout for
now — there is no in-app "manage subscription" yet (needs the Paddle API key;
logged as a follow-up in `progress.md`).

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
Watch first-signup deliverability in the Brevo dashboard.
