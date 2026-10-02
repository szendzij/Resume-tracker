# Clean Entrypoint Invariant (Bun & Docker Guardrail)

> **Scope**: Application entrypoint scripts (`server.ts`, `main.ts`) bundled for production.

## Invariant
**Entrypoint files (`server.ts`) MUST NEVER export any variables, objects, or functions.**
There must be zero `export const`, `export function`, `export default`, or `export { ... }` in `server.ts`.

## Rationale
In runtime environments using Bun (e.g. `Bun v1.4+` in `oven/bun:1-slim` Docker images):
1. When Bun executes a bundled script (`dist/server.cjs`), Bun's internal `bun:main` inspects exported properties via `isServerConfig(entryNamespace?.default)`.
2. If `app` or server-like properties are exported, Bun assumes the module is a native `Bun.serve()` configuration (similar to Hono/Elysia).
3. Bun then calls `Bun.serve(entryNamespace.default)`. Since an Express application does not implement Bun's native `fetch` or `routes` handlers, Bun throws:
   ```text
   TypeError: Bun.serve() needs either: a routes object or a fetch handler
   ```
   causing a critical crash and infinite restart loop in Docker.

## Rules for Agents
1. **Application Configuration**:
   - Instantiate Express, configure CORS/PNA, body parsers, health checks, and route mounts in `server/app.ts`.
   - Export `app` from `server/app.ts` (`export const app = express();`).
2. **Entrypoint Execution**:
   - `server.ts` must only import `app` from `./server/app`, configure runtime-only concerns (Vite dev middleware or static dist file serving), and call `startServer()`.
   - `server.ts` must have **zero exports**.
3. **Tests**:
   - Any unit or integration tests verifying Express routes or CORS MUST import `app` from `../server/app` (or `@/server/app`), NEVER from `../server`.
4. **Verification**:
   - Run `node scripts/check-entrypoint.cjs` (or `npm run check:entrypoint`) to guarantee no exports exist before committing or building.
