import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';
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
});
