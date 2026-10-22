import type { PurchaseEmailFlowProps } from './props';
import { Section } from './ui';

export function PurchaseEmailFlow(_props: PurchaseEmailFlowProps) {
  return (
    <Section id="achat" step="4" title="Préparer l'achat">
      <p className="muted">À venir.</p>
    </Section>
  );
}
