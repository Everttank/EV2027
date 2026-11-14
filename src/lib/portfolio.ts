// Portfolio: waarde, winst/verlies en historische waarde uit koershistorie.

import { dayRange } from './date';

export type AssetKind = 'stock' | 'crypto';

export interface Position {
  id?: number;
  kind: AssetKind;
  symbol: string; // 'VWRL' of coingecko-id 'bitcoin'
  exchange?: string; // bijv. 'Euronext' (alleen aandelen/ETF's, voor weergave)
  mic?: string; // beurscode, bijv. 'XAMS' (Euronext Amsterdam): maakt de koers eenduidig
  name: string;
  quantity: number;
  buyPrice: number; // per stuk, in EUR
  buyDate: string; // YYYY-MM-DD
  manualPrice?: number; // als er geen live koers is
  isin?: string;
  currency?: string; // munt van de notering, bijv. 'EUR', 'USD', 'GBp'
  source?: 'degiro' | 'handmatig'; // degiro-posities worden bij een nieuwe import vervangen
}

export interface PricePoint {
  date: string;
  close: number; // in EUR
}

export interface Valued {
  position: Position;
  price: number | null;
  value: number;
  cost: number;
  gain: number;
  gainPct: number;
}

export function value(p: Position, price: number | null): Valued {
  const effective = price ?? p.manualPrice ?? null;
  const cost = p.quantity * p.buyPrice;
  const v = effective == null ? cost : p.quantity * effective;
  return { position: p, price: effective, value: v, cost, gain: v - cost, gainPct: cost > 0 ? (v - cost) / cost : 0 };
}

export function totals(list: Valued[]) {
  const value = list.reduce((s, x) => s + x.value, 0);
  const cost = list.reduce((s, x) => s + x.cost, 0);
  return { value, cost, gain: value - cost, gainPct: cost > 0 ? (value - cost) / cost : 0 };
}

/** Laatst bekende slotkoers op of vóór `date` (weekenden/feestdagen overbruggen). */
function closeAt(points: PricePoint[], date: string): number | null {
  let best: number | null = null;
  for (const p of points) {
    if (p.date <= date) best = p.close;
    else break;
  }
  return best;
}

/**
 * Reconstrueer de totale portfoliowaarde per dag vanaf de eerste aankoop.
 * `history` per positie-sleutel (symbol) met oplopend gesorteerde punten.
 * Posities zonder historie tellen mee tegen aankoopprijs.
 */
export function reconstruct(
  positions: Position[],
  history: Record<string, PricePoint[]>,
  until: string,
  keyFn: (p: Position) => string = (p) => p.symbol,
): { date: string; value: number; cost: number }[] {
  if (positions.length === 0) return [];
  const start = positions.map((p) => p.buyDate).sort()[0];
  const sorted: Record<string, PricePoint[]> = {};
  for (const [k, v] of Object.entries(history)) sorted[k] = [...v].sort((a, b) => a.date.localeCompare(b.date));

  return dayRange(start, until).map((date) => {
    let val = 0;
    let cost = 0;
    for (const p of positions) {
      if (p.buyDate > date) continue;
      const c = closeAt(sorted[keyFn(p)] ?? [], date);
      val += p.quantity * (c ?? p.buyPrice);
      cost += p.quantity * p.buyPrice;
    }
    return { date, value: Math.round(val * 100) / 100, cost: Math.round(cost * 100) / 100 };
  });
}
