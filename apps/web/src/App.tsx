import { useMemo, useState } from 'react';
import {
  dividendForPreviousYear,
  estimateConfrontation,
  formatDateFr,
  formatEur,
  formatInt,
  formatPct,
  purchaseCost,
  yieldFeesIncluded,
  yieldWithFixedFees,
} from '@louve/core';
import type { MarketResponse, ScpiInfo } from '@louve/core';
import { useScpiData } from './useScpiData';
import type { DraftOrder } from './order';
import { MarketOverview } from './components/MarketOverview';
import { YieldPanel } from './components/YieldPanel';
import { ConfrontationPanel } from './components/ConfrontationPanel';
import { PurchaseEmailFlow } from './components/PurchaseEmailFlow';
import { Note } from './components/ui';

// V1 integrates a single SCPI; the API and components are keyed by id so others can be added.
const SCPI_ID = 'primopierre';

export function App() {
  const { state, reload, refreshMarket, refreshing, refreshError, upToDate } = useScpiData(SCPI_ID);

  if (state.status === 'loading') return <p className="state">Chargement des données de marché…</p>;
  if (state.status === 'error') {
    return (
      <div className="state">
        <Note tone="warning" title="Données indisponibles">
          {state.error}
        </Note>
        <p>
          <button onClick={() => void reload()}>Réessayer</button>
        </p>
      </div>
    );
  }
  return (
    <Dashboard
      scpi={state.scpi}
      market={state.market}
      refresh={{ run: () => void refreshMarket(), pending: refreshing, error: refreshError, upToDate }}
    />
  );
}

interface RefreshControl {
  run: () => void;
  pending: boolean;
  error: string | null;
  upToDate: boolean;
}

function Dashboard({ scpi, market, refresh }: { scpi: ScpiInfo; market: MarketResponse; refresh: RefreshControl }) {
  const { snapshot } = market;
  const estimate = useMemo(
    () => estimateConfrontation(snapshot.orderBook, snapshot.lastExecutionPrice),
    [snapshot],
  );
  const dividend = useMemo(() => dividendForPreviousYear(scpi.dividends, new Date()), [scpi]);
  const lastYield = dividend ? yieldFeesIncluded(dividend.record.grossPerShare, snapshot.lastExecutionPrice, scpi.fees) : null;
  const [order, setOrder] = useState<DraftOrder>(() => ({
    shares: 100,
    netPrice: estimate.price ?? snapshot.lastExecutionPrice,
  }));

  const orderCost = purchaseCost({ netPrice: order.netPrice, shares: order.shares, fees: scpi.fees, includeFixedFees: true });
  const orderYield = dividend ? yieldWithFixedFees(dividend.record.grossPerShare, order.netPrice, order.shares, scpi.fees) : null;

  return (
    <>
      <header className="masthead">
        <p className="kicker">
          <span className="wordmark">louve invest</span> · Marché secondaire des SCPI
        </p>
        <h1>{scpi.name}</h1>
        <p className="dek">
          Le marché des parts de la SCPI de bureaux gérée par {scpi.managementCompany} : où en sont les prix, ce que
          rapporterait une part, le prix probable de la prochaine confrontation, et l'email pour préparer votre achat.
        </p>
        <p className="meta">
          {snapshot.sourceUpdatedAt && <>Données du site officiel au {formatDateFr(snapshot.sourceUpdatedAt)}, </>}
          récupérées à {formatTimeParis(snapshot.scrapedAt)}
          {snapshot.nextConfrontation && <> · Prochaine confrontation le {formatDateFr(snapshot.nextConfrontation)}</>}
          {' · '}
          <button type="button" className="link-button" onClick={refresh.run} disabled={refresh.pending}>
            {refresh.pending ? 'Actualisation…' : 'Actualiser'}
          </button>
          {refresh.upToDate && <span role="status"> Déjà à jour.</span>}
          {refresh.error && (
            <span className="meta-error" role="alert">
              {' '}
              Échec de l'actualisation : {refresh.error}
            </span>
          )}
        </p>
      </header>
      {market.stale && (
        <p className="banner-stale" role="alert">
          Le site source est momentanément indisponible ou a changé. Affichage des dernières données valides, récupérées
          le {new Date(snapshot.scrapedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.
        </p>
      )}
      <nav className="app-nav" aria-label="Sections">
        <div className="app-nav-inner">
          <a href="#marche">Le marché</a>
          <a href="#rendement">Rendement</a>
          <a href="#confrontation">Prochaine confrontation</a>
          <a href="#achat">Préparer l'achat</a>
        </div>
      </nav>
      <div className="layout">
        <main className="app-main">
          <MarketOverview scpi={scpi} snapshot={snapshot} estimate={estimate} />
          <YieldPanel
            scpi={scpi}
            snapshot={snapshot}
            estimate={estimate}
            dividend={dividend}
            order={order}
            onOrderChange={setOrder}
          />
          <ConfrontationPanel
            scpi={scpi}
            snapshot={snapshot}
            estimate={estimate}
            dividend={dividend}
            order={order}
            onOrderChange={setOrder}
          />
          <PurchaseEmailFlow scpi={scpi} snapshot={snapshot} estimate={estimate} order={order} onOrderChange={setOrder} />
        </main>
        <aside className="summary" aria-label="En bref">
          <h2 className="summary-title">En bref</h2>
          <dl className="summary-list">
            <SummaryRow label="Dernier prix d'exécution" value={formatEur(snapshot.lastExecutionPrice)} note="net vendeur" />
            {lastYield !== null && dividend && (
              <SummaryRow label="Rendement frais inclus" value={formatPct(lastYield)} note={`dividende ${dividend.record.year}`} />
            )}
            <SummaryRow
              label="Prix estimé, prochaine confrontation"
              value={estimate.price === null ? '—' : formatEur(estimate.price)}
              note={estimate.price === null ? 'aucun échange attendu' : `${formatInt(estimate.sharesTraded)} parts`}
            />
            {snapshot.orderDeadline && <SummaryRow label="Date limite des ordres" value={formatDateFr(snapshot.orderDeadline)} />}
          </dl>
          <h2 className="summary-title">Votre ordre</h2>
          <dl className="summary-list">
            <SummaryRow label={`${formatInt(order.shares)} parts à ${formatEur(order.netPrice)}`} value={formatEur(orderCost.total)} note="frais inclus" />
            {orderYield !== null && <SummaryRow label="Rendement, frais fixes inclus" value={formatPct(orderYield)} />}
          </dl>
          <a className="button summary-cta" href="#achat">
            Préparer l'email
          </a>
        </aside>
      </div>
      <footer className="app-footer">
        Sources : site officiel {scpi.managementCompany}, bulletins trimestriels et mandat d'achat, détaillées dans chaque
        section. Les performances passées ne préjugent pas des performances futures. Aucun ordre n'est transmis par cette
        application.
      </footer>
    </>
  );
}

const formatTimeParis = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

function SummaryRow(props: { label: string; value: string; note?: string }) {
  return (
    <div className="summary-row">
      <dt>{props.label}</dt>
      <dd>
        {props.value}
        {props.note && <span>{props.note}</span>}
      </dd>
    </div>
  );
}
