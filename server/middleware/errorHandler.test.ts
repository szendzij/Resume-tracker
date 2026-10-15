import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { applicationsRouter } from '../routes/applications.routes';
import { errorHandler } from './errorHandler';
import { asyncHandler, HttpError } from './asyncHandler';
import { dbService } from '../services/db.service';

vi.mock('../services/db.service', () => ({
  dbService: {
    getAllApplications: vi.fn(),
    getApplicationById: vi.fn(),
    saveApplication: vi.fn(),
    saveApplicationsBatch: vi.fn(),
    updateApplicationsBatch: vi.fn(),
    deleteApplication: vi.fn(),
    deleteApplicationsBatch: vi.fn(),
  },
}));

function listen(app: express.Express): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe('errorHandler (centralny middleware błędów)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('maps a thrown route error to the existing GET /api/applications 500 message', async () => {
    vi.mocked(dbService.getAllApplications).mockRejectedValueOnce(
      new Error('Sensitive internal DB stack trace')
    );

    const app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRouter);
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/applications`);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Nie udało się pobrać aplikacji z bazy danych');
    } finally {
      await close(server);
    }
  });

  it('does not leak stack trace or internal error details in the response body', async () => {
    vi.mocked(dbService.getAllApplications).mockRejectedValueOnce(
      new Error('Sensitive internal DB stack trace')
    );

    const app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRouter);
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/api/applications`);
      const raw = await res.text();
      expect(raw).not.toContain('Sensitive internal DB stack trace');
      expect(raw).not.toContain('stack');
      expect(raw).not.toMatch(/\bat .+:\d+:\d+/); // no stack frames
    } finally {
      await close(server);
    }
  });

  it('logs the error exactly once via the central handler', async () => {
    vi.mocked(dbService.getAllApplications).mockRejectedValueOnce(new Error('boom'));

    const app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRouter);
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      await fetch(`${baseUrl}/api/applications`);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    } finally {
      await close(server);
    }
  });

  it('logs the real cause of an HttpError while keeping the client body free of internal details', async () => {
    const rootCause = new Error('SQLITE_BUSY');
    const routeMessage = 'Nie udało się pobrać aplikacji z bazy danych';

    const app = express();
    // Prepared HttpError carrying the original rejection as ES2022 `cause`.
    app.get('/boom', () => {
      throw new HttpError(500, routeMessage, { cause: rootCause });
    });
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/boom`);
      expect(res.status).toBe(500);

      const data = await res.json();
      // (a) Body stays identical: only the route message, no internal details.
      expect(data).toEqual({ error: routeMessage });
      expect(Object.keys(data)).toEqual(['error']);
      const raw = JSON.stringify(data);
      expect(raw).not.toContain('SQLITE_BUSY');
      expect(raw).not.toContain('cause');
      expect(raw).not.toMatch(/\bat .+:\d+:\d+/); // no stack frames

      // (b) console.error was called exactly once with the REAL cause.
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const args = consoleErrorSpy.mock.calls[0];
      const hasRootCause = args.some(
        (arg: unknown) => arg instanceof Error && arg.message === 'SQLITE_BUSY'
      );
      expect(hasRootCause).toBe(true);
      expect(args).toContain(routeMessage);
    } finally {
      await close(server);
    }
  });

  it('asyncHandler attaches the original rejection as HttpError cause and logs it', async () => {
    const rootCause = new Error('SQLITE_BUSY');
    const app = express();
    app.get(
      '/boom',
      asyncHandler(
        async () => {
          throw rootCause;
        },
        { message: 'Nie udało się pobrać aplikacji z bazy danych' }
      )
    );
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/boom`);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Nie udało się pobrać aplikacji z bazy danych');
      expect(JSON.stringify(data)).not.toContain('SQLITE_BUSY');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const args = consoleErrorSpy.mock.calls[0];
      expect(
        args.some((arg: unknown) => arg instanceof Error && arg.message === 'SQLITE_BUSY')
      ).toBe(true);
    } finally {
      await close(server);
    }
  });

  it('asyncHandler forwards a rejection as a 500 with a generic message for an unmapped error', async () => {
    const app = express();
    app.get(
      '/boom',
      asyncHandler(async () => {
        throw new Error('raw failure');
      })
    );
    app.use(errorHandler);

    const { server, baseUrl } = await listen(app);
    try {
      const res = await fetch(`${baseUrl}/boom`);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Wewnętrzny błąd serwera');
      expect(JSON.stringify(data)).not.toContain('raw failure');
    } finally {
      await close(server);
    }
  });
});
