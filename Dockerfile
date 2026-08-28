# syntax=docker/dockerfile:1

###############################################################################
# zarand-backend — NestJS 11 + Prisma 7 (driver adapter: @prisma/adapter-mariadb)
#
# Stages:
#   base         common runtime settings + OS libs Prisma needs on Alpine
#   deps         full dependency install (dev + prod) — used for build & dev
#   development   hot-reload target (nest start --watch), used by compose override
#   build        compiles TS -> dist/ and runs `prisma generate`
#   prod-deps    production-only node_modules (no dev deps)
#   production   final slim image: dist/ + prod deps + prisma CLI/engine + entrypoint
###############################################################################

########################  base  ###############################################
FROM node:20-alpine AS base
# openssl + libc6-compat are required by the Prisma schema engine on musl/Alpine.
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
# Let Node see it is inside a container (better default memory limits).
ENV NODE_OPTIONS=--enable-source-maps

########################  deps  ###############################################
FROM base AS deps
ENV NODE_ENV=development
# `prisma generate` (run in the `development` and `build` stages) loads
# prisma.config.ts, which calls env('DATABASE_URL') and THROWS if it is unset.
# generate never connects to the DB, so a placeholder is enough — compose
# overrides this with the real URL at runtime.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
# Copy ONLY manifests first so this layer is cached until deps actually change.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

########################  development  ######################################
# Used by docker-compose.override.yml for local hot-reload development.
FROM deps AS development
ENV NODE_ENV=development
# Source is bind-mounted at runtime by compose; copying here keeps the image
# runnable on its own too.
COPY . .
RUN npx prisma generate \
    && cp docker/entrypoint.sh /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/uploads /app/logs
EXPOSE 3000
# entrypoint runs migrations (+ optional seed) then hands off to CMD
ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

########################  build  ###########################################
FROM deps AS build
ENV NODE_ENV=development
COPY . .
# Generate the Prisma client into node_modules/.prisma + @prisma/client
RUN npx prisma generate
# nest build -> dist/src/main.js
RUN npm run build

########################  prod-deps  #######################################
# Clean production-only install (parallel to `build` so it caches independently).
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

########################  production  #####################################
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000

# 1) production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules

# 2) Prisma bits needed at runtime for `prisma migrate deploy` + generated client.
#    (@prisma/client & @prisma/adapter-mariadb are prod deps and already present;
#     these copies add the generated client + the `prisma` CLI + schema engine.)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# 3) app artifacts
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json seed.ts package.json ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 4) writable dirs for uploads + winston logs, owned by the non-root user
RUN mkdir -p /app/uploads /app/logs \
    && chown -R node:node /app

USER node
EXPOSE 3000

# entrypoint runs migrations (+ optional seed) then starts the server
ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/src/main"]
