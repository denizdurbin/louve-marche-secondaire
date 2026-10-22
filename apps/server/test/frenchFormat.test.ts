import { describe, expect, it } from 'vitest';
import { parseFrenchDate, parseFrenchDateTime, parseFrenchNumber } from '../src/scpi/frenchFormat.js';

describe('parseFrenchNumber', () => {
  it.each([
    ['1 747', 1747],
    ['1747', 1747],
    ['31,88 \u20ac / Part', 31.88],
    ['31,88\u20ac', 31.88],
    ['3,62 %', 3.62],
    ['-0,04 %', -0.04],
    ['832 199 173 \u20ac', 832199173],
    ['1\u00a0747', 1747],
    ['1\u202f747', 1747],
    ['832\u00a0199\u00a0173\u00a0\u20ac', 832199173],
    ['31,88\u00a0\u20ac', 31.88],
    ['\n   31,88 \n  \u20ac / Part\n', 31.88],
  ])('%j -> %d', (text, expected) => {
    expect(parseFrenchNumber(text)).toBe(expected);
  });

  it('throws when there is no number', () => {
    expect(() => parseFrenchNumber('N/A')).toThrow(Error);
    expect(() => parseFrenchNumber('')).toThrow(Error);
  });
});

describe('parseFrenchDate', () => {
  it('converts dd/mm/yyyy to ISO', () => {
    expect(parseFrenchDate('24/09/2026')).toBe('2026-09-24');
    expect(parseFrenchDate('1/2/2026')).toBe('2026-02-01');
  });

  it('throws without a date', () => {
    expect(() => parseFrenchDate('hier')).toThrow(Error);
  });
});

describe('parseFrenchDateTime', () => {
  it('handles a plain date and time', () => {
    expect(parseFrenchDateTime('29/10/2026 16:00')).toBe('2026-10-29T16:00');
  });

  it('handles the "date - time" form, with and without NBSP', () => {
    expect(parseFrenchDateTime('22/10/2026 - 11:09')).toBe('2026-10-22T11:09');
    expect(parseFrenchDateTime('22/10/2026\u00a0-\u00a011:09')).toBe('2026-10-22T11:09');
  });

  it('throws without a time', () => {
    expect(() => parseFrenchDateTime('22/10/2026')).toThrow(Error);
  });
});
