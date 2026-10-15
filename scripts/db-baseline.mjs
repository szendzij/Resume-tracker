#!/usr/bin/env node
/**
 * Mark the baseline migration as applied on a database that predates migrations.
 *
 * Single source of truth for locating the *_baseline migration: this script is
 * shared by the npm `db:baseline` script and the Docker startup fallback (see
 * the CMD in the Dockerfile), so the "which migration is the baseline" rule
 * lives in exactly one place.
 *
 * Paths are resolved relative to THIS file (import.meta.url), never relative to
 * the current working directory, so the script behaves identically no matter
 * which directory it is invoked from.
 *
 * The Prisma CLI is located resiliently: the project-local CLI
 * (node_modules/prisma/build/index.js, run through the current JS runtime) is
 * preferred, and a PATH lookup (`prisma`) is only used as a last-resort
 * fallback. This keeps the script working in environments where the Prisma
 * binary is not on PATH — notably the runtime image, which has bun/bunx but no
 * guaranteed `node`/`prisma` on PATH.
 *
 * Exists so the npm script stays portable: the previous inline
 * `$(ls prisma/migrations | grep _baseline | head -n1)` only works in sh-like
 * shells and breaks on Windows (see .agents/rules/windows-powershell.md).
 *
 * Usage:  node scripts/db-baseline.mjs [--print]
 */
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'prisma', 'migrations');

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`No migrations directory at ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const baseline = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.endsWith('_baseline'))
  .map((entry) => entry.name)
  .sort()[0];

if (!baseline) {
  console.error('No *_baseline migration found in prisma/migrations');
  process.exit(1);
}

if (process.argv.includes('--print')) {
  process.stdout.write(baseline);
  process.exit(0);
}

// Prefer the project-local Prisma CLI (run through the current JS runtime) so we
// do not depend on `prisma` being resolvable via PATH; only fall back to a bare
// `prisma` (PATH lookup) when the bundled CLI is not present.
const LOCAL_PRISMA_CLI = path.join(REPO_ROOT, 'node_modules', 'prisma', 'build', 'index.js');

function runPrisma(args) {
  // Run the CLI from the repo root so Prisma resolves prisma/schema.prisma and
  // .env regardless of the directory this script was invoked from.
  const options = { stdio: 'inherit', cwd: REPO_ROOT };
  if (existsSync(LOCAL_PRISMA_CLI)) {
    execFileSync(process.execPath, [LOCAL_PRISMA_CLI, ...args], options);
    return;
  }
  execFileSync('prisma', args, options);
}

console.log(`Baselining existing database against ${baseline}`);
runPrisma(['migrate', 'resolve', '--applied', baseline]);
