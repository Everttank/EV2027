// Stappen: snel invullen (een web-app kan Health Connect / Google Fit niet uitlezen).

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../../db/db';
import { addDays, dayRange, today } from '../../lib/date';
import { fmtDay, fmtInt } from '../../lib/format';
import { Field, useToast } from '../../components/ui';

const GOAL = 8000;

export function Stappen() {
  const toast = useToast();
  const t = today();
  const [date, setDate] = useState(t);
  const existing = useLiveQuery(() => db.steps.get(date), [date]);
  const [value, setValue] = useState('');
  useEffect(() => setValue(existing ? String(existing.count) : ''), [existing, date]);

  const from = addDays(t, -13);
  const rows = useLiveQuery(() => db.steps.where('date').between(from, t, true, true).toArray(), [from, t]) ?? [];
  const byDay = new Map(rows.map((r) => [r.date, r.count]));
  const data = dayRange(from, t).map((d) => ({ date: d, stappen: byDay.get(d) ?? 0 }));
  const filled = rows.filter((r) => r.count > 0);
  const avg = filled.length ? filled.reduce((s, r) => s + r.count, 0) / filled.length : 0;

  const n = Number(value.replace(/\D/g, ''));
  return (
    <>
      <form className="hero" onSubmit={async (e) => {
        e.preventDefault();
        if (!n) return;
        await db.steps.put({ date, count: n });
        toast(`${fmtInt(n)} stappen opgeslagen`);
      }}>
        <div className="row between">
          <h2>Stappen</h2>
          <select className="select" style={{ width: 'auto', minHeight: 40 }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Dag">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(t, -i); return <option key={d} value={d}>{i === 0 ? 'Vandaag' : i === 1 ? 'Gisteren' : fmtDay(d, { weekday: 'long', day: 'numeric', month: 'short' })}</option>; })}
          </select>
        </div>
        <Field label="Aantal stappen" hint="Neem het getal over uit je Fit- of Health-app. Lang indrukken op het app-icoon brengt je direct hier.">
          <input className="big-input" inputMode="numeric" placeholder="0" value={value ? fmtInt(n) : ''} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <button className="btn primary block" disabled={!n}>{existing ? 'Bijwerken' : 'Opslaan'}</button>
      </form>

      <section className="stack">
        <div className="section-head"><h2>Laatste 2 weken</h2><span className="small muted">gem. <span className="num">{fmtInt(avg)}</span></span></div>
        <div className="panel">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} strokeDasharray="2 4" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(d) => fmtDay(d, { day: 'numeric' })} interval={1} />
              <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload }) => active && payload?.length ? <div className="chart-tip"><div className="faint tiny">{fmtDay(payload[0].payload.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div><div className="num">{fmtInt(payload[0].value as number)} stappen</div></div> : null} />
              <ReferenceLine y={GOAL} stroke="var(--text-3)" strokeDasharray="4 4" />
              <Bar dataKey="stappen" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="faint tiny" style={{ marginTop: 8 }}>Stippellijn = {fmtInt(GOAL)} stappen.</p>
        </div>
      </section>
    </>
  );
}
