import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createMarketService, fetchHtml } from './market/marketService.js';
import { fileSnapshotStore } from './market/snapshotStore.js';

const port = Number(process.env.PORT ?? 3001);
const dataDir = fileURLToPath(new URL('../data', import.meta.url));
// After `npm run build`, the API also serves the web app, so production is a single service.
const webDir = fileURLToPath(new URL('../../web/dist', import.meta.url));

const market = createMarketService({ store: fileSnapshotStore(dataDir), fetchHtml });

const serveWeb = existsSync(webDir);

createApp({ market, webDir: serveWeb ? webDir : undefined }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}${serveWeb ? ' (web app served from apps/web/dist)' : ''}`);
});
