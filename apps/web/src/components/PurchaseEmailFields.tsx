import type { ChangeEvent, ReactNode } from 'react';
import type { PurchaseRequestErrors, ScpiInfo } from '@louve/core';
import type { PurchaseFormState } from './PurchaseEmailForm';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  type?: 'text' | 'date';
  inputMode?: 'text' | 'numeric' | 'decimal';
  autoComplete?: string;
  min?: string;
  max?: string;
}

/** Label + input + optional hint and error, wired with aria-describedby. */
export function TextField(props: TextFieldProps) {
  const hintId = `${props.id}-hint`;
  const errorId = `${props.id}-error`;
  const describedBy = [props.hint ? hintId : '', props.error ? errorId : ''].filter(Boolean).join(' ');
  return (
    <div className="pef-field">
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        min={props.min}
        max={props.max}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value)}
      />
      {props.hint && (
        <span id={hintId} className="muted small">
          {props.hint}
        </span>
      )}
      {props.error && (
        <span id={errorId} className="field-error">
          {props.error}
        </span>
      )}
    </div>
  );
}

interface StepYouProps {
  uid: string;
  scpi: ScpiInfo;
  form: PurchaseFormState;
  errors: PurchaseRequestErrors;
  onChange: (patch: Partial<PurchaseFormState>) => void;
}

export function StepYou({ uid, scpi, form, errors, onChange }: StepYouProps) {
  const radioError = errors.isAssociate;
  const radioErrorId = `${uid}-associate-error`;
  const radio = (value: 'yes' | 'no', text: string) => (
    <label className="checkbox">
      <input
        type="radio"
        name={`${uid}-associate`}
        checked={form.associate === value}
        aria-invalid={radioError ? true : undefined}
        aria-describedby={radioError ? radioErrorId : undefined}
        onChange={() => onChange({ associate: value })}
      />
      {text}
    </label>
  );
  return (
    <>
      <div className="form-row">
        <TextField
          id={`${uid}-firstName`}
          label="Prénom"
          value={form.firstName}
          autoComplete="given-name"
          error={errors.firstName}
          onChange={(firstName) => onChange({ firstName })}
        />
        <TextField
          id={`${uid}-lastName`}
          label="Nom"
          value={form.lastName}
          autoComplete="family-name"
          error={errors.lastName}
          onChange={(lastName) => onChange({ lastName })}
        />
      </div>
      <fieldset className="pef-fieldset">
        <legend>Êtes-vous déjà associé(e) de la SCPI {scpi.name} ?</legend>
        <div className="pef-radios">
          {radio('yes', 'Oui')}
          {radio('no', 'Non')}
        </div>
        {radioError && (
          <span id={radioErrorId} className="field-error">
            {radioError}
          </span>
        )}
      </fieldset>
      {form.associate === 'yes' && (
        <div className="form-row">
          <TextField
            id={`${uid}-associateNumber`}
            label="Numéro d'associé"
            value={form.associateNumber}
            error={errors.associateNumber}
            hint="Il figure sur vos relevés et avis de la société de gestion."
            onChange={(associateNumber) => onChange({ associateNumber })}
          />
        </div>
      )}
    </>
  );
}
