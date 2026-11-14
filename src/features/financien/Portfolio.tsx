// Portfolio: DeGiro-import + handmatige posities met live koersen, overige bezittingen,
// verdeling (donut) en waarde over tijd.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { db, type OtherAsset } from '../../db/db';
import { priceKeys, useSettings } from '../../db/hooks';
import { historyEur, quoteEur, keyOf } from '../../lib/prices';
import { reconstruct, totals, value, type Position, type PricePoint, type Valued } from '../../lib/portfolio';
import { addDays, today } from '../../lib/date';
import { fmtDay, fmtEur, fmtEur0, fmtPct, parseNum } from '../../lib/format';
import { AreaLine, DONUT_COLORS, Donut } from '../../components/charts';
import { CountUp, Empty, useToast } from '../../components/ui';
import { AddPositionSheet } from './AddPosition';
import { importDegiro } from './degiroImport';

const RANGES = [
  { id: 30, label: '1 mnd' },
  { id: 182, label: '6 mnd' },
  { id: 365, label: '1 jaar' },
  { id: 0, label: 'Alles' },
];

/** Alle aankopen van hetzelfde fonds samen als één regel. */
interface Holding {
  key: string;
  name: string;
  exchange?: string;
  qty: number;
  price: number | null;
  value: number;
  cost: number;
  ids: number[];
}

function group(valued: Valued[]): Holding[] {
  const m = new Map<string, Holding>();
  for (const v of valued) {
    const k = keyOf(v.position);
    const h = m.get(k) ?? { key: k, name: v.position.name, exchange: v.position.exchange, qty: 0, price: v.price, value: 0, cost: 0, ids: [] };
    h.qty += v.position.quantity;
    h.value += v.value;
    h.cost += v.cost;
    h.ids.push(v.position.id!);
    m.set(k, h);
  }
  return [...m.values()].sort((a, b) => b.value - a.value);
}

