import {
  buyerPrice,
  formatDateFr,
  formatEur,
  formatInt,
  formatPct,
  purchaseCost,
  simulateClientOrder,
  yieldFeesIncluded,
} from '@louve/core';
import type { ConfrontationEstimate, LevelFill } from '@louve/core';
import type { ConfrontationPanelProps } from './props';
import { Card, Note, Section, Stat } from './ui';
import { CurveTable, SupplyDemandChart } from './SupplyDemandChart';
import { NumberField } from './NumberField';
import { describeOutcome } from './orderOutcome';
import './Panels.css';

function signedPct(ratio: number): string {
  const text = formatPct(Math.abs(ratio));
  return ratio < 0 ? `−${text}` : ratio > 0 ? `+${text}` : text;
}

const parts = (n: number) => `${formatInt(n)} part${n > 1 ? 's' : ''}`;

function EstimateStats({ props }: { props: ConfrontationPanelProps }) {
  const { scpi, snapshot, estimate, dividend } = props;
  if (estimate.price === null) {
    return (
      <div className="grid grid-stats">
        <Stat emphasis label="Prix estimé" value="Aucun échange" caption="aucun acheteur n'atteint un vendeur" />
      </div>
    );
  }
  const change = estimate.price / snapshot.lastExecutionPrice - 1;
  return (
    <div className="grid grid-stats">
      <Stat emphasis label="Prix estimé (hors frais)" value={formatEur(estimate.price)} caption="prix net vendeur" />
      <Stat label="Prix estimé, frais inclus" value={formatEur(buyerPrice(estimate.price, scpi.fees))} caption="ce que paie l'acheteur, par part" />
      <Stat label="Parts échangées" value={formatInt(estimate.sharesTraded)} />
      <Stat
        label="Écart avec le dernier prix"
        value={signedPct(change)}
        caption={`dernier prix : ${formatEur(snapshot.lastExecutionPrice)}`}
      />
      <Stat
        label="Rendement frais inclus à ce prix"
        value={dividend ? formatPct(yieldFeesIncluded(dividend.record.grossPerShare, estimate.price, scpi.fees)) : '—'}
        caption={dividend ? `dividende ${dividend.record.year}` : 'dividende indisponible'}
      />
    </div>
  );
}

function TiedPrices({ estimate, onlyBestUnmatched }: { estimate: ConfrontationEstimate; onlyBestUnmatched: boolean }) {
  const tied = estimate.curve.filter(
    (c) => c.volume === estimate.sharesTraded && (!onlyBestUnmatched || c.unmatched === estimate.unmatched),
  );
  return (
    <ul className="plain-list compact">
      {tied.map((c) => (
        <li key={c.price}>
          {formatEur(c.price)} : {parts(c.volume)} échangeables, {parts(c.unmatched)} non échangées
        </li>
      ))}
    </ul>
  );
}

function DecidingRule({ props }: { props: ConfrontationPanelProps }) {
  const { estimate, snapshot } = props;
  if (estimate.price === null || estimate.decidedBy === null) {
    return (
      <p>
        Aucun prix limite des acheteurs n'atteint un prix limite des vendeurs : aucun échange n'est attendu à la prochaine
        confrontation, tant que les ordres visibles ne changent pas.
      </p>
    );
  }
  const price = formatEur(estimate.price);
  switch (estimate.decidedBy) {
    case 'volume':
      return (
        <p>
          Ici, un seul prix permet d'échanger le plus de parts ({parts(estimate.sharesTraded)}) : c'est {price}. La première règle suffit.
        </p>
      );
    case 'unmatched':
      return (
        <>
          <p>
            Plusieurs prix permettent d'échanger le même maximum ({parts(estimate.sharesTraded)}). C'est la deuxième règle qui
            tranche : {price} laisse le moins de parts sans contrepartie.
          </p>
          <TiedPrices estimate={estimate} onlyBestUnmatched={false} />
        </>
      );
    case 'lastPrice':
      return (
        <>
          <p>
            Plusieurs prix sont à égalité sur le volume et sur les parts non échangées. C'est la troisième règle qui tranche :{' '}
            {price} est le plus proche du dernier prix ({formatEur(snapshot.lastExecutionPrice)}).
          </p>
          <TiedPrices estimate={estimate} onlyBestUnmatched />
        </>
      );
    case 'highestPrice':
      return (
        <>
          <p>
            Les trois règles officielles laissent plusieurs prix à égalité. Nous retenons le plus élevé, {price} : c'est notre
            propre convention, pas une règle officielle, donc le prix réel peut être différent.
          </p>
          <TiedPrices estimate={estimate} onlyBestUnmatched />
        </>
      );
  }
}

function HowItWorks({ props }: { props: ConfrontationPanelProps }) {
  return (
    <Card title="Comment ce prix est obtenu">
      <p className="small">
        La confrontation fixe un prix unique pour tous les ordres, selon trois règles appliquées dans cet ordre :
      </p>
      <ol className="plain-list">
        <li>le prix qui permet d'échanger le plus grand nombre de parts ;</li>
        <li>en cas d'égalité, celui qui laisse le moins de parts sans contrepartie ;</li>
        <li>s'il reste une égalité, celui qui est le plus proche du dernier prix d'exécution.</li>
      </ol>
      <DecidingRule props={props} />
    </Card>
  );
}

