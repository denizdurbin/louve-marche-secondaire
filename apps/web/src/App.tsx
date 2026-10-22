import { useMemo, useState } from 'react';
import { dividendForPreviousYear, estimateConfrontation, formatDateFr } from '@louve/core';
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
  const { state, reload } = useScpiData(SCPI_ID);

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
  return <Dashboard scpi={state.scpi} market={state.market} />;
}

function Dashboard({ scpi, market }: { scpi: ScpiInfo; market: MarketResponse }) {
  const { snapshot } = market;
  const estimate = useMemo(
    () => estimateConfrontation(snapshot.orderBook, snapshot.lastExecutionPrice),
    [snapshot],
  );
  const dividend = useMemo(() => dividendForPreviousYear(scpi.dividends, new Date()), [scpi]);
  const [order, setOrder] = useState<DraftOrder>(() => ({
    shares: 100,
    netPrice: estimate.price ?? snapshot.lastExecutionPrice,
  }));

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <h1>SCPI {scpi.name} · marché secondaire</h1>
          <p>
            {scpi.managementCompany} · données du site officiel
            {snapshot.sourceUpdatedAt && <> mises à jour le {formatDateFr(snapshot.sourceUpdatedAt)} (heure de Paris)</>}
          </p>
        </div>
      </header>
      {market.stale && (
        <div className="banner-stale" role="alert">
          Le site source est momentanément indisponible ou a changé : affichage des dernières données valides, récupérées
          le {new Date(snapshot.scrapedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.
        </div>
      )}
      <nav className="app-nav" aria-label="Sections">
        <div className="app-nav-inner">
          <a href="#marche">1. Marché</a>
          <a href="#rendement">2. Rendement</a>
          <a href="#confrontation">3. Prochaine confrontation</a>
          <a href="#achat">4. Préparer l'achat</a>
        </div>
      </nav>
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
        <ConfrontationPanel scpi={scpi} snapshot={snapshot} estimate={estimate} dividend={dividend} />
        <PurchaseEmailFlow scpi={scpi} snapshot={snapshot} estimate={estimate} order={order} onOrderChange={setOrder} />
      </main>
    </>
  );
}
