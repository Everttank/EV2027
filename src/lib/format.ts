// Nederlandse notatie voor getallen, bedragen en datums.

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat('nl-NL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' });

export const fmtEur = (n: number) => eur.format(n);
export const fmtEur0 = (n: number) => eur0.format(n);
export const fmtInt = (n: number) => num0.format(Math.round(n));
export const fmt1 = (n: number) => num1.format(n);
export const fmtPct = (fraction: number) => pct.format(fraction);

export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-NL', opts);
}

export function fmtLongDay(key: string): string {
  return fmtDay(key, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Parse een getal dat de gebruiker typt: '12,5', '12.5', en Nederlandse duizendtallen '12.500' / '1.234,56'. */
export function parseNum(input: string): number | null {
  let clean = input.trim().replace(/\s/g, '').replace(/^€/, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d*)?$/.test(clean)) clean = clean.replace(/\./g, '');
  clean = clean.replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
