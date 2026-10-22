import { buyerPrice, formatDateFr, formatEur, formatInt, formatPct, purchaseCost, variableFeeRate, yieldFeesIncluded, yieldWithFixedFees } from '@louve/core';
import type { ManualFact } from '@louve/core';
import type { YieldPanelProps } from './props';
import { Card, Note, Section, Source, Stat } from './ui';
import { NumberField } from './NumberField';
import { YieldCurveChart } from './YieldCurveChart';
import './Panels.css';

type Dividend = NonNullable<YieldPanelProps['dividend']>;

/** The interim dividend fact covers the first two quarters (T1 + T2), so the annual pace is twice its value. */
const INTERIM_QUARTERS_COVERED = 2;
const QUARTERS_PER_YEAR = 4;
const INTERIM_FACT_KEY = 'interimDividends2026';

function ratioText(r: number): string {
  return r.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
}

function Headline({ props, dividend }: { props: YieldPanelProps; dividend: Dividend }) {
  const { scpi, snapshot } = props;
  const { record } = dividend;
  const last = snapshot.lastExecutionPrice;
  const gross = buyerPrice(last, scpi.fees);
  return (
    <div className="grid grid-2">
      <Card>
        <Stat
          emphasis
          label="Rendement frais inclus (au dernier prix)"
          value={formatPct(yieldFeesIncluded(record.grossPerShare, last, scpi.fees))}
          caption={`Dividende ${record.year}, dernier prix d'exécution ${formatEur(last)}`}
        />
        {!dividend.isPreviousYear && (
          <Note tone="warning" title="Dividende plus ancien">
            Le dividende de l'année précédente n'est pas encore renseigné : le calcul utilise celui de {record.year}.
          </Note>
        )}
      </Card>
      <Card title="Comment c'est calculé">
        <p className="calc-line">
          {formatEur(record.grossPerShare)} ÷ ({formatEur(last)} × {ratioText(1 + variableFeeRate(scpi.fees))} ={' '}
          {formatEur(gross)}) = <span className="calc-result">{formatPct(yieldFeesIncluded(record.grossPerShare, last, scpi.fees))}</span>
        </p>
        <p className="small muted">
          Dividende brut par part de {record.year} ÷ prix payé par l'acheteur (prix d'exécution + commission de cession{' '}
          {formatPct(scpi.fees.cessionCommissionTtc)} + droits d'enregistrement {formatPct(scpi.fees.registrationDuty)}). Les frais
          fixes de {formatEur(scpi.fees.fixedFeesEur)} par dossier ne sont pas comptés ici.
        </p>
        <Source href={record.sourceUrl}>
          dividende {record.year} : {record.source}
        </Source>
      </Card>
    </div>
  );
}

function MissingDividend() {
  return (
    <Note tone="warning" title="Dividende indisponible">
      Aucun dividende par part n'est renseigné pour cette SCPI : le rendement ne peut pas être calculé pour l'instant.
    </Note>
  );
}

function InterimPace({ fact, last, props }: { fact: ManualFact; last: number; props: YieldPanelProps }) {
  const pace = (fact.value * QUARTERS_PER_YEAR) / INTERIM_QUARTERS_COVERED;
  return (
    <li>
      {fact.label} : {formatEur(fact.value)} (au {fact.asOf}). Au même rythme sur l'année, cela ferait environ{' '}
      {formatEur(pace)} par part, soit {formatPct(yieldFeesIncluded(pace, last, props.scpi.fees))} au prix actuel. C'est une
      simple extrapolation, pas une prévision.
    </li>
  );
}

function ReadFirst({ props }: { props: YieldPanelProps }) {
  const fact = props.scpi.facts?.find((f) => f.key === INTERIM_FACT_KEY);
  const last = props.snapshot.lastExecutionPrice;
  const oldest = props.snapshot.history[props.snapshot.history.length - 1];
  const priceTrend =
    oldest && oldest.executionPrice > last
      ? `Le prix a baissé de ${formatPct(1 - last / oldest.executionPrice, 0)} depuis le ${formatDateFr(oldest.date)} (${formatEur(oldest.executionPrice)} à ${formatEur(last)}) : un rendement élevé peut refléter un prix bas plutôt qu'un bon signal.`
      : "Le prix varie d'une confrontation à l'autre : le rendement d'aujourd'hui peut ne plus être celui de demain.";
  return (
    <Note tone="warning" title="À lire avant de vous fier à ce chiffre">
      <ul>
        <li>Ce rendement regarde en arrière : il repose sur le dividende de l'an dernier, qui peut ne pas se répéter.</li>
        {fact && <InterimPace fact={fact} last={last} props={props} />}
        <li>{priceTrend}</li>
        <li>La revente peut prendre du temps : il faut qu'un acheteur se présente lors d'une confrontation.</li>
      </ul>
    </Note>
  );
}

