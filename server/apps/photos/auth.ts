import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

/**
 * Owner authentication and the write-authorization seam (ADR-0002).
 *
 * The session is a stateless, signed JWT carried in an httpOnly cookie — there
 * is no server-side session store, so a login survives backend restarts and
 * redeploys. The token carries a `userId` (not an `isAdmin` boolean), and
 * authorization is expressed as "the authenticated user owns this asset," so
 * the single-owner app today generalizes to many owners without a rewrite.
 */

// The single Owner today; assets live under photos/<userId>/… (ADR-0002).
export const OWNER_USER_ID = 'me';

// The httpOnly cookie that carries the signed session.
export const SESSION_COOKIE = 'photos_session';

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/** The claims baked into the session JWT. Authorization keys off `userId`. */
export interface SessionClaims {
  userId: string;
}

export interface AuthConfig {
  /** Secret used to sign/verify the session JWT. */
  jwtSecret: string;
  /** bcrypt hash of the Owner password (from an env var; never the plaintext). */
  passwordHash: string;
  /** The userId a correct password unlocks. */
  userId: string;
  /** Production tightens cookie flags; see {@link cookieOptions}. */
  isProd: boolean;
  /** Session lifetime; also the cookie maxAge. */
  maxAgeMs?: number;
  /** Failed-login attempts allowed per window before throttling (default 10). */
  loginMaxAttempts?: number;
  /** Throttle window in ms (default 15 min). */
  loginWindowMs?: number;
}

// A request that has passed requireOwner carries the authenticated userId.
export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Environment-aware cookie flags. In production the cookie must be `secure` and
 * `sameSite:'none'` (the app and API are served cross-site over HTTPS); in dev
 * it must be `secure:false` + `sameSite:'lax'` so the browser will set it over
 * plain `http://localhost`. It is always httpOnly so client JS can't read it.
 */
export function cookieOptions(isProd: boolean, maxAgeMs: number = DEFAULT_MAX_AGE_MS): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** The flags used to clear the cookie must match those used to set it (minus maxAge). */
export function clearCookieOptions(isProd: boolean): CookieOptions {
  const { maxAge: _maxAge, ...rest } = cookieOptions(isProd);
  return rest;
}

/** Verify a plaintext password against a bcrypt hash. */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

/** Sign a session token carrying the given claims. */
export function signSession(claims: SessionClaims, secret: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS): string {
  return jwt.sign(claims, secret, { expiresIn: Math.floor(maxAgeMs / 1000) });
}

/** Verify a session token, returning its claims or null if invalid/expired. */
export function verifySession(token: string, secret: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded !== null && typeof decoded.userId === 'string') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ownership check (ADR-0002): a userId owns an asset when the asset lives under
 * that owner's namespace, `photos/<userId>/…`. This is the authorization
 * primitive — there is no admin flag.
 */
export function ownsAsset(userId: string, assetId: string): boolean {
  return assetId.startsWith(`photos/${userId}/`);
}

/** The owner-namespaced folder new assets for a user are written under. */
export function ownerFolder(userId: string): string {
  return `photos/${userId}/`;
}

export interface Auth {
  readonly cookieName: string;
  /** Rate-limit middleware for the login endpoint. */
  loginRateLimiter: RequestHandler;
  /** Verify a password; on success return the cookie value to set, else null. */
  authenticate(password: string): Promise<string | null>;
  /** Cookie options for setting the session. */
  setCookieOptions(): CookieOptions;
  /** Cookie options for clearing the session. */
  clearCookieOptions(): CookieOptions;
  /** Gate a route: 401 unless a valid session cookie is present. Sets req.userId. */
  requireOwner: RequestHandler;
}

/**
 * Build the auth seam from config. Production wires this from env; tests
 * construct it with a known password hash and secret and exercise the HTTP
 * endpoints (see client/photos auth tests).
 */
export function createAuth(config: AuthConfig): Auth {
  const maxAgeMs = config.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  const loginRateLimiter = rateLimit({
    windowMs: config.loginWindowMs ?? 15 * 60 * 1000,
    max: config.loginMaxAttempts ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Only failed attempts count toward the limit, so a successful owner is never locked out.
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts, please try again later.' },
  });

  return {
    cookieName: SESSION_COOKIE,
    loginRateLimiter,

    async authenticate(password: string): Promise<string | null> {
      const ok = await verifyPassword(password, config.passwordHash);
      if (!ok) return null;
      return signSession({ userId: config.userId }, config.jwtSecret, maxAgeMs);
    },

    setCookieOptions() {
      return cookieOptions(config.isProd, maxAgeMs);
    },

    clearCookieOptions() {
      return clearCookieOptions(config.isProd);
    },

    requireOwner(req: Request, res: Response, next: NextFunction) {
      const token = (req as AuthedRequest & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
      const claims = token ? verifySession(token, config.jwtSecret) : null;
      if (!claims) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      (req as AuthedRequest).userId = claims.userId;
      next();
    },
  };
}
