import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createMarketService, fetchHtml } from './market/marketService.js';
import { fileSnapshotStore } from './market/snapshotStore.js';

const port = Number(process.env.PORT ?? 3001);
const dataDir = fileURLToPath(new URL('../data', import.meta.url));

const market = createMarketService({ store: fileSnapshotStore(dataDir), fetchHtml });

createApp({ market }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
