import { formatDateFr, formatEur, formatInt, formatPct } from '@louve/core';
import type { DatedValue, ManualFact, MarketSnapshot, ScpiInfo } from '@louve/core';
import type { MarketOverviewProps } from './props';
import { Card, Note, Section, Source, Stat } from './ui';
import { PriceHistoryCharts } from './PriceHistoryCharts';
import { OrderBookTable } from './OrderBookTable';
import './MarketOverview.css';

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const dash = '—';

/** "+12,3 %" / "−29,2 %" (typographic minus). */
function formatSignedPct(ratio: number, digits = 1): string {
  const text = formatPct(Math.abs(ratio), digits);
  if (ratio > 0) return `+${text}`;
  return ratio < 0 ? `−${text}` : text;
}

const frNumber = (n: number, digits: number): string =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    .format(n)
    .replace(/[\u202F\u00A0]/g, ' ');

/** Whole calendar days from today (Paris) to a Paris-local ISO date. */
function daysUntil(iso: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!t) return null;
  const utc = (y: string, mo: string, d: string) => Date.UTC(Number(y), Number(mo) - 1, Number(d));
  return Math.round((utc(m[1]!, m[2]!, m[3]!) - utc(t[1]!, t[2]!, t[3]!)) / 86_400_000);
}

function daysLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return 'date dépassée';
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  return `dans ${days} jours`;
}

function formatFact(f: ManualFact): string {
  switch (f.unit) {
    case 'eur':
      return formatEur(f.value);
    case 'ratio':
      return formatPct(f.value);
    case 'shares':
      return formatInt(f.value);
  }
}

function MarketStats({ scpi, snapshot }: { scpi: ScpiInfo; snapshot: MarketSnapshot }) {
  const { history, orderBook, realisationValue, lastExecutionPrice, lastBuyerPrice } = snapshot;
  const now = new Date();

  const latest = history[0];
  const oldest = history[history.length - 1];
  const avgVolume = history.length > 0 ? sum(history.map((p) => p.sharesTraded)) / history.length : null;
  const evolution = oldest && history.length > 1 ? lastExecutionPrice / oldest.executionPrice - 1 : null;
  const discount = realisationValue && realisationValue.value > 0 ? 1 - lastExecutionPrice / realisationValue.value : null;

  const awaiting = scpi.facts?.find((f) => f.key === 'sharesAwaitingSale');
  const monthsToSell = awaiting && avgVolume ? awaiting.value / avgVolume : null;

  const offered = sum(orderBook.asks.map((a) => a.shares));
  const demanded = sum(orderBook.bids.map((b) => b.shares));
  const bookEmpty = orderBook.asks.length === 0 && orderBook.bids.length === 0;

  const nextDays = snapshot.orderDeadline ? daysUntil(snapshot.orderDeadline, now) : null;

  return (
    <div className="grid grid-stats">
      <Stat
        label="Évolution depuis la 1re confrontation"
        value={evolution === null ? dash : formatSignedPct(evolution)}
        caption={
          oldest && evolution !== null
            ? `${formatEur(oldest.executionPrice)} (${formatDateFr(oldest.date)}) → ${formatEur(lastExecutionPrice)}`
            : "Pas assez d'historique"
        }
      />
      <Stat
        label="Décote vs valeur de réalisation"
        value={discount === null ? dash : formatPct(discount, 1)}
        caption={
          realisationValue
            ? `valeur de réalisation ${formatEur(realisationValue.value)}${realisationValue.asOf ? ` au ${realisationValue.asOf}` : ''}`
            : 'valeur de réalisation non publiée'
        }
      />
      <Stat
        label="Parts échangées à la dernière confrontation"
        value={latest ? formatInt(latest.sharesTraded) : dash}
        caption={avgVolume !== null ? `moyenne de l'historique : ${formatInt(avgVolume)} parts par mois` : undefined}
      />
      {awaiting && (
        <Stat
          label="Liquidité : temps pour tout revendre"
          value={monthsToSell === null ? dash : `≈ ${formatInt(monthsToSell)} mois`}
          caption={
            <>
              {formatInt(awaiting.value)} parts en attente de vente au {formatDateFr(awaiting.asOf)} ({awaiting.source}).
              {monthsToSell !== null && " Soit autant de mois d'échanges au rythme moyen."}
            </>
          }
        />
      )}
      <Stat
        label="Parts à vendre pour 1 demandée (carnet visible)"
        value={
          bookEmpty ? dash : demanded > 0 ? frNumber(offered / demanded, 1) : 'Aucune demande'
        }
        caption={bookEmpty ? 'aucun ordre visible' : `${formatInt(offered)} parts à vendre · ${formatInt(demanded)} demandées`}
      />
    </div>
  );
}

