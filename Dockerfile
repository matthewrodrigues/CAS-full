# syntax=docker/dockerfile:1

# NightLife Trivia for Fly.io (docs/SPEC.md section 10): one Node process serves /api, /ws, /media
# and the built SPA. The server runs its TypeScript through tsx, a devDependency, so the image keeps
# the full install instead of pruning to production dependencies.

ARG NODE_VERSION=22.23.4

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 normally downloads a prebuilt binary; these let it compile one if that fails.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json /app/tsconfig.server.json ./
EXPOSE 3000
# The server doesn't migrate on its own (openDb only opens), so apply migrations to the volume first;
# they are idempotent. Fly's release_command can't do it: it runs without the volume mounted.
# `exec` makes the server PID 1, so Fly's SIGTERM reaches the shutdown handler in server/index.ts.
CMD ["sh", "-c", "node --import tsx server/db/migrate.ts && exec node --import tsx server/index.ts"]
