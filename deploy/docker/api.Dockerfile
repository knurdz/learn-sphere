# Build context: repository root (see deploy/docker-compose.yml).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/
RUN pnpm install --frozen-lockfile --filter ./api

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api ./api
RUN pnpm install --frozen-lockfile --filter ./api
WORKDIR /app/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-bookworm-slim AS runner
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
# Standalone only traces files the server reads (meme templates); landing images
# are referenced from JSX, so the whole public/ folder has to be copied.
COPY --from=builder /app/api/public ./api/public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1

CMD ["node", "api/server.js"]
