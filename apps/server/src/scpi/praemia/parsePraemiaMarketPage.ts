import * as cheerio from 'cheerio';

import type {
  AskLevel,
  BidLevel,
  DatedValue,
  MarketSnapshot,
  OrderBook,
  PricePoint,
} from '@louve/core';
import { parseFrenchDate, parseFrenchDateTime, parseFrenchNumber } from '../frenchFormat.js';

export class PageStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PageStructureError';
  }
}

type $ = cheerio.CheerioAPI;
type Sel = ReturnType<$>;

interface Kpi {
  label: string; // normalized (lowercase, no accents, straight apostrophes, single spaces)
  number: string;
  date: string;
}

const DEFAULT_DEPTH = 5;

export function parsePraemiaMarketPage(
  html: string,
  opts: { scpiId: string; scrapedAt?: Date },
): MarketSnapshot {
  const $ = cheerio.load(html);
  const kpis = readKpis($);

  const lastExecutionPrice = numberOrNull(findKpi(kpis, 'dernier prix d\'execution')?.number);
  if (lastExecutionPrice === null) {
    throw new PageStructureError('Last execution price not found: page changed or in maintenance');
  }

  const buyer = findKpi(kpis, 'dernier prix acquereur');
  const next = findKpi(kpis, 'date et heure de la prochaine confrontation');
  const deadline = findKpi(kpis, 'date limite de reception des ordres');

  return {
    scpiId: opts.scpiId,
    scrapedAt: (opts.scrapedAt ?? new Date()).toISOString(),
    sourceUpdatedAt: readSourceUpdatedAt($),
    lastExecutionPrice,
    lastBuyerPrice: numberOrNull(buyer?.number),
    nextConfrontation: dateTimeOrNull(next),
    orderDeadline: dateTimeOrNull(deadline),
    realisationValue: datedValue(findKpi(kpis, 'valeur de realisation'), 1),
    distributionRate: datedValue(findKpi(kpis, 'taux de distribution'), 0.01),
    capitalisation: datedValue(findKpi(kpis, 'capitalisation'), 1),
    history: readHistory($),
    orderBook: readOrderBook($),
  };
}

// --- KPIs ---------------------------------------------------------------------------------

// Each KPI block is a `key-item*` element holding .key-number, .key-label and maybe .key-date.
// The page has two groups of blocks (subscription conditions and market); blocks are not nested.
function readKpis($: $): Kpi[] {
  return $('[class*="key-item"]')
    .toArray()
    .map((el) => {
      const block = $(el);
      const label = block.find('.key-label').first().clone();
      label.find('.by-popover').remove(); // hidden tooltip text
      return {
        label: normalize(label.text()),
        number: text(block.find('.key-number').first()),
        date: text(block.find('.key-date').first()),
      };
    });
}

function findKpi(kpis: Kpi[], labelStart: string): Kpi | undefined {
  return kpis.find((k) => k.label.startsWith(labelStart));
}

function datedValue(kpi: Kpi | undefined, scale: number): DatedValue | null {
  const value = numberOrNull(kpi?.number);
  if (!kpi || value === null) return null;
  const asOf = kpi.date.replace(/^au\s+/i, '').trim();
  return { value: roundTo(value * scale, 10), asOf: asOf || null };
}

// The date is in .key-number ("29/10/2026") and the time in .key-date ("16:00").
function dateTimeOrNull(kpi: Kpi | undefined): string | null {
  if (!kpi) return null;
  try {
    return parseFrenchDateTime(`${kpi.number} ${kpi.date}`);
  } catch {
    return null;
  }
}

function readSourceUpdatedAt($: $): string | null {
  const m = /Mise à jour le\s*(\d{1,2}\/\d{1,2}\/\d{4}\s*-?\s*\d{1,2}:\d{2})/.exec(
    text($('body')),
  );
  return m?.[1] ? parseFrenchDateTime(m[1]) : null;
}

// --- History ------------------------------------------------------------------------------

function readHistory($: $): PricePoint[] {
  const points: PricePoint[] = [];
  for (const row of $('#historic-table tbody tr').toArray()) {
    const cells = $(row).children('td').toArray().map((c) => text($(c)));
    if (cells.length !== 4) continue;
    try {
      points.push({
        date: parseFrenchDate(cells[0] ?? ''),
        sharesTraded: parseFrenchNumber(cells[1] ?? ''),
        executionPrice: parseFrenchNumber(cells[2] ?? ''),
        buyerPrice: parseFrenchNumber(cells[3] ?? ''),
      });
    } catch {
      // not a data row
    }
  }
  return points;
}

// --- Order book ---------------------------------------------------------------------------

// Each side is an h3.fixed-capital-table-title, then an <hr>, then the <table> (siblings).
function readOrderBook($: $): OrderBook {
  const book: OrderBook = { bids: [], asks: [], visibleDepth: DEFAULT_DEPTH };
  for (const h3 of $('h3.fixed-capital-table-title').toArray()) {
    const title = normalize(text($(h3)));
    const rows = tableRows($, $(h3));
    if (title.includes('achat')) {
      book.bids = rows.flatMap((r) => bid(r));
      book.visibleDepth = Number(/\d+/.exec(title)?.[0] ?? DEFAULT_DEPTH);
    } else if (title.includes('vente')) {
      book.asks = rows.flatMap((r) => ask(r));
    }
  }
  return book;
}

function tableRows($: $, heading: Sel): number[][] {
  let table = heading.nextAll('table').first();
  if (table.length === 0) table = heading.parent().find('table').first();
  return table
    .find('tbody tr')
    .toArray()
    .map((tr) => {
      try {
        return $(tr).children('td').toArray().map((td) => parseFrenchNumber(text($(td))));
      } catch {
        return [];
      }
    });
}

function bid(r: number[]): BidLevel[] {
  const [orderCount, shares, limitNet, limitGross] = r;
  if (orderCount === undefined || shares === undefined || limitNet === undefined) return [];
  return [{ orderCount, shares, limitNet, limitGross: limitGross ?? null }];
}

function ask(r: number[]): AskLevel[] {
  const [orderCount, shares, limitNet] = r;
  if (orderCount === undefined || shares === undefined || limitNet === undefined) return [];
  return [{ orderCount, shares, limitNet }];
}

// --- Small helpers ------------------------------------------------------------------------

function text(el: Sel): string {
  return el.text().replace(/\s+/g, ' ').trim();
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function numberOrNull(s: string | undefined): number | null {
  if (!s) return null;
  try {
    return parseFrenchNumber(s);
  } catch {
    return null;
  }
}

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
