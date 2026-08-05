# Build context: repository root (see deploy/docker-compose.yml).
FROM node:20-bookworm-slim AS deps
WORKDIR /app/api
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY api/package.json api/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api ./api
WORKDIR /app/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/api/.next/standalone ./
COPY --from=builder /app/api/.next/static ./api/.next/static

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1

CMD ["node", "api/server.js"]
