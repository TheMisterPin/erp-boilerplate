#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
pnpm exec prisma migrate deploy

DECISION="$(pnpm exec tsx scripts/maybe-seed.ts)"
case "$DECISION" in
  seed)
    echo "Empty User table — running seed..."
    pnpm exec tsx prisma/seed.ts
    ;;
  skip)
    echo "Seed skipped: users already exist"
    ;;
  *)
    echo "Unexpected seed decision: $DECISION" >&2
    exit 1
    ;;
esac

echo "Starting Next.js..."
exec node server.js
