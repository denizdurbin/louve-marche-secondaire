import { describe, it, expect } from 'vitest';
import { estimateConfrontation, simulateClientOrder, withClientBid } from '../src/confrontation';
import type { AskLevel, BidLevel } from '../src/types';
import { todayBook } from './fixtures';

const bid = (shares: number, limitNet: number): BidLevel => ({ orderCount: 1, shares, limitNet, limitGross: null });
const ask = (shares: number, limitNet: number): AskLevel => ({ orderCount: 1, shares, limitNet });

describe('estimateConfrontation', () => {
  it("today's book", () => {
    const e = estimateConfrontation(todayBook, 31.88);
    expect(e.price).toBe(22);
    expect(e.sharesTraded).toBe(1018);
    expect(e.demandAtPrice).toBe(1018);
    expect(e.supplyAtPrice).toBe(1233);
    expect(e.unmatched).toBe(215);
    expect(e.decidedBy).toBe('unmatched');
    const at10 = e.curve.find((p) => p.price === 10);
    expect(at10?.demand).toBe(2028);
    expect(at10?.supply).toBe(0);
    expect(e.fills.bids.map((f) => f.served)).toEqual([18, 1000, 0, 0]);
    expect(e.fills.asks.map((f) => f.served)).toEqual([752, 266, 0, 0, 0]);
  });

  it('rule 1 alone', () => {
    const e = estimateConfrontation(
      {
        bids: [bid(18, 31.88), bid(1000, 20), bid(10, 10)],
        asks: [ask(752, 20), ask(452, 25), ask(1442, 28), ask(852, 30), ask(59, 31)],
      },
      31.88,
    );
    expect(e.price).toBe(20);
    expect(e.sharesTraded).toBe(752);
    expect(e.demandAtPrice).toBe(1018);
    expect(e.supplyAtPrice).toBe(752);
    expect(e.decidedBy).toBe('volume');
  });

  it('rule 3 and fallback', () => {
    const book = { bids: [bid(10, 30)], asks: [ask(10, 20)] };
    const a = estimateConfrontation(book, 31.88);
    expect(a.price).toBe(30);
    expect(a.decidedBy).toBe('lastPrice');
    expect(estimateConfrontation(book, 15).price).toBe(20);
    expect(estimateConfrontation(book, null)).toMatchObject({ price: 30, decidedBy: 'highestPrice' });
  });

  it('no cross', () => {
    const e = estimateConfrontation({ bids: [bid(10, 20)], asks: [ask(10, 25)] }, 22);
    expect(e.price).toBeNull();
    expect(e.sharesTraded).toBe(0);
    expect(e.decidedBy).toBeNull();
    expect(e.fills.bids.every((f) => f.served === 0)).toBe(true);
    expect(estimateConfrontation({ bids: [], asks: [] }, 22).price).toBeNull();
  });

  it('partial fill on the last level', () => {
    const e = estimateConfrontation({ bids: [bid(5, 30), bid(10, 28)], asks: [ask(8, 20)] }, 25);
    expect(e.sharesTraded).toBe(8);
    expect(e.fills.bids.map((f) => f.served)).toEqual([5, 3]);
  });
});

describe('withClientBid', () => {
  it('adds a new level without mutating', () => {
    const snapshot = JSON.stringify(todayBook);
    const b = withClientBid(todayBook, { shares: 100, limitNet: 25 });
    expect(JSON.stringify(todayBook)).toBe(snapshot);
    expect(b.bids).toHaveLength(5);
    expect(b.bids.find((l) => l.limitNet === 25)).toMatchObject({ shares: 100, orderCount: 1, limitGross: null });
    const e = estimateConfrontation(b, 31.88);
    expect(e.price).not.toBeNull();
    expect(e.sharesTraded).toBeGreaterThan(0);
  });
  it('merges into an existing level', () => {
    const b = withClientBid(todayBook, { shares: 100, limitNet: 27 });
    expect(b.bids).toHaveLength(4);
    expect(b.bids.find((l) => l.limitNet === 27)?.shares).toBe(1100);
    expect(todayBook.bids.find((l) => l.limitNet === 27)?.shares).toBe(1000);
  });
});

describe('simulateClientOrder', () => {
  it('serves an order above the clearing price in full, and shows its effect on the price', () => {
    const out = simulateClientOrder(todayBook, 31.88, { shares: 100, limitNet: 22 });
    expect(out.estimate.price).toBe(22);
    expect(out.estimate.sharesTraded).toBe(1118);
    expect(out.served).toBe(100);
    expect(out.sharesAheadAtLimit).toBe(0);
  });

  it('does not serve an order below the clearing price', () => {
    const out = simulateClientOrder(todayBook, 31.88, { shares: 100, limitNet: 20 });
    expect(out.estimate.price).toBe(22);
    expect(out.served).toBe(0);
    expect(out.sharesAheadAtLimit).toBe(1000);
  });

  it('puts the client behind earlier orders at the same price, and ahead of them one cent higher', () => {
    const book = { bids: [bid(10, 30), bid(50, 20)], asks: [ask(40, 20)] };
    const atPrice = simulateClientOrder(book, 31.88, { shares: 10, limitNet: 20 });
    expect(atPrice.estimate.price).toBe(20);
    expect(atPrice.sharesAheadAtLimit).toBe(50);
    expect(atPrice.served).toBe(0);

    const aboveBy1Cent = simulateClientOrder(book, 31.88, { shares: 10, limitNet: 20.01 });
    expect(aboveBy1Cent.estimate.price).toBe(20);
    expect(aboveBy1Cent.served).toBe(10);
  });
});
