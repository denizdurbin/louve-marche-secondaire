import { useCallback, useEffect, useState } from 'react';
import type { MarketResponse, ScpiInfo } from '@louve/core';
import { fetchMarket, fetchScpi } from './api';

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; scpi: ScpiInfo; market: MarketResponse };

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function useScpiData(scpiId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  /** True when the last refresh brought nothing newer (the server fetched the page less than a minute ago). */
  const [upToDate, setUpToDate] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [scpi, market] = await Promise.all([fetchScpi(scpiId), fetchMarket(scpiId)]);
      setState({ status: 'ready', scpi, market });
    } catch (err) {
      setState({ status: 'error', error: message(err) });
    }
  }, [scpiId]);

  /** Asks the server to fetch the source page again; the current data stays on screen meanwhile. */
  const refreshMarket = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    setUpToDate(false);
    try {
      const market = await fetchMarket(scpiId, true);
      if (state.status === 'ready') {
        setUpToDate(state.market.snapshot.scrapedAt === market.snapshot.scrapedAt);
        setState({ ...state, market });
      }
    } catch (err) {
      setRefreshError(message(err));
    } finally {
      setRefreshing(false);
    }
  }, [scpiId, state]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load, refreshMarket, refreshing, refreshError, upToDate };
}
