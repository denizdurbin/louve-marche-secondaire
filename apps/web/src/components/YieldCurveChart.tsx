import { useId, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatEur, formatPct, yieldCurve, yieldWithFixedFees } from '@louve/core';
import type { FeeSchedule } from '@louve/core';
import { axisProps, chart } from './chartTheme';
import { Card } from './ui';
import { NumberField } from './NumberField';
import './Panels.css';

const POINTS = 31;
const DEFAULT_FROM = 15;
const DEFAULT_TO = 45;

interface LabelPointProps {
  x?: number | string;
  y?: number | string;
  index?: number;
}

/** Direct label drawn after the last point of a line, in neutral text colour. */
function endLabel(text: string, last: number, dy: number) {
  return function EndLabel({ x, y, index }: LabelPointProps) {
    if (index !== last || typeof x !== 'number' || typeof y !== 'number') return <g />;
    return (
      <text x={x + 6} y={y + dy} fill={chart.textSecondary} fontSize={chart.font} dominantBaseline="middle">
        {text}
      </text>
    );
  };
}

interface Ref {
  price: number;
  label: string;
}

/** Merge reference marks that sit at the same price so their labels do not overlap. */
function groupRefs(refs: Ref[]): Ref[] {
  const sorted = [...refs].sort((a, b) => a.price - b.price);
  const out: Ref[] = [];
  for (const r of sorted) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.price - r.price) < 0.005) out[out.length - 1] = { price: prev.price, label: `${prev.label} = ${r.label.toLowerCase()}` };
    else out.push(r);
  }
  return out;
}

export interface YieldCurveChartProps {
  dividendPerShare: number;
  fees: FeeSchedule;
  /** Number of shares used for the "frais fixes inclus" series. */
  shares: number;
  lastPrice: number;
  estimatePrice: number | null;
  orderPrice: number;
}

export function YieldCurveChart(props: YieldCurveChartProps) {
  const { dividendPerShare, fees, shares, lastPrice, estimatePrice, orderPrice } = props;
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const rangeValid = from > 0 && to > from;

  const data = useMemo(() => {
    if (!rangeValid) return [];
    return yieldCurve(dividendPerShare, fees, { from, to, points: POINTS }).map((p) => ({
      price: p.price,
      yield: p.yield,
      yieldFixed: yieldWithFixedFees(dividendPerShare, p.price, shares, fees),
    }));
  }, [dividendPerShare, fees, from, to, shares, rangeValid]);

  const refs = groupRefs(
    [
      { price: lastPrice, label: 'Dernier prix' },
      ...(estimatePrice !== null ? [{ price: estimatePrice, label: 'Prix estimé' }] : []),
      { price: orderPrice, label: 'Votre prix' },
    ]
      .filter((r) => rangeValid && r.price >= from && r.price <= to)
      .map((r) => ({ ...r, label: `${r.label} ${formatEur(r.price)}` })),
  );

  const fixedName = `Avec frais fixes (${shares} part${shares > 1 ? 's' : ''})`;
  const summary = rangeValid
    ? `Courbe du rendement frais inclus selon le prix d'exécution, de ${formatEur(from)} à ${formatEur(to)} : ${formatPct(data[data.length - 1]?.yield ?? 0)} à ${formatEur(to)} et ${formatPct(data[0]?.yield ?? 0)} à ${formatEur(from)}.`
    : 'Courbe indisponible : plage de prix invalide.';

  return (
    <Card title="Rendement selon le prix d'exécution">
      <div className="form-row">
        <NumberField
          label="Prix de départ (€, hors frais)"
          value={from}
          isValid={(n) => n > 0}
          onValidChange={setFrom}
          errorText="Entrez un prix supérieur à 0."
          min={0}
        />
        <NumberField
          label="Prix d'arrivée (€, hors frais)"
          value={to}
          isValid={(n) => n > 0}
          onValidChange={setTo}
          errorText="Entrez un prix supérieur à 0."
          min={0}
        />
      </div>
      {!rangeValid ? (
        <p className="field-error" role="alert">
          La plage est invalide : le prix de départ doit être supérieur à 0 et inférieur au prix d'arrivée.
        </p>
      ) : (
        <div className="chart-box" role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 44, right: 120, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis
                {...axisProps}
                type="number"
                dataKey="price"
                domain={[from, to]}
                tickFormatter={(v: number) => formatEur(v, 0)}
              />
              <YAxis {...axisProps} width={56} domain={[0, 'auto']} tickFormatter={(v: number) => formatPct(v, 0)} />
              <Tooltip
                labelFormatter={(label) => `Prix d'exécution : ${formatEur(Number(label))}`}
                formatter={(value) => (typeof value === 'number' ? formatPct(value) : String(value ?? ''))}
              />
              <Legend formatter={(value: string) => <span style={{ color: chart.textSecondary }}>{value}</span>} />
              {refs.map((r, i) => (
                <ReferenceLine
                  key={r.label}
                  x={r.price}
                  stroke={chart.reference}
                  strokeDasharray="4 3"
                  label={{ value: r.label, position: 'insideTopLeft', fill: chart.textSecondary, fontSize: chart.font, dy: -36 + i * 13, offset: 4 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="yield"
                name="Frais variables inclus"
                stroke={chart.series1}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                label={endLabel('Frais variables', data.length - 1, -10)}
              />
              <Line
                type="monotone"
                dataKey="yieldFixed"
                name={fixedName}
                stroke={chart.series2}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                label={endLabel('Avec frais fixes', data.length - 1, 10)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="chart-caption">
        Le rendement est inversement proportionnel au prix : plus le prix d'exécution baisse, plus le rendement
        monte. Les frais fixes pèsent davantage quand le nombre de parts est faible.
      </p>
    </Card>
  );
}
