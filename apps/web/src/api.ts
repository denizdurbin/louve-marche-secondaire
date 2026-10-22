import type { MarketResponse, ScpiInfo } from '@louve/core';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Erreur ${res.status}`);
  return body as T;
}

export const fetchScpi = (id: string) => getJson<ScpiInfo>(`/api/scpis/${id}`);
export const fetchMarket = (id: string) => getJson<MarketResponse>(`/api/scpis/${id}/market`);
