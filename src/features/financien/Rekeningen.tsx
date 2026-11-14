// Betaal- en spaarrekening uit ABN AMRO-exports: saldo, verloop en uitgaven per categorie.

import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { db, type Account, type Transaction } from '../../db/db';
import { parseAbn } from '../../lib/abn';
import { CATEGORIES, categorize } from '../../lib/categories';
import { dailyTotals, latestBalances } from '../../lib/balances';
import { fmtDay, fmtEur, fmtEur0 } from '../../lib/format';
import { AreaLine } from '../../components/charts';
import { Empty, Sheet, useToast } from '../../components/ui';

const NOT_SPENDING = new Set(['Inkomen', 'Sparen & beleggen', 'Overboekingen']);

function monthKey(date: string) {
  return date.slice(0, 7);
}
function shiftMonth(m: string, n: number) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Rekeningen() {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const tx = useLiveQuery(() => db.transactions.orderBy('date').toArray(), []) ?? [];
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openCat, setOpenCat] = useState<string | null>(null);

  async function onImport(f: File) {
    const text = await f.text();
    const res = parseAbn(text);
    if (res.transactions.length === 0) {
      toast('Geen transacties gevonden. Is dit een ABN AMRO TXT/TAB-export?');
      return;
    }
    const known = new Set((await db.accounts.toArray()).map((a) => a.iban));
    for (const iban of res.accounts) {
      if (!known.has(iban)) await db.accounts.put({ iban, name: `Rekening …${iban.slice(-4)}`, type: 'betaal' });
    }
    const own = [...new Set([...known, ...res.accounts])];
    const rules = await db.categoryRules.toArray();
    const existing = new Set(await db.transactions.toCollection().primaryKeys());
    const fresh = res.transactions.filter((t) => !existing.has(t.id));
    await db.transactions.bulkPut(fresh.map((t) => ({ ...t, category: categorize(t.description, t.amount, own.filter((a) => a !== t.account), rules) })));
    toast(`${fresh.length} nieuwe transacties${res.transactions.length - fresh.length ? `, ${res.transactions.length - fresh.length} al bekend` : ''}`);
    const last = res.transactions[res.transactions.length - 1];
    if (last) setMonth(monthKey(last.date));
  }

  const balances = useMemo(() => latestBalances(tx), [tx]);
  const series = useMemo(() => dailyTotals(tx).slice(-180), [tx]);

  const monthTx = tx.filter((t) => monthKey(t.date) === month);
  const byCat = new Map<string, number>();
  for (const t of monthTx) if (t.amount < 0 && !NOT_SPENDING.has(t.category)) byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const spent = cats.reduce((s, [, v]) => s + v, 0);
  const income = monthTx.filter((t) => t.category === 'Inkomen' && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const max = cats[0]?.[1] ?? 1;

  const totalOf = (type: Account['type']) => accounts.filter((a) => a.type === type).reduce((s, a) => s + (balances.get(a.iban)?.balance ?? 0), 0);

  return (
    <>
      <input ref={file} type="file" accept=".tab,.txt,.csv,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />

      {accounts.length === 0 ? (
        <section className="panel stack">
          <h2>Je rekeningen</h2>
          <p className="small muted">Download in ABN AMRO internetbankieren je transacties als <strong>TXT</strong> (tab-gescheiden) en laad het bestand hier. Alles blijft op je telefoon.</p>
          <button className="btn primary block" onClick={() => file.current?.click()}><Upload size={18} /> Export importeren</button>
        </section>
      ) : (
        <>
          <section className="grid2 money-tiles">
            <div className="tile t-geld"><p className="label">Betaalrekening</p><p className="figure sm">{fmtEur(totalOf('betaal'))}</p></div>
            <div className="tile t-stappen"><p className="label">Spaarrekening</p><p className="figure sm">{fmtEur(totalOf('spaar'))}</p></div>
          </section>

          {series.length > 1 && (
            <section className="panel stack">
              <div className="row between"><h3>Totaal saldo</h3><span className="faint tiny">t/m {fmtDay(series[series.length - 1].date)}</span></div>
              <AreaLine data={series} dataKey="saldo" name="Saldo" color="var(--accent)" fmt={(n) => fmtEur0(n)} height={180} />
            </section>
          )}

          <section className="stack">
            <div className="section-head">
              <h2>Uitgaven</h2>
              <div className="row" style={{ gap: 2 }}>
                <button className="btn icon ghost" aria-label="Vorige maand" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
                <span className="small" style={{ minWidth: 92, textAlign: 'center' }}>{new Date(`${month}-01`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</span>
                <button className="btn icon ghost" aria-label="Volgende maand" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="panel stack">
              <div className="row between">
                <div><div className="faint tiny">Uitgegeven</div><div className="figure sm">{fmtEur(spent)}</div></div>
                <div style={{ textAlign: 'right' }}><div className="faint tiny">Binnengekomen</div><div className="figure sm pos">{fmtEur(income)}</div></div>
              </div>
              {cats.length === 0 ? <Empty>Geen uitgaven in deze maand.</Empty> : (
                <div className="stack" style={{ gap: 4 }}>
                  {cats.map(([c, v]) => (
                    <button key={c} className="cat-row" onClick={() => setOpenCat(c)}>
                      <span className="row between small"><span>{c}</span><span className="num">{fmtEur(v)}</span></span>
                      <span className="bar-track"><span className="bar-fill" style={{ ['--w' as string]: v / max }} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="stack">
            <div className="section-head"><h2>Rekeningen</h2><button className="btn small" onClick={() => file.current?.click()}><Upload size={16} /> Importeren</button></div>
            <div className="panel flush">
              <ul className="list">
                {accounts.map((a) => (
                  <li key={a.iban}>
                    <div className="grow">
                      <input className="input" style={{ minHeight: 36, padding: '6px 10px' }} defaultValue={a.name} aria-label="Naam rekening" onBlur={(e) => db.accounts.update(a.iban, { name: e.target.value || a.name })} />
                      <div className="faint tiny num" style={{ marginTop: 4 }}>{a.iban} · {balances.get(a.iban) ? `${fmtEur(balances.get(a.iban)!.balance)} op ${fmtDay(balances.get(a.iban)!.date)}` : 'geen saldo'}</div>
                    </div>
                    <select className="select" style={{ width: 'auto', minHeight: 40 }} value={a.type} onChange={(e) => db.accounts.update(a.iban, { type: e.target.value as Account['type'] })} aria-label="Soort rekening">
                      <option value="betaal">Betaal</option>
                      <option value="spaar">Spaar</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <CategorySheet category={openCat} month={month} tx={monthTx} onClose={() => setOpenCat(null)} />
    </>
  );
}

function CategorySheet({ category, month, tx, onClose }: { category: string | null; month: string; tx: Transaction[]; onClose: () => void }) {
  const toast = useToast();
  const list = tx.filter((t) => t.category === category && t.amount < 0).sort((a, b) => b.date.localeCompare(a.date));
  async function recategorize(t: Transaction, cat: string, always: boolean) {
    await db.transactions.update(t.id, { category: cat });
    if (always) {
      const match = t.counterparty.toLowerCase();
      await db.categoryRules.add({ match, category: cat });
      const all = await db.transactions.toArray();
      const hits = all.filter((x) => x.counterparty.toLowerCase() === match);
      await db.transactions.bulkPut(hits.map((x) => ({ ...x, category: cat })));
      toast(`${hits.length} transacties van ${t.counterparty} → ${cat}`);
    }
  }
  return (
    <Sheet open={category != null} onClose={onClose} title={category ?? ''}>
      <p className="faint small">{new Date(`${month}-01`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}. Klopt een categorie niet? Kies een andere; met "altijd" geldt het voor alle betalingen aan die partij.</p>
      <div className="panel flush">
        <ul className="list">
          {list.map((t) => (
            <li key={t.id} style={{ flexWrap: 'wrap' }}>
              <div className="grow"><div className="title">{t.counterparty}</div><div className="faint tiny">{fmtDay(t.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div></div>
              <span className="num">{fmtEur(-t.amount)}</span>
              <RecatSelect current={t.category} onPick={(c, always) => recategorize(t, c, always)} />
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function RecatSelect({ current, onPick }: { current: string; onPick: (c: string, always: boolean) => void }) {
  const [cat, setCat] = useState(current);
  return (
    <div className="row" style={{ width: '100%', gap: 6 }}>
      <select className="select grow" style={{ minHeight: 40 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categorie">
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <button className="btn small" disabled={cat === current} onClick={() => onPick(cat, false)}>Eenmalig</button>
      <button className="btn small" disabled={cat === current} onClick={() => onPick(cat, true)}>Altijd</button>
    </div>
  );
}
