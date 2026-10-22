import { useCallback, useEffect, useState } from 'react';
import type { MarketResponse, ScpiInfo } from '@louve/core';
import { fetchMarket, fetchScpi } from './api';

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; scpi: ScpiInfo; market: MarketResponse };

export function useScpiData(scpiId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [scpi, market] = await Promise.all([fetchScpi(scpiId), fetchMarket(scpiId)]);
      setState({ status: 'ready', scpi, market });
    } catch (err) {
      setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }, [scpiId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
