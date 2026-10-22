import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { buildPurchaseEmail, validatePurchaseRequest } from '@louve/core';
import type { PurchaseRequestErrors } from '@louve/core';
import type { PurchaseEmailFlowProps } from './props';
import { Card, Note, Section } from './ui';
import { StepYou } from './PurchaseEmailFields';
import { StepOrder } from './PurchaseEmailOrder';
import { StepPreview } from './PurchaseEmailPreview';
import {
  STEP_LABELS,
  numberToInput,
  parseNumber,
  pickStepErrors,
  toRequest,
  validityBounds,
} from './PurchaseEmailForm';
import type { PurchaseFormState, StepIndex } from './PurchaseEmailForm';
import './PurchaseEmailFlow.css';

type FieldErrors = PurchaseRequestErrors;

export function PurchaseEmailFlow({ scpi, snapshot, estimate, order, onOrderChange }: PurchaseEmailFlowProps) {
  const uid = useId();
  const [step, setStep] = useState<StepIndex>(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState<PurchaseFormState>(() => ({
    firstName: '',
    lastName: '',
    associate: '',
    associateNumber: '',
    shares: String(order.shares),
    maxPrice: numberToInput(order.netPrice),
    validUntil: '',
    acceptPartial: true,
  }));
  const bounds = useMemo(() => validityBounds(new Date()), []);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  // The yield simulator edits the same order: follow it unless our text already means the same number.
  useEffect(() => {
    setForm((f) => {
      const shares = parseNumber(f.shares) === order.shares ? f.shares : String(order.shares);
      const maxPrice = parseNumber(f.maxPrice) === order.netPrice ? f.maxPrice : numberToInput(order.netPrice);
      return shares === f.shares && maxPrice === f.maxPrice ? f : { ...f, shares, maxPrice };
    });
  }, [order.shares, order.netPrice]);

  // Keyboard users: land on the step title after navigating, or on the first invalid field.
  // Move focus to the new step's title only when the user changes step (not on mount, which would scroll the page).
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (attempt === 0) return;
    document.querySelector<HTMLElement>(`[id^="${CSS.escape(uid)}"][aria-invalid="true"]`)?.focus();
  }, [attempt, uid]);

  const update = (patch: Partial<PurchaseFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      if ('firstName' in patch) delete next.firstName;
      if ('lastName' in patch) delete next.lastName;
      if ('associate' in patch) {
        delete next.isAssociate;
        delete next.associateNumber;
      }
      if ('associateNumber' in patch) delete next.associateNumber;
      if ('shares' in patch) delete next.shares;
      if ('maxPrice' in patch) delete next.maxPriceNet;
      if ('validUntil' in patch) delete next.validUntil;
      return next;
    });
    if (patch.shares !== undefined) {
      const n = parseNumber(patch.shares);
      if (Number.isInteger(n) && n >= 1 && n !== order.shares) onOrderChange({ ...order, shares: n });
    }
    if (patch.maxPrice !== undefined) {
      const n = parseNumber(patch.maxPrice);
      if (Number.isFinite(n) && n > 0 && n !== order.netPrice) onOrderChange({ ...order, netPrice: n });
    }
  };

  const goTo = (target: StepIndex) => {
    setErrors({});
    setStep(target);
  };
  const next = (e: FormEvent) => {
    e.preventDefault();
    if (step === 2) return;
    const found = pickStepErrors(validatePurchaseRequest(toRequest(form), new Date()), step, form);
    setErrors(found);
    if (Object.keys(found).length > 0) setAttempt((a) => a + 1);
    else goTo((step + 1) as StepIndex);
  };

  return (
    <Section
      id="achat"
      step="4"
      title="Préparer l'achat"
      intro={`Préparez en 3 étapes l'email à destination de ${scpi.managementCompany}. Rien n'est envoyé depuis cette page.`}
    >
      <Stepper current={step} />
      <Card>
        <h3 className="card-title" tabIndex={-1} ref={heading}>
          Étape {step + 1} sur 3 : {STEP_LABELS[step]}
        </h3>
        {step === 2 ? (
          <FinalStep form={form} scpi={scpi} snapshot={snapshot} onEdit={goTo} onBack={() => goTo(1)} />
        ) : (
          <form className="pef-form" noValidate onSubmit={next}>
            {step === 0 ? (
              <StepYou uid={uid} scpi={scpi} form={form} errors={errors} onChange={update} />
            ) : (
              <StepOrder
                uid={uid}
                scpi={scpi}
                snapshot={snapshot}
                estimate={estimate}
                form={form}
                errors={errors}
                bounds={bounds}
                onChange={update}
              />
            )}
            <div className="actions">
              {step > 0 && (
                <button type="button" className="secondary" onClick={() => goTo((step - 1) as StepIndex)}>
                  Retour
                </button>
              )}
              <button type="submit">Continuer</button>
            </div>
          </form>
        )}
      </Card>
    </Section>
  );
}

function Stepper({ current }: { current: StepIndex }) {
  return (
    <ol className="pef-stepper" aria-label="Étapes">
      {STEP_LABELS.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className={i < current ? 'is-done' : i === current ? 'is-current' : undefined}
        >
          <span className="pef-stepper-num" aria-hidden="true">
            {i < current ? '✓' : i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function FinalStep(props: {
  form: PurchaseFormState;
  scpi: PurchaseEmailFlowProps['scpi'];
  snapshot: PurchaseEmailFlowProps['snapshot'];
  onEdit: (step: 0 | 1) => void;
  onBack: () => void;
}) {
  const { scpi, snapshot } = props;
  const request = toRequest(props.form);
  const valid = props.form.associate !== '' && Object.keys(validatePurchaseRequest(request, new Date())).length === 0;
  const email = valid ? buildPurchaseEmail(request, scpi) : null;

  if (!email) {
    return (
      <>
        <Note tone="warning" title="Votre ordre n'est plus valide">
          Une information a changé (par exemple dans le simulateur). Vérifiez vos informations et votre ordre.
        </Note>
        <div className="actions">
          <button type="button" onClick={() => props.onEdit(0)}>
            Modifier mes informations
          </button>
          <button type="button" className="secondary" onClick={() => props.onEdit(1)}>
            Modifier mon ordre
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <StepPreview
        scpi={scpi}
        snapshot={snapshot}
        email={email}
        lastName={request.lastName}
        maxPriceNet={request.maxPriceNet}
        onEdit={props.onEdit}
      />
      <div className="actions">
        <button type="button" className="secondary" onClick={props.onBack}>
          Retour
        </button>
      </div>
    </>
  );
}
