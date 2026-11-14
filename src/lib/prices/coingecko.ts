// CoinGecko publieke API (geen sleutel nodig). Gebruik de coin-id, bijv. 'bitcoin', 'ethereum'.

const BASE = 'https://api.coingecko.com/api/v3';

export async function priceEur(id: string): Promise<number> {
  const res = await fetch(`${BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=eur`);
  const json = await res.json();
  const p = json?.[id]?.eur;
  if (typeof p !== 'number') throw new Error(`Geen koers voor ${id}`);
  return p;
}

export async function historyEur(id: string, from: string) {
  const days = Math.min(365, Math.max(2, Math.ceil((Date.now() - new Date(from).getTime()) / 86_400_000) + 1));
  // Gratis API geeft maximaal 365 dagen terug.
  const res = await fetch(`${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=eur&days=${days}&interval=daily`);
  const json = await res.json();
  const byDay = new Map<string, number>();
  for (const [ts, close] of (json.prices ?? []) as [number, number][]) {
    byDay.set(new Date(ts).toISOString().slice(0, 10), close);
  }
  return [...byDay.entries()].map(([date, close]) => ({ date, close }));
}

export async function search(q: string): Promise<{ id: string; name: string; symbol: string }[]> {
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(q)}`);
  const json = await res.json();
  return (json.coins ?? []).slice(0, 10).map((c: { id: string; name: string; symbol: string }) => ({ id: c.id, name: c.name, symbol: c.symbol.toUpperCase() }));
}
