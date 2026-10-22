import type { ConfrontationEstimate, MarketSnapshot, PurchaseRequestErrors, ScpiInfo } from '@louve/core';
import { buyerPrice, formatDateFr, formatEur, formatInt, purchaseCost } from '@louve/core';
import { Card, Note } from './ui';
import { TextField } from './PurchaseEmailFields';
import { parseNumber, type PurchaseFormState } from './PurchaseEmailForm';

interface StepOrderProps {
  uid: string;
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  estimate: ConfrontationEstimate;
  form: PurchaseFormState;
  errors: PurchaseRequestErrors;
  bounds: { min: string; max: string };
  onChange: (patch: Partial<PurchaseFormState>) => void;
}

export function StepOrder({ uid, scpi, snapshot, estimate, form, errors, bounds, onChange }: StepOrderProps) {
  const shares = parseNumber(form.shares);
  const price = parseNumber(form.maxPrice);
  const validShares = Number.isInteger(shares) && shares >= 1;
  const validPrice = Number.isFinite(price) && price > 0;
  return (
    <>
      <div className="form-row">
        <TextField
          id={`${uid}-shares`}
          label="Nombre de parts souhaité"
          value={form.shares}
          inputMode="numeric"
          error={errors.shares}
          onChange={(v) => onChange({ shares: v })}
        />
        <TextField
          id={`${uid}-maxPrice`}
          label="Prix maximum par part, hors frais (€)"
          value={form.maxPrice}
          inputMode="decimal"
          error={errors.maxPriceNet}
          hint="Le prix que vous acceptez de payer au maximum, avant frais."
          onChange={(v) => onChange({ maxPrice: v })}
        />
      </div>
      <div className="form-row">
        <TextField
          id={`${uid}-validUntil`}
          label="Valable jusqu'au (facultatif)"
          type="date"
          value={form.validUntil}
          min={bounds.min}
          max={bounds.max}
          error={errors.validUntil}
          hint="6 mois maximum."
          onChange={(v) => onChange({ validUntil: v })}
        />
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.acceptPartial}
          onChange={(e) => onChange({ acceptPartial: e.target.checked })}
        />
        J'accepte une exécution partielle
      </label>
      <p className="muted small pef-tight">
        Par défaut, le mandat officiel prévoit l'exécution partielle : seule une partie des parts demandées peut être
        servie.
      </p>
      <OrderSummary scpi={scpi} shares={validShares ? shares : null} price={validPrice ? price : null} />
      <PriceHints estimate={estimate} snapshot={snapshot} price={validPrice ? price : null} />
    </>
  );
}

function OrderSummary(props: { scpi: ScpiInfo; shares: number | null; price: number | null }) {
  const { scpi, shares, price } = props;
  if (shares === null || price === null) {
    return (
      <Card title="Récapitulatif">
        <p className="muted small pef-tight">Renseignez le nombre de parts et le prix maximum pour voir le montant.</p>
      </Card>
    );
  }
  const { fees } = scpi;
  const cost = purchaseCost({ netPrice: price, shares, fees, includeFixedFees: true });
  const maxAmount = cost.netAmount + cost.variableFees;
  return (
    <Card title="Récapitulatif (frais inclus)">
      <dl className="pef-summary">
        <dt>Prix maximum frais inclus, par part</dt>
        <dd>{formatEur(buyerPrice(price, fees))}</dd>
        <dt>Montant maximum frais inclus ({formatInt(shares)} parts)</dt>
        <dd>{formatEur(maxAmount)}</dd>
        {cost.fixedFees > 0 && (
          <>
            <dt>Frais fixes de dossier</dt>
            <dd>+ {formatEur(cost.fixedFees)}</dd>
          </>
        )}
        <dt className="pef-total">Total</dt>
        <dd className="pef-total">{formatEur(cost.total)}</dd>
      </dl>
    </Card>
  );
}

function PriceHints(props: { estimate: ConfrontationEstimate; snapshot: MarketSnapshot; price: number | null }) {
  const { estimate, snapshot, price } = props;
  const { nextConfrontation, orderDeadline } = snapshot;
  return (
    <div className="pef-hints">
      {price !== null && estimate.price !== null && price < estimate.price && (
        <Note tone="warning">
          En dessous du prix estimé de la prochaine confrontation ({formatEur(estimate.price)}) : votre ordre risque de
          ne pas être servi.
        </Note>
      )}
      {price !== null && estimate.price !== null && price >= estimate.price && (
        <Note>
          Si l'ordre est exécuté, vous paierez le prix d'exécution (le même pour tous), pas forcément votre prix
          maximum.
        </Note>
      )}
      {orderDeadline && (
        <p className="muted small pef-tight">
          Date limite des ordres{nextConfrontation && <> pour la confrontation du {formatDateFr(nextConfrontation)}</>} :{' '}
          <strong>{formatDateFr(orderDeadline)}</strong>.
        </p>
      )}
    </div>
  );
}
