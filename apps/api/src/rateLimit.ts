import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

// Key on the session, IP only for a caller with no session yet. Pure IP keying
// would let dinner-splitters sharing one WiFi (or carrier NAT) eat each other's
// budget; the IP fallback still bounds a cookie-dropping client that never gets
// a session.
function actorOrIpKey(request: Request): string {
  const actorId = request.actorId;
  if (actorId) return `actor:${actorId}`;
  // ipKeyGenerator normalizes IPv6 to a /64 subnet; express-rate-limit v8
  // rejects a hand-rolled req.ip key for that reason.
  return `ip:${ipKeyGenerator(request.ip ?? '')}`;
}

// Onboarding is write-heavy (a group plus eight people is nine writes before any
// expense), so the ceiling clears a realistic first session.
export const writeRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 120,
  keyGenerator: actorOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many changes in a short time — wait a few minutes and try again.' }
});

// Separate budget from writes: a busy expense-adding session must not lock
// someone out of signing in.
export const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  keyGenerator: actorOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts — wait a few minutes and try again.' }
});
