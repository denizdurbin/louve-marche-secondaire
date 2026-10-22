import { useEffect, useRef, useState } from 'react';
import type { MarketSnapshot, PreparedEmail, ScpiInfo } from '@louve/core';
import { buyerPrice, formatDateFr, formatEur, toEml, toMailto } from '@louve/core';
import { Note } from './ui';
import { emlFilename } from './PurchaseEmailForm';

interface StepPreviewProps {
  scpi: ScpiInfo;
  snapshot: MarketSnapshot;
  email: PreparedEmail;
  lastName: string;
  maxPriceNet: number;
  onEdit: (step: 0 | 1) => void;
}

type CopyState = 'idle' | 'done' | 'failed';

function plainText(email: PreparedEmail): string {
  return `Objet : ${email.subject}\n\n${email.body}`;
}

function downloadEml(email: PreparedEmail, filename: string): void {
  const blob = new Blob([toEml(email)], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StepPreview({ scpi, snapshot, email, lastName, maxPriceNet, onEdit }: StepPreviewProps) {
  const [copy, setCopy] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (state: CopyState) => {
    setCopy(state);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy('idle'), 2000);
  };
  const onCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(plainText(email));
      flash('done');
    } catch {
      flash('failed');
    }
  };

  const { orderDeadline } = snapshot;
  const mandateUrl = scpi.fees.sourceUrl;
  return (
    <>
      <div className="pef-email">
        <dl className="pef-headers">
          <dt>À</dt>
          <dd>{email.to}</dd>
          <dt>Objet</dt>
          <dd>{email.subject}</dd>
        </dl>
        <pre className="pef-body" tabIndex={0} aria-label="Corps de l'email">
          {email.body}
        </pre>
      </div>
      <p className="pef-tight small">
        <button type="button" className="pef-link" onClick={() => onEdit(0)}>
          Modifier mes informations
        </button>
        {' · '}
        <button type="button" className="pef-link" onClick={() => onEdit(1)}>
          Modifier mon ordre
        </button>
      </p>
      <div className="actions">
        <button type="button" onClick={() => void onCopy()}>
          {copy === 'done' ? 'Copié ✓' : 'Copier le texte'}
        </button>
        <button type="button" className="secondary" onClick={() => downloadEml(email, emlFilename(scpi.id, lastName))}>
          Télécharger (.eml)
        </button>
        <a className="button secondary" href={toMailto(email)}>
          Ouvrir dans ma messagerie
        </a>
      </div>
      <p className="small pef-tight" role="status">
        {copy === 'done' && 'Texte copié dans le presse-papiers.'}
        {copy === 'failed' && 'Copie impossible : sélectionnez le texte ci-dessus et copiez-le à la main.'}
      </p>
      <Note title="Rien n'a été envoyé">
        <p className="pef-tight">
          Cette application n'envoie aucun email : envoyez-le vous-même depuis votre messagerie. Ensuite :
        </p>
        <ul>
          <li>
            {scpi.managementCompany} vous enverra le{' '}
            {mandateUrl ? (
              <a href={mandateUrl} target="_blank" rel="noreferrer">
                Mandat d'achat officiel (PDF)
              </a>
            ) : (
              "mandat d'achat officiel"
            )}
            .
          </li>
          <li>
            Il demande le prix maximum <strong>frais inclus</strong> :{' '}
            <strong>{formatEur(buyerPrice(maxPriceNet, scpi.fees))} par part</strong>.
          </li>
          <li>
            Retournez-le par courrier avec vos pièces d'identité et les fonds
            {orderDeadline ? (
              <>
                {' '}
                avant le <strong>{formatDateFr(orderDeadline)}</strong>
              </>
            ) : (
              ' avant la date limite des ordres'
            )}
            .
          </li>
        </ul>
      </Note>
    </>
  );
}
