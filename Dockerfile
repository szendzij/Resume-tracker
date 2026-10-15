# Multi-stage Dockerfile for Resume Tracker
# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency definitions and lockfile
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies needed for build)
RUN bun install --no-frozen-lockfile

# Copy source code and config files
COPY . .

# Build Vite client (to dist/) and bundle server (to dist/server.cjs)
ENV NODE_ENV=production
RUN bun run build

# Stage 2: Runtime runner (using bun or node with isolated production packages)
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy production runtime files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/db-baseline.mjs ./scripts/db-baseline.mjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create persistent data directory and grant ownership to non-root user 'bun'
RUN mkdir -p /app/data && chown -R bun:bun /app/data

# Run as non-root user (bun image comes with user 'bun')
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Apply Prisma migrations before starting (fresh volumes get the baseline schema;
# pre-existing databases are baselined so `deploy` does not fail with P3005).
# The baseline migration is located by scripts/db-baseline.mjs — the single
# source of truth shared with the npm db:baseline script (no duplicated
# `ls | grep _baseline` shell logic here).
CMD ["sh", "-c", "bunx prisma migrate deploy || (bun scripts/db-baseline.mjs && bunx prisma migrate deploy); exec bun run dist/server.cjs"]
