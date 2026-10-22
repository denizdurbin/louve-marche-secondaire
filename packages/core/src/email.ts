import { buyerPrice } from './fees';
import { formatDateFr, formatEur, formatInt, formatPct } from './format';
import type { ScpiInfo } from './types';

export interface PurchaseRequest {
  firstName: string;
  lastName: string;
  isAssociate: boolean;
  associateNumber?: string;
  shares: number;
  maxPriceNet: number;
  /** YYYY-MM-DD */
  validUntil?: string;
  acceptPartial: boolean;
}
export interface PreparedEmail {
  to: string;
  subject: string;
  body: string;
}
export type PurchaseRequestErrors = Partial<Record<keyof PurchaseRequest, string>>;

const MAX_VALIDITY_MONTHS = 6;

function parseIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** Empty object = valid. Messages are meant to be shown to the user. */
export function validatePurchaseRequest(req: PurchaseRequest, today: Date): PurchaseRequestErrors {
  const errors: PurchaseRequestErrors = {};

  if (!req.firstName.trim()) errors.firstName = 'Le prénom est obligatoire.';
  if (!req.lastName.trim()) errors.lastName = 'Le nom est obligatoire.';
  if (req.isAssociate && !req.associateNumber?.trim()) {
    errors.associateNumber = "Le numéro d'associé est obligatoire.";
  }
  if (!Number.isInteger(req.shares) || req.shares < 1) {
    errors.shares = 'Le nombre de parts doit être un entier supérieur ou égal à 1.';
  }
  const price = req.maxPriceNet;
  if (!Number.isFinite(price) || price <= 0) {
    errors.maxPriceNet = 'Le prix maximum doit être supérieur à 0.';
  } else if (Math.abs(price * 100 - Math.round(price * 100)) >= 1e-6) {
    errors.maxPriceNet = 'Le prix maximum ne peut pas avoir plus de 2 décimales.';
  }

  if (req.validUntil) {
    const date = parseIsoDate(req.validUntil);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const limit = new Date(start);
    limit.setMonth(limit.getMonth() + MAX_VALIDITY_MONTHS);
    if (!date) errors.validUntil = 'Date de validité invalide.';
    else if (date <= start) errors.validUntil = 'La date de validité doit être postérieure à aujourd’hui.';
    else if (date > limit) {
      errors.validUntil = `La validité du mandat est limitée à ${MAX_VALIDITY_MONTHS} mois.`;
    }
  }
  return errors;
}

export function buildPurchaseEmail(req: PurchaseRequest, scpi: ScpiInfo): PreparedEmail {
  const firstName = req.firstName.trim();
  const lastName = req.lastName.trim();
  const fullName = `${firstName} ${lastName.toUpperCase()}`;
  const { fees } = scpi;

  const grossPerShare = buyerPrice(req.maxPriceNet, fees);
  const maxTotal = grossPerShare * req.shares;
  const status = req.isAssociate
    ? `Associé(e) n° ${req.associateNumber?.trim() ?? ''}`
    : `Pas encore associé(e) de la SCPI ${scpi.name}`;

  const lines = [
    'Madame, Monsieur,',
    '',
    `Je souhaite acquérir des parts de la SCPI ${scpi.name} sur le marché secondaire (confrontation) et vous prie de bien vouloir m'adresser le mandat d'achat correspondant.`,
    '',
    `Nom et prénom : ${fullName}`,
    `Statut : ${status}`,
    `Nombre de parts souhaité : ${formatInt(req.shares)}`,
    `Prix maximum proposé par part, hors frais : ${formatEur(req.maxPriceNet)}`,
    `soit ${formatEur(grossPerShare)} frais inclus : commission de cession ${formatPct(fees.cessionCommissionTtc)} TTC + droits d'enregistrement ${formatPct(fees.registrationDuty)}`,
    `Montant maximum frais inclus : ${formatEur(maxTotal)}`,
  ];
  if (fees.fixedFeesEur > 0) {
    lines.push(`(auquel s'ajoutent des frais fixes de ${formatEur(fees.fixedFeesEur)} par dossier)`);
  }
  lines.push(
    `Durée de validité de l'ordre : ${req.validUntil ? `jusqu'au ${formatDateFr(req.validUntil)}` : 'non précisée'}`,
    `Exécution partielle acceptée : ${req.acceptPartial ? 'oui' : 'non'}`,
    '',
    "Pourriez-vous également m'indiquer la liste des pièces justificatives à joindre au mandat ?",
    '',
    'Je vous remercie par avance et reste à votre disposition.',
    '',
    'Cordialement,',
    fullName,
  );

  return {
    to: scpi.managementCompanyEmail,
    subject: `Projet d'achat de parts SCPI ${scpi.name} – ${firstName} ${lastName.toUpperCase()}`,
    body: lines.join('\n'),
  };
}

/** UTF-8 safe base64 that works in Node and browsers (no Buffer). */
function toBase64Utf8(s: string): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(s)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

const toCrlf = (s: string): string => s.replace(/\r?\n/g, '\r\n');

/** RFC 5322 draft; `X-Unsent: 1` makes mail clients open it as an editable draft. */
export function toEml(email: PreparedEmail): string {
  return [
    `To: ${email.to}`,
    `Subject: =?UTF-8?B?${toBase64Utf8(email.subject)}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Unsent: 1',
    '',
    toCrlf(email.body),
  ].join('\r\n');
}

export function toMailto(email: PreparedEmail): string {
  return `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(toCrlf(email.body))}`;
}
