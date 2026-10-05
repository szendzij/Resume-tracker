import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { JobApplication } from '../../shared/types';
import { validateBody } from '../middleware/validate';
import {
  createApplicationSchema,
  updateApplicationSchema,
  batchApplicationsSchema,
  batchUpdateApplicationsSchema,
  bulkDeleteApplicationsSchema,
} from '../schemas/application.schema';

export const applicationsRouter = Router();

// GET /api/applications - Get all applications
applicationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const apps = await dbService.getAllApplications();
    res.json(apps);
  } catch (err: any) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Nie udało się pobrać aplikacji z bazy danych' });
  }
});

// GET /api/applications/:id - Get single application
applicationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const app = await dbService.getApplicationById(req.params.id);
    if (!app) {
      res.status(404).json({ error: 'Aplikacja nie została znaleziona' });
      return;
    }
    res.json(app);
  } catch (err: any) {
    console.error(`Error fetching application ${req.params.id}:`, err);
    res.status(500).json({ error: 'Błąd podczas pobierania aplikacji' });
  }
});

// POST /api/applications - Create or update single application
applicationsRouter.post('/', validateBody(createApplicationSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body as JobApplication;

    const applicationToSave: JobApplication = {
      ...data,
      id: data.id || `job-${crypto.randomUUID()}`,
      appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
      status: data.status || 'Wysłana',
      lastUpdated: new Date().toISOString(),
    };

    const saved = await dbService.saveApplication(applicationToSave);
    res.status(201).json(saved);
  } catch (err: any) {
    console.error('Error saving application:', err);
    res.status(500).json({ error: 'Nie udało się zapisać aplikacji' });
  }
});

// POST /api/applications/batch - Batch save applications
applicationsRouter.post('/batch', validateBody(batchApplicationsSchema), async (req: Request, res: Response) => {
  try {
    const { applications } = req.body;
    const result = await dbService.saveApplicationsBatch(applications);
    res.status(201).json({ count: result.count, success: true });
  } catch (err: any) {
    console.error('Error batch saving applications:', err);
    res.status(500).json({ error: 'Błąd podczas masowego zapisu aplikacji' });
  }
});

// PUT /api/applications/batch - Batch update applications
applicationsRouter.put('/batch', validateBody(batchUpdateApplicationsSchema), async (req: Request, res: Response) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : (req.body as any).updates;
    const count = await dbService.updateApplicationsBatch(updates);
    res.json({ count, success: true });
  } catch (err: any) {
    console.error('Error batch updating applications:', err);
    res.status(500).json({ error: 'Błąd podczas masowej aktualizacji aplikacji' });
  }
});

// PUT /api/applications/:id - Update application
applicationsRouter.put('/:id', validateBody(updateApplicationSchema), async (req: Request, res: Response) => {
  try {
    const existing = await dbService.getApplicationById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Aplikacja nie została znaleziona' });
      return;
    }

    const updatedApp: JobApplication = {
      ...existing,
      ...req.body,
      id: req.params.id,
      lastUpdated: new Date().toISOString(),
    };

    const saved = await dbService.saveApplication(updatedApp);
    res.json(saved);
  } catch (err: any) {
    console.error(`Error updating application ${req.params.id}:`, err);
    res.status(500).json({ error: 'Błąd podczas aktualizacji aplikacji' });
  }
});

// DELETE /api/applications/:id - Delete single application
applicationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await dbService.deleteApplication(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Aplikacja nie została znaleziona lub usunięta' });
      return;
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error(`Error deleting application ${req.params.id}:`, err);
    res.status(500).json({ error: 'Błąd podczas usuwania aplikacji' });
  }
});

// DELETE /api/applications - Bulk delete
applicationsRouter.delete('/', validateBody(bulkDeleteApplicationsSchema), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const count = await dbService.deleteApplicationsBatch(ids);
    res.json({ success: true, count });
  } catch (err: any) {
    console.error('Error bulk deleting applications:', err);
    res.status(500).json({ error: 'Błąd podczas usuwania wielu aplikacji' });
  }
});
