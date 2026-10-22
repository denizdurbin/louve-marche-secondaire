// Shared data shapes. Prices are euros per share; "net" = net vendeur (execution price),
// "gross" = prix acquéreur (fees included). Dates from the source page are Paris local time
// without offset: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm".

/** A figure published with its reference date, e.g. 70,76 € "au 30 juin 2026". */
export interface DatedValue {
  value: number;
  /** Reference date as written on the source page (e.g. "30 juin 2026"), if any. */
  asOf: string | null;
}

/** One past confrontation. */
export interface PricePoint {
  date: string;
  sharesTraded: number;
  executionPrice: number;
  buyerPrice: number;
}

/** Aggregated buy level (several orders at the same limit appear as one line). */
export interface BidLevel {
  orderCount: number;
  shares: number;
  limitNet: number;
  /** Same limit, fees included, when the source publishes it. */
  limitGross: number | null;
}

/** Aggregated sell level. */
export interface AskLevel {
  orderCount: number;
  shares: number;
  limitNet: number;
}

export interface OrderBook {
  bids: BidLevel[];
  asks: AskLevel[];
  /** How many levels per side the source publishes (5 on Praemia). */
  visibleDepth: number;
}

export interface MarketSnapshot {
  scpiId: string;
  /** When we fetched the page (ISO 8601, UTC). */
  scrapedAt: string;
  /** "Mise à jour le …" shown by the source, Paris local time. */
  sourceUpdatedAt: string | null;
  lastExecutionPrice: number;
  lastBuyerPrice: number | null;
  nextConfrontation: string | null;
  orderDeadline: string | null;
  realisationValue: DatedValue | null;
  /** Ratio, e.g. 0.0362 for 3,62 %. */
  distributionRate: DatedValue | null;
  capitalisation: DatedValue | null;
  /** Most recent confrontation first, as on the source page. */
  history: PricePoint[];
  orderBook: OrderBook;
}

/** Fees paid by the buyer on top of the execution price. */
export interface FeeSchedule {
  /** Commission de cession, TTC, as a ratio of the execution price (0.048). */
  cessionCommissionTtc: number;
  /** Droits d'enregistrement, ratio of the execution price (0.05). */
  registrationDuty: number;
  /** Flat fee per purchase file, TTC, in euros. */
  fixedFeesEur: number;
  source: string;
  sourceUrl?: string;
}

/** Gross dividend per share for a calendar year, entered by hand with its source. */
export interface DividendRecord {
  year: number;
  grossPerShare: number;
  source: string;
  sourceUrl?: string;
}

/** A figure not on the scraped page (quarterly bulletin, mandate…), entered by hand with its source. */
export interface ManualFact {
  key: string;
  label: string;
  value: number;
  unit: 'eur' | 'ratio' | 'shares';
  asOf: string;
  source: string;
  sourceUrl?: string;
}

/** Everything about an SCPI that is safe to send to the browser. */
export interface ScpiInfo {
  id: string;
  name: string;
  managementCompany: string;
  managementCompanyEmail: string;
  sourceUrl: string;
  fees: FeeSchedule;
  dividends: DividendRecord[];
  facts?: ManualFact[];
}

export interface MarketResponse {
  snapshot: MarketSnapshot;
  /** True when the live fetch failed and this is the last good snapshot. */
  stale: boolean;
  error?: string;
}
