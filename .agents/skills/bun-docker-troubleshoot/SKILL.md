---
name: bun-docker-troubleshoot
description: >-
  Troubleshooting guide and checklist for Bun + SQLite + Docker container deployments.
  Covers Bun v1.4+ auto-serve entrypoint collisions, Docker non-root UID 1000 volume
  permissions for SQLite, multi-stage frozen lockfile workarounds, and healthcheck debugging.
---

# Bun + SQLite + Docker Deployment & Troubleshooting Guide

When running Bun-based applications (especially combining Express, SQLite, and multi-stage Docker builds), subtle runtime differences can lead to crash loops or build failures. Use this skill when troubleshooting or configuring Bun Docker deployments.

---

## 1. Bun.serve() Auto-Start Collision (`isServerConfig`)

### Symptoms
Container crashes immediately on startup with:
```text
TypeError: Bun.serve() needs either:
  - A routes object: routes: { "/path": { GET: (req) => new Response("Hello") } }
  - Or a fetch handler: fetch: (req) => { return new Response("Hello") }
at bun:main
```

### Cause
In Bun v1.4+, when Bun executes a bundled script (e.g. `dist/server.cjs`), its entrypoint loader (`bun:main`) checks if the default export looks like a server configuration (`isServerConfig(entryNamespace?.default)`).
If your entrypoint exports `app` (e.g. `export const app = express();`), Bun misidentifies Express as a Hono/Elysia-like object and attempts to auto-start it via native `Bun.serve()`.

### Solution
1. **Entrypoint Isolation**: The entrypoint file (`server.ts`) must have **zero exports**.
2. **App Factory/Module**: Extract Express middleware, routers, and CORS to `server/app.ts`, and export `app` from there for tests.
3. **Verification**: Run `node scripts/check-entrypoint.cjs` before building.

---

## 2. Docker Non-Root Volume Permissions (SQLite Error 14)

### Symptoms
```text
PrismaClientInitializationError: Error code 14: Unable to open the database file
```

### Cause
The official `oven/bun` Docker image uses the non-root user `bun` with UID 1000 and GID 1000. When mounting a host volume (e.g. `./data:/app/data`), if the host directory was created by `root`, the `bun` user inside the container cannot create or write to the SQLite database file (`tracker.db`).

### Solution
On the Docker host:
```bash
mkdir -p data
sudo chown -R 1000:1000 data
sudo chmod -R 775 data
```

---

## 3. Frozen Lockfile Failures in Multi-Stage Bun Builds

### Symptoms
In Docker builder or runner stages:
```text
error: lockfile had changes, but lockfile is frozen
```
even when `--no-frozen-lockfile` is passed to `bun install --production`.

### Cause
Bun strictly enforces frozen lockfile checks during dependency pruning/production filtering.

### Solution
In `Dockerfile`, install all dependencies in the builder stage and copy `node_modules` directly to the runner stage:
```dockerfile
# Builder stage
RUN bun install --no-frozen-lockfile
RUN bun run build

# Runner stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

---

## 4. Host Port Mapping & Proxmox / Self-Hosted Configurations

### Symptoms
Port 3000 conflict with Grafana, Portainer, or other existing services on self-hosted Proxmox nodes.

### Solution
Use customizable host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "${HOST_PORT:-3050}:3000"
environment:
  - PORT=3000
  - APP_URL=http://localhost:${HOST_PORT:-3050}
```
Inside the container, Express always listens on `0.0.0.0:3000`. On the host, it binds to `3050`.

---

## 5. Healthcheck Verification

Use a minimal curl healthcheck in `Dockerfile`:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```
Ensure `/api/health` returns `200 OK` with JSON `{ "status": "ok" }` and has zero heavy external dependencies.
