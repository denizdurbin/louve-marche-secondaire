import type { YieldPanelProps } from './props';
import { Section } from './ui';

export function YieldPanel(_props: YieldPanelProps) {
  return (
    <Section id="rendement" step="2" title="Rendement frais inclus">
      <p className="muted">À venir.</p>
    </Section>
  );
}
