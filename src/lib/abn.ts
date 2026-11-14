// ABN AMRO-export inlezen.
//
// Standaard TAB/TXT-export van ABN AMRO (geen kopregel), kolommen:
//   rekeningnummer · muntsoort · transactiedatum (JJJJMMDD) · beginsaldo · eindsaldo
//   · rentedatum · transactiebedrag · omschrijving
// Bedragen gebruiken een komma als decimaalteken.
//
// VOORLOPIG: gebouwd op het gedocumenteerde formaat. Zodra er een echte export is,
// controleren en zo nodig aanpassen (zie HANDOFF.md).

export interface ParsedTransaction {
  id: string; // stabiele hash → dubbel importeren maakt geen dubbele regels
  account: string;
  date: string; // YYYY-MM-DD
  amount: number; // negatief = uitgave
  balanceAfter: number | null;
  seq: number; // volgorde in het bestand: bepaalt welk saldo het laatste van de dag is
  description: string;
  counterparty: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  skipped: number;
  accounts: string[];
}

function num(s: string | undefined): number | null {
  if (s == null) return null;
  const clean = s.trim().replace(/"/g, '');
  if (clean === '') return null;
  // "1.234,56" → 1234.56 ; "-12,50" → -12.5 ; "12.50" → 12.5
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function dateKey(s: string): string | null {
  const t = s.trim().replace(/"/g, '');
  let m = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** Simpele, stabiele string-hash (FNV-1a). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Haal de tegenpartij uit een ABN-omschrijving. */
export function counterpartyOf(desc: string): string {
  const d = desc.replace(/\s+/g, ' ').trim();
  // SEPA-structuur: /TRTP/.../NAME/Naam/REMI/...
  const sepa = d.match(/\/NAME\/([^/]+)\//i);
  if (sepa) return sepa[1].trim();
  // Oude SEPA-stijl: "Naam: Jansen Omschrijving: ..."
  const naam = d.match(/Naam:\s*(.+?)(?:\s{1,}(?:Omschrijving|IBAN|Kenmerk|Machtiging):|$)/i);
  if (naam) return naam[1].trim();
  // Pinbetaling: "BEA, Betaalpas  ALBERT HEIJN 1234,PAS123 ..." / "BEA NR:XXXX 01.02.24/12.34 Jumbo Utrecht,PAS123"
  const bea = d.match(/^(?:BEA|GEA|eCom)[^A-Za-z]*(?:Betaalpas|Apple Pay|Google Pay)?\s*(.+?),\s*PAS/i);
  if (bea) return bea[1].replace(/^NR:\S+\s+[\d./:\s]+/, '').trim();
  return d.slice(0, 40);
}

export function parseAbn(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const out: ParsedTransaction[] = [];
  const accounts = new Set<string>();
  let skipped = 0;
  const seen = new Map<string, number>();

  for (const line of lines) {
    const delim = line.includes('\t') ? '\t' : line.split(';').length >= 7 ? ';' : ',';
    const cols = line.split(delim);
    if (cols.length < 7) {
      skipped++;
      continue;
    }
    const [account, , rawDate, , endBal, , rawAmount, ...rest] = cols;
    const date = dateKey(rawDate);
    const amount = num(rawAmount);
    if (!date || amount == null) {
      skipped++; // kopregel of onleesbare regel
      continue;
    }
    const acct = account.trim().replace(/"/g, '');
    const description = rest.join(' ').replace(/"/g, '').replace(/\s+/g, ' ').trim();
    const base = `${acct}|${date}|${amount}|${description}`;
    // Twee identieke regels op één dag (bijv. 2× koffie) krijgen een volgnummer.
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    accounts.add(acct);
    out.push({
      id: hash(`${base}|${n}`),
      account: acct,
      date,
      amount,
      balanceAfter: num(endBal),
      seq: out.length,
      description,
      counterparty: counterpartyOf(description),
    });
  }
  return { transactions: out, skipped, accounts: [...accounts] };
}
