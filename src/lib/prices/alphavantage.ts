// Alpha Vantage (https://www.alphavantage.co/documentation/). Werkt vanuit de browser.
// Gratis: 25 aanvragen per dag en maximaal 1 per seconde. Historie: laatste 100 handelsdagen
// (de volledige historie is betaald), daarom spaart de app dagkoersen zelf op (zie index.ts).
// Symbolen: ticker + beurs-achtervoegsel, bijv. VWRL.AMS (Euronext Amsterdam), IBM (VS).

const BASE = 'https://www.alphavantage.co/query';
const DAY_LIMIT = 24; // één reserve onder de 25

/** MIC-code → Alpha Vantage-achtervoegsel. VS-beurzen hebben geen achtervoegsel. */
export const MIC_TO_AV: Record<string, string> = {
  XAMS: 'AMS', XLON: 'LON', XETR: 'DEX', XFRA: 'FRK', XPAR: 'PAR', XBRU: 'BRU', XLIS: 'LIS',
  XMIL: 'MIL', XSWX: 'SWX', XMAD: 'MCE', XSTO: 'STO', XHEL: 'HEL', XCSE: 'CPH', XOSL: 'OSL', XTSE: 'TRT',
};
const US = new Set(['XNYS', 'XNGS', 'XNAS', 'XNMS', 'ARCX', 'BATS', 'XASE']);

export function avSymbol(symbol: string, mic?: string): string {
  if (symbol.includes('.')) return symbol;
  if (!mic || US.has(mic)) return symbol;
  return MIC_TO_AV[mic] ? `${symbol}.${MIC_TO_AV[mic]}` : symbol;
}

/* Rem: 1 per 1,2 s en een dagteller in localStorage, zodat het daglimiet nooit op raakt. */
let last = 0;
const dayKey = () => `getij-av-${new Date().toISOString().slice(0, 10)}`;
export function usedToday(): number {
  try {
    return Number(localStorage.getItem(dayKey()) ?? 0);
  } catch {
    return 0;
  }
}
async function get(params: Record<string, string>) {
  if (usedToday() >= DAY_LIMIT) throw new Error('Daglimiet Alpha Vantage bereikt; morgen weer nieuwe koersen.');
  const wait = last + 1200 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  try {
    localStorage.setItem(dayKey(), String(usedToday() + 1));
  } catch {
    /* privémodus: geen teller */
  }
  const res = await fetch(`${BASE}?${new URLSearchParams(params)}`);
  const json = await res.json();
  const note = json.Information ?? json.Note ?? json['Error Message'];
  if (note) throw new Error(String(note));
  return json;
}

export async function quote(symbol: string, apikey: string): Promise<number> {
  const j = await get({ function: 'GLOBAL_QUOTE', symbol, apikey });
  const price = Number(j['Global Quote']?.['05. price']);
  if (!price) throw new Error(`Geen koers voor ${symbol}`);
  return price;
}

/** Laatste ~100 handelsdagen, oplopend gesorteerd. */
export async function history(symbol: string, apikey: string): Promise<{ date: string; close: number }[]> {
  const j = await get({ function: 'TIME_SERIES_DAILY', symbol, outputsize: 'compact', apikey });
  const ts = j['Time Series (Daily)'] ?? {};
  return Object.entries(ts)
    .map(([date, v]) => ({ date, close: Number((v as Record<string, string>)['4. close']) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function testKey(apikey: string): Promise<string> {
  try {
    const p = await quote('VWRL.AMS', apikey);
    return `Werkt: VWRL op Euronext Amsterdam = € ${p.toFixed(2).replace('.', ',')}`;
  } catch (e) {
    return `Fout: ${(e as Error).message}`;
  }
}
