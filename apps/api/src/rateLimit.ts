import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

// Key on session, IP only as fallback — pure IP keying would let people on the
// same WiFi/NAT eat each other's budget.
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

// The join code is the app's access boundary (TECH_STACK.md §2) — an
// unthrottled lookup would let it be brute-forced. Ceiling is generous since
// legitimate polling of a group someone already has open must not trip it.
export const readRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  keyGenerator: actorOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests in a short time — wait a few minutes and try again.' }
});