function FillList({ title, fills }: { title: string; fills: LevelFill[] }) {
  const served = fills.filter((f) => f.served > 0).sort((a, b) => b.limitNet - a.limitNet);
  return (
    <div>
      <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem' }}>{title}</h4>
      {served.length === 0 ? (
        <p className="small muted">Personne.</p>
      ) : (
        <ul className="plain-list compact">
          {served.map((f) => (
            <li key={f.limitNet}>
              à {formatEur(f.limitNet)} : {formatInt(f.served)} / {formatInt(f.shares)} parts
              {f.served < f.shares && <span className="fill-partial"> (exécution partielle)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WhoIsServed({ estimate }: { estimate: ConfrontationEstimate }) {
  return (
    <Card title="Qui serait servi ?">
      {estimate.price === null ? (
        <p className="small muted">Aucun échange attendu : personne ne serait servi.</p>
      ) : (
        <>
          <div className="grid grid-2">
            <FillList title="Acheteurs (prix limite)" fills={estimate.fills.bids} />
            <FillList title="Vendeurs (prix limite)" fills={estimate.fills.asks} />
          </div>
          <p className="small muted">
            Tous les ordres servis sont exécutés au même prix, {formatEur(estimate.price)}, quelle que soit leur limite.
          </p>
        </>
      )}
    </Card>
  );
}

function SimulationResult({ props }: { props: ConfrontationPanelProps }) {
  const { scpi, snapshot, estimate: current, order } = props;
  const outcome = simulateClientOrder(snapshot.orderBook, snapshot.lastExecutionPrice, {
    shares: order.shares,
    limitNet: order.netPrice,
  });
  const message = describeOutcome(outcome, { shares: order.shares, limitNet: order.netPrice });
  const price = outcome.estimate.price;
  const cost =
    price !== null && outcome.served > 0
      ? purchaseCost({ netPrice: price, shares: outcome.served, fees: scpi.fees, includeFixedFees: true })
      : null;
  const move =
    price === null
      ? 'aucun échange attendu'
      : current.price === null
        ? "sans votre ordre, aucun échange n'était attendu"
        : current.price === price
          ? 'inchangé par votre ordre'
          : `${formatEur(current.price)} sans votre ordre`;
  return (
    <>
      <div className="grid grid-stats">
        <Stat label="Prix d'exécution estimé avec votre ordre" value={price === null ? '—' : formatEur(price)} caption={move} />
        <Stat label="Parts obtenues" value={`${formatInt(outcome.served)} / ${formatInt(order.shares)}`} />
        <Stat
          label="Coût probable, frais inclus"
          value={cost ? formatEur(cost.total) : '—'}
          caption={cost ? `au prix d'exécution, frais fixes de ${formatEur(cost.fixedFees)} compris` : 'rien à payer si non servi'}
        />
      </div>
      <Note tone={message.tone} title={message.title}>
        {message.text}
      </Note>
    </>
  );
}

function OrderSimulator({ props }: { props: ConfrontationPanelProps }) {
  const { order, onOrderChange } = props;
  return (
    <Card title="Votre ordre serait-il servi ?">
      <p className="small muted">
        Votre ordre est ajouté au carnet visible et la confrontation est recalculée. C'est le même ordre que dans « Coût et
        rendement de votre achat » et dans l'email de l'étape 4.
      </p>
      <div className="form-row">
        <NumberField
          label="Nombre de parts"
          value={order.shares}
          step={1}
          min={1}
          isValid={(n) => Number.isInteger(n) && n >= 1}
          errorText="Entrez un nombre entier de parts, au moins 1."
          onValidChange={(shares) => onOrderChange({ ...order, shares })}
        />
        <NumberField
          label="Prix maximum par part (hors frais)"
          value={order.netPrice}
          step="any"
          min={0}
          isValid={(n) => n > 0}
          errorText="Entrez un prix supérieur à 0."
          onValidChange={(netPrice) => onOrderChange({ ...order, netPrice })}
        />
      </div>
      <SimulationResult props={props} />
    </Card>
  );
}

function Limits({ props }: { props: ConfrontationPanelProps }) {
  const { snapshot } = props;
  return (
    <Note tone="warning" title="Hypothèses et limites">
      <ul>
        <li>
          Seuls les {snapshot.orderBook.visibleDepth} meilleurs niveaux de prix de chaque côté sont publiés : des ordres plus
          éloignés peuvent exister et ne sont pas comptés.
        </li>
        <li>
          Le carnet est une photo : des ordres peuvent encore arriver ou changer
          {snapshot.orderDeadline ? ` jusqu'à la date limite (${formatDateFr(snapshot.orderDeadline)})` : " jusqu'à la date limite"}, et
          quelques jours de traitement administratif sont nécessaires.
        </li>
        <li>Une ligne du carnet regroupe plusieurs ordres au même prix.</li>
        <li>Nous supposons qu'une exécution partielle est acceptée.</li>
        <li>À un même prix, les ordres sont servis dans leur ordre d'enregistrement, que nous ne connaissons pas.</li>
        <li>Les comparaisons se font sur les prix nets (hors frais).</li>
      </ul>
    </Note>
  );
}

export function ConfrontationPanel(props: ConfrontationPanelProps) {
  const { estimate } = props;
  return (
    <Section
      id="confrontation"
      step="3"
      title="Prochaine confrontation : estimation"
      intro="Une estimation à partir des ordres visibles aujourd'hui. Le prix réel n'est connu qu'après la confrontation."
    >
      <EstimateStats props={props} />
      <div className="grid grid-2">
        <HowItWorks props={props} />
        <WhoIsServed estimate={estimate} />
      </div>
      <Card title="Offre et demande selon le prix">
        <SupplyDemandChart curve={estimate.curve} price={estimate.price} />
        <p className="chart-caption">
          Demande : parts que les acheteurs veulent à ce prix ou moins cher. Offre : parts que les vendeurs proposent à ce prix
          ou plus cher.
        </p>
        <CurveTable curve={estimate.curve} price={estimate.price} />
      </Card>
      <OrderSimulator props={props} />
      <Limits props={props} />
    </Section>
  );
}
