import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createPhotosRouter } from '../../../../server/apps/photos/routes';
import {
  cookieOptions,
  clearCookieOptions,
  signSession,
  verifySession,
  verifyPassword,
  ownsAsset,
  ownerFolder,
  createAuth,
  SESSION_COOKIE,
} from '../../../../server/apps/photos/auth';
import type { PhotoGateway } from '../../../../server/apps/photos/cloudinary-gateway';

const PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
const gateway: PhotoGateway = { listPhotos: async () => [] };

// Build an app whose auth seam knows PASSWORD_HASH. Each call gets a FRESH auth
// (and thus a fresh rate limiter), so tests don't leak attempt counts.
function makeApp(overrides: Parameters<typeof createAuth>[0] extends infer _ ? Partial<Parameters<typeof createAuth>[0]> : never = {}) {
  const auth = createAuth({
    jwtSecret: 'test-secret',
    passwordHash: PASSWORD_HASH,
    userId: 'me',
    isProd: false,
    ...overrides,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/photos', createPhotosRouter(gateway, auth));
  return app;
}

// Pull the session cookie out of a Set-Cookie header array.
function sessionCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

describe('cookieOptions', () => {
  it('is secure + sameSite none in production', () => {
    const opts = cookieOptions(true);
    expect(opts).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' });
  });

  it('is secure:false + sameSite lax in dev so it sets over http://localhost', () => {
    const opts = cookieOptions(false);
    expect(opts).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax' });
  });

  it('clear options drop maxAge but keep the matching flags', () => {
    expect(clearCookieOptions(true)).not.toHaveProperty('maxAge');
    expect(clearCookieOptions(true)).toMatchObject({ secure: true, sameSite: 'none', path: '/' });
  });
});

describe('session token', () => {
  it('round-trips the userId claim', () => {
    const token = signSession({ userId: 'me' }, 'secret');
    expect(verifySession(token, 'secret')).toEqual({ userId: 'me' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSession({ userId: 'me' }, 'secret');
    expect(verifySession(token, 'other')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifySession('not-a-jwt', 'secret')).toBeNull();
  });
});

describe('verifyPassword', () => {
  it('accepts the right password and rejects the wrong one', async () => {
    expect(await verifyPassword(PASSWORD, PASSWORD_HASH)).toBe(true);
    expect(await verifyPassword('wrong', PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword('', PASSWORD_HASH)).toBe(false);
  });
});

describe('ownsAsset / ownerFolder (ADR-0002)', () => {
  it('owns assets under its own namespace only', () => {
    expect(ownsAsset('me', 'photos/me/tent')).toBe(true);
    expect(ownsAsset('me', 'photos/someone-else/tent')).toBe(false);
    expect(ownsAsset('me', 'photos/mentor/tent')).toBe(false); // not a prefix of the segment
  });

  it('namespaces the owner folder', () => {
    expect(ownerFolder('me')).toBe('photos/me/');
  });
});

describe('POST /api/photos/login', () => {
  it('sets an httpOnly session cookie on the correct password', async () => {
    const res = await request(makeApp()).post('/api/photos/login').send({ password: PASSWORD });
    expect(res.status).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('does not set a cookie on the wrong password', async () => {
    const res = await request(makeApp()).post('/api/photos/login').send({ password: 'nope' });
    expect(res.status).toBe(401);
    expect(sessionCookie(res)).toBeUndefined();
  });

  it('throttles repeated failed attempts', async () => {
    const app = makeApp({ loginMaxAttempts: 3 });
    const attempt = () => request(app).post('/api/photos/login').send({ password: 'nope' });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    // The 4th failed attempt is rejected by the limiter, not the password check.
    expect((await attempt()).status).toBe(429);
  });
});

describe('the write gate (stub write endpoint)', () => {
  it('rejects an unauthenticated write', async () => {
    const res = await request(makeApp()).post('/api/photos').send({});
    expect(res.status).toBe(401);
  });

  it('accepts a write carrying a valid session cookie and namespaces by owner', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    const res = await agent.post('/api/photos').send({});
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, owner: 'me', folder: 'photos/me/' });
  });

  it('rejects a write whose cookie was signed with the wrong secret', async () => {
    const forged = signSession({ userId: 'me' }, 'attacker-secret');
    const res = await request(makeApp())
      .post('/api/photos')
      .set('Cookie', `${SESSION_COOKIE}=${forged}`)
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('session lifecycle', () => {
  it('reports the authenticated userId, survives a "refresh", and clears on logout', async () => {
    const agent = request.agent(makeApp());

    // Not logged in yet.
    expect((await agent.get('/api/photos/session')).status).toBe(401);

    // Log in, then a fresh request (the cookie is all the server needs — stateless).
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    const session = await agent.get('/api/photos/session');
    expect(session.status).toBe(200);
    expect(session.body).toEqual({ userId: 'me' });

    // Logout clears the cookie; the session is gone.
    const logout = await agent.post('/api/photos/logout');
    expect(logout.status).toBe(200);
    expect((await agent.get('/api/photos/session')).status).toBe(401);
  });
});
