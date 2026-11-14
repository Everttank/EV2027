// Saldo's uit transacties. Sorteert op datum en daarna op volgorde in het exportbestand,
// zodat bij meerdere transacties op één dag het juiste eindsaldo wint.

export interface BalanceRow {
  account: string;
  date: string;
  seq?: number;
  balanceAfter: number | null;
}

export function chronological<T extends BalanceRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || (a.seq ?? 0) - (b.seq ?? 0));
}

/** Laatst bekende saldo per rekening. */
export function latestBalances(rows: BalanceRow[]): Map<string, { balance: number; date: string }> {
  const m = new Map<string, { balance: number; date: string }>();
  for (const t of chronological(rows)) if (t.balanceAfter != null) m.set(t.account, { balance: t.balanceAfter, date: t.date });
  return m;
}

/** Totaal saldo (alle rekeningen) aan het eind van elke dag met transacties. */
export function dailyTotals(rows: BalanceRow[]): { date: string; saldo: number }[] {
  const cur = new Map<string, number>();
  const out: { date: string; saldo: number }[] = [];
  for (const t of chronological(rows)) {
    if (t.balanceAfter != null) cur.set(t.account, t.balanceAfter);
    const total = [...cur.values()].reduce((a, b) => a + b, 0);
    if (out.length && out[out.length - 1].date === t.date) out[out.length - 1].saldo = total;
    else out.push({ date: t.date, saldo: total });
  }
  return out;
}
