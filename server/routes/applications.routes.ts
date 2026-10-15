import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { JobApplication, DEFAULT_STATUS } from '../../shared/types';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createApplicationSchema,
  updateApplicationSchema,
  batchApplicationsSchema,
  batchUpdateApplicationsSchema,
  bulkDeleteApplicationsSchema,
} from '../schemas/application.schema';

export const applicationsRouter = Router();

// GET /api/applications - Get all applications
applicationsRouter.get(
  '/',
  asyncHandler(
    async (_req: Request, res: Response) => {
      const apps = await dbService.getAllApplications();
      res.json(apps);
    },
    { message: 'Nie udało się pobrać aplikacji z bazy danych' }
  )
);

// GET /api/applications/:id - Get single application
applicationsRouter.get(
  '/:id',
  asyncHandler(
    async (req: Request, res: Response) => {
      const app = await dbService.getApplicationById(req.params.id);
      if (!app) {
        res.status(404).json({ error: 'Aplikacja nie została znaleziona' });
        return;
      }
      res.json(app);
    },
    { message: 'Błąd podczas pobierania aplikacji' }
  )
);

// POST /api/applications - Create or update single application
applicationsRouter.post(
  '/',
  validateBody(createApplicationSchema),
  asyncHandler(
    async (req: Request, res: Response) => {
      const data = req.body as JobApplication;

      const applicationToSave: JobApplication = {
        ...data,
        id: data.id || `job-${crypto.randomUUID()}`,
        appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
        status: data.status || DEFAULT_STATUS,
        lastUpdated: new Date().toISOString(),
      };

      const saved = await dbService.saveApplication(applicationToSave);
      res.status(201).json(saved);
    },
    { message: 'Nie udało się zapisać aplikacji' }
  )
);

// POST /api/applications/batch - Batch save applications
applicationsRouter.post(
  '/batch',
  validateBody(batchApplicationsSchema),
  asyncHandler(
    async (req: Request, res: Response) => {
      const { applications } = req.body;
      const result = await dbService.saveApplicationsBatch(applications);
      res.status(201).json({ count: result.count, success: true });
    },
    { message: 'Błąd podczas masowego zapisu aplikacji' }
  )
);

// PUT /api/applications/batch - Batch update applications
applicationsRouter.put(
  '/batch',
  validateBody(batchUpdateApplicationsSchema),
  asyncHandler(
    async (req: Request, res: Response) => {
      const updates = Array.isArray(req.body) ? req.body : (req.body as any).updates;
      const count = await dbService.updateApplicationsBatch(updates);
      res.json({ count, success: true });
    },
    { message: 'Błąd podczas masowej aktualizacji aplikacji' }
  )
);

// PUT /api/applications/:id - Update application
applicationsRouter.put(
  '/:id',
  validateBody(updateApplicationSchema),
  asyncHandler(
    async (req: Request, res: Response) => {
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
    },
    { message: 'Błąd podczas aktualizacji aplikacji' }
  )
);

// DELETE /api/applications/:id - Delete single application
applicationsRouter.delete(
  '/:id',
  asyncHandler(
    async (req: Request, res: Response) => {
      const success = await dbService.deleteApplication(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Aplikacja nie została znaleziona lub usunięta' });
        return;
      }
      res.json({ success: true, id: req.params.id });
    },
    { message: 'Błąd podczas usuwania aplikacji' }
  )
);

// DELETE /api/applications - Bulk delete
applicationsRouter.delete(
  '/',
  validateBody(bulkDeleteApplicationsSchema),
  asyncHandler(
    async (req: Request, res: Response) => {
      const { ids } = req.body;
      const count = await dbService.deleteApplicationsBatch(ids);
      res.json({ success: true, count });
    },
    { message: 'Błąd podczas usuwania wielu aplikacji' }
  )
);
