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
import type { Photo, PhotoGateway, UploadInput } from '../../../../server/apps/photos/cloudinary-gateway';

const PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

// A canned Photo the fake upload returns, standing in for what Cloudinary would
// hand back (dimensions included, from which the client derives Orientation).
const uploadedPhoto: Photo = {
  id: 'abc123',
  url: 'https://res.cloudinary.com/demo/abc123.jpg',
  thumbnailUrl: 'https://res.cloudinary.com/demo/t_thumb/abc123.jpg',
  width: 2560,
  height: 1707,
  tags: [],
  caption: null,
  alt: null,
  position: -1,
};
const gateway: PhotoGateway = {
  listPhotos: async () => [],
  deletePhoto: async () => {},
  uploadPhoto: async () => uploadedPhoto,
};

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

describe('POST /api/photos (upload, Owner-only)', () => {
  // A gateway that records what it was asked to upload, so we can assert the
  // processed bytes reach it and that each upload is seeded newest-first.
  function recordingUploadGateway() {
    const uploads: UploadInput[] = [];
    const gw: PhotoGateway = {
      listPhotos: async () => [],
      deletePhoto: async () => {},
      uploadPhoto: async (input: UploadInput) => {
        uploads.push(input);
        return uploadedPhoto;
      },
    };
    return { gw, uploads };
  }

  function makeAppWith(gw: PhotoGateway) {
    const auth = createAuth({ jwtSecret: 'test-secret', passwordHash: PASSWORD_HASH, userId: 'me', isProd: false });
    const app = express();
    app.use(express.json());
    app.use('/api/photos', createPhotosRouter(gw, auth));
    return app;
  }

  it('rejects an unauthenticated upload and never touches the gateway', async () => {
    const { gw, uploads } = recordingUploadGateway();
    const res = await request(makeAppWith(gw))
      .post('/api/photos')
      .attach('file', Buffer.from('fake-jpeg'), 'photo.jpg');
    expect(res.status).toBe(401);
    expect(uploads).toEqual([]);
  });

  it('rejects an upload whose cookie was signed with the wrong secret', async () => {
    const forged = signSession({ userId: 'me' }, 'attacker-secret');
    const res = await request(makeApp())
      .post('/api/photos')
      .set('Cookie', `${SESSION_COOKIE}=${forged}`)
      .attach('file', Buffer.from('fake-jpeg'), 'photo.jpg');
    expect(res.status).toBe(401);
  });

  it('uploads the file via the gateway and returns the created Photo', async () => {
    const { gw, uploads } = recordingUploadGateway();
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });

    const bytes = Buffer.from('processed-jpeg-bytes');
    const res = await agent.post('/api/photos').attach('file', bytes, 'DSCF6913.jpg');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ photo: uploadedPhoto });
    expect(uploads).toHaveLength(1);
    expect(uploads[0].data.equals(bytes)).toBe(true);
    // Seeded newest-first: Master Order ascends, so a negative seed sorts ahead
    // of the existing (0+) Photos.
    expect(uploads[0].position).toBeLessThan(0);
  });

  it('seeds later uploads ahead of earlier ones (newest-first)', async () => {
    const { gw, uploads } = recordingUploadGateway();
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });

    await agent.post('/api/photos').attach('file', Buffer.from('a'), 'a.jpg');
    await agent.post('/api/photos').attach('file', Buffer.from('b'), 'b.jpg');

    // A later upload gets a smaller (more negative) position, so it sorts first.
    expect(uploads[1].position).toBeLessThanOrEqual(uploads[0].position);
  });

  it('responds 400 when authenticated but no file is attached', async () => {
    const { gw } = recordingUploadGateway();
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    const res = await agent.post('/api/photos').send({});
    expect(res.status).toBe(400);
  });

  it('responds 502 when the gateway upload fails', async () => {
    const gw: PhotoGateway = {
      listPhotos: async () => [],
      deletePhoto: async () => {},
      uploadPhoto: async () => {
        throw new Error('cloudinary unavailable');
      },
    };
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    const res = await agent.post('/api/photos').attach('file', Buffer.from('x'), 'x.jpg');
    expect(res.status).toBe(502);
  });
});

describe('DELETE /api/photos/:id (Owner-only)', () => {
  // A gateway that records which ids it was asked to destroy, so we can assert
  // the delete reaches Cloudinary (ADR-0001) without touching the real account.
  function recordingGateway() {
    const deleted: string[] = [];
    const gw: PhotoGateway = {
      listPhotos: async () => [],
      deletePhoto: async (id: string) => {
        deleted.push(id);
      },
      uploadPhoto: async () => uploadedPhoto,
    };
    return { gw, deleted };
  }

  function makeAppWith(gw: PhotoGateway) {
    const auth = createAuth({ jwtSecret: 'test-secret', passwordHash: PASSWORD_HASH, userId: 'me', isProd: false });
    const app = express();
    app.use(express.json());
    app.use('/api/photos', createPhotosRouter(gw, auth));
    return app;
  }

  it('rejects an unauthenticated delete and never touches the gateway', async () => {
    const { gw, deleted } = recordingGateway();
    const res = await request(makeAppWith(gw)).delete('/api/photos/DSCF6913');
    expect(res.status).toBe(401);
    expect(deleted).toEqual([]);
  });

  it('removes the asset via the gateway when authenticated', async () => {
    const { gw, deleted } = recordingGateway();
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    const res = await agent.delete('/api/photos/DSCF6913');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, id: 'DSCF6913' });
    expect(deleted).toEqual(['DSCF6913']);
  });

  it('responds 502 when the gateway fails', async () => {
    const gw: PhotoGateway = {
      listPhotos: async () => [],
      deletePhoto: async () => {
        throw new Error('cloudinary unavailable');
      },
      uploadPhoto: async () => uploadedPhoto,
    };
    const agent = request.agent(makeAppWith(gw));
    await agent.post('/api/photos/login').send({ password: PASSWORD });
    expect((await agent.delete('/api/photos/DSCF6913')).status).toBe(502);
  });
});

describe('lazy config (env read at request time, not import time)', () => {
  it('resolves passwordHash/jwtSecret getters per request', async () => {
    // Simulates dotenv populating process.env AFTER createAuth() has run: the
    // getter returns empty at construction and the real values only later.
    let hash = '';
    let secret = 'placeholder';
    const auth = createAuth({
      jwtSecret: () => secret,
      passwordHash: () => hash,
      userId: 'me',
      isProd: false,
    });
    const app = express();
    app.use(express.json());
    app.use('/api/photos', createPhotosRouter(gateway, auth));

    // Before env is "loaded", the correct password is rejected.
    expect((await request(app).post('/api/photos/login').send({ password: PASSWORD })).status).toBe(401);

    // Env arrives (as dotenv.config() would do); same auth object now works.
    hash = PASSWORD_HASH;
    secret = 'test-secret';
    const res = await request(app).post('/api/photos/login').send({ password: PASSWORD });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toBeDefined();
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
