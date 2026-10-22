import { describe, it, expect } from 'vitest';
import { formatDateFr, formatEur, formatInt, formatPct } from '../src/format';

describe('format', () => {
  it('formats euros', () => {
    expect(formatEur(3513.6)).toBe('3 513,60 €');
    expect(formatEur(35)).toBe('35,00 €');
  });
  it('formats ints and percentages', () => {
    expect(formatInt(1018)).toBe('1 018');
    expect(formatPct(0.0362)).toBe('3,62 %');
    expect(formatPct(0.13027)).toBe('13,03 %');
  });
  it('formats dates', () => {
    expect(formatDateFr('2026-09-24')).toBe('24/09/2026');
    expect(formatDateFr('2026-10-29T16:00')).toBe('29/10/2026 16:00');
  });
});
