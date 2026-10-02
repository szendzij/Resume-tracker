import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service';
import { JobApplication } from '../../src/types';

export const applicationsRouter = Router();

// GET /api/applications - Get all applications
applicationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const apps = await dbService.getAllApplications();
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: 'Nie udało się pobrać aplikacji z bazy danych', details: err.message });
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
    res.status(500).json({ error: 'Błąd podczas pobierania aplikacji', details: err.message });
  }
});

// POST /api/applications - Create or update single application
applicationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body as JobApplication;
    if (!data.company || !data.role) {
      res.status(400).json({ error: 'Pola company i role są wymagane' });
      return;
    }

    const applicationToSave: JobApplication = {
      ...data,
      id: data.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
      status: data.status || 'Wysłana',
      lastUpdated: new Date().toISOString(),
    };

    const saved = await dbService.saveApplication(applicationToSave);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Nie udało się zapisać aplikacji', details: err.message });
  }
});

// POST /api/applications/batch - Batch save applications
applicationsRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { applications } = req.body;
    if (!Array.isArray(applications)) {
      res.status(400).json({ error: 'Tablica applications jest wymagana' });
      return;
    }

    const result = await dbService.saveApplicationsBatch(applications);
    res.status(201).json({ count: result.count, success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Błąd podczas masowego zapisu aplikacji', details: err.message });
  }
});

// PUT /api/applications/:id - Update application
applicationsRouter.put('/:id', async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Błąd podczas aktualizacji aplikacji', details: err.message });
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
    res.status(500).json({ error: 'Błąd podczas usuwania aplikacji', details: err.message });
  }
});

// DELETE /api/applications - Bulk delete
applicationsRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'Tablica ids jest wymagana' });
      return;
    }

    const count = await dbService.deleteApplicationsBatch(ids);
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: 'Błąd podczas usuwania wielu aplikacji', details: err.message });
  }
});
