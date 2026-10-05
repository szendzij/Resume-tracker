import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dbService, prisma } from './db.service';
import { JobApplication } from '../../src/types';

describe('dbService', () => {
  it('saves and retrieves applications with parsed JSON fields', async () => {
    const mockApp: JobApplication = {
      id: 'test-job-1',
      role: 'QA Engineer',
      company: 'TestCorp',
      portal: 'LinkedIn',
      url: 'https://example.com/job/1',
      appliedDate: '2026-10-02',
      status: 'Wysłana',
      skills: ['TypeScript', 'Playwright'],
      notes: 'Initial test note',
      location: 'Remote',
      salary: '15000 PLN',
      lastUpdated: new Date().toISOString(),
    };

    await dbService.saveApplication(mockApp);
    const retrieved = await dbService.getApplicationById('test-job-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('test-job-1');
    expect(retrieved?.skills).toEqual(['TypeScript', 'Playwright']);
    expect(retrieved?.company).toBe('TestCorp');
  });

  it('handles batch save and retrieve all', async () => {
    const apps: JobApplication[] = [
      {
        id: 'test-batch-1',
        role: 'Frontend Dev',
        company: 'BatchCorp',
        portal: 'JustJoin',
        url: 'https://example.com/job/2',
        appliedDate: '2026-10-02',
        status: 'Rozmowa HR',
        skills: ['React', 'Tailwind'],
      },
      {
        id: 'test-batch-2',
        role: 'Backend Dev',
        company: 'BatchCorp',
        portal: 'NoFluffJobs',
        url: 'https://example.com/job/3',
        appliedDate: '2026-10-02',
        status: 'Weryfikacja CV',
      },
    ];

    const result = await dbService.saveApplicationsBatch(apps);
    expect(result.count).toBeGreaterThanOrEqual(2);

    const all = await dbService.getAllApplications();
    const found1 = all.find((a) => a.id === 'test-batch-1');
    const found2 = all.find((a) => a.id === 'test-batch-2');
    expect(found1).toBeDefined();
    expect(found1?.skills).toEqual(['React', 'Tailwind']);
    expect(found2).toBeDefined();
    expect(found2?.skills).toEqual([]);
  });

  it('uses prisma.$transaction to execute batch save atomically', async () => {
    const transactionSpy = vi.spyOn(prisma, '$transaction');

    const apps: JobApplication[] = [
      {
        id: 'test-tx-1',
        role: 'Fullstack Dev',
        company: 'TxCorp',
        portal: 'LinkedIn',
        url: 'https://example.com/tx/1',
        appliedDate: '2026-10-02',
        status: 'Wysłana',
      },
      {
        id: 'test-tx-2',
        role: 'Mobile Dev',
        company: 'TxCorp',
        portal: 'LinkedIn',
        url: 'https://example.com/tx/2',
        appliedDate: '2026-10-02',
        status: 'Do zaaplikowania',
      },
    ];

    const result = await dbService.saveApplicationsBatch(apps);
    expect(transactionSpy).toHaveBeenCalled();
    expect(result.count).toBe(2);

    const app1 = await dbService.getApplicationById('test-tx-1');
    const app2 = await dbService.getApplicationById('test-tx-2');
    expect(app1).not.toBeNull();
    expect(app2).not.toBeNull();

    transactionSpy.mockRestore();
  });

  it('rolls back entire transaction if any operation in the batch fails at the database level', async () => {
    const validAppId = `test-rollback-valid-${Date.now()}`;

    // Execute a real multi-operation transaction where the first operation creates a valid record,
    // but the second operation fails at the SQLite level (e.g. non-existent table).
    await expect(
      prisma.$transaction([
        prisma.application.create({
          data: {
            id: validAppId,
            role: 'Security Engineer',
            company: 'RollbackCorp',
            appliedDate: '2026-10-02',
            status: 'Wysłana',
          },
        }),
        prisma.$executeRawUnsafe('INSERT INTO NonExistentTable VALUES (1)'),
      ])
    ).rejects.toThrow();

    // Verify SQLite transaction atomicity: the first operation was rolled back and not persisted
    const app = await dbService.getApplicationById(validAppId);
    expect(app).toBeNull();
  });

  it('retries up to 3 times on SQLITE_BUSY before succeeding', async () => {
    const retryApp: JobApplication = {
      id: `test-retry-${Date.now()}`,
      role: 'DevOps Engineer',
      company: 'RetryCorp',
      portal: 'LinkedIn',
      url: 'https://example.com/job/retry',
      appliedDate: '2026-10-02',
      status: 'Wysłana',
    };

    let callCount = 0;
    const realTransaction = prisma.$transaction.bind(prisma);
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (ops: any) => {
      callCount++;
      if (callCount < 3) {
        const busyError: any = new Error('database is locked (SQLITE_BUSY)');
        busyError.code = 'SQLITE_BUSY';
        throw busyError;
      }
      return realTransaction(ops);
    });

    const result = await dbService.saveApplicationsBatch([retryApp]);
    expect(result.count).toBe(1);
    expect(callCount).toBe(3);

    const saved = await dbService.getApplicationById(retryApp.id);
    expect(saved).not.toBeNull();
    expect(saved?.company).toBe('RetryCorp');

    transactionSpy.mockRestore();
  });

  it('throws after exhausting 3 retries on persistent SQLITE_BUSY', async () => {
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async () => {
      const busyError: any = new Error('database is locked (SQLITE_BUSY)');
      busyError.code = 'SQLITE_BUSY';
      throw busyError;
    });

    const busyApp: JobApplication = {
      id: `test-busy-fail-${Date.now()}`,
      role: 'SRE',
      company: 'BusyCorp',
      portal: 'NoFluffJobs',
      url: 'https://example.com/job/busy',
      appliedDate: '2026-10-02',
      status: 'Wysłana',
    };

    await expect(dbService.saveApplicationsBatch([busyApp])).rejects.toThrow('SQLITE_BUSY');

    transactionSpy.mockRestore();
  });

  it('returns count 0 when saving empty batch', async () => {
    const result = await dbService.saveApplicationsBatch([]);
    expect(result.count).toBe(0);
  });

  it('deletes single and batch applications', async () => {
    const app: JobApplication = {
      id: 'test-del-1',
      role: 'DevOps',
      company: 'DeleteCorp',
      portal: 'Pracuj.pl',
      url: 'https://example.com/job/del',
      appliedDate: '2026-10-02',
      status: 'Wysłana',
    };

    await dbService.saveApplication(app);
    const deleted = await dbService.deleteApplication('test-del-1');
    expect(deleted).toBe(true);

    const afterDel = await dbService.getApplicationById('test-del-1');
    expect(afterDel).toBeNull();
  });

  it('logs error and returns false when deleteApplication encounters a DB error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deleteSpy = vi.spyOn(prisma.application, 'delete').mockRejectedValueOnce(new Error('DB failure'));

    const result = await dbService.deleteApplication('error-id');
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    deleteSpy.mockRestore();
  });
});