function ContextRow({ label, value, asOf, sourceLabel, href }: {
  label: string;
  value: string;
  asOf?: string | null;
  sourceLabel: string;
  href?: string;
}) {
  return (
    <div className="mo-fact">
      <dt>
        {label}
        {asOf && <span className="muted"> · au {formatDateFr(asOf)}</span>}
      </dt>
      <dd>{value}</dd>
      <Source href={href}>{sourceLabel}</Source>
    </div>
  );
}

function ContextCard({ scpi, snapshot }: { scpi: ScpiInfo; snapshot: MarketSnapshot }) {
  const official = `site officiel ${scpi.managementCompany}`;
  const dated = (label: string, d: DatedValue | null, format: (v: number) => string) =>
    d && (
      <ContextRow label={label} value={format(d.value)} asOf={d.asOf} sourceLabel={official} href={scpi.sourceUrl} />
    );

  return (
    <Card title="Contexte">
      <dl className="mo-facts">
        {(scpi.facts ?? []).map((f) => (
          <ContextRow
            key={f.key}
            label={f.label}
            value={formatFact(f)}
            asOf={f.asOf}
            sourceLabel={f.source}
            href={f.sourceUrl ?? scpi.sourceUrl}
          />
        ))}
        {dated('Taux de distribution', snapshot.distributionRate, (v) => formatPct(v))}
        {dated('Capitalisation', snapshot.capitalisation, (v) => formatEur(v, 0))}
      </dl>
    </Card>
  );
}

export function MarketOverview({ scpi, snapshot, estimate }: MarketOverviewProps) {
  const discount = snapshot.realisationValue ? 1 - snapshot.lastExecutionPrice / snapshot.realisationValue.value : null;

  return (
    <Section
      id="marche"
      step="1"
      title="Analyser le marché"
      intro={
        <>
          Depuis janvier 2026, les parts de la SCPI {scpi.name} ne s'échangent plus qu'une fois par mois, lors d'une
          « confrontation » : tous les ordres sont réunis et un seul prix est fixé. Voici où en est le marché.
        </>
      }
    >
      <MarketStats scpi={scpi} snapshot={snapshot} />

      {discount !== null && discount > 0 && (
        <Note title="Une décote n'est pas forcément une bonne affaire">
          La valeur de réalisation est une estimation faite par des experts, pas un prix que l'on peut obtenir à coup
          sûr. Quand les valeurs d'immeubles baissent, elle peut être revue à la baisse, et la décote s'amenuiser
          d'autant.
        </Note>
      )}

      <PriceHistoryCharts history={snapshot.history} />

      <h3 className="card-title">Carnet d'ordres visible</h3>
      <OrderBookTable book={snapshot.orderBook} fees={scpi.fees} estimate={estimate} />

      <ContextCard scpi={scpi} snapshot={snapshot} />

      <Note tone="warning" title="À garder en tête">
        <ul>
          <li>Le capital investi et les revenus ne sont pas garantis : vous pouvez perdre de l'argent.</li>
          <li>La liquidité n'est pas garantie : il peut être long, voire impossible, de revendre vos parts.</li>
          <li>Durée de placement recommandée : 10 ans minimum (mandat officiel).</li>
          <li>Les performances passées ne préjugent pas des performances futures.</li>
        </ul>
      </Note>
    </Section>
  );
}
