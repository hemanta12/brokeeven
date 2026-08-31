import type { RequestHandler } from 'express';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// The session is a cookie, and without COOKIE_DOMAIN it is SameSite=None, so
// browsers attach it to cross-site requests too. Two things stop a hostile page
// from riding it: the explicit CORS origin allowlist in app.ts, and this.
//
// A cross-site <form> can only send urlencoded, multipart, or text/plain --
// never application/json. Anything that *can* send JSON must clear a CORS
// preflight first, which the allowlist blocks. Rejecting those content types
// on writes therefore closes CSRF without tokens or a session table.
//
// A write with no Content-Type at all is allowed through: a form always sets
// one, and a bodyless cross-site POST cannot carry the fields any route here
// needs. Non-simple methods (PATCH, DELETE) are preflighted regardless.
export const requireJsonWrites: RequestHandler = (request, response, next) => {
  if (READ_METHODS.has(request.method)) {
    next();
    return;
  }
  // Inspect the header directly rather than request.is(): that helper returns
  // null for a bodyless request, which would reject every write that carries
  // its parameters in the URL (claim, logout, remove person).
  const contentType = request.headers['content-type'];
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) {
    response.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }
  next();
};
