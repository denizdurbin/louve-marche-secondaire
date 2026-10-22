import { describe, it, expect } from 'vitest';
import { buildPurchaseEmail, toEml, toMailto, validatePurchaseRequest, type PurchaseRequest } from '../src/email';
import { scpi } from './fixtures';

const base: PurchaseRequest = {
  firstName: 'Marie',
  lastName: 'Dupont',
  isAssociate: false,
  shares: 100,
  maxPriceNet: 32,
  acceptPartial: true,
};
const today = new Date(2026, 9, 22);

describe('buildPurchaseEmail', () => {
  it('builds the body', () => {
    const m = buildPurchaseEmail(base, scpi);
    expect(m.to).toBe('serviceclients@praemiareim.com');
    for (const s of ['Marie', 'DUPONT', '100', '32,00 €', '35,14 €', '3 513,60 €', '90,00 €', 'Pas encore associé', '4,80 % TTC', '5,00 %']) {
      expect(m.body).toContain(s);
    }
    expect(m.subject).toBe('Projet d\'achat de parts SCPI Primopierre – Marie DUPONT');
  });
  it('associate variant and validity', () => {
    const m = buildPurchaseEmail({ ...base, isAssociate: true, associateNumber: '12345', validUntil: '2027-01-15' }, scpi);
    expect(m.body).toContain('Associé(e) n° 12345');
    expect(m.body).toContain('15/01/2027');
  });
});

describe('validatePurchaseRequest', () => {
  it('accepts a valid request', () => expect(validatePurchaseRequest(base, today)).toEqual({}));
  it('requires names and associate number', () => {
    const e = validatePurchaseRequest({ ...base, firstName: ' ', lastName: '', isAssociate: true }, today);
    expect(e.firstName).toBeDefined();
    expect(e.lastName).toBeDefined();
    expect(e.associateNumber).toBeDefined();
  });
  it('checks shares', () => {
    expect(validatePurchaseRequest({ ...base, shares: 0 }, today).shares).toBeDefined();
    expect(validatePurchaseRequest({ ...base, shares: 1.5 }, today).shares).toBeDefined();
  });
  it('checks price decimals', () => {
    expect(validatePurchaseRequest({ ...base, maxPriceNet: 32.1 }, today)).toEqual({});
    expect(validatePurchaseRequest({ ...base, maxPriceNet: 32.123 }, today).maxPriceNet).toBeDefined();
    expect(validatePurchaseRequest({ ...base, maxPriceNet: 0 }, today).maxPriceNet).toBeDefined();
  });
  it('checks validity date', () => {
    expect(validatePurchaseRequest({ ...base, validUntil: '2027-05-22' }, today).validUntil).toBeDefined();
    expect(validatePurchaseRequest({ ...base, validUntil: '2027-01-22' }, today)).toEqual({});
    expect(validatePurchaseRequest({ ...base, validUntil: '2026-10-01' }, today).validUntil).toBeDefined();
    expect(validatePurchaseRequest({ ...base, validUntil: '2026-10-22' }, today).validUntil).toBeDefined();
  });
});

describe('export formats', () => {
  const email = buildPurchaseEmail(base, scpi);
  it('toEml', () => {
    const eml = toEml(email);
    expect(eml).toContain('\r\n');
    expect(eml).toContain('X-Unsent: 1');
    expect(eml).toContain('=?UTF-8?B?');
    expect(eml).not.toMatch(/[^\r]\n/);
    const b64 = /Subject: =\?UTF-8\?B\?(.+)\?=/.exec(eml)![1]!;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(email.subject);
  });
  it('toMailto', () => {
    const url = toMailto(email);
    expect(url.startsWith('mailto:serviceclients@praemiareim.com?subject=')).toBe(true);
    expect(url).toContain('%0D%0A');
  });
});
