import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ENV } from './server/config/env';
import { dbService } from './server/services/db.service';
import { app } from './server/app';

// Production static assets & Vite development middleware
async function startServer() {
  await dbService.initDatabase();

  if (!ENV.IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${ENV.PORT}`);
  });
}

startServer();
