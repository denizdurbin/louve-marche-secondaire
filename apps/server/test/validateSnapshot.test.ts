import { readFileSync } from 'node:fs';
import type { FeeSchedule, MarketSnapshot } from '@louve/core';
import { describe, expect, it } from 'vitest';
import { parsePraemiaMarketPage } from '../src/scpi/praemia/parsePraemiaMarketPage.js';
import { SnapshotValidationError, validateSnapshot } from '../src/market/validateSnapshot.js';

const fixture = readFileSync(new URL('./fixtures/primopierre-2026-10-22-1109.html', import.meta.url), 'utf8');
const fees: FeeSchedule = { cessionCommissionTtc: 0.048, registrationDuty: 0.05, fixedFeesEur: 90, source: 'test' };
const snapshot = (): MarketSnapshot => parsePraemiaMarketPage(fixture, { scpiId: 'primopierre' });

describe('validateSnapshot', () => {
  it('accepts the real page of 22/10/2026', () => {
    expect(() => validateSnapshot(snapshot(), fees)).not.toThrow();
  });

  it('detects a fee change we have not configured', () => {
    const newFees = { ...fees, cessionCommissionTtc: 0.06 };
    expect(() => validateSnapshot(snapshot(), newFees)).toThrow(SnapshotValidationError);
    expect(() => validateSnapshot(snapshot(), newFees)).toThrow(/dernier prix acquéreur/);
  });

  it('rejects a misread price or quantity', () => {
    const zeroPrice = { ...snapshot(), lastExecutionPrice: 0, lastBuyerPrice: null };
    expect(() => validateSnapshot(zeroPrice, fees)).toThrow(/dernier prix/);

    const s = snapshot();
    const badBook = { ...s, orderBook: { ...s.orderBook, asks: [{ orderCount: 1, shares: -5, limitNet: 20 }] } };
    expect(() => validateSnapshot(badBook, fees)).toThrow(/parts invalides/);
  });
});
