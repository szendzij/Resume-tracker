#!/usr/bin/env node
/**
 * Mark the baseline migration as applied on a database that predates migrations.
 *
 * Exists so the npm script stays portable: the previous inline
 * `$(ls prisma/migrations | grep _baseline | head -n1)` only works in sh-like
 * shells and breaks on Windows (see .agents/rules/windows-powershell.md).
 *
 * Usage:  node scripts/db-baseline.mjs [--print]
 */
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

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

console.log(`Baselining existing database against ${baseline}`);
execFileSync('prisma', ['migrate', 'resolve', '--applied', baseline], { stdio: 'inherit' });
