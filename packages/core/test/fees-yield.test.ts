import { describe, it, expect } from 'vitest';
import { buyerPrice, netFromBuyerPrice, purchaseCost, variableFeeRate } from '../src/fees';
import { dividendForPreviousYear, yieldCurve, yieldFeesIncluded, yieldWithFixedFees } from '../src/yield';
import { formatEur, formatPct } from '../src/format';
import { fees } from './fixtures';

describe('fees', () => {
  it('computes the variable rate', () => expect(variableFeeRate(fees)).toBeCloseTo(0.098, 10));
  it('computes buyer prices', () => {
    expect(buyerPrice(31.88, fees)).toBeCloseTo(35.00424, 5);
    expect(formatEur(buyerPrice(31.88, fees))).toBe('35,00 €');
    expect(formatEur(buyerPrice(36, fees))).toBe('39,53 €');
    expect(formatEur(buyerPrice(45, fees))).toBe('49,41 €');
  });
  it('inverts buyerPrice', () => expect(netFromBuyerPrice(buyerPrice(31.88, fees), fees)).toBeCloseTo(31.88, 10));
  it('computes purchase cost', () => {
    const c = purchaseCost({ netPrice: 32, shares: 100, fees, includeFixedFees: true });
    expect(c.netAmount).toBeCloseTo(3200, 8);
    expect(c.variableFees).toBeCloseTo(313.6, 8);
    expect(c.fixedFees).toBe(90);
    expect(c.total).toBeCloseTo(3603.6, 8);
    expect(purchaseCost({ netPrice: 32, shares: 100, fees, includeFixedFees: false }).total).toBeCloseTo(3513.6, 8);
  });
});

describe('yield', () => {
  it('yieldFeesIncluded', () => {
    expect(yieldFeesIncluded(4.56, 31.88, fees)).toBeCloseTo(0.13027, 5);
    expect(formatPct(yieldFeesIncluded(4.56, 31.88, fees))).toBe('13,03 %');
    expect(yieldFeesIncluded(4.56, 22, fees)).toBeCloseTo(0.18877, 5);
  });
  it('yieldWithFixedFees', () => expect(yieldWithFixedFees(4.56, 31.88, 100, fees)).toBeCloseTo(0.127, 4));
  it('yieldCurve', () => {
    const c = yieldCurve(4.56, fees, { from: 20, to: 40, points: 5 });
    expect(c.map((p) => p.price)).toEqual([20, 25, 30, 35, 40]);
    expect(c[0]?.yield).toBeCloseTo(0.20765, 5);
    for (let i = 1; i < c.length; i++) expect(c[i]!.yield).toBeLessThan(c[i - 1]!.yield);
  });
  it('yieldCurve rejects invalid input', () => {
    expect(() => yieldCurve(4.56, fees, { from: 20, to: 40, points: 1 })).toThrow();
    expect(() => yieldCurve(4.56, fees, { from: 40, to: 20, points: 5 })).toThrow();
  });
  it('dividendForPreviousYear', () => {
    const today = new Date(2026, 9, 22);
    const d24 = { year: 2024, grossPerShare: 4, source: 's' };
    const d25 = { year: 2025, grossPerShare: 4.56, source: 's' };
    expect(dividendForPreviousYear([d24, d25], today)).toEqual({ record: d25, isPreviousYear: true });
    expect(dividendForPreviousYear([d24], today)).toEqual({ record: d24, isPreviousYear: false });
    expect(dividendForPreviousYear([], today)).toBeNull();
  });
});
