import { buyerPrice, type FeeSchedule, type MarketSnapshot } from '@louve/core';

/** The page parsed, but its numbers don't make sense: treated like a parsing failure (stale fallback). */
export class SnapshotValidationError extends Error {
  override name = 'SnapshotValidationError';
}

// Praemia rounds published buyer prices to the cent.
const CENT_TOLERANCE = 0.011;

/**
 * Sanity checks on a freshly scraped snapshot. Besides catching a misread page, comparing the
 * published "frais inclus" prices with our fee schedule detects a fee change we haven't configured.
 */
export function validateSnapshot(snapshot: MarketSnapshot, fees: FeeSchedule): void {
  const problems: string[] = [];
  const positive = (label: string, n: number) => {
    if (!(Number.isFinite(n) && n > 0)) problems.push(`${label} invalide (${n})`);
  };
  const consistent = (label: string, net: number, gross: number | null) => {
    if (gross === null) return;
    const expected = buyerPrice(net, fees);
    if (Math.abs(gross - expected) > CENT_TOLERANCE) {
      problems.push(`${label} : ${gross} publié, ${expected.toFixed(2)} attendu avec nos frais`);
    }
  };

  positive('dernier prix d’exécution', snapshot.lastExecutionPrice);
  consistent('dernier prix acquéreur', snapshot.lastExecutionPrice, snapshot.lastBuyerPrice);

  for (const p of snapshot.history) {
    positive(`historique ${p.date} : prix`, p.executionPrice);
    if (!Number.isInteger(p.sharesTraded) || p.sharesTraded < 0) problems.push(`historique ${p.date} : parts invalides`);
    consistent(`historique ${p.date}`, p.executionPrice, p.buyerPrice);
  }

  const { bids, asks } = snapshot.orderBook;
  for (const level of [...bids, ...asks]) {
    positive('carnet : prix limite', level.limitNet);
    if (!Number.isInteger(level.shares) || level.shares <= 0) problems.push(`carnet : parts invalides (${level.shares})`);
  }
  for (const b of bids) consistent(`carnet : achat à ${b.limitNet}`, b.limitNet, b.limitGross);

  if (problems.length > 0) {
    throw new SnapshotValidationError(`Données incohérentes : ${problems.join(' ; ')}`);
  }
}
