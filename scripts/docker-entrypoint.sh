#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
pnpm exec prisma migrate deploy

DECISION="$(pnpm exec tsx scripts/maybe-seed.ts)"
if [ "$DECISION" = "seed" ]; then
  echo "Empty User table — running seed..."
  pnpm exec tsx prisma/seed.ts
else
  echo "Seed skipped: users already exist"
fi

echo "Starting Next.js..."
exec node server.js
