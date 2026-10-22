import type { ConfrontationPanelProps } from './props';
import { Section } from './ui';

export function ConfrontationPanel(_props: ConfrontationPanelProps) {
  return (
    <Section id="confrontation" step="3" title="Prochaine confrontation (estimation)">
      <p className="muted">À venir.</p>
    </Section>
  );
}
