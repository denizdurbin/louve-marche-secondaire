import type { ConfrontationEstimate, DividendRecord, MarketSnapshot, ScpiInfo } from '@louve/core';
import type { DraftOrder } from '../order';

export interface MarketOverviewProps {
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  estimate: ConfrontationEstimate;
}

export interface YieldPanelProps {
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  estimate: ConfrontationEstimate;
  /** Previous calendar year's gross dividend, or the latest known one (isPreviousYear false). */
  dividend: { record: DividendRecord; isPreviousYear: boolean } | null;
  order: DraftOrder;
  onOrderChange: (order: DraftOrder) => void;
}

export interface ConfrontationPanelProps {
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  estimate: ConfrontationEstimate;
  dividend: { record: DividendRecord; isPreviousYear: boolean } | null;
  order: DraftOrder;
  onOrderChange: (order: DraftOrder) => void;
}

export interface PurchaseEmailFlowProps {
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  estimate: ConfrontationEstimate;
  order: DraftOrder;
  onOrderChange: (order: DraftOrder) => void;
}
