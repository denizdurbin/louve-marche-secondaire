import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { MarketSnapshot } from '@louve/core';
import { PageStructureError, parsePraemiaMarketPage } from '../src/scpi/praemia/parsePraemiaMarketPage.js';

const fixture = readFileSync(
  new URL('./fixtures/primopierre-2026-10-22-1109.html', import.meta.url),
  'utf8',
);
const scrapedAt = new Date('2026-10-22T09:15:00Z');

describe('parsePraemiaMarketPage (fixture 2026-10-22 11:09)', () => {
  let snap: MarketSnapshot;
  beforeAll(() => {
    snap = parsePraemiaMarketPage(fixture, { scpiId: 'primopierre', scrapedAt });
  });

  it('reads identity and timestamps', () => {
    expect(snap.scpiId).toBe('primopierre');
    expect(snap.scrapedAt).toBe('2026-10-22T09:15:00.000Z');
    expect(snap.sourceUpdatedAt).toBe('2026-10-22T11:09');
  });

  it('reads prices and confrontation dates', () => {
    expect(snap.lastExecutionPrice).toBe(31.88);
    expect(snap.lastBuyerPrice).toBe(35);
    expect(snap.nextConfrontation).toBe('2026-10-29T16:00');
    expect(snap.orderDeadline).toBe('2026-10-27T16:00');
  });

  it('reads dated KPIs', () => {
    expect(snap.realisationValue).toEqual({ value: 70.76, asOf: '30 juin 2026' });
    expect(snap.distributionRate).toEqual({ value: 0.0362, asOf: '31 décembre 2025' });
    expect(snap.capitalisation).toEqual({ value: 832199173, asOf: '30 juin 2026' });
  });

  it('reads the 7 history rows, most recent first', () => {
    expect(snap.history).toHaveLength(7);
    expect(snap.history.map((p) => [p.date, p.sharesTraded, p.executionPrice, p.buyerPrice])).toEqual([
      ['2026-09-24', 364, 31.88, 35],
      ['2026-08-27', 1747, 36, 39.53],
      ['2026-07-30', 1637, 38.71, 42.51],
      ['2026-06-25', 2959, 40, 43.92],
      ['2026-05-28', 2021, 40, 43.92],
      ['2026-04-30', 1756, 40, 43.92],
      ['2026-03-26', 171, 45, 49.41],
    ]);
  });

  it('reads the order book', () => {
    expect(snap.orderBook.visibleDepth).toBe(5);
    expect(snap.orderBook.bids).toEqual([
      { orderCount: 1, shares: 18, limitNet: 31.88, limitGross: 35 },
      { orderCount: 1, shares: 1000, limitNet: 27, limitGross: 29.65 },
      { orderCount: 2, shares: 1000, limitNet: 20, limitGross: 21.96 },
      { orderCount: 1, shares: 10, limitNet: 10, limitGross: 10.98 },
    ]);
    expect(snap.orderBook.asks).toEqual([
      { orderCount: 2, shares: 752, limitNet: 20 },
      { orderCount: 1, shares: 481, limitNet: 22 },
      { orderCount: 4, shares: 452, limitNet: 25 },
      { orderCount: 2, shares: 1539, limitNet: 28 },
      { orderCount: 3, shares: 1332, limitNet: 30 },
    ]);
  });
});

describe('parsePraemiaMarketPage edge cases', () => {
  it('throws PageStructureError on a maintenance page', () => {
    const html = '<html><body><h1>Site en maintenance</h1></body></html>';
    expect(() => parsePraemiaMarketPage(html, { scpiId: 'primopierre' })).toThrow(PageStructureError);
  });

  it('returns an empty order book when the tables are absent', () => {
    const html = `<html><body>
      <div class="key-item"><div class="key-number">31,88 € / Part</div>
        <div class="key-label">Dernier prix d’exécution constaté (Prix net revenant au vendeur)</div></div>
    </body></html>`;
    const snap = parsePraemiaMarketPage(html, { scpiId: 'primopierre', scrapedAt });
    expect(snap.lastExecutionPrice).toBe(31.88);
    expect(snap.orderBook).toEqual({ bids: [], asks: [], visibleDepth: 5 });
    expect(snap.history).toEqual([]);
    expect(snap.lastBuyerPrice).toBeNull();
    expect(snap.sourceUpdatedAt).toBeNull();
    expect(snap.capitalisation).toBeNull();
  });
});
