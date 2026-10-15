import { PrismaClient, Prisma } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { JobApplication, JobStatus, ApplicationTimelineEntry, DEFAULT_STATUS } from '../../shared/types';
import { withRetry } from './retry';

export const prisma = new PrismaClient();

// Single source of truth for the schema: Prisma Migrate (see prisma/migrations).
// No raw DDL is executed anywhere — the baseline migration creates the table.
const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
const PRISMA_CLI = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

function listLocalMigrations(): string[] {
  try {
    return fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function findBaselineMigration(): string | null {
  return listLocalMigrations().find((name) => name.endsWith('_baseline')) ?? null;
}

/**
 * True only for Prisma error P3005 — "the database schema is not empty", i.e. the
 * database was created before migrations existed and needs baselining.
 */
function isNotBaselinedError(error: unknown): boolean {
  const err = error as { message?: string; stdout?: Buffer | string; stderr?: Buffer | string };
  const text = [
    err?.message,
    err?.stdout?.toString(),
    err?.stderr?.toString(),
  ]
    .filter(Boolean)
    .join('\n');
  return text.includes('P3005') || text.includes('database schema is not empty');
}

/**
 * Fast in-process check: true when every local migration is recorded as applied.
 * Avoids spawning the Prisma CLI (slow on fsync-bound storage) on every startup
 * when the schema has not changed.
 */
async function schemaIsUpToDate(): Promise<boolean> {
  const local = listLocalMigrations();
  if (local.length === 0) return false;
  try {
    const applied = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const appliedNames = new Set(applied.map((row) => row.migration_name));
    return local.every((name) => appliedNames.has(name));
  } catch {
    return false;
  }
}

function runPrismaCli(args: string[]): void {
  execFileSync(process.execPath, [PRISMA_CLI, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

/**
 * Apply pending Prisma migrations.
 *
 * Fresh databases receive the full schema from the baseline migration. Databases
 * created before migrations existed already contain the table, so `deploy` fails
 * with P3005 ("database schema is not empty") until the baseline is marked as
 * applied — that is the documented migrate-baseline flow, handled here so the
 * "table already exists" case stays tolerated.
 */
function applyMigrations(): void {
  if (!fs.existsSync(PRISMA_CLI)) return;
  try {
    runPrismaCli(['migrate', 'deploy']);
  } catch (deployError) {
    // Only P3005 ("database schema is not empty") means "this database predates
    // migrations", which is the case the baseline flow exists for. Any other
    // failure (bad SQL, disk full, lock) must surface instead of being masked by
    // marking the migration as applied — a false baseline silently skips schema
    // changes and is far worse than a loud startup error.
    if (!isNotBaselinedError(deployError)) throw deployError;
    const baseline = findBaselineMigration();
    if (!baseline) throw deployError;
    runPrismaCli(['migrate', 'resolve', '--applied', baseline]);
    runPrismaCli(['migrate', 'deploy']);
  }
}

function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function mapToJobApplication(record: {
  id: string;
  role: string;
  company: string;
  portal: string | null;
  url: string | null;
  appliedDate: string;
  status: string;
  location: string | null;
  salary: string | null;
  skills: string | null;
  timeline?: string | null;
  notes: string | null;
  lastUpdated: string | null;
}): JobApplication {
  return {
    id: record.id,
    role: record.role,
    company: record.company,
    portal: record.portal || 'Inne',
    url: record.url || '',
    appliedDate: record.appliedDate,
    status: record.status as JobStatus,
    location: record.location || undefined,
    salary: record.salary || undefined,
    skills: safeJsonParse<string[]>(record.skills, []),
    timeline: safeJsonParse<ApplicationTimelineEntry[]>(record.timeline, []),
    notes: record.notes || undefined,
    lastUpdated: record.lastUpdated || undefined,
  };
}

function buildUpsertArgs(app: JobApplication) {
  const skillsJson = app.skills ? JSON.stringify(app.skills) : '[]';
  const timelineJson = app.timeline ? JSON.stringify(app.timeline) : '[]';
  const now = new Date().toISOString();

  return {
    where: { id: app.id },
    create: {
      id: app.id,
      role: app.role || 'Stanowisko',
      company: app.company || 'Firma',
      portal: app.portal || 'LinkedIn',
      url: app.url || '',
      appliedDate: app.appliedDate || now.split('T')[0],
      status: app.status || DEFAULT_STATUS,
      location: app.location || null,
      salary: app.salary || null,
      skills: skillsJson,
      timeline: timelineJson,
      notes: app.notes || null,
      lastUpdated: app.lastUpdated || now,
    },
    update: {
      role: app.role,
      company: app.company,
      portal: app.portal,
      url: app.url,
      appliedDate: app.appliedDate,
      status: app.status,
      location: app.location || null,
      salary: app.salary || null,
      skills: skillsJson,
      timeline: timelineJson,
      notes: app.notes || null,
      lastUpdated: app.lastUpdated || now,
    },
  };
}

function isRetryableDbError(err: any): boolean {
  if (!err) return false;
  if (err.code === 'P2034' || err.code === 'SQLITE_BUSY') return true;
  if (typeof err.message === 'string' && (err.message.includes('SQLITE_BUSY') || err.message.includes('P2034'))) {
    return true;
  }
  return false;
}

export const dbService = {
  async getAllApplications(): Promise<JobApplication[]> {
    const records = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapToJobApplication);
  },

  async getApplicationById(id: string): Promise<JobApplication | null> {
    const record = await prisma.application.findUnique({
      where: { id },
    });
    if (!record) return null;
    return mapToJobApplication(record);
  },

  async saveApplication(app: JobApplication): Promise<JobApplication> {
    const record = await prisma.application.upsert(buildUpsertArgs(app));
    return mapToJobApplication(record);
  },

  async saveApplicationsBatch(apps: JobApplication[]): Promise<{ count: number }> {
    if (!apps || apps.length === 0) {
      return { count: 0 };
    }

    const operations = apps.map((app) => prisma.application.upsert(buildUpsertArgs(app)));
    const results = await withRetry(() => prisma.$transaction(operations), {
      isRetryable: isRetryableDbError,
    });
    return { count: results.length };
  },

  async deleteApplication(id: string): Promise<boolean> {
    try {
      await prisma.application.delete({
        where: { id },
      });
      return true;
    } catch (err) {
      console.error(`Error deleting application ${id}:`, err);
      return false;
    }
  },

  async deleteApplicationsBatch(ids: string[]): Promise<number> {
    const result = await prisma.application.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },

  async updateApplicationsBatch(updates: Array<{ id: string } & Partial<JobApplication>>): Promise<number> {
    if (!updates || updates.length === 0) {
      return 0;
    }

    const operations = updates.map((item) => {
      const data: Prisma.ApplicationUncheckedUpdateInput = {
        lastUpdated: item.lastUpdated || new Date().toISOString(),
      };
      if (item.role !== undefined) data.role = item.role;
      if (item.company !== undefined) data.company = item.company;
      if (item.portal !== undefined) data.portal = item.portal;
      if (item.url !== undefined) data.url = item.url;
      if (item.appliedDate !== undefined) data.appliedDate = item.appliedDate;
      if (item.status !== undefined) data.status = item.status;
      if (item.location !== undefined) data.location = item.location;
      if (item.salary !== undefined) data.salary = item.salary;
      if (item.skills !== undefined) {
        data.skills = Array.isArray(item.skills) ? JSON.stringify(item.skills) : item.skills;
      }
      if (item.timeline !== undefined) {
        data.timeline = Array.isArray(item.timeline) ? JSON.stringify(item.timeline) : item.timeline;
      }
      if (item.notes !== undefined) data.notes = item.notes;

      return prisma.application.update({
        where: { id: item.id },
        data,
      });
    });

    const results = await withRetry(() => prisma.$transaction(operations), {
      isRetryable: isRetryableDbError,
    });
    return results.length;
  },


  async initDatabase(): Promise<void> {
    try {
      // Connect to SQLite
      await prisma.$connect();

      // Ensure the schema comes from Prisma migrations only (no raw DDL).
      // Existing databases (table already present) are baselined automatically.
      if (!(await schemaIsUpToDate())) {
        applyMigrations();
      }

      console.log('Database connected and schema verified (SQLite)');
    } catch (err) {
      console.error('Failed to initialize database connection:', err);
    }
  },
};
