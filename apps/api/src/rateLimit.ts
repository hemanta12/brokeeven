import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

// Key on the session, falling back to IP only for a caller who has none yet.
//
// Keying purely on IP is wrong for this app: the people splitting a dinner
// bill are usually on one WiFi, so they share a public IP and would eat each
// other's budget -- and behind carrier-grade NAT, strangers would too. Every
// write mints a session, so only a caller's very first write is IP-keyed;
// after that each actor gets its own budget.
//
// The IP fallback still does the job it was added for: a client that drops
// cookies stays IP-limited, so it cannot mint an unbounded number of guest
// rows.
function actorOrIpKey(request: Request): string {
  const actorId = request.actorId;
  if (actorId) return `actor:${actorId}`;
  // ipKeyGenerator normalizes IPv6 to a /64 subnet; express-rate-limit v8
  // rejects a hand-rolled req.ip key for that reason.
  return `ip:${ipKeyGenerator(request.ip ?? '')}`;
}

// Onboarding is write-heavy -- creating a group plus adding eight people is
// nine writes before anyone has logged an expense -- so the ceiling is set to
// clear a realistic first session rather than a minimal one.
export const writeRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 120,
  keyGenerator: actorOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many changes in a short time — wait a few minutes and try again.' }
});

// Sign-in gets its own budget: sharing the write limit would mean a busy
// session of adding expenses could lock someone out of signing in, which is
// the opposite of what throttling is for.
export const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  keyGenerator: actorOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts — wait a few minutes and try again.' }
});