export function Portfolio() {
  const s = useSettings();
  const keys = priceKeys(s);
  const keySig = `${keys.av ?? ''}|${keys.td ?? ''}`;
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const positions = useLiveQuery(() => db.positions.toArray(), []) ?? [];
  const others = useLiveQuery(() => db.otherAssets.toArray(), []) ?? [];
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [history, setHistory] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [adding, setAdding] = useState(false);
  const [range, setRange] = useState(182);

  const sig = positions.map((p) => `${keyOf(p)}@${p.buyDate}`).join('|');
  const load = useCallback(async (force = false) => {
    if (!positions.length) return;
    setLoading(true);
    // Eén aanvraag per fonds. Eerst alle koersen (snel zichtbaar), daarna de historie.
    const groups = new Map<string, { p: Position; from: string }>();
    for (const p of positions) {
      const k = keyOf(p);
      const g = groups.get(k);
      groups.set(k, { p: g?.p ?? p, from: g && g.from < p.buyDate ? g.from : p.buyDate });
    }
    for (const [k, { p }] of groups) {
      const price = await quoteEur(p, keys, force);
      setPrices((cur) => ({ ...cur, [k]: price }));
    }
    setUpdatedAt(new Date());
    setHistLoading(true);
    for (const [k, { p, from }] of groups) {
      const h = await historyEur(p, from, keys);
      setHistory((cur) => ({ ...cur, [k]: h }));
    }
    setHistLoading(false);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, keySig]);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 5 * 60_000); // elke 5 min verversen zolang je kijkt
    return () => clearInterval(id);
  }, [load]);

  async function onImport(f: File) {
    setImporting(true);
    try {
      const r = await importDegiro(await f.text());
      toast(`${r.instruments} fondsen geïmporteerd${r.unresolved.length ? `, ${r.unresolved.length} zonder live koers` : ''}`);
    } catch (e) {
      toast((e as Error).message);
    }
    setImporting(false);
  }

  const valued = positions.map((p) => value(p, prices[keyOf(p)] ?? null));
  const holdings = group(valued);
  const inv = totals(valued);
  const otherTotal = others.reduce((a, o) => a + o.value, 0);
  const total = inv.value + otherTotal;
  const missing = holdings.filter((h) => h.price == null);

  const series = useMemo(() => {
    const full = reconstruct(positions, history, today(), keyOf);
    const allHistory = positions.every((p) => (history[keyOf(p)] ?? []).length > 0);
    if (full.length && allHistory) full[full.length - 1].value = Math.round(inv.value * 100) / 100; // laatste punt = live
    // Begin waar voor álle aandelen echte koershistorie is (gratis bron: ~5 maanden, groeit vanzelf).
    const firsts = positions.filter((p) => p.kind === 'stock').map((p) => history[keyOf(p)]?.[0]?.date).filter(Boolean) as string[];
    const histStart = firsts.length ? firsts.sort().at(-1)! : '0000';
    const from = range ? addDays(today(), -range) : '0000';
    return full.filter((x) => x.date >= from && x.date >= histStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, sig, range, inv.value]);

  const donut = [
    ...holdings.filter((h) => h.value > 0).map((h) => ({ name: h.name, value: h.value })),
    ...others.filter((o) => o.value > 0).map((o) => ({ name: o.name, value: o.value })),
  ].sort((a, b) => b.value - a.value);

  const empty = positions.length === 0 && others.length === 0;

  return (
    <>
      <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />

      {!keys.av && positions.some((p) => p.kind === 'stock') && (
        <div className="banner"><AlertTriangle size={16} /><span>Geen Alpha Vantage-sleutel ingesteld: aandelen en ETF's staan op aankoopprijs. <a href="#/instellingen" style={{ color: 'var(--accent)' }}>Sleutel invullen</a></span></div>
      )}

      {empty ? (
        <section className="hero">
          <h2>Je portfolio</h2>
          <p className="sub">Exporteer je transacties uit DeGiro (Inbox → Transacties → Exporteer → CSV, vanaf je eerste aankoop) en laad het bestand hier. Koersen worden daarna live opgehaald.</p>
          <button className="btn primary block" onClick={() => file.current?.click()} disabled={importing}><Upload size={18} /> {importing ? 'Importeren…' : 'DeGiro-export laden'}</button>
          <button className="btn block" onClick={() => setAdding(true)}><Plus size={18} /> Of voeg zelf een positie toe</button>
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="label">Totaal vermogen in portfolio</div>
                <div className="figure" style={{ marginTop: 6 }}><CountUp value={total} format={fmtEur} /></div>
                {positions.length > 0 && <div className="sub num" style={{ marginTop: 6 }}>Beleggingen {inv.gain >= 0 ? '▲ +' : '▼ '}{fmtEur(inv.gain)} · {fmtPct(inv.gainPct)}</div>}
              </div>
              <button className="btn icon" aria-label="Koersen verversen" onClick={() => load(true)} disabled={loading}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
            </div>
          </section>

          <section className="panel stack">
            <Donut data={donut} size={190} center={<div><div className="faint tiny">{donut.length} onderdelen</div><div className="num small">{fmtEur0(total)}</div></div>} />
            <div className="legend">
              {donut.map((d, i) => (
                <div key={d.name} className="legend-row">
                  <span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="grow">{d.name}</span>
                  <span className="num muted">{fmtPct(d.value / total).replace('+', '')}</span>
                </div>
              ))}
            </div>
            {positions.length > 0 && <p className="faint tiny">{updatedAt ? `Koersen bijgewerkt ${updatedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Koersen ophalen…'}{missing.length > 0 && ` · ${missing.length} zonder live koers`}</p>}
          </section>

          {positions.length > 0 && (
            <section className="stack">
              <div className="section-head">
                <h2>Beleggingen over tijd</h2>
                <div className="row" style={{ gap: 4 }}>
                  {RANGES.map((r) => <button key={r.id} className="chip" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
                </div>
              </div>
              <div className="panel">
                {!keys.av && positions.every((p) => p.kind === 'stock') ? <Empty>Voor de grafiek over tijd is koershistorie nodig. <a href="#/instellingen" style={{ color: 'var(--accent)' }}>Vul je Alpha Vantage-sleutel in</a>.</Empty> : histLoading && Object.keys(history).length === 0 ? <div className="skeleton" style={{ height: 210 }} aria-label="Koershistorie laden" /> : series.length < 2 ? <Empty>De grafiek verschijnt zodra er koershistorie is.</Empty> : (
                  <AreaLine data={series} dataKey="value" name="Waarde" color="var(--accent)" baselineKey="cost" fmt={(n) => fmtEur0(n)} height={210} />
                )}
                <p className="faint tiny" style={{ marginTop: 8 }}>Stippellijn = wat je hebt ingelegd (incl. kosten). Overige bezittingen tellen niet mee. De gratis koersbron geeft ~5 maanden historie; de app bewaart vanaf nu elke dagkoers, dus de grafiek wordt vanzelf langer.</p>
              </div>
            </section>
          )}

          <section className="stack">
            <div className="section-head">
              <h2>Beleggingen</h2>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn small" onClick={() => file.current?.click()} disabled={importing}><Upload size={16} /> {importing ? 'Bezig…' : 'DeGiro'}</button>
                <button className="btn small icon" aria-label="Positie toevoegen" onClick={() => setAdding(true)}><Plus size={16} /></button>
              </div>
            </div>
            <div className="panel flush">
              {holdings.length === 0 ? <Empty>Nog geen beleggingen. Laad je DeGiro-export.</Empty> : (
                <ul className="list">
                  {holdings.map((h) => {
                    const gain = h.value - h.cost;
                    return (
                      <li key={h.key}>
                        <div className="grow">
                          <div className="title">{h.name}</div>
                          <div className="faint tiny num">{h.qty.toLocaleString('nl-NL')} × {h.price != null ? fmtEur(h.price) : 'geen koers'}{h.exchange ? ` · ${h.exchange}` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num">{fmtEur(h.value)}</div>
                          <div className={`tiny num ${gain >= 0 ? 'pos' : 'neg'}`}>{fmtPct(h.cost ? gain / h.cost : 0)}</div>
                        </div>
                        <button className="btn icon ghost" aria-label={`${h.name} verwijderen`} onClick={() => db.positions.bulkDelete(h.ids)}><Trash2 size={16} /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="faint tiny">Nieuwe aankoop gedaan? Exporteer opnieuw en laad het bestand: de DeGiro-posities worden dan vervangen, je handmatige posities blijven staan.</p>
          </section>
        </>
      )}

      <OtherAssets list={others} />

      <AddPositionSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/* Overige bezittingen: naam + bedrag, zelf bijhouden. */
function OtherAssets({ list }: { list: OtherAsset[] }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const v = parseNum(amount);
  return (
    <section className="stack">
      <div className="section-head"><h2>Overige bezittingen</h2><span className="num muted small">{fmtEur0(list.reduce((a, o) => a + o.value, 0))}</span></div>
      <div className="panel flush">
        {list.length > 0 && (
          <ul className="list">
            {list.map((o) => (
              <li key={o.id}>
                <div className="grow">
                  <div className="title">{o.name}</div>
                  <div className="faint tiny">bijgewerkt {fmtDay(o.updatedAt)}</div>
                </div>
                <input
                  className="input num"
                  style={{ width: 120, minHeight: 40, textAlign: 'right' }}
                  inputMode="decimal"
                  defaultValue={String(o.value).replace('.', ',')}
                  aria-label={`Waarde ${o.name}`}
                  onBlur={(e) => { const n = parseNum(e.target.value); if (n != null && n !== o.value) db.otherAssets.update(o.id!, { value: n, updatedAt: today() }); }}
                />
                <button className="btn icon ghost" aria-label={`${o.name} verwijderen`} onClick={() => db.otherAssets.delete(o.id!)}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        <form className="row" style={{ padding: 14 }} onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || v == null) return;
          await db.otherAssets.add({ name: name.trim(), value: v, updatedAt: today() });
          setName('');
          setAmount('');
        }}>
          <input className="input grow" placeholder="Bijv. pensioen, crypto, contant" value={name} onChange={(e) => setName(e.target.value)} aria-label="Naam" />
          <input className="input num" style={{ width: 110 }} inputMode="decimal" placeholder="€" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Bedrag" />
          <button className="btn icon primary" aria-label="Toevoegen" disabled={!name.trim() || v == null}><Plus size={18} /></button>
        </form>
      </div>
    </section>
  );
}
