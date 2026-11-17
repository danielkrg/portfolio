import { Router, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { cloudinaryGateway, type PhotoGateway } from './cloudinary-gateway';
import {
  createAuth,
  ownerFolder,
  OWNER_USER_ID,
  type Auth,
  type AuthedRequest,
} from './auth';

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

  // POST /api/photos — stub write endpoint proving the gate: rejected when
  // unauthenticated, accepted with a valid cookie. It reports the owner-
  // namespaced folder the asset would be written under (ADR-0002); real upload
  // arrives in a later slice.
  router.post('/', auth.requireOwner, (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).userId as string;
    res.status(201).json({ ok: true, owner: userId, folder: ownerFolder(userId) });
  });

  return router;
}

// Production auth seam, wired from the environment. The JWT is signed with
// PHOTOS_JWT_SECRET; the Owner password is checked against the bcrypt hash in
// PHOTOS_OWNER_PASSWORD_HASH. Cookie flags tighten when NODE_ENV=production.
const auth = createAuth({
  jwtSecret: process.env.PHOTOS_JWT_SECRET ?? '',
  passwordHash: process.env.PHOTOS_OWNER_PASSWORD_HASH ?? '',
  userId: OWNER_USER_ID,
  isProd: process.env.NODE_ENV === 'production',
});

export default createPhotosRouter(cloudinaryGateway, auth);
