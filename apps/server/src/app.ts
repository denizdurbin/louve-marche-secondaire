import express from 'express';
import { getScpi, listScpis } from './scpi/registry.js';
import { MarketUnavailableError, type MarketService } from './market/marketService.js';

/** `webDir`: the built front end (apps/web/dist), served by the same process in production. */
export function createApp(deps: { market: MarketService; webDir?: string }) {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/scpis', (_req, res) => {
    res.json(listScpis());
  });

  app.get('/api/scpis/:id', (req, res) => {
    const scpi = getScpi(req.params.id);
    if (!scpi) {
      res.status(404).json({ error: 'SCPI inconnue' });
      return;
    }
    res.json(scpi.info);
  });

  app.get('/api/scpis/:id/market', async (req, res) => {
    const scpi = getScpi(req.params.id);
    if (!scpi) {
      res.status(404).json({ error: 'SCPI inconnue' });
      return;
    }
    try {
      res.json(await deps.market.getMarket(scpi, { refresh: req.query.refresh === '1' }));
    } catch (err) {
      if (!(err instanceof MarketUnavailableError)) throw err;
      res.status(503).json({ error: 'Données de marché indisponibles pour le moment', detail: err.message });
    }
  });

  if (deps.webDir) app.use(express.static(deps.webDir));

  return app;
}
