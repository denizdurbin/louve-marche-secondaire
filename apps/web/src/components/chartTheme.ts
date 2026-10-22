// Chart colours (light mode), from the dataviz reference palette. Text never uses series colours.
export const chart = {
  surface: '#fcfcfb',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  grid: '#e4e3df',
  axis: '#a3a29c',
  /** Slot 1, blue: price, demand (buyers), yield. */
  series1: '#2a78d6',
  /** Slot 2, orange: supply (sellers), volume. */
  series2: '#eb6834',
  /** Neutral reference marks (last price, estimate). */
  reference: '#52514e',
  font: 12,
} as const;

export const axisProps = {
  stroke: chart.axis,
  tick: { fill: chart.textSecondary, fontSize: chart.font },
  tickLine: false,
} as const;

export const legendProps = {
  iconType: 'plainline',
  iconSize: 14,
  wrapperStyle: { fontSize: chart.font, paddingTop: 8 },
} as const;
