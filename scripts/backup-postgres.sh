#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/nio-market-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "Backup created: $FILE"
