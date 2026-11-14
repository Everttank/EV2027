// DeGiro-export inlezen: transacties → aankopen (FIFO) → posities met live koers via ISIN.

import { db } from '../../db/db';
import { EXCHANGE_TO_MIC, parseDegiroTransactions, toLots } from '../../lib/degiro';
import type { Position } from '../../lib/portfolio';
import { td } from '../../lib/prices';

interface Resolved {
  symbol: string;
  mic?: string;
  exchange?: string;
  currency?: string;
}

/** Zoek de ticker bij een ISIN; liefst op de beurs waar je kocht, anders een notering in euro's. */
async function resolve(isin: string, degiroExchange: string): Promise<Resolved | null> {
  try {
    const hits = await td.search(isin);
    if (!hits.length) return null;
    const mic = EXCHANGE_TO_MIC[degiroExchange];
    const hit = (mic && hits.find((h) => h.mic === mic)) || hits.find((h) => h.currency === 'EUR') || hits[0];
    return { symbol: hit.symbol, mic: hit.mic, exchange: hit.exchange, currency: hit.currency };
  } catch {
    return null;
  }
}

export interface ImportResult {
  instruments: number;
  lots: number;
  unresolved: string[];
}

/** Vervangt alle eerder geïmporteerde DeGiro-posities door de inhoud van deze export. */
export async function importDegiro(text: string): Promise<ImportResult> {
  const { trades } = parseDegiroTransactions(text);
  if (!trades.length) throw new Error('Geen transacties gevonden in dit bestand.');
  const lots = toLots(trades);
  const isins = [...new Set(lots.map((l) => l.isin))];
  const resolved = new Map<string, Resolved | null>();
  for (const isin of isins) {
    const ex = lots.find((l) => l.isin === isin)!.exchange;
    resolved.set(isin, await resolve(isin, ex));
  }
  const positions: Position[] = lots.map((l) => {
    const r = resolved.get(l.isin);
    return {
      kind: 'stock',
      symbol: r?.symbol ?? l.isin,
      mic: r?.mic,
      exchange: r?.exchange,
      currency: r?.currency,
      isin: l.isin,
      name: l.product,
      quantity: l.qty,
      buyPrice: l.buyPriceEur,
      buyDate: l.buyDate,
      source: 'degiro',
    };
  });
  await db.transaction('rw', db.positions, async () => {
    const old = await db.positions.where('source').equals('degiro').primaryKeys();
    await db.positions.bulkDelete(old);
    await db.positions.bulkAdd(positions);
  });
  return {
    instruments: isins.length,
    lots: positions.length,
    unresolved: isins.filter((i) => !resolved.get(i)).map((i) => lots.find((l) => l.isin === i)!.product),
  };
}
