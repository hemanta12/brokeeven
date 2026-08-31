import type { ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { attachActor } from './auth/middleware.js';
import { requireJsonWrites } from './auth/csrf.js';
import { sessionSecret } from './auth/session.js';
import { authRouter } from './routes/auth.js';
import { expensesRouter } from './routes/expenses.js';
import { groupsRouter } from './routes/groups.js';
import { meRouter } from './routes/me.js';
import { peopleRouter } from './routes/people.js';
import { settlementsRouter } from './routes/settlements.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express only treats 4-arg handlers as error middleware
const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};

// `credentials: true` cannot be paired with a reflect-any-origin policy: that
// would let any site make credentialed calls with the user's session cookie.
// Production must name its origin; dev keeps the permissive fallback.
function corsOrigin(): string | string[] | true {
  const configured = process.env.WEB_ORIGIN;
  if (configured) return configured.split(',').map((origin) => origin.trim());
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WEB_ORIGIN is required in production');
  }
  return true;
}

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(cookieParser(sessionSecret()));
  app.use(express.json());
  app.use(requireJsonWrites);
  app.use(attachActor);

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use(authRouter);
  app.use(meRouter);
  app.use(groupsRouter);
  app.use(peopleRouter);
  app.use(expensesRouter);
  app.use(settlementsRouter);

  app.use(jsonErrorHandler);

  return app;
}
