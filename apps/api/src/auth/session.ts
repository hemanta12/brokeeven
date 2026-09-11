import type { Request, Response } from 'express';

import { isNonProductionEnv } from '../env.js';

export const SESSION_COOKIE = 'be_session';

const SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const DEV_SESSION_SECRET = 'brokeeven-dev-session-secret';

// Rotating this value logs everyone out.
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (isNonProductionEnv()) return DEV_SESSION_SECRET;
  throw new Error('SESSION_SECRET is required outside development/test');
}

// ponytail: with no COOKIE_DOMAIN this is a third-party cookie, which Safari/Brave
// may cap to ~7 days, so a guest who loses it before signing in loses edit rights
// on older entries. Set COOKIE_DOMAIN once web and API share a parent domain to
// make it a first-party SameSite=Lax cookie with the full lifetime.
function cookieOptions() {
  const base = { httpOnly: true, signed: true, maxAge: SESSION_MAX_AGE_MS, path: '/' } as const;

  if (isNonProductionEnv()) {
    return { ...base, sameSite: 'lax' as const, secure: false };
  }
  const domain = process.env.COOKIE_DOMAIN;
  if (domain) {
    return { ...base, sameSite: 'lax' as const, secure: true, domain };
  }
  return { ...base, sameSite: 'none' as const, secure: true, partitioned: true };
}

export function issueSession(response: Response, userId: string): void {
  response.cookie(SESSION_COOKIE, userId, cookieOptions());
}

export function readSession(request: Request): string | null {
  const value: unknown = request.signedCookies?.[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function clearSession(response: Response): void {
  // clearCookie ignores maxAge and expires, but every other attribute must match
  // the original for the browser to drop the cookie.
  response.clearCookie(SESSION_COOKIE, cookieOptions());
}
