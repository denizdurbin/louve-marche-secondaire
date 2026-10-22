import { buyerPrice } from './fees';
import type { DividendRecord, FeeSchedule } from './types';

/** Gross yield as a ratio (0.1303 = 13,03 %), variable fees included in the cost. */
export function yieldFeesIncluded(dividendPerShare: number, netPrice: number, fees: FeeSchedule): number {
  return dividendPerShare / buyerPrice(netPrice, fees);
}

/** Same, spreading the flat per-file fee over `shares` shares. */
export function yieldWithFixedFees(
  dividendPerShare: number,
  netPrice: number,
  shares: number,
  fees: FeeSchedule,
): number {
  return (dividendPerShare * shares) / (buyerPrice(netPrice, fees) * shares + fees.fixedFeesEur);
}

export interface YieldRange {
  from: number;
  to: number;
  points: number;
}

/** `points` evenly spaced net prices, both ends included. */
export function yieldCurve(
  dividendPerShare: number,
  fees: FeeSchedule,
  { from, to, points }: YieldRange,
): { price: number; yield: number }[] {
  if (!Number.isInteger(points) || points < 2) throw new Error('points doit être un entier ≥ 2');
  if (!(from > 0) || !(to > from)) throw new Error('Plage de prix invalide');
  const step = (to - from) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const price = i === points - 1 ? to : from + step * i;
    return { price, yield: yieldFeesIncluded(dividendPerShare, price, fees) };
  });
}

/** Dividend of the previous calendar year, or else the latest older one. */
export function dividendForPreviousYear(
  dividends: DividendRecord[],
  today: Date,
): { record: DividendRecord; isPreviousYear: boolean } | null {
  const year = today.getFullYear();
  const exact = dividends.find((d) => d.year === year - 1);
  if (exact) return { record: exact, isPreviousYear: true };
  let latest: DividendRecord | null = null;
  for (const d of dividends) {
    if (d.year < year && (latest === null || d.year > latest.year)) latest = d;
  }
  return latest ? { record: latest, isPreviousYear: false } : null;
}
