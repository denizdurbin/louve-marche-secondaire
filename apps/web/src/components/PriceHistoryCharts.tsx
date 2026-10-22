import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateFr, formatEur, formatInt } from '@louve/core';
import type { PricePoint } from '@louve/core';
import { axisProps, chart } from './chartTheme';
import { Card } from './ui';

const shortDate = (iso: string): string => formatDateFr(iso).slice(0, 5);

const tooltipStyle = {
  border: `1px solid ${chart.grid}`,
  borderRadius: 8,
  background: chart.surface,
  color: chart.textPrimary,
  fontSize: chart.font,
} as const;

interface ChartCardProps {
  title: string;
  summary: string;
  children: ReactNode;
  columnLabel: string;
  rows: { date: string; value: string }[];
}

/** A titled chart with a text summary for screen readers and a table of the same data. */
function ChartCard({ title, summary, children, columnLabel, rows }: ChartCardProps) {
  return (
    <Card title={title}>
      <div className="mo-chart" role="img" aria-label={summary}>
        {children}
      </div>
      <details className="mo-details">
        <summary>Voir les données</summary>
        <table>
          <caption className="muted small">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Confrontation du</th>
              <th scope="col">{columnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <th scope="row" style={{ fontWeight: 400, color: 'inherit', fontSize: 'inherit' }}>
                  {formatDateFr(r.date)}
                </th>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

/** Two stacked charts sharing the same chronological x-axis: execution price, then volume. */
export function PriceHistoryCharts({ history }: { history: PricePoint[] }) {
  if (history.length === 0) return <p className="muted">Aucun historique de confrontation disponible.</p>;

  // The source lists the most recent confrontation first; charts read oldest to newest.
  const data = [...history].reverse();
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const prices = data.map((p) => p.executionPrice);
  const volumes = data.map((p) => p.sharesTraded);

  const priceSummary =
    `Prix d'exécution net vendeur : ${formatEur(first.executionPrice)} le ${formatDateFr(first.date)}, ` +
    `${formatEur(last.executionPrice)} le ${formatDateFr(last.date)}. ` +
    `Plus bas ${formatEur(Math.min(...prices))}, plus haut ${formatEur(Math.max(...prices))}.`;
  const volumeSummary =
    `Parts échangées par confrontation : ${formatInt(last.sharesTraded)} le ${formatDateFr(last.date)}. ` +
    `Plus bas ${formatInt(Math.min(...volumes))}, plus haut ${formatInt(Math.max(...volumes))}.`;

  const margin = { top: 12, right: 16, bottom: 0, left: 0 };
  const xAxis = (
    <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} interval="preserveStartEnd" minTickGap={16} />
  );
  const grid = <CartesianGrid vertical={false} stroke={chart.grid} />;

  return (
    <div className="mo-chart-stack">
      <ChartCard
        title="Prix d'exécution (net vendeur)"
        summary={priceSummary}
        columnLabel="Prix net vendeur"
        rows={data.map((p) => ({ date: p.date, value: formatEur(p.executionPrice) }))}
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={margin}>
            {grid}
            {xAxis}
            <YAxis
              {...axisProps}
              width={64}
              domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
              tickFormatter={(v: number) => formatEur(v, 0)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `Confrontation du ${formatDateFr(String(label))}`}
              formatter={(value) => [formatEur(Number(value)), 'Prix net vendeur']}
            />
            <Line
              type="monotone"
              dataKey="executionPrice"
              stroke={chart.series1}
              strokeWidth={2}
              dot={{ r: 4, fill: chart.series1, stroke: chart.surface, strokeWidth: 1 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Parts échangées"
        summary={volumeSummary}
        columnLabel="Parts échangées"
        rows={data.map((p) => ({ date: p.date, value: formatInt(p.sharesTraded) }))}
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={margin}>
            {grid}
            {xAxis}
            <YAxis {...axisProps} width={64} tickFormatter={(v: number) => formatInt(v)} />
            <Tooltip
              cursor={{ fill: chart.grid, opacity: 0.5 }}
              contentStyle={tooltipStyle}
              labelFormatter={(label) => `Confrontation du ${formatDateFr(String(label))}`}
              formatter={(value) => [formatInt(Number(value)), 'Parts échangées']}
            />
            <Bar
              dataKey="sharesTraded"
              fill={chart.series1}
              barSize={14}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
