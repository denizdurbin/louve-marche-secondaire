import type { MarketResponse, MarketSnapshot } from '@louve/core';
import type { ScpiConfig } from '../scpi/registry.js';
import type { SnapshotStore } from './snapshotStore.js';
import { validateSnapshot } from './validateSnapshot.js';

export type FetchHtml = (url: string) => Promise<string>;

/** No usable data at all: the source failed and nothing was ever saved. */
export class MarketUnavailableError extends Error {
  override name = 'MarketUnavailableError';
}

// The source refreshes its order book every 30 minutes: scraping more often is pointless and impolite.
export const CACHE_TTL_MS = 30 * 60 * 1000;
// A user-requested refresh bypasses the cache, but never more than once a minute per SCPI.
export const MIN_REFRESH_INTERVAL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

export const fetchHtml: FetchHtml = async (url) => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LouveInvest-TestTechnique/0.1 (analyse marché secondaire SCPI)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.text();
};

export function createMarketService(deps: { store: SnapshotStore; fetchHtml: FetchHtml; now?: () => number }) {
  const now = deps.now ?? Date.now;
  const cache = new Map<string, { snapshot: MarketSnapshot; fetchedAt: number }>();

  return {
    async getMarket(scpi: ScpiConfig, opts: { refresh?: boolean } = {}): Promise<MarketResponse> {
      const { id, sourceUrl } = scpi.info;
      const cached = cache.get(id);
      const maxAge = opts.refresh ? MIN_REFRESH_INTERVAL_MS : CACHE_TTL_MS;
      if (cached && now() - cached.fetchedAt < maxAge) {
        return { snapshot: cached.snapshot, stale: false };
      }

      try {
        const snapshot = scpi.parse(await deps.fetchHtml(sourceUrl), { scpiId: id, scrapedAt: new Date(now()) });
        validateSnapshot(snapshot, scpi.info.fees);
        cache.set(id, { snapshot, fetchedAt: now() });
        await deps.store.save(snapshot);
        return { snapshot, stale: false };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.warn(`[market] ${id}: échec de la récupération (${error})`);
        const last = cached?.snapshot ?? (await deps.store.load(id));
        if (last) return { snapshot: last, stale: true, error };
        throw new MarketUnavailableError(error);
      }
    },
  };
}

export type MarketService = ReturnType<typeof createMarketService>;
