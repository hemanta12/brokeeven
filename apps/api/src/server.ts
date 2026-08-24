import 'dotenv/config';

import { createServer } from 'node:http';

import { createApp } from './app.js';
import { initRealtime } from './realtime.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();
const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.listen(port, () => {
  console.log(`BrokeEven API listening on port ${port}`);
});
