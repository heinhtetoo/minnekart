#!/usr/bin/env bash
#
# Scheduled Neon backup — runs on the OCI box (see docs/OPS.md).
# Dumps the database over TLS, gzips it, then prunes old dumps.
#
# Env:
#   DATABASE_URL    Neon connection string (required)
#   BACKUP_DIR      Where to write dumps (default: ./backups)
#   RETENTION_DAYS  Delete dumps older than this many days (default: 14)
#
# Needs the postgres client (pg_dump) installed on the box.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

target="$BACKUP_DIR/minnekart-$(date +%F-%H%M).sql.gz"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip >"$target"
echo "wrote $target"

find "$BACKUP_DIR" -name 'minnekart-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "pruned dumps older than ${RETENTION_DAYS} days"
