import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../server';
import { ALL_STATUSES, STATUS_CONFIG } from '../src/utils/statusConfig';

describe('Server CORS & Private Network Access', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('OPTIONS /api/health returns status 204 with PNA and CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'chrome-extension://test-extension-id',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Private-Network': 'true',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-private-network')).toBe('true');
  });

  it('GET /api/health returns headers access-control-allow-origin: * and access-control-allow-private-network: true', async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-private-network')).toBe('true');
  });
});

describe('Domain Status Updates', () => {
  it('contains "Do zaaplikowania" in ALL_STATUSES and in STATUS_CONFIG with required styling and description', () => {
    expect(ALL_STATUSES).toContain('Do zaaplikowania');
    const config = (STATUS_CONFIG as Record<string, any>)['Do zaaplikowania'];
    expect(config).toBeDefined();
    expect(config.label).toBe('Do zaaplikowania');
    expect(config.bg).toBeTruthy();
    expect(config.text).toBeTruthy();
    expect(config.border).toBeTruthy();
    expect(config.dot).toBeTruthy();
    expect(config.badgeClass).toBeTruthy();
    expect(config.description).toBe('Zapisana oferta, oczekuje na przygotowanie i wysłanie CV');
  });
});
