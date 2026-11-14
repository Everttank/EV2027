// Twelve Data API (https://twelvedata.com/docs). Werkt rechtstreeks vanuit de browser.

const BASE = 'https://api.twelvedata.com';

// Rem: maximaal 8 aanvragen per minuut (gratis abonnement).
const stamps: number[] = [];
async function throttle() {
  for (;;) {
    const now = Date.now();
    while (stamps.length && now - stamps[0] > 60_000) stamps.shift();
    if (stamps.length < 8) {
      stamps.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 60_000 - (now - stamps[0]) + 50));
  }
}

async function get(path: string, params: Record<string, string | undefined>) {
  await throttle();
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
  const res = await fetch(`${BASE}/${path}?${qs}`);
  const json = await res.json();
  if (json.status === 'error' || json.code >= 400) throw new Error(json.message ?? 'Twelve Data-fout');
  return json;
}

export interface SymbolHit {
  symbol: string;
  name: string;
  exchange: string;
  mic: string;
  currency: string;
  country: string;
  type: string;
}

/** Zoeken werkt zonder sleutel. */
export async function search(q: string): Promise<SymbolHit[]> {
  const res = await fetch(`${BASE}/symbol_search?symbol=${encodeURIComponent(q)}&outputsize=12`);
  const json = await res.json();
  return (json.data ?? []).map((d: Record<string, string>) => ({
    symbol: d.symbol,
    name: d.instrument_name,
    exchange: d.exchange,
    mic: d.mic_code,
    currency: d.currency,
    country: d.country,
    type: d.instrument_type,
  }));
}

/** Beurs eenduidig: liefst de MIC-code (bijv. XAMS), anders de beursnaam. */
export interface Venue {
  exchange?: string;
  mic?: string;
}
const venue = (v: Venue) => (v.mic ? { mic_code: v.mic } : { exchange: v.exchange });

export async function quote(symbol: string, v: Venue, apikey: string) {
  const j = await get('quote', { symbol, ...venue(v), apikey });
  return { price: Number(j.close), currency: j.currency as string, changePct: Number(j.percent_change) / 100 };
}

export async function history(symbol: string, v: Venue, from: string, apikey: string) {
  const j = await get('time_series', { symbol, ...venue(v), interval: '1day', start_date: from, outputsize: '5000', apikey });
  const points = (j.values ?? [])
    .map((v: { datetime: string; close: string }) => ({ date: v.datetime.slice(0, 10), close: Number(v.close) }))
    .reverse();
  return { currency: (j.meta?.currency as string) ?? 'EUR', points };
}

export async function fx(from: string, to: string, apikey: string): Promise<number> {
  const j = await get('exchange_rate', { symbol: `${from}/${to}`, apikey });
  return Number(j.rate);
}

/** Test de sleutel met één aanvraag; geeft een leesbaar resultaat terug. */
export async function testKey(apikey: string, symbol = 'VWRL', mic = 'XAMS'): Promise<string> {
  try {
    const q = await quote(symbol, { mic }, apikey);
    return `Werkt: ${symbol} op Euronext Amsterdam = ${q.price} ${q.currency}`;
  } catch (e) {
    return `Fout: ${(e as Error).message}`;
  }
}
