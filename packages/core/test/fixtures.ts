import type { FeeSchedule, OrderBook, ScpiInfo } from '../src/types';

export const fees: FeeSchedule = { cessionCommissionTtc: 0.048, registrationDuty: 0.05, fixedFeesEur: 90, source: 'test' };

export const todayBook: Pick<OrderBook, 'bids' | 'asks'> = {
  bids: [
    { orderCount: 1, shares: 18, limitNet: 31.88, limitGross: 35 },
    { orderCount: 1, shares: 1000, limitNet: 27, limitGross: 29.65 },
    { orderCount: 2, shares: 1000, limitNet: 20, limitGross: 21.96 },
    { orderCount: 1, shares: 10, limitNet: 10, limitGross: 10.98 },
  ],
  asks: [
    { orderCount: 2, shares: 752, limitNet: 20 },
    { orderCount: 1, shares: 481, limitNet: 22 },
    { orderCount: 4, shares: 452, limitNet: 25 },
    { orderCount: 2, shares: 1539, limitNet: 28 },
    { orderCount: 3, shares: 1332, limitNet: 30 },
  ],
};

export const scpi: ScpiInfo = {
  id: 'primopierre',
  name: 'Primopierre',
  managementCompany: 'Praemia REIM France',
  managementCompanyEmail: 'serviceclients@praemiareim.com',
  sourceUrl: 'https://example.com',
  fees,
  dividends: [],
};
