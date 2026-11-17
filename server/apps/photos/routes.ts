import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * GET /api/photos — list all photos.
 *
 * Tracer-bullet slice: the gallery has no data source wired up yet, so this
 * always responds with an empty list. Later slices back this with Cloudinary
 * (see docs/adr/0001-cloudinary-as-system-of-record.md).
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ photos: [] });
});

export default router;
