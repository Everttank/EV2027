// Gewicht: invullen, grafiek met 7-daags gemiddelde en streefgewicht.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { db, updateSettings } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { trend, bmi } from '../../lib/weight';
import { addDays, today } from '../../lib/date';
import { fmt1, fmtDay, parseNum } from '../../lib/format';
import { Lines } from '../../components/charts';
import { Empty, Field, useToast } from '../../components/ui';

const RANGES = [
  { id: 30, label: '30 d' },
  { id: 90, label: '3 mnd' },
  { id: 365, label: '1 jaar' },
  { id: 0, label: 'Alles' },
];

export function Gewicht() {
  const toast = useToast();
  const s = useSettings();
  const all = useLiveQuery(() => db.weights.orderBy('date').toArray(), []) ?? [];
  const [kg, setKg] = useState('');
  const [range, setRange] = useState(90);
  const [goal, setGoal] = useState<string | null>(null);

  const t = trend(all);
  const from = range ? addDays(today(), -range) : '0000';
  const data = t.filter((x) => x.date >= from);
  const last = t[t.length - 1];
  const first = data[0];
  const goalKg = s.weightGoalKg;
  const v = parseNum(kg);

  return (
    <>
      <form className="hero" onSubmit={async (e) => {
        e.preventDefault();
        if (!v || v < 25 || v > 350) return;
        await db.weights.put({ date: today(), kg: v });
        setKg('');
        toast(`${fmt1(v)} kg opgeslagen`);
      }}>
        <div className="row between">
          <h2>Gewicht vandaag</h2>
          {last && <span className="sub">trend <span className="num">{fmt1(last.avg)}</span> kg</span>}
        </div>
        <div className="row">
          <input className="big-input grow" inputMode="decimal" placeholder={last ? fmt1(last.kg) : '0,0'} value={kg} onChange={(e) => setKg(e.target.value)} aria-label="Gewicht in kg" />
          <span className="unit">kg</span>
        </div>
        <button className="btn primary block" disabled={!v}>Opslaan</button>
      </form>

      <section className="stack">
        <div className="section-head">
          <h2>Verloop</h2>
          <div className="row" style={{ gap: 4 }}>
            {RANGES.map((r) => <button key={r.id} className="chip" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
          </div>
        </div>
        <div className="panel stack">
          {data.length < 2 ? <Empty>Na twee metingen verschijnt hier je grafiek.</Empty> : (
            <>
              <div className="grid3">
                <div><div className="faint tiny">Trend (7 d)</div><div className="figure sm">{fmt1(last.avg)}<span className="unit">kg</span></div></div>
                <div><div className="faint tiny">Verschil periode</div><div className={`figure sm ${last.avg - first.avg <= 0 ? '' : ''}`}>{last.avg - first.avg > 0 ? '+' : ''}{fmt1(last.avg - first.avg)}<span className="unit">kg</span></div></div>
                <div><div className="faint tiny">{goalKg ? 'Nog te gaan' : 'BMI'}</div><div className="figure sm">{goalKg ? `${fmt1(Math.abs(last.avg - goalKg))}` : s.profile ? fmt1(bmi(last.avg, s.profile.heightCm)) : '–'}{goalKg && <span className="unit">kg</span>}</div></div>
              </div>
              <Lines
                data={data}
                fmt={(n) => fmt1(n)}
                height={220}
                goal={goalKg ? { value: goalKg, label: `doel ${fmt1(goalKg)}` } : undefined}
                domain={[(min: number) => Math.floor(Math.min(min, goalKg ?? min) - 1), (max: number) => Math.ceil(Math.max(max, goalKg ?? max) + 1)] as never}
                series={[
                  { key: 'kg', name: 'Meting', color: 'var(--text-3)', dot: true, dashed: true },
                  { key: 'avg', name: 'Trend', color: 'var(--accent)' },
                ]}
              />
              <p className="faint tiny">De doorgetrokken lijn is het gemiddelde van 7 dagen. Dagelijkse schommelingen (vocht, zout) tellen zo minder mee.</p>
            </>
          )}
        </div>
      </section>

      <section className="panel stack">
        <h2>Streefgewicht</h2>
        <div className="row">
          <Field label="Doel (kg)">
            <input className="input num" inputMode="decimal" value={goal ?? (goalKg ? fmt1(goalKg) : '')} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <button className="btn" style={{ alignSelf: 'end' }} onClick={async () => {
            const g = parseNum(goal ?? '');
            await updateSettings({ weightGoalKg: g ?? undefined });
            setGoal(null);
            toast(g ? 'Streefgewicht opgeslagen' : 'Streefgewicht verwijderd');
          }}>Opslaan</button>
        </div>
      </section>

      {all.length > 0 && (
        <section className="stack">
          <h2>Metingen</h2>
          <div className="panel flush">
            <ul className="list">
              {[...all].reverse().slice(0, 20).map((w) => (
                <li key={w.date}>
                  <div className="grow">{fmtDay(w.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <span className="num">{fmt1(w.kg)} kg</span>
                  <button className="btn icon ghost" aria-label="Verwijderen" onClick={() => db.weights.delete(w.date)}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
