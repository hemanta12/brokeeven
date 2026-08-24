import rateLimit from 'express-rate-limit';

// Basic per-IP throttling on public write endpoints (TECH_STACK.md §5) — closes off casual spam.
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});
