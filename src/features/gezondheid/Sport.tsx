// Sporten: kies activiteit + duur; de app schat de kcal (MET × gewicht × tijd).

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { useLatestWeight } from '../../db/hooks';
import { SPORTS, sportKcal } from '../../lib/met';
import { addDays, today } from '../../lib/date';
import { fmtDay, fmtInt, parseNum } from '../../lib/format';
import { CountUp, Empty, Field, Hero, useToast } from '../../components/ui';

export function Sport() {
  const toast = useToast();
  const weight = useLatestWeight();
  const [sportId, setSportId] = useState(SPORTS[3].id);
  const [minutes, setMinutes] = useState('30');
  const [date, setDate] = useState(today());
  const sport = SPORTS.find((s) => s.id === sportId)!;
  const min = parseNum(minutes) ?? 0;
  const kcal = weight ? sportKcal(sport.met, weight, min) : 0;

  const since = addDays(today(), -30);
  const list = useLiveQuery(() => db.workouts.where('date').aboveOrEqual(since).reverse().sortBy('date'), [since]) ?? [];
  const weekFrom = addDays(today(), -6);
  const week = list.filter((w) => w.date >= weekFrom);

  const weekMin = week.reduce((s, w) => s + w.minutes, 0);
  return (
    <>
      <Hero icon={<Dumbbell size={16} />} label="Deze week">
        <p className="huge"><CountUp value={weekMin} /><span className="unit">min</span></p>
        <p className="sub"><span className="num">{week.length}×</span> gesport · <span className="num">{fmtInt(week.reduce((s, w) => s + w.kcal, 0))}</span> kcal verbrand</p>
      </Hero>

      <form className="panel stack" onSubmit={async (e) => {
        e.preventDefault();
        if (!min || !weight) return;
        await db.workouts.add({ date, sportId, name: sport.name, minutes: min, kcal });
        toast(`${sport.name} opgeslagen`);
      }}>
        <h2>Sport toevoegen</h2>
        <Field label="Activiteit">
          <select className="select" value={sportId} onChange={(e) => setSportId(e.target.value)}>
            {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Duur (minuten)"><input className="input num" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
          <Field label="Dag">
            <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
              {[0, 1, 2, 3].map((i) => { const d = addDays(today(), -i); return <option key={d} value={d}>{i === 0 ? 'Vandaag' : i === 1 ? 'Gisteren' : fmtDay(d, { weekday: 'short', day: 'numeric' })}</option>; })}
            </select>
          </Field>
        </div>
        <div className="row between">
          <span className="small muted">Geschat verbruik</span>
          {weight ? <span className="figure sm"><CountUp value={kcal} /><span className="unit">kcal</span></span> : <span className="small muted">Vul eerst je gewicht in</span>}
        </div>
        <button className="btn primary block" disabled={!min || !weight}>Opslaan</button>
        <p className="faint tiny">Schatting op basis van MET-waarden en je laatste gewicht. Deze kcal komen bij je eetbudget van die dag.</p>
      </form>

      <section className="stack">
        <div className="section-head"><h2>Afgelopen 30 dagen</h2><span className="small muted">deze week <span className="num">{week.length}×</span> · <span className="num">{fmtInt(week.reduce((s, w) => s + w.minutes, 0))}</span> min</span></div>
        <div className="panel flush">
          {list.length === 0 ? <Empty>Nog geen trainingen gelogd.</Empty> : (
            <ul className="list">
              {list.map((w) => (
                <li key={w.id}>
                  <div className="grow"><div className="title">{w.name}</div><div className="faint tiny">{fmtDay(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · <span className="num">{w.minutes}</span> min</div></div>
                  <span className="num">{fmtInt(w.kcal)} kcal</span>
                  <button className="btn icon ghost" aria-label="Verwijderen" onClick={() => db.workouts.delete(w.id!)}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
