import type { AskLevel, BidLevel, OrderBook } from './types';

export interface CurvePoint {
  price: number;
  demand: number;
  supply: number;
  volume: number;
  unmatched: number;
}
/** Which rule settled the price; 'highestPrice' is our own fallback when the three official rules leave a tie. */
export type DecidingRule = 'volume' | 'unmatched' | 'lastPrice' | 'highestPrice';
export interface LevelFill {
  limitNet: number;
  shares: number;
  served: number;
}
export interface ConfrontationEstimate {
  price: number | null;
  sharesTraded: number;
  demandAtPrice: number;
  supplyAtPrice: number;
  unmatched: number;
  decidedBy: DecidingRule | null;
  curve: CurvePoint[];
  fills: { bids: LevelFill[]; asks: LevelFill[] };
}

type Book = Pick<OrderBook, 'bids' | 'asks'>;

function sumShares(levels: { shares: number }[]): number {
  return levels.reduce((acc, l) => acc + l.shares, 0);
}

/**
 * Price priority: serve the best limits first (highest for buyers, lowest for sellers);
 * the last level served may be partial. Returns `served` in the input order.
 */
function allocate<T extends { shares: number; limitNet: number }>(
  levels: T[],
  eligible: (l: T) => boolean,
  better: (a: number, b: number) => number,
  quantity: number,
): LevelFill[] {
  const served = new Array<number>(levels.length).fill(0);
  const order = levels
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => eligible(l))
    .sort((a, b) => better(a.l.limitNet, b.l.limitNet));
  let left = quantity;
  for (const { l, i } of order) {
    const take = Math.min(l.shares, left);
    served[i] = take;
    left -= take;
  }
  return levels.map((l, i) => ({ limitNet: l.limitNet, shares: l.shares, served: served[i] ?? 0 }));
}

/**
 * Estimate of the next confrontation (call auction) from the visible order book.
 * Rules, in order: max volume, min unmatched shares, closest to the last execution price.
 */
export function estimateConfrontation(book: Book, lastExecutionPrice: number | null): ConfrontationEstimate {
  const { bids, asks } = book;
  const prices = [...new Set([...bids, ...asks].map((l) => l.limitNet))].sort((a, b) => a - b);

  const curve: CurvePoint[] = prices.map((price) => {
    const demand = sumShares(bids.filter((b) => b.limitNet >= price));
    const supply = sumShares(asks.filter((a) => a.limitNet <= price));
    return { price, demand, supply, volume: Math.min(demand, supply), unmatched: Math.abs(demand - supply) };
  });

  let candidates = curve.filter((c) => c.volume > 0);
  let decidedBy: DecidingRule | null = null;

  if (candidates.length > 0) {
    const maxVolume = Math.max(...candidates.map((c) => c.volume));
    candidates = candidates.filter((c) => c.volume === maxVolume);
    if (candidates.length === 1) decidedBy = 'volume';

    if (candidates.length > 1) {
      const minUnmatched = Math.min(...candidates.map((c) => c.unmatched));
      candidates = candidates.filter((c) => c.unmatched === minUnmatched);
      if (candidates.length === 1) decidedBy = 'unmatched';
    }

    if (candidates.length > 1 && lastExecutionPrice !== null) {
      const minDist = Math.min(...candidates.map((c) => Math.abs(c.price - lastExecutionPrice)));
      candidates = candidates.filter((c) => Math.abs(c.price - lastExecutionPrice) === minDist);
      if (candidates.length === 1) decidedBy = 'lastPrice';
    }
  }

  // Our own assumption (not in the mandate): if the three rules leave several prices
  // (or there is no last price to compare with), we take the highest one.
  const chosen = candidates.length > 0 ? candidates[candidates.length - 1] : undefined;

  if (!chosen) {
    return {
      price: null,
      sharesTraded: 0,
      demandAtPrice: 0,
      supplyAtPrice: 0,
      unmatched: 0,
      decidedBy: null,
      curve,
      fills: {
        bids: bids.map((b) => ({ limitNet: b.limitNet, shares: b.shares, served: 0 })),
        asks: asks.map((a) => ({ limitNet: a.limitNet, shares: a.shares, served: 0 })),
      },
    };
  }

  const price = chosen.price;
  return {
    price,
    sharesTraded: chosen.volume,
    demandAtPrice: chosen.demand,
    supplyAtPrice: chosen.supply,
    unmatched: chosen.unmatched,
    decidedBy: decidedBy ?? 'highestPrice',
    curve,
    fills: {
      bids: allocate(bids, (b) => b.limitNet >= price, (a, b) => b - a, chosen.volume),
      asks: allocate(asks, (a) => a.limitNet <= price, (a, b) => a - b, chosen.volume),
    },
  };
}

/** New book with the client's buy order merged in; the input is not mutated. */
export function withClientBid(book: Book, bid: { shares: number; limitNet: number }): Book {
  const existing = book.bids.some((b) => b.limitNet === bid.limitNet);
  const bids: BidLevel[] = existing
    ? book.bids.map((b) => (b.limitNet === bid.limitNet ? { ...b, shares: b.shares + bid.shares, orderCount: b.orderCount + 1 } : { ...b }))
    : [...book.bids.map((b) => ({ ...b })), { orderCount: 1, shares: bid.shares, limitNet: bid.limitNet, limitGross: null }];
  const asks: AskLevel[] = book.asks.map((a) => ({ ...a }));
  return { bids, asks };
}
