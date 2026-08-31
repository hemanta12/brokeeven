import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'be_session';

const SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const DEV_SESSION_SECRET = 'brokeeven-dev-session-secret';

// Signed with cookie-parser's HMAC rather than a JWT: the payload is a single
// user id, so a signed cookie carries exactly as much as a token would without
// the extra dependency. Rotating this value logs everyone out.
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }
  return DEV_SESSION_SECRET;
}

// ponytail: with no COOKIE_DOMAIN the session is a third-party cookie, which
// Safari/Brave may cap to ~7 days — a guest who loses it before ever signing in
// loses edit rights on their older entries. Set COOKIE_DOMAIN (e.g.
// ".brokeeven.app") once web and API share a parent domain and this becomes a
// first-party SameSite=Lax cookie with the full lifetime.
export function cookieOptions() {
  const base = { httpOnly: true, signed: true, maxAge: SESSION_MAX_AGE_MS, path: '/' } as const;

  if (process.env.NODE_ENV !== 'production') {
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
  // clearCookie ignores maxAge and expires; every other attribute must match
  // the original for browsers to actually drop it.
  response.clearCookie(SESSION_COOKIE, cookieOptions());
}
