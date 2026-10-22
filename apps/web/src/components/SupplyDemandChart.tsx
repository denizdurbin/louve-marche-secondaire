import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatEur, formatInt } from '@louve/core';
import type { CurvePoint } from '@louve/core';
import { axisProps, chart, legendProps } from './chartTheme';
import './Panels.css';

interface LabelPointProps {
  x?: number | string;
  y?: number | string;
  index?: number;
}

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

export function SupplyDemandChart({ curve, price }: { curve: CurvePoint[]; price: number | null }) {
  if (curve.length === 0) {
    return <p className="chart-empty">Aucun ordre visible : pas de courbe à afficher.</p>;
  }
  const first = curve[0];
  const last = curve[curve.length - 1];
  const lo = Math.floor((first?.price ?? 0) - 1);
  const hi = Math.ceil((last?.price ?? 0) + 1);
  const summary =
    price !== null
      ? `Courbes de la demande (acheteurs) et de l'offre (vendeurs) selon le prix, de ${formatEur(first?.price ?? 0)} à ${formatEur(last?.price ?? 0)}. Elles se croisent au prix estimé de ${formatEur(price)}.`
      : `Courbes de la demande (acheteurs) et de l'offre (vendeurs) selon le prix : aucun prix ne permet d'échange.`;
  return (
    <div className="chart-box" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={curve} margin={{ top: 28, right: 90, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis {...axisProps} type="number" dataKey="price" domain={[lo, hi]} tickFormatter={(v: number) => formatEur(v, 0)} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatInt(v)} />
          <Tooltip
            labelFormatter={(label) => `Prix limite : ${formatEur(Number(label))}`}
            formatter={(value, name) => [typeof value === 'number' ? `${formatInt(value)} parts` : String(value ?? ''), name]}
          />
          <Legend {...legendProps} formatter={(value: string) => <span style={{ color: chart.textSecondary }}>{value}</span>} />
          {price !== null && (
            <ReferenceLine
              x={price}
              stroke={chart.reference}
              strokeDasharray="4 3"
              label={{ value: `Prix estimé ${formatEur(price)}`, position: 'insideTopLeft', fill: chart.textSecondary, fontSize: chart.font, dy: -20, offset: 4 }}
            />
          )}
          <Line
            type="stepBefore"
            dataKey="demand"
            name="Demande (acheteurs)"
            stroke={chart.series1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            label={endLabel('Demande', curve.length - 1, 0)}
          />
          <Line
            type="stepAfter"
            dataKey="supply"
            name="Offre (vendeurs)"
            stroke={chart.series2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            label={endLabel('Offre', curve.length - 1, 0)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Full curve as an accessible table; the row of the chosen price is highlighted. */
export function CurveTable({ curve, price }: { curve: CurvePoint[]; price: number | null }) {
  return (
    <details className="curve-details">
      <summary>Voir la courbe complète en tableau</summary>
      <div className="table-scroll">
        <table>
          <caption>Offre et demande cumulées à chaque prix limite (parts)</caption>
          <thead>
            <tr>
              <th scope="col">Prix (hors frais)</th>
              <th scope="col">Demande</th>
              <th scope="col">Offre</th>
              <th scope="col">Parts échangeables</th>
              <th scope="col">Parts non échangées</th>
            </tr>
          </thead>
          <tbody>
            {curve.map((c) => {
              const chosen = price !== null && c.price === price;
              return (
                <tr key={c.price} className={chosen ? 'row-highlight' : undefined} aria-current={chosen ? 'true' : undefined}>
                  <th scope="row">
                    {formatEur(c.price)}
                    {chosen && ' (retenu)'}
                  </th>
                  <td>{formatInt(c.demand)}</td>
                  <td>{formatInt(c.supply)}</td>
                  <td>{formatInt(c.volume)}</td>
                  <td>{formatInt(c.unmatched)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
