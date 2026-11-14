// Positie handmatig toevoegen (aandeel/ETF via Twelve Data-zoeken, crypto via CoinGecko).

import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { td, cg } from '../../lib/prices';
import type { AssetKind, Position } from '../../lib/portfolio';
import { today } from '../../lib/date';
import { parseNum } from '../../lib/format';
import { Empty, Field, Sheet, useToast } from '../../components/ui';

type Hit = { symbol: string; name: string; exchange?: string; mic?: string; currency?: string; detail: string };

export function AddPositionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<AssetKind>('stock');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState<Hit | null>(null);
  const [f, setF] = useState({ qty: '', price: '', date: today(), manual: '' });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        if (kind === 'crypto') setHits((await cg.search(q)).map((c) => ({ symbol: c.id, name: `${c.name} (${c.symbol})`, detail: 'CoinGecko' })));
        else setHits((await td.search(q)).map((h) => ({ symbol: h.symbol, name: h.name, exchange: h.exchange, mic: h.mic, currency: h.currency, detail: `${h.symbol} · ${h.exchange} · ${h.currency}` })));
      } catch {
        setHits([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q, kind]);

  const reset = () => { setSel(null); setQ(''); setHits([]); setF({ qty: '', price: '', date: today(), manual: '' }); onClose(); };
  const qty = parseNum(f.qty);
  const price = parseNum(f.price);

  return (
    <Sheet open={open} onClose={reset} title="Positie toevoegen">
      {!sel ? (
        <>
          <div className="row">
            <button className="chip" aria-pressed={kind === 'stock'} onClick={() => setKind('stock')}>Aandeel / ETF</button>
            <button className="chip" aria-pressed={kind === 'crypto'} onClick={() => setKind('crypto')}>Crypto</button>
          </div>
          <input className="input" autoFocus placeholder={kind === 'stock' ? 'Zoek op naam of ticker, bijv. VWRL' : 'Zoek, bijv. bitcoin'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoeken" />
          {kind === 'stock' && <p className="faint tiny">Kies de beurs waar je het echt hebt gekocht (bijv. Euronext in euro's).</p>}
          <div className="panel flush">
            {searching ? <div className="skeleton" style={{ height: 120, margin: 12 }} /> : hits.length === 0 ? <Empty>{q.length < 2 ? 'Typ minstens 2 tekens.' : 'Niets gevonden.'}</Empty> : (
              <ul className="list">
                {hits.map((h) => (
                  <li key={`${h.symbol}-${h.mic ?? h.exchange}`} onClick={() => setSel(h)} style={{ cursor: 'pointer' }}>
                    <div className="grow"><div className="title">{h.name}</div><div className="faint tiny">{h.detail}</div></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          if (!qty || price == null) return;
          const p: Position = { source: 'handmatig', kind, symbol: sel.symbol, exchange: sel.exchange, mic: sel.mic, currency: sel.currency, name: kind === 'stock' ? sel.symbol : sel.name.replace(/ \(.+\)$/, ''), quantity: qty, buyPrice: price, buyDate: f.date, manualPrice: parseNum(f.manual) ?? undefined };
          await db.positions.add(p);
          toast(`${p.name} toegevoegd`);
          reset();
        }}>
          <div><div style={{ fontWeight: 600 }}>{sel.name}</div><div className="faint small">{sel.detail}</div></div>
          <div className="grid2">
            <Field label="Aantal"><input className="input num" inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} autoFocus /></Field>
            <Field label="Aankoopprijs per stuk (€)"><input className="input num" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          </div>
          <Field label="Aankoopdatum" hint="Gebruikt voor de grafiek over tijd. Meerdere aankopen? Voeg ze los toe of gebruik je gemiddelde prijs."><input className="input" type="date" max={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Handmatige koers (optioneel)" hint="Alleen nodig als er geen live koers beschikbaar is."><input className="input num" inputMode="decimal" value={f.manual} onChange={(e) => setF({ ...f, manual: e.target.value })} /></Field>
          <div className="row">
            <button type="button" className="btn" onClick={() => setSel(null)}>Terug</button>
            <button className="btn primary grow" disabled={!qty || price == null}>Toevoegen</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