function CostTable(props: { cost: ReturnType<typeof purchaseCost>; props: YieldPanelProps }) {
  const { cost } = props;
  const fees = props.props.scpi.fees;
  return (
    <table className="cost-table">
      <caption className="muted small" style={{ textAlign: 'left', paddingBottom: 6 }}>
        Coût de l'achat
      </caption>
      <tbody>
        <tr>
          <th scope="row">Montant hors frais</th>
          <td>{formatEur(cost.netAmount)}</td>
        </tr>
        <tr>
          <th scope="row">Frais variables ({formatPct(variableFeeRate(fees))})</th>
          <td>{formatEur(cost.variableFees)}</td>
        </tr>
        <tr>
          <th scope="row">Frais fixes (par dossier)</th>
          <td>{formatEur(cost.fixedFees)}</td>
        </tr>
        <tr className="cost-total">
          <th scope="row">Total à payer</th>
          <td>{formatEur(cost.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Simulator({ props, dividend }: { props: YieldPanelProps; dividend: Dividend }) {
  const { scpi, order, onOrderChange } = props;
  const dps = dividend.record.grossPerShare;
  const cost = purchaseCost({ netPrice: order.netPrice, shares: order.shares, fees: scpi.fees, includeFixedFees: true });
  const withFixed = yieldWithFixedFees(dps, order.netPrice, order.shares, scpi.fees);
  const withoutFixed = yieldFeesIncluded(dps, order.netPrice, scpi.fees);
  const small = yieldWithFixedFees(dps, order.netPrice, 10, scpi.fees);
  const large = yieldWithFixedFees(dps, order.netPrice, 1000, scpi.fees);
  return (
    <Card title="Coût et rendement de votre achat">
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
          label="Prix d'acquisition par part (hors frais)"
          value={order.netPrice}
          step="any"
          min={0}
          isValid={(n) => n > 0}
          errorText="Entrez un prix supérieur à 0."
          onValidChange={(netPrice) => onOrderChange({ ...order, netPrice })}
          hint="En euros, avant commission et droits."
        />
      </div>
      <div className="sim-results">
        <CostTable cost={cost} props={props} />
        <div className="grid">
          <Stat
            emphasis
            label="Rendement avec frais fixes"
            value={formatPct(withFixed)}
            caption={`pour ${formatInt(order.shares)} part${order.shares > 1 ? 's' : ''} à ${formatEur(order.netPrice)}`}
          />
          <Stat label="Sans les frais fixes (même prix)" value={formatPct(withoutFixed)} caption="frais variables seulement" />
        </div>
      </div>
      <p className="small">
        Les frais fixes pèsent plus sur les petits ordres : à {formatEur(order.netPrice)} la part, le rendement est de{' '}
        {formatPct(small)} pour 10 parts, contre {formatPct(large)} pour 1 000 parts.
      </p>
      <p className="small muted">
        Calculé comme si vous achetiez à ce prix. Le même ordre sert à la section 3 (serait-il servi, et à quel prix) et à l'email de l'étape 4.
      </p>
    </Card>
  );
}

export function YieldPanel(props: YieldPanelProps) {
  const { dividend, scpi, snapshot, estimate, order } = props;
  return (
    <Section
      id="rendement"
      step="2"
      title="Rendement frais inclus"
      intro="Ce que rapporte une part par rapport à ce que vous payez vraiment pour l'acheter, commission et droits compris."
    >
      {dividend ? <Headline props={props} dividend={dividend} /> : <MissingDividend />}
      <ReadFirst props={props} />
      {dividend && (
        <>
          <Simulator props={props} dividend={dividend} />
          <YieldCurveChart
            dividendPerShare={dividend.record.grossPerShare}
            fees={scpi.fees}
            shares={order.shares}
            lastPrice={snapshot.lastExecutionPrice}
            estimatePrice={estimate.price}
            orderPrice={order.netPrice}
          />
        </>
      )}
      <Source href={scpi.fees.sourceUrl}>frais : {scpi.fees.source}</Source>
    </Section>
  );
}
