import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import express from 'express';

import { expensesRouter } from './routes/expenses.js';
import { groupsRouter } from './routes/groups.js';
import { peopleRouter } from './routes/people.js';
import { settlementsRouter } from './routes/settlements.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express only treats 4-arg handlers as error middleware
const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.WEB_ORIGIN ?? true }));
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use(groupsRouter);
  app.use(peopleRouter);
  app.use(expensesRouter);
  app.use(settlementsRouter);

  app.use(jsonErrorHandler);

  return app;
}
