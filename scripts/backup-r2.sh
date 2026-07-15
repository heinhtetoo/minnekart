#!/usr/bin/env bash
#
# Scheduled R2 photo backup — runs on the OCI box (see docs/OPS.md), beside the
# Neon pg_dump cron. Mirrors the R2 photo bucket to local disk with rclone:
# `current/` tracks R2 exactly, and anything a sync would delete or replace is
# moved into a timestamped `archive/<ts>/` first, so a deleted photo is
# recoverable for RETENTION_DAYS. `current/` is never pruned.
#
# Env:
#   R2_ACCOUNT_ID         Cloudflare account id (required) — S3 endpoint host
#   R2_ACCESS_KEY_ID      R2 token key id (required)
#   R2_SECRET_ACCESS_KEY  R2 token secret (required)
#   R2_BUCKET             Bucket name (required) — prod bucket, or minnekart-dev
#   BACKUP_DIR            Base dir (default: ./backups/photos)
#   RETENTION_DAYS        Prune archive snapshots older than this (default: 14)
#
# Needs rclone installed on the box. A read-only R2 token is sufficient.

set -euo pipefail

command -v rclone >/dev/null 2>&1 || {
  echo "rclone is not installed" >&2
  exit 1
}

: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups/photos}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Define the remote from env so no secret touches argv or a config file. Matches
# the S3 client the app builds in src/lib/storage/r2.ts.
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_REGION=auto

ts="$(date +%F-%H%M)"
mkdir -p "$BACKUP_DIR/current" "$BACKUP_DIR/archive"

rclone sync "R2:${R2_BUCKET}/photos" "$BACKUP_DIR/current" \
  --backup-dir "$BACKUP_DIR/archive/$ts" \
  --fast-list --transfers 8 --checkers 16
echo "synced R2:${R2_BUCKET}/photos → $BACKUP_DIR/current (removed/replaced → archive/$ts)"

find "$BACKUP_DIR/archive" -mindepth 1 -maxdepth 1 -type d \
  -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
echo "pruned archive snapshots older than ${RETENTION_DAYS} days"
