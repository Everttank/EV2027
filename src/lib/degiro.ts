// DeGiro-transactie-export (Transactions.csv / Transacties.csv) inlezen en omzetten naar
// "lots": per aankoop het nog aanwezige aantal en de kostprijs. Verkopen worden FIFO
// (eerst gekocht, eerst verkocht) van de oudste aankopen afgehaald.
//
// Kolommen (NL): Datum, Tijd, Product, ISIN, Beurs, Uitvoeringsplaats, Aantal, Koers, (munt),
//   Lokale waarde, (munt), Waarde, (munt), Wisselkoers, Transactiekosten…, (munt), Totaal, (munt), Order ID
// Kolommen (EN): Date, Time, Product, ISIN, Reference exchange, Venue, Quantity, Price, …, Value, …
// We zoeken kolommen op naam, zodat kleine verschillen tussen versies niet uitmaken.

export interface DegiroTrade {
  date: string; // YYYY-MM-DD
  time: string;
  product: string;
  isin: string;
  exchange: string; // DeGiro-beurscode, bijv. EAM, XET, NDQ
  qty: number; // negatief = verkoop
  priceLocal: number;
  currency: string;
  valueEur: number; // absolute waarde in EUR (zonder kosten)
  feesEur: number; // absolute kosten in EUR
  orderId: string;
}

export interface Lot {
  isin: string;
  product: string;
  exchange: string;
  qty: number;
  buyPriceEur: number; // per stuk, inclusief kosten
  buyDate: string;
}

/** Minimale CSV-parser met aanhalingstekens ("1.234,56"). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  const delim = (s.split('\n')[0].match(/;/g)?.length ?? 0) > (s.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/** "1.234,56" / "1,234.56" / "-12,5" / "12.50" → getal. */
export function num(s: string | undefined): number | null {
  if (s == null) return null;
  let t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function dateKey(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

const norm = (h: string) => h.trim().toLowerCase();

export function parseDegiroTransactions(text: string): { trades: DegiroTrade[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { trades: [], skipped: 0 };
  const head = rows[0].map(norm);
  const find = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const startsWith = (...names: string[]) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const c = {
    date: find('datum', 'date'),
    time: find('tijd', 'time'),
    product: find('product'),
    isin: find('isin'),
    exchange: find('beurs', 'referentiebeurs', 'reference exchange', 'reference'),
    qty: find('aantal', 'quantity', 'number'),
    price: find('koers', 'price'),
    local: find('lokale waarde', 'local value'),
    value: find('waarde', 'value', 'waarde eur', 'value eur'),
    fx: find('wisselkoers', 'exchange rate'),
    fees: startsWith('transactiekosten', 'transaction', 'kosten', 'autofx'),
    order: find('order id', 'order'),
  };
  if (c.date < 0 || c.isin < 0 || c.qty < 0 || c.price < 0) throw new Error('Dit lijkt geen DeGiro-transactie-export (kolommen Datum, ISIN, Aantal en Koers ontbreken).');

  const trades: DegiroTrade[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const date = dateKey(r[c.date] ?? '');
    const qty = num(r[c.qty]);
    const price = num(r[c.price]);
    const isin = (r[c.isin] ?? '').trim();
    if (!date || !qty || price == null || !isin) {
      skipped++;
      continue;
    }
    const fx = c.fx >= 0 ? num(r[c.fx]) : null;
    const local = c.local >= 0 ? num(r[c.local]) : null;
    let valueEur = c.value >= 0 ? num(r[c.value]) : null;
    if (valueEur == null) valueEur = local != null ? local / (fx || 1) : qty * price;
    const fees = c.fees >= 0 ? num(r[c.fees]) ?? 0 : 0;
    trades.push({
      date,
      time: c.time >= 0 ? (r[c.time] ?? '').trim() : '',
      product: (r[c.product] ?? isin).trim(),
      isin,
      exchange: c.exchange >= 0 ? (r[c.exchange] ?? '').trim() : '',
      qty,
      priceLocal: price,
      currency: (r[c.price + 1] ?? '').trim() || 'EUR',
      valueEur: Math.abs(valueEur),
      feesEur: Math.abs(fees),
      orderId: c.order >= 0 ? (r[c.order] ?? '').trim() : '',
    });
  }
  return { trades, skipped };
}

/** Van transacties naar nog aanwezige aankopen (FIFO). Kosten zitten in de kostprijs. */
export function toLots(trades: DegiroTrade[]): Lot[] {
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const open = new Map<string, Lot[]>();
  for (const t of sorted) {
    const lots = open.get(t.isin) ?? [];
    open.set(t.isin, lots);
    if (t.qty > 0) {
      lots.push({ isin: t.isin, product: t.product, exchange: t.exchange, qty: t.qty, buyPriceEur: (t.valueEur + t.feesEur) / t.qty, buyDate: t.date });
    } else {
      let toSell = -t.qty;
      while (toSell > 1e-9 && lots.length) {
        const first = lots[0];
        const take = Math.min(first.qty, toSell);
        first.qty -= take;
        toSell -= take;
        if (first.qty <= 1e-9) lots.shift();
      }
    }
  }
  return [...open.values()].flat().map((l) => ({ ...l, qty: Math.round(l.qty * 1e6) / 1e6, buyPriceEur: Math.round(l.buyPriceEur * 10000) / 10000 }));
}

/** DeGiro-beurscode → MIC-code (zoals Twelve Data die gebruikt). Onbekend = zoeken op ISIN. */
export const EXCHANGE_TO_MIC: Record<string, string> = {
  EAM: 'XAMS', EPA: 'XPAR', EBR: 'XBRU', ELI: 'XLIS', XET: 'XETR', FRA: 'XFRA', LSE: 'XLON',
  MIL: 'XMIL', SWX: 'XSWX', MAD: 'XMAD', OSL: 'XOSL', HEL: 'XHEL', CSE: 'XCSE', STO: 'XSTO',
  WSE: 'XWAR', VIE: 'XWBO', NDQ: 'XNGS', NSY: 'XNYS', ASX: 'XASX', TOR: 'XTSE',
};
