FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY docker.npmrc .npmrc
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY docker.npmrc .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY docker.npmrc .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/.next/standalone/server.js ./server.js
COPY --from=build /app/.next/standalone/.next ./.next
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /app/scripts/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
