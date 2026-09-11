import type { RequestHandler } from 'express';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defense without tokens: a write carrying a body must be application/json,
// which a cross-site <form> cannot send and a JSON fetch cannot reach without
// clearing the CORS preflight against the app.ts origin allowlist. Bodyless
// writes (e.g. logout) pass through too: a form always sets a Content-Type,
// and a bodyless cross-site POST cannot carry the fields any route needs.
export const requireJsonWrites: RequestHandler = (request, response, next) => {
  if (READ_METHODS.has(request.method)) {
    next();
    return;
  }
  // Read the header directly, not request.is(): that returns null for a bodyless
  // request and would wrongly reject a bodyless write like logout.
  const contentType = request.headers['content-type'];
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) {
    response.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }
  next();
};
