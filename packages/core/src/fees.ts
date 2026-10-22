import type { FeeSchedule } from './types';

/** Variable fees paid by the buyer, as a ratio of the net (execution) price. */
export function variableFeeRate(fees: FeeSchedule): number {
  return fees.cessionCommissionTtc + fees.registrationDuty;
}

/** Prix acquéreur (fees included) for a net price. */
export function buyerPrice(net: number, fees: FeeSchedule): number {
  return net * (1 + variableFeeRate(fees));
}

/** Inverse of {@link buyerPrice}. */
export function netFromBuyerPrice(gross: number, fees: FeeSchedule): number {
  return gross / (1 + variableFeeRate(fees));
}

export interface PurchaseCostInput {
  netPrice: number;
  shares: number;
  fees: FeeSchedule;
  includeFixedFees: boolean;
}

export interface PurchaseCost {
  netAmount: number;
  variableFees: number;
  fixedFees: number;
  total: number;
}

export function purchaseCost({ netPrice, shares, fees, includeFixedFees }: PurchaseCostInput): PurchaseCost {
  const netAmount = netPrice * shares;
  const variableFees = netAmount * variableFeeRate(fees);
  const fixedFees = includeFixedFees ? fees.fixedFeesEur : 0;
  return { netAmount, variableFees, fixedFees, total: netAmount + variableFees + fixedFees };
}
