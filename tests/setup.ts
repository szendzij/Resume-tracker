import path from 'path';
import { createRequire } from 'module';
import dotenv from 'dotenv';

// Load .env once per test file so that any module evaluated at import time
// (e.g. `new PrismaClient()` in server/services/db.service.ts) sees the same
// environment the application sees. Mirrors server/config/env.ts.
dotenv.config();

// Prisma reads DATABASE_URL directly from process.env when the client is
// instantiated, and db.service.ts imports PrismaClient without importing
// server/config/env.ts. Test files therefore used to depend on the caller
// exporting DATABASE_URL in the shell. Provide a deterministic fallback.
process.env.DATABASE_URL ||= 'file:./data/tracker.db';

/**
 * Make SQLite writes fast and deterministic in tests.
 *
 * The test suite runs on storage where a rollback-journal commit (the SQLite
 * default) costs ~1.5s because every commit fsyncs. Tests that perform a few
 * writes in sequence then blow through the 5s default test timeout, which is
 * *not* a property of the code under test. WAL mode keeps commits cheap
 * (measured: ~0 -> ~0.5s here) so the suite outcome no longer depends on disk
 * latency or on how many other processes are hammering the same volume.
 *
 * journal_mode is stored in the database file itself, so it survives between
 * runs; setting it here keeps the suite reproducible on a freshly created DB.
 * Everything is best-effort: any failure must never break the test run.
 */
function enableSqliteWal(databaseUrl: string | undefined): void {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) return;

  const raw = databaseUrl.slice('file:'.length).split('?')[0];
  // Prisma resolves relative SQLite paths against the schema directory.
  const dbPath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), 'prisma', raw);

  try {
    // node:sqlite is available on Node >= 22 and keeps this dependency-free.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
    const db = new DatabaseSync(dbPath);
    try {
      db.exec('PRAGMA journal_mode=WAL;');
    } finally {
      db.close();
    }
  } catch {
    // Best effort — a missing DB file or an older Node is not fatal.
  }
}

enableSqliteWal(process.env.DATABASE_URL);
