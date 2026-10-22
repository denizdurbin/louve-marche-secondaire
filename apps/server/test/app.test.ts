import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { CACHE_TTL_MS, MIN_REFRESH_INTERVAL_MS, createMarketService, type FetchHtml } from '../src/market/marketService.js';
import { memorySnapshotStore } from '../src/market/snapshotStore.js';

const fixture = readFileSync(new URL('./fixtures/primopierre-2026-10-22-1109.html', import.meta.url), 'utf8');

function setup(fetchHtml: FetchHtml) {
  let clock = Date.parse('2026-10-22T09:30:00Z');
  let calls = 0;
  const countingFetch: FetchHtml = (url) => {
    calls++;
    return fetchHtml(url);
  };
  const market = createMarketService({ store: memorySnapshotStore(), fetchHtml: countingFetch, now: () => clock });
  return {
    app: createApp({ market }),
    advance: (ms: number) => (clock += ms),
    calls: () => calls,
  };
}

describe('API', () => {
  it('lists SCPIs without server-only config', async () => {
    const { app } = setup(async () => fixture);
    const res = await request(app).get('/api/scpis').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'primopierre', managementCompanyEmail: 'serviceclients@praemiareim.com' });
    expect(res.body[0].parse).toBeUndefined();
  });

  it('returns 404 for an unknown SCPI', async () => {
    const { app } = setup(async () => fixture);
    await request(app).get('/api/scpis/inconnue').expect(404);
    await request(app).get('/api/scpis/inconnue/market').expect(404);
  });

  it('serves the parsed market and caches it for 30 minutes', async () => {
    const t = setup(async () => fixture);
    const res = await request(t.app).get('/api/scpis/primopierre/market').expect(200);
    expect(res.body.stale).toBe(false);
    expect(res.body.snapshot.lastExecutionPrice).toBe(31.88);

    t.advance(CACHE_TTL_MS - 1);
    await request(t.app).get('/api/scpis/primopierre/market').expect(200);
    expect(t.calls()).toBe(1);

    t.advance(2);
    await request(t.app).get('/api/scpis/primopierre/market').expect(200);
    expect(t.calls()).toBe(2);
  });

  it('refetches on ?refresh=1, but at most once a minute', async () => {
    const t = setup(async () => fixture);
    await request(t.app).get('/api/scpis/primopierre/market').expect(200);

    t.advance(MIN_REFRESH_INTERVAL_MS - 1);
    await request(t.app).get('/api/scpis/primopierre/market?refresh=1').expect(200);
    expect(t.calls()).toBe(1);

    t.advance(2);
    await request(t.app).get('/api/scpis/primopierre/market?refresh=1').expect(200);
    expect(t.calls()).toBe(2);
  });

  it('falls back to the last good snapshot, flagged stale, when the source fails', async () => {
    let fail = false;
    const t = setup(async () => {
      if (fail) throw new Error('timeout');
      return fixture;
    });
    await request(t.app).get('/api/scpis/primopierre/market').expect(200);

    fail = true;
    t.advance(CACHE_TTL_MS + 1);
    const res = await request(t.app).get('/api/scpis/primopierre/market').expect(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.error).toContain('timeout');
    expect(res.body.snapshot.lastExecutionPrice).toBe(31.88);
  });

  it('falls back when the page structure changed', async () => {
    let html = fixture;
    const t = setup(async () => html);
    await request(t.app).get('/api/scpis/primopierre/market').expect(200);

    html = '<html><body><h1>Site en maintenance</h1></body></html>';
    t.advance(CACHE_TTL_MS + 1);
    const res = await request(t.app).get('/api/scpis/primopierre/market').expect(200);
    expect(res.body.stale).toBe(true);
  });

  it('answers 503 when the source fails and nothing was ever saved', async () => {
    const t = setup(async () => {
      throw new Error('ECONNREFUSED');
    });
    const res = await request(t.app).get('/api/scpis/primopierre/market').expect(503);
    expect(res.body.error).toBeDefined();
  });
});
