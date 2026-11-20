import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPhotosRouter } from '../../../../server/apps/photos/routes';
import { createAuth } from '../../../../server/apps/photos/auth';
import type { Photo, PhotoGateway } from '../../../../server/apps/photos/cloudinary-gateway';

// A throwaway auth seam; these tests exercise only the public, unauthenticated
// list endpoint, so the password/secret values never matter here.
function testAuth() {
  return createAuth({ jwtSecret: 'test-secret', passwordHash: '', userId: 'me', isProd: false });
}

// The router is exercised at the HTTP seam with a FAKE gateway standing in for
// Cloudinary (ADR-0001), so the contract is asserted without network or creds.
function makeApp(gateway: PhotoGateway) {
  const app = express();
  app.use(express.json());
  app.use('/api/photos', createPhotosRouter(gateway, testAuth()));
  return app;
}

const photo: Photo = {
  id: 'photos/me/tent',
  url: 'https://res.cloudinary.com/demo/tent.jpg',
  thumbnailUrl: 'https://res.cloudinary.com/demo/t_thumb/tent.jpg',
  width: 1600,
  height: 900,
  tags: ['nature'],
  caption: 'A tent at dawn',
  alt: 'Tent on a ridge',
  position: 0,
};

describe('GET /api/photos', () => {
  it('returns the gateway photos as JSON without requiring auth', async () => {
    const gateway: PhotoGateway = {
      listPhotos: async () => [photo],
      deletePhoto: async () => {},
      uploadPhoto: async () => photo,
      setPosition: async () => {},
    };

    // No Authorization header is sent — the list endpoint is public.
    const res = await request(makeApp(gateway)).get('/api/photos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ photos: [photo] });
  });

  it('responds 502 when the gateway fails', async () => {
    const gateway: PhotoGateway = {
      listPhotos: async () => {
        throw new Error('cloudinary unavailable');
      },
      deletePhoto: async () => {},
      uploadPhoto: async () => photo,
      setPosition: async () => {},
    };

    const res = await request(makeApp(gateway)).get('/api/photos');

    expect(res.status).toBe(502);
  });
});
