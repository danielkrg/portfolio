import { Router, type Request, type Response } from 'express';
import { cloudinaryGateway, type PhotoGateway } from './cloudinary-gateway';

/**
 * Build the public Photos router around a PhotoGateway. The gateway is injected
 * so tests can fake Cloudinary (ADR-0001); production wires the real one below.
 */
export function createPhotosRouter(gateway: PhotoGateway): Router {
  const router = Router();

  // GET /api/photos — public, unauthenticated list of all Photos in Master Order.
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const photos = await gateway.listPhotos();
      res.json({ photos });
    } catch (err) {
      console.error('Failed to list photos:', err);
      res.status(502).json({ error: 'Failed to list photos' });
    }
  });

  return router;
}

export default createPhotosRouter(cloudinaryGateway);
