# Multi-stage Dockerfile for Resume Tracker
# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency definitions and lockfile
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# Copy source code and config files
COPY . .

# Build Vite client (to dist/) and bundle server (to dist/server.cjs)
ENV NODE_ENV=production
RUN bun run build

# Stage 2: Runtime runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for Docker healthcheck
RUN apk add --no-cache curl

# Create non-root system user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifacts and package manifest
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

# Install production dependencies only (express, dotenv, @google/genai, etc.)
RUN npm install --omit=dev --ignore-scripts

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
