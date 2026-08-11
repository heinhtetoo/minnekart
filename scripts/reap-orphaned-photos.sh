#!/usr/bin/env bash
#
# Orphaned R2 photo reaper — runs on the OCI box (see docs/OPS.md), beside
# the Neon pg_dump and R2 mirror crons. A presigned PUT can succeed with no
# photo record ever following it (a crashed upload, or a client that
# deliberately never calls back) — see progress.md task 32. This finds
# objects under photos/ old enough that a normal upload-then-record
# sequence could never still be mid-flight, and with no matching row in the
# photos table, and removes them.
#
# Env:
#   DATABASE_URL           Neon connection string (required)
#   R2_ACCOUNT_ID          Cloudflare account id (required) — S3 endpoint host
#   R2_ACCESS_KEY_ID       R2 token key id (required)
#   R2_SECRET_ACCESS_KEY   R2 token secret (required)
#   R2_BUCKET              Bucket name (required) — prod bucket, or minnekart-dev
#   ORPHAN_MIN_AGE_HOURS   Only consider objects at least this old (default: 24)
#   DRY_RUN                "true" lists candidates without deleting (default: true)
#
# Needs rclone installed natively (already required by backup-r2.sh) and
# Docker (already required by backup-neon.sh, which runs pg_dump inside the
# official postgres image rather than installing a client on the box — this
# script does the same for psql, for the same reason: no client version to
# keep matched to whatever Neon runs). A read-only Neon connection and a
# read+write R2 token are sufficient (deletion needs the write scope).

set -euo pipefail

command -v rclone >/dev/null 2>&1 || {
  echo "rclone is not installed" >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "docker is not installed" >&2
  exit 1
}

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
ORPHAN_MIN_AGE_HOURS="${ORPHAN_MIN_AGE_HOURS:-24}"
DRY_RUN="${DRY_RUN:-true}"

# Define the remote from env so no secret touches argv or a config file.
# Matches the S3 client the app builds in src/lib/storage/r2.ts.
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_REGION=auto

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

# Keys as R2 actually holds them, filtered to old enough that no in-flight
# upload could still be mid-sequence — the presigned PUT itself expires in
# 5 minutes, so 24h of default slack is generous, not tight.
rclone lsf "R2:${R2_BUCKET}/photos" --recursive --files-only \
  --min-age "${ORPHAN_MIN_AGE_HOURS}h" |
  sed 's#^#photos/#' | sort >"$work_dir/r2_keys.txt"

# Keys the app actually references — every displayKey and thumbKey any
# photo row points at. Run via a disposable postgres:18 container rather
# than a native psql — same reasoning as backup-neon.sh. -e (no =value)
# forwards DATABASE_URL by reference; the single-quoted sh -c defers its
# expansion to the container, so the secret never appears in this host's
# own process list.
docker run --rm -e DATABASE_URL postgres:18 \
  sh -c 'psql "$DATABASE_URL" -tAc "SELECT display_key FROM photos UNION SELECT thumb_key FROM photos"' |
  sort >"$work_dir/db_keys.txt"

comm -23 "$work_dir/r2_keys.txt" "$work_dir/db_keys.txt" \
  >"$work_dir/orphans.txt"

count="$(wc -l <"$work_dir/orphans.txt" | tr -d ' ')"
if [ "$count" -eq 0 ]; then
  echo "no orphaned photos found (older than ${ORPHAN_MIN_AGE_HOURS}h)"
  exit 0
fi

echo "found $count orphaned object(s) under photos/, older than ${ORPHAN_MIN_AGE_HOURS}h, with no matching photo record:"
cat "$work_dir/orphans.txt"

if [ "$DRY_RUN" = "false" ]; then
  rclone delete "R2:${R2_BUCKET}" --files-from "$work_dir/orphans.txt"
  echo "deleted $count orphaned object(s)"
else
  echo "dry run — nothing deleted. Set DRY_RUN=false to actually delete."
fi
