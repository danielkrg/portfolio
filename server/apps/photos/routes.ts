import { Router, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { cloudinaryGateway, type PhotoGateway } from './cloudinary-gateway';
import {
  createAuth,
  OWNER_USER_ID,
  type Auth,
  type AuthedRequest,
} from './auth';

// The browser downscales/strips each image before sending (issue #8), so the
// processed upload is comfortably under Cloudinary's 10 MB cap; 12 MB leaves
// headroom. Kept in memory — nothing touches the ephemeral disk (ADR-0001).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

// A request carrying a single parsed upload (multer populates `file`).
type UploadRequest = AuthedRequest & { file?: Express.Multer.File };

/**
 * Build the Photos router around a PhotoGateway and an Auth seam, both injected
 * so tests can fake Cloudinary (ADR-0001) and construct auth with a known
 * password (ADR-0002); production wires the real ones below.
 *
 * Reads are public; writes are gated behind {@link Auth.requireOwner}.
 */
export function createPhotosRouter(gateway: PhotoGateway, auth: Auth): Router {
  const router = Router();

  // Parse the session cookie for this router's routes.
  router.use(cookieParser());

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

  // POST /api/photos/login — verify the Owner password, set the session cookie.
  // Rate-limited so repeated failed attempts are throttled.
  router.post('/login', auth.loginRateLimiter, async (req: Request, res: Response) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const token = await auth.authenticate(password);
    if (!token) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    res.cookie(auth.cookieName, token, auth.setCookieOptions());
    res.json({ ok: true });
  });

  // POST /api/photos/logout — clear the session cookie.
  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie(auth.cookieName, auth.clearCookieOptions());
    res.json({ ok: true });
  });

  // GET /api/photos/session — who, if anyone, is authenticated. The client uses
  // this to restore Owner state after a refresh (the cookie is httpOnly).
  router.get('/session', auth.requireOwner, (req: Request, res: Response) => {
    res.json({ userId: (req as AuthedRequest).userId });
  });

  // POST /api/photos — upload a new Photo (issue #8), Owner-only. requireOwner
  // runs before multer so an unauthenticated upload is rejected (401) without
  // the body ever being read. The image has already been downscaled and
  // EXIF-stripped in the browser; the server relays the bytes to Cloudinary and
  // seeds Master Order. New Photos sort newest-first: Master Order ascends by
  // `position`, so a descending-time seed keeps each upload ahead of the
  // existing Photos (and ahead of earlier uploads in the same batch) until the
  // Owner reorders. Orientation is derived client-side from the dimensions
  // Cloudinary returns, so none is computed here.
  router.post('/', auth.requireOwner, upload.single('file'), async (req: Request, res: Response) => {
    const file = (req as UploadRequest).file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }
    try {
      const photo = await gateway.uploadPhoto({ data: file.buffer, position: -Date.now() });
      res.status(201).json({ photo });
    } catch (err) {
      console.error('Failed to upload photo:', err);
      res.status(502).json({ error: 'Failed to upload photo' });
    }
  });

  // PATCH /api/photos/:id/position — set a Photo's Master-Order position (issue
  // #9), Owner-only. Reordering in unfiltered Edit Mode drags a Photo (or a
  // contiguous multi-selection) to a new slot; the client computes fractional
  // positions so only the moved Photos are rewritten, then PATCHes each one. The
  // id is the Photo's public_id (bare under dynamic folders), URL-encoded by the
  // client.
  router.patch('/:id/position', auth.requireOwner, async (req: Request, res: Response) => {
    const publicId = req.params.id;
    const position = Number((req.body as { position?: unknown })?.position);
    if (!Number.isFinite(position)) {
      res.status(400).json({ error: 'position must be a finite number' });
      return;
    }
    try {
      await gateway.setPosition(publicId, position);
      res.json({ ok: true, id: publicId, position });
    } catch (err) {
      console.error(`Failed to set position for ${publicId}:`, err);
      res.status(502).json({ error: 'Failed to set position' });
    }
  });

  // DELETE /api/photos/:id — remove a Photo and its underlying Cloudinary asset
  // (ADR-0001), Owner-only. The single Owner's gateway addresses only their own
  // account, so requireOwner is the authorization gate; the id is the Photo's
  // public_id (bare under dynamic folders), URL-encoded by the client.
  router.delete('/:id', auth.requireOwner, async (req: Request, res: Response) => {
    const publicId = req.params.id;
    try {
      await gateway.deletePhoto(publicId);
      res.json({ ok: true, id: publicId });
    } catch (err) {
      console.error(`Failed to delete photo ${publicId}:`, err);
      res.status(502).json({ error: 'Failed to delete photo' });
    }
  });

  return router;
}

// Production auth seam, wired from the environment. The JWT is signed with
// PHOTOS_JWT_SECRET; the Owner password is checked against the bcrypt hash in
// PHOTOS_OWNER_PASSWORD_HASH. Cookie flags tighten when NODE_ENV=production.
// Env is read lazily (getters), not at import time: index.js calls
// dotenv.config() in its module body, which runs AFTER this module is imported,
// so process.env is not yet populated here. Resolving at request time fixes it.
const auth = createAuth({
  jwtSecret: () => process.env.PHOTOS_JWT_SECRET ?? '',
  passwordHash: () => process.env.PHOTOS_OWNER_PASSWORD_HASH ?? '',
  userId: OWNER_USER_ID,
  isProd: () => process.env.NODE_ENV === 'production',
});

export default createPhotosRouter(cloudinaryGateway, auth);
