// fr-FR formatting. Intl emits narrow no-break spaces (U+202F / U+00A0); we normalise to a plain space.

const normalise = (s: string): string => s.replace(/[\u202F\u00A0]/g, ' ');

export function formatEur(value: number, digits = 2): string {
  return normalise(
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value),
  );
}

/** `ratio` 0.13027 → "13,03 %". */
export function formatPct(ratio: number, digits = 2): string {
  const n = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio * 100);
  return normalise(`${n} %`);
}

export function formatInt(n: number): string {
  return normalise(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n));
}

/** "2026-09-24" → "24/09/2026"; "2026-10-29T16:00" → "29/10/2026 16:00". No timezone conversion. */
export function formatDateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(iso);
  if (!m) return iso;
  const date = `${m[3]}/${m[2]}/${m[1]}`;
  return m[4] ? `${date} ${m[4]}` : date;
}
