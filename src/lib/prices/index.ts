// Koersen ophalen met cache, rem en omrekening naar EUR.
// - Aandelen/ETF's: Alpha Vantage (gratis 25/dag, ook Euronext). Koppelen en zoeken gaat via de
//   gratis zoekfunctie van Twelve Data (geen sleutel, kost geen Alpha Vantage-aanvragen).
// - Wisselkoersen: Twelve Data (gratis sleutel).
// - Crypto: CoinGecko (zonder sleutel).
// Een andere koersbron? Pas alleen dit bestand en het bijbehorende bronbestand aan.

import { db } from '../../db/db';
import type { Position, PricePoint } from '../portfolio';
import * as td from './twelvedata';
import * as cg from './coingecko';
import * as av from './alphavantage';

export interface PriceKeys {
  av?: string; // Alpha Vantage
  td?: string; // Twelve Data (wisselkoersen)
}

const QUOTE_TTL = 15 * 60_000; // crypto: 15 minuten
const STOCK_QUOTE_TTL = 2 * 3600_000; // aandelen: 2 uur (zuinig met 25 aanvragen per dag)
const HISTORY_TTL = 20 * 3600_000; // historie: 1× per dag
const FX_TTL = 12 * 3600_000;

/** Eén sleutel per instrument (meerdere aankopen van hetzelfde fonds delen hem). */
export function keyOf(p: Pick<Position, 'kind' | 'symbol' | 'exchange' | 'mic'>): string {
  return p.kind === 'crypto' ? `crypto:${p.symbol}` : `stock:${p.symbol}:${p.mic ?? p.exchange ?? ''}`;
}

/** Munt van de notering; oudere posities zonder munt leiden we af uit de beurs. */
export function currencyOf(p: Position): string {
  if (p.currency) return p.currency;
  if (!p.mic || ['XNYS', 'XNGS', 'XNAS', 'XNMS', 'ARCX', 'BATS'].includes(p.mic)) return p.mic ? 'USD' : 'EUR';
  if (p.mic === 'XLON') return 'GBp';
  if (p.mic === 'XSWX') return 'CHF';
  return 'EUR';
}

async function cached<T>(table: 'priceCache' | 'historyCache', key: string, ttl: number, fetcher: () => Promise<T>, force = false): Promise<T> {
  const row = await db.table(table).get(key);
  if (!force && row && Date.now() - row.fetchedAt < ttl) return (table === 'priceCache' ? row.price : row.points) as T;
  try {
    const fresh = await fetcher();
    await db.table(table).put(table === 'priceCache' ? { key, price: fresh, fetchedAt: Date.now() } : { key, points: fresh, fetchedAt: Date.now() });
    return fresh;
  } catch (e) {
    // Offline of limiet bereikt: oude waarde is beter dan niets.
    if (row) return (table === 'priceCache' ? row.price : row.points) as T;
    throw e;
  }
}

/** Factor om een bedrag in `currency` naar EUR om te rekenen. 'GBp' = Britse pence. */
export async function fxToEur(currency: string, keys: PriceKeys): Promise<number> {
  if (!currency || currency === 'EUR') return 1;
  const pence = currency === 'GBp' || currency === 'GBX';
  const cur = pence ? 'GBP' : currency;
  if (!keys.td) throw new Error('Geen Twelve Data-sleutel voor wisselkoersen.');
  const rate = await cached('priceCache', `fx:${cur}/EUR`, FX_TTL, () => td.fx(cur, 'EUR', keys.td!));
  return pence ? rate / 100 : rate;
}

/** Actuele koers in EUR, of null als die niet op te halen is. */
export async function quoteEur(p: Position, keys: PriceKeys, force = false): Promise<number | null> {
  try {
    if (p.kind === 'crypto') return await cached('priceCache', keyOf(p), QUOTE_TTL, () => cg.priceEur(p.symbol), force);
    if (!keys.av) return null;
    return await cached('priceCache', keyOf(p), STOCK_QUOTE_TTL, async () => {
      const price = await av.quote(av.avSymbol(p.symbol, p.mic), keys.av!);
      return price * (await fxToEur(currencyOf(p), keys));
    }, force);
  } catch {
    return null;
  }
}

/**
 * Koershistorie in EUR. Crypto: vanaf `from`. Aandelen: Alpha Vantage geeft gratis alleen de
 * laatste ~100 handelsdagen; we voegen elke ophaalronde samen met wat al bewaard was, zodat de
 * historie vanaf nu vanzelf langer wordt.
 */
export async function historyEur(p: Position, from: string, keys: PriceKeys): Promise<PricePoint[]> {
  try {
    if (p.kind === 'crypto') return await cached('historyCache', `${keyOf(p)}@${from}`, HISTORY_TTL, () => cg.historyEur(p.symbol, from));
    const cacheKey = `${keyOf(p)}@av`;
    const saved = ((await db.historyCache.get(cacheKey))?.points ?? []) as PricePoint[];
    if (!keys.av) return saved;
    return await cached('historyCache', cacheKey, HISTORY_TTL, async () => {
      const rate = await fxToEur(currencyOf(p), keys); // benadering: huidige wisselkoers
      const fresh = (await av.history(av.avSymbol(p.symbol, p.mic), keys.av!)).map((x) => ({ date: x.date, close: x.close * rate }));
      const merged = new Map(saved.map((x) => [x.date, x.close]));
      for (const x of fresh) merged.set(x.date, x.close);
      return [...merged.entries()].map(([date, close]) => ({ date, close })).sort((a, b) => a.date.localeCompare(b.date));
    });
  } catch {
    return [];
  }
}

export { td, cg, av };
