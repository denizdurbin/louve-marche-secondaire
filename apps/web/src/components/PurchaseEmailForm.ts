import type { PurchaseRequest, PurchaseRequestErrors } from '@louve/core';

/** Raw form values: numbers stay strings so "32," or an empty field can be typed freely. */
export interface PurchaseFormState {
  firstName: string;
  lastName: string;
  /** '' = not answered yet. */
  associate: '' | 'yes' | 'no';
  associateNumber: string;
  shares: string;
  maxPrice: string;
  validUntil: string;
  acceptPartial: boolean;
}

export type StepIndex = 0 | 1 | 2;

export const STEP_LABELS = ['Vous', 'Votre ordre', 'Votre email'] as const;

/** Which validation keys belong to which input step. */
export const STEP_FIELDS: Record<0 | 1, readonly (keyof PurchaseRequest)[]> = {
  0: ['firstName', 'lastName', 'isAssociate', 'associateNumber'],
  1: ['shares', 'maxPriceNet', 'validUntil'],
};

export const UNANSWERED_ASSOCIATE = 'Indiquez si vous êtes déjà associé(e).';

/** French-tolerant number parsing: "32,5", "32.5", "1 200". Returns NaN when not a plain number. */
export function parseNumber(raw: string): number {
  const s = raw.replace(/\s/g, '').replace(',', '.');
  return /^\d+(\.\d*)?$/.test(s) ? Number(s) : Number.NaN;
}

export function numberToInput(n: number): string {
  return String(n).replace('.', ',');
}

export function toRequest(form: PurchaseFormState): PurchaseRequest {
  const isAssociate = form.associate === 'yes';
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    isAssociate,
    associateNumber: isAssociate ? form.associateNumber : undefined,
    shares: parseNumber(form.shares),
    maxPriceNet: parseNumber(form.maxPrice),
    validUntil: form.validUntil || undefined,
    acceptPartial: form.acceptPartial,
  };
}

/** Errors for one step only (validatePurchaseRequest reports every field). */
export function pickStepErrors(
  all: PurchaseRequestErrors,
  step: 0 | 1,
  form: PurchaseFormState,
): PurchaseRequestErrors {
  const picked: PurchaseRequestErrors = {};
  for (const key of STEP_FIELDS[step]) {
    const message = all[key];
    if (message) picked[key] = message;
  }
  if (step === 0 && form.associate === '') picked.isAssociate = UNANSWERED_ASSOCIATE;
  return picked;
}

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Same bounds as validatePurchaseRequest: strictly after today, at most 6 months ahead. */
export function validityBounds(today: Date): { min: string; max: string } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const min = new Date(start);
  min.setDate(min.getDate() + 1);
  const max = new Date(start);
  max.setMonth(max.getMonth() + 6);
  return { min: isoLocal(min), max: isoLocal(max) };
}

export function emlFilename(scpiId: string, lastName: string): string {
  const slug = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `achat-${scpiId}-${slug || 'client'}.eml`;
}
