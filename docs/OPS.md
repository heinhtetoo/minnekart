# Minnekart — Ops Runbook

Launch and day-two operations. The app is on Vercel (auto-deploy `main`,
PR previews), Postgres on Neon, photos on Cloudflare R2, CI on GitHub Actions.

## Environment variables

Validated at boot by `src/lib/env.ts` — a missing/invalid required var throws on
startup. Set these in Vercel for **both** Production and Preview unless noted.

| Var                    | Required    | Notes                                                                                                                                                                                                   |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes         | Neon **pooled** connection string (host contains `-pooler`) for the Vercel runtime — see the pooling note below. Also a GitHub Actions secret for the migrate job (use the direct/unpooled host there). |
| `APP_URL`              | yes in prod | Public base URL; builds invite/share/reset links. Defaults to `http://localhost:3000`. Use the preview URL for Preview.                                                                                 |
| `NODE_ENV`             | auto        | Vercel sets `production`.                                                                                                                                                                               |
| `EMAIL_TRANSPORT`      | yes in prod | `console` \| `memory` \| `smtp`. Set `smtp` in prod.                                                                                                                                                    |
| `SMTP_HOST`            | when smtp   | Brevo: `smtp-relay.brevo.com`.                                                                                                                                                                          |
| `SMTP_PORT`            | when smtp   | `587` (STARTTLS — works from Vercel serverless).                                                                                                                                                        |
| `SMTP_USER`            | when smtp   | Brevo SMTP login.                                                                                                                                                                                       |
| `SMTP_PASS`            | when smtp   | Brevo SMTP key (not your account password).                                                                                                                                                             |
| `EMAIL_FROM`           | when smtp   | e.g. `Minnekart <hello@yourdomain.com>` — must be a Brevo-verified sender.                                                                                                                              |
| `STORAGE_DRIVER`       | yes in prod | `r2` \| `memory`. **Defaults to `r2`.**                                                                                                                                                                 |
| `R2_ACCOUNT_ID`        | when r2     | Cloudflare account id.                                                                                                                                                                                  |
| `R2_ACCESS_KEY_ID`     | when r2     | R2 token key id.                                                                                                                                                                                        |
| `R2_SECRET_ACCESS_KEY` | when r2     | R2 token secret.                                                                                                                                                                                        |
| `R2_BUCKET`            | when r2     | Private bucket name.                                                                                                                                                                                    |

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

## Invite the first users

Invites are one-time signup links. Bootstrap the owner once, then mint invites
(headless CLI, or the owner `/admin` page):

```sh
npm run create-owner -- <email> <username> "<name>" "<password>"   # once
npm run create-invite -- "note about who this is for"
```

`create-invite` prints `${APP_URL}/signup?invite=<token>` — share that link.
Watch first-signup deliverability in the Brevo dashboard.
