import type { MarketSnapshot, ScpiInfo } from '@louve/core';
import { parsePraemiaMarketPage } from './praemia/parsePraemiaMarketPage.js';

export type MarketPageParser = (html: string, opts: { scpiId: string; scrapedAt?: Date }) => MarketSnapshot;

/** Server-side config: the public info plus how to read its market page. */
export interface ScpiConfig {
  info: ScpiInfo;
  parse: MarketPageParser;
}

const PRAEMIA_DOCS = 'https://www.praemiareim.fr/documents/14836074';
const PRIMOPIERRE_MANDATE_URL = `${PRAEMIA_DOCS}/1099398036/PRIMOPIERRE%20-%20Mandat%20d'achat%20-%20Personne%20Physique/dc631e45-bbdd-40fa-23b6-9d52b2160104`;
const PRIMOPIERRE_BTI_T2_2026_URL = `${PRAEMIA_DOCS}/14836287/PRAEMIA_BTI_Primopierre_T2_2026_VDEF.pdf/97936dbf-e24c-ed99-8b83-a62abece978d`;

const primopierre: ScpiConfig = {
  info: {
    id: 'primopierre',
    name: 'Primopierre',
    managementCompany: 'Praemia REIM France',
    managementCompanyEmail: 'serviceclients@praemiareim.com',
    sourceUrl: 'https://www.praemiareim.fr/fr/scpi-primopierre',
    fees: {
      cessionCommissionTtc: 0.048,
      registrationDuty: 0.05,
      // "Commission de cession ou mutation de parts : 75 € HT / 90 € TTC par dossier", payable by the buyer.
      fixedFeesEur: 90,
      source: "Mandat d'achat Primopierre, 08/2026, p. 3-4",
      sourceUrl: PRIMOPIERRE_MANDATE_URL,
    },
    dividends: [
      {
        year: 2025,
        grossPerShare: 4.56,
        source: 'BTI T4 2025 (1,00 + 1,00 + 1,00 + 1,56 €), cohérent avec le taux de distribution 2025 de 3,62 % (BTI T2 2026)',
        sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL,
      },
    ],
    facts: [
      { key: 'interimDividends2026', label: 'Acomptes 2026 versés (T1 + T2)', value: 1.8, unit: 'eur', asOf: '30/06/2026', source: 'BTI T2 2026', sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL },
      { key: 'sharesAwaitingSale', label: 'Parts en attente de cession', value: 146_937, unit: 'shares', asOf: '30/06/2026', source: 'BTI T2 2026', sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL },
      { key: 'occupancyRate', label: "Taux d'occupation financier (TOF)", value: 0.817, unit: 'ratio', asOf: '30/06/2026', source: 'BTI T2 2026', sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL },
      { key: 'debtRatio', label: 'Dettes et autres engagements', value: 0.413, unit: 'ratio', asOf: '30/06/2026', source: 'BTI T2 2026', sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL },
      { key: 'reconstitutionValue', label: 'Valeur de reconstitution', value: 81.75, unit: 'eur', asOf: '30/06/2026', source: 'BTI T2 2026', sourceUrl: PRIMOPIERRE_BTI_T2_2026_URL },
    ],
  },
  parse: parsePraemiaMarketPage,
};

const registry = new Map<string, ScpiConfig>([[primopierre.info.id, primopierre]]);

export function listScpis(): ScpiInfo[] {
  return [...registry.values()].map((c) => c.info);
}

export function getScpi(id: string): ScpiConfig | undefined {
  return registry.get(id);
}
