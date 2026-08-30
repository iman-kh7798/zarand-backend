#!/bin/sh
# ---------------------------------------------------------------------------
# Container entrypoint for zarand-backend.
# Waits for the DB, applies Prisma migrations, optionally seeds, then runs CMD.
# ---------------------------------------------------------------------------
set -e

echo "[entrypoint] NODE_ENV=$NODE_ENV"

# --- wait for the database TCP port to accept connections -------------------
# Values come from the runtime env (see docker-compose.yml).
DB_HOST="${DATABASE_HOST:-db}"
DB_PORT="${DATABASE_PORT:-3306}"

echo "[entrypoint] waiting for ${DB_HOST}:${DB_PORT} ..."
i=0
until node -e "require('net').createConnection({host:'${DB_HOST}',port:${DB_PORT}}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[entrypoint] database not reachable after 60 tries — aborting." >&2
    exit 1
  fi
  sleep 2
done
echo "[entrypoint] database is up."

# --- sync the database schema -------------------------------------------
# Prisma reads the connection URL from prisma.config.ts
# (datasource.url = env('DATABASE_URL')). Make sure DATABASE_URL is set.
#
# PRISMA_SCHEMA_STRATEGY:
#   push   (default) -> `prisma db push`: diffs schema.prisma against the live
#          DB and applies it directly. Matches this repo's actual workflow
#          (`npm run push`); the prisma/migrations/ folder is incomplete and
#          NOT the source of truth (CI deploy never runs migrate deploy).
#   deploy -> `prisma migrate deploy`: only use once the migrations folder is
#          known-good for a from-scratch apply.
SCHEMA_STRATEGY="${PRISMA_SCHEMA_STRATEGY:-push}"
if [ "$SCHEMA_STRATEGY" = "deploy" ]; then
  echo "[entrypoint] running: prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "[entrypoint] running: prisma db push"
  npx prisma db push
fi

# --- optional one-off seed ----------------------------------------------
# Enable by setting RUN_SEED=true in the environment (defaults to off so a
# restart never re-seeds). seed.ts is written to be idempotent (upserts).
if [ "${RUN_SEED}" = "true" ]; then
  echo "[entrypoint] running: prisma db seed"
  npx prisma db seed
fi

echo "[entrypoint] starting app: $*"
exec "$@"
