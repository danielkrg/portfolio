import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import photosRouter from '../../../../server/apps/photos/routes';

// Exercises the real photos router at the HTTP seam, mounted exactly as the
// server mounts it (/api/photos). supertest stands in for the browser + Vite
// proxy so later slices can assert the API contract without a running server.
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/photos', photosRouter);
  return app;
}

describe('GET /api/photos', () => {
  it('responds 200 with an empty photo list', async () => {
    const res = await request(makeApp()).get('/api/photos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ photos: [] });
  });
});
