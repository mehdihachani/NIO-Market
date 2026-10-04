#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
FILE="${1:?Usage: restore-postgres.sh backup.sql.gz}"
gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "Restore completed from: $FILE"
