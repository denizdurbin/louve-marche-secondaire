import type { AskLevel, BidLevel, ConfrontationEstimate, FeeSchedule, LevelFill, OrderBook } from '@louve/core';
import { buyerPrice, formatEur, formatInt } from '@louve/core';
import { Card, Note } from './ui';

interface Row {
  key: string;
  orders: number;
  shares: number;
  net: number;
  gross: number;
  served: number;
}

interface SideTableProps {
  title: string;
  grossLabel: string;
  rows: Row[];
}

function SideTable({ title, grossLabel, rows }: SideTableProps) {
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalShares = rows.reduce((s, r) => s + r.shares, 0);
  return (
    <Card>
      <div className="mo-table-wrap">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Ordres</th>
              <th scope="col">Parts</th>
              <th scope="col">Prix limite hors frais</th>
              <th scope="col">{grossLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.served > 0 ? 'row-highlight' : undefined}>
                <td>{formatInt(r.orders)}</td>
                <td>
                  {formatInt(r.shares)}
                  {r.served > 0 && <span className="mo-served">servi : {formatInt(r.served)}</span>}
                </td>
                <td>{formatEur(r.net)}</td>
                <td>{formatEur(r.gross)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>{formatInt(totalOrders)}</td>
              <td>{formatInt(totalShares)}</td>
              <td colSpan={2}>Total visible</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

const servedAt = (fills: LevelFill[], i: number): number => fills[i]?.served ?? 0;

/** Visible order book: buyers and sellers side by side, levels served at the estimated price highlighted. */
export function OrderBookTable({
  book,
  fees,
  estimate,
}: {
  book: OrderBook;
  fees: FeeSchedule;
  estimate: ConfrontationEstimate;
}) {
  if (book.bids.length === 0 && book.asks.length === 0) {
    return <p className="muted">Le carnet d'ordres est vide pour le moment : aucun ordre n'est visible.</p>;
  }

  const bidRows = book.bids.map((b: BidLevel, i): Row => ({
    key: `b${i}-${b.limitNet}`,
    orders: b.orderCount,
    shares: b.shares,
    net: b.limitNet,
    gross: b.limitGross ?? buyerPrice(b.limitNet, fees),
    served: servedAt(estimate.fills.bids, i),
  }));
  const askRows = book.asks.map((a: AskLevel, i): Row => ({
    key: `a${i}-${a.limitNet}`,
    orders: a.orderCount,
    shares: a.shares,
    net: a.limitNet,
    gross: buyerPrice(a.limitNet, fees),
    served: servedAt(estimate.fills.asks, i),
  }));

  const bestBid = book.bids.length > 0 ? Math.max(...book.bids.map((b) => b.limitNet)) : null;
  const lowestAsk = book.asks.length > 0 ? Math.min(...book.asks.map((a) => a.limitNet)) : null;
  const crossed = bestBid !== null && lowestAsk !== null && bestBid >= lowestAsk;
  const anyServed = [...bidRows, ...askRows].some((r) => r.served > 0);

  return (
    <div className="mo-chart-stack">
      <div className="grid grid-2">
        <SideTable title="Acheteurs (ordres d'achat)" grossLabel="Prix limite frais inclus" rows={bidRows} />
        <SideTable title="Vendeurs (ordres de vente)" grossLabel="Équivalent frais inclus" rows={askRows} />
      </div>
      {estimate.price !== null && anyServed && (
        <p className="mo-legend">
          Lignes surlignées : ordres exécutés, en tout ou en partie, si la confrontation se faisait au prix estimé de{' '}
          {formatEur(estimate.price)} (net vendeur).
        </p>
      )}
      <Note title="À savoir sur ce carnet">
        Seuls les {book.visibleDepth} meilleurs prix de chaque côté sont publiés, et la liste est actualisée toutes les
        30 minutes : d'autres ordres existent peut-être. Le prix limite est le prix maximum accepté par l'acheteur ou le
        prix minimum demandé par le vendeur.
        {crossed && bestBid !== null && lowestAsk !== null && (
          <>
            {' '}
            Ici, le carnet « croise » déjà : le meilleur acheteur ({formatEur(bestBid)}) accepte de payer plus que ce que
            demande le vendeur le moins cher ({formatEur(lowestAsk)}). C'est pourquoi le prochain prix peut baisser par
            rapport au dernier prix d'exécution.
          </>
        )}
      </Note>
    </div>
  );
}
