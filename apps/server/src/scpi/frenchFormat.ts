// Helpers for numbers and dates as written on French pages. Pure string work: dates are
// Paris local time and never go through a Date object, so there is no timezone shift.

/** "31,88 € / Part" -> 31.88, "1 747" -> 1747, "-0,04 %" -> -0.04. Throws if no number. */
export function parseFrenchNumber(text: string): number {
  // \s covers regular, NBSP (U+00A0) and narrow NBSP (U+202F) spaces: "1 747" -> "1747".
  const compact = text.replace(/\s/g, '');
  const match = /[-\u2212]?\d+(?:[.,]\d+)?/.exec(compact);
  if (!match) throw new Error(`No number found in "${text}"`);
  return Number(match[0].replace('\u2212', '-').replace(',', '.'));
}

/** "24/09/2026" -> "2026-09-24". */
export function parseFrenchDate(text: string): string {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (!m) throw new Error(`No date found in "${text}"`);
  return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
}

/** "29/10/2026 16:00" or "22/10/2026 - 11:09" -> "2026-10-29T16:00" (Paris local time). */
export function parseFrenchDateTime(text: string): string {
  const date = parseFrenchDate(text);
  const t = /(\d{1,2})\s*[h:]\s*(\d{2})/.exec(text.replace(/^.*?\d{4}/, ''));
  if (!t) throw new Error(`No time found in "${text}"`);
  return `${date}T${pad(t[1])}:${t[2]}`;
}

function pad(n: string | undefined): string {
  return (n ?? '').padStart(2, '0');
}
