// Stoppen met roken: live teller sinds de stopdatum en geld bespaard.

import { useEffect, useState } from 'react';
import { updateSettings } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { smokeFree, type SmokingSettings } from '../../lib/smoking';
import { fmtEur, fmtInt, parseNum } from '../../lib/format';
import { Field, useToast } from '../../components/ui';

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Roken() {
  const s = useSettings();
  const [editing, setEditing] = useState(false);
  if (!s.smoking || editing) return <SmokingForm initial={s.smoking} onDone={() => setEditing(false)} />;
  return <Ticker settings={s.smoking} onEdit={() => setEditing(true)} />;
}

export function Ticker({ settings, onEdit }: { settings: SmokingSettings; onEdit?: () => void }) {
  const now = useNow();
  const st = smokeFree(settings, now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <section className="hero" aria-live="off">
        <div className="label">Rookvrij sinds {new Date(settings.quitAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
          <span className="huge">{fmtInt(st.days)}</span><span className="unit">{st.days === 1 ? 'dag' : 'dagen'}</span>
        </div>
        <div className="figure md num" style={{ opacity: 0.75 }}>
          {pad(st.hours)}:{pad(st.minutes)}:{pad(st.seconds)}
        </div>
      </section>
      <section className="grid2">
        <div className="panel">
          <div className="faint tiny">Bespaard</div>
          <div className="figure sm" style={{ color: 'var(--accent)' }}>{fmtEur(st.saved)}</div>
        </div>
        <div className="panel">
          <div className="faint tiny">Niet gerookt</div>
          <div className="figure sm">{fmtInt(st.notSmoked)}<span className="unit">sigaretten</span></div>
        </div>
      </section>
      <p className="faint small">Per jaar scheelt dit <span className="num">{fmtEur((365 * settings.perDay / settings.perPack) * settings.packPrice)}</span>.</p>
      {onEdit && <button className="btn" onClick={onEdit}>Gegevens aanpassen</button>}
    </>
  );
}

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function SmokingForm({ initial, onDone }: { initial?: SmokingSettings; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    quitAt: toLocalInput(initial?.quitAt),
    perDay: String(initial?.perDay ?? 10),
    packPrice: String(initial?.packPrice ?? '11,50').replace('.', ','),
    perPack: String(initial?.perPack ?? 20),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="panel stack" onSubmit={async (e) => {
      e.preventDefault();
      await updateSettings({
        smoking: { quitAt: new Date(f.quitAt).toISOString(), perDay: parseNum(f.perDay) ?? 0, packPrice: parseNum(f.packPrice) ?? 0, perPack: parseNum(f.perPack) ?? 20 },
      });
      toast('Opgeslagen');
      onDone();
    }}>
      <h2>Stoppen met roken</h2>
      <p className="small muted">Vul in wanneer je bent gestopt en hoeveel je rookte, dan rekent de app uit wat je bespaart.</p>
      <Field label="Gestopt op"><input className="input" type="datetime-local" value={f.quitAt} onChange={set('quitAt')} /></Field>
      <div className="grid2">
        <Field label="Sigaretten per dag"><input className="input num" inputMode="numeric" value={f.perDay} onChange={set('perDay')} /></Field>
        <Field label="Per pakje"><input className="input num" inputMode="numeric" value={f.perPack} onChange={set('perPack')} /></Field>
      </div>
      <Field label="Prijs per pakje (€)"><input className="input num" inputMode="decimal" value={f.packPrice} onChange={set('packPrice')} /></Field>
      <div className="row">
        {initial && <button type="button" className="btn" onClick={onDone}>Annuleren</button>}
        <button className="btn primary grow">Opslaan</button>
      </div>
    </form>
  );
}
