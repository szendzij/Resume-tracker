import { PrismaClient } from '@prisma/client';
import { JobApplication, JobStatus } from '../../src/types';

export const prisma = new PrismaClient();

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
    notes: record.notes || undefined,
    lastUpdated: record.lastUpdated || undefined,
  };
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
    const skillsJson = app.skills ? JSON.stringify(app.skills) : '[]';
    const now = new Date().toISOString();

    const record = await prisma.application.upsert({
      where: { id: app.id },
      create: {
        id: app.id,
        role: app.role || 'Stanowisko',
        company: app.company || 'Firma',
        portal: app.portal || 'LinkedIn',
        url: app.url || '',
        appliedDate: app.appliedDate || now.split('T')[0],
        status: app.status || 'Wysłana',
        location: app.location || null,
        salary: app.salary || null,
        skills: skillsJson,
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
        notes: app.notes || null,
        lastUpdated: app.lastUpdated || now,
      },
    });

    return mapToJobApplication(record);
  },

  async saveApplicationsBatch(apps: JobApplication[]): Promise<{ count: number }> {
    let savedCount = 0;
    for (const app of apps) {
      await this.saveApplication(app);
      savedCount++;
    }
    return { count: savedCount };
  },

  async deleteApplication(id: string): Promise<boolean> {
    try {
      await prisma.application.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  },

  async deleteApplicationsBatch(ids: string[]): Promise<number> {
    const result = await prisma.application.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },

  async initDatabase(): Promise<void> {
    try {
      // Connect to SQLite
      await prisma.$connect();

      // Automatically ensure Application table exists without requiring external CLI migrations
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Application" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "role" TEXT NOT NULL,
          "company" TEXT NOT NULL,
          "portal" TEXT,
          "url" TEXT,
          "appliedDate" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'Wysłana',
          "location" TEXT,
          "salary" TEXT,
          "skills" TEXT,
          "notes" TEXT,
          "lastUpdated" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Database connected and schema verified (SQLite)');
    } catch (err) {
      console.error('Failed to initialize database connection:', err);
    }
  },
};
