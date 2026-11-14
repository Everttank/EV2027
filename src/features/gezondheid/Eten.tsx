// Kcal-teller: dagbudget, gelogd eten, toevoegen (zoeken/scannen/nieuw/snel) en vaste gerechten.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Flame, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { useDayNutrition } from '../../db/hooks';
import { CountUp, Empty, Hero } from '../../components/ui';
import { Rings } from '../../components/Rings';
import { addDays, today } from '../../lib/date';
import { fmtInt, fmtLongDay } from '../../lib/format';
import type { Macros } from '../../lib/nutrition';
import { AddFoodSheet } from './AddFood';
import { Meals } from './Meals';

export function Eten() {
  const [date, setDate] = useState(today());
  const n = useDayNutrition(date);
  const log = useLiveQuery(() => db.foodLog.where('date').equals(date).reverse().sortBy('id'), [date]) ?? [];
  const [adding, setAdding] = useState(false);
  const isToday = date === today();
  const level = n.budget ? n.eaten.kcal / n.budget : 0;

  return (
    <>
      <div className="row between">
        <button className="btn icon" aria-label="Vorige dag" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800 }}>{isToday ? 'Vandaag' : fmtLongDay(date)}</div>
          {isToday && <div className="faint tiny">{fmtLongDay(date)}</div>}
        </div>
        <button className="btn icon" aria-label="Volgende dag" disabled={isToday} onClick={() => setDate(addDays(date, 1))}><ChevronRight size={20} /></button>
      </div>

      <Hero
        icon={<Flame size={16} />}
        label={n.remaining == null ? 'Gegeten' : n.remaining >= 0 ? 'Kcal over' : 'Boven je budget'}
        right={n.budget != null ? <Rings size={92} stroke={12} rings={[{ pct: level, from: 'rgb(255 255 255 / 0.95)', to: '#fff' }]} /> : undefined}
      >
        <p className="huge"><CountUp value={Math.abs(n.remaining ?? n.eaten.kcal)} format={fmtInt} /></p>
        {n.budget != null ? (
          <p className="sub"><span className="num">{fmtInt(n.eaten.kcal)}</span> gegeten · <span className="num">{fmtInt(n.budget)}</span> budget{n.burned > 0 && <> · <span className="num">+{fmtInt(n.burned)}</span> sport</>}</p>
        ) : (
          <p className="sub">Vul je profiel en gewicht in voor je dagdoel. <a href="#/instellingen" style={{ color: 'inherit' }}>Naar instellingen</a></p>
        )}
      </Hero>

      <section className="panel stack">
        <MacroBars eaten={n.eaten} target={n.target} />
        {n.plan && !n.override && (
          <p className="faint tiny">
            Budget: <span className="num">{fmtInt(n.plan.tdee)}</span> verbruik {n.plan.delta < 0 ? '−' : '+'} <span className="num">{fmtInt(Math.abs(n.plan.delta))}</span> {n.plan.delta < 0 ? 'tekort' : 'overschot'}
            {n.plan.tempo ? <> ({String(n.plan.tempo).replace('.', ',')} kg/week)</> : null}{n.burned > 0 && <> + <span className="num">{fmtInt(n.burned)}</span> sport</>}. <a href="#/instellingen" style={{ color: 'inherit' }}>Aanpassen</a>
          </p>
        )}
      </section>

      <button className="btn primary block" onClick={() => setAdding(true)}><Plus size={18} /> Eten toevoegen</button>

      <section className="stack">
        <div className="section-head"><h2>Gegeten</h2><span className="faint small num">{log.length || ''}</span></div>
        <div className="panel flush">
          {log.length === 0 ? (
            <Empty>Nog niets gelogd{isToday ? ' vandaag' : ''}. Scan een verpakking of kies een vast gerecht.</Empty>
          ) : (
            <ul className="list">
              {log.map((l) => (
                <li key={l.id}>
                  <div className="grow">
                    <div className="title">{l.name}</div>
                    <div className="faint tiny num">{l.kind === 'meal' ? `${l.amount} portie${l.amount === 1 ? '' : 's'}` : l.kind === 'food' ? `${fmtInt(l.amount)} g` : 'snel'} · E {fmtInt(l.macros.protein)} · K {fmtInt(l.macros.carbs)} · V {fmtInt(l.macros.fat)}</div>
                  </div>
                  <span className="num">{fmtInt(l.macros.kcal)}</span>
                  <button className="btn icon ghost" aria-label={`${l.name} verwijderen`} onClick={() => db.foodLog.delete(l.id!)}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Meals date={date} />

      <AddFoodSheet open={adding} onClose={() => setAdding(false)} date={date} />
    </>
  );
}

function MacroBars({ eaten, target }: { eaten: Macros; target: Macros | null }) {
  const items = [
    { k: 'protein' as const, label: 'Eiwit', c: 'eten' },
    { k: 'carbs' as const, label: 'Koolh.', c: 'roken' },
    { k: 'fat' as const, label: 'Vet', c: 'sport' },
  ];
  return (
    <div className="bars">
      {items.map(({ k, label, c }) => {
        const t = target?.[k] || 0;
        const pct = t ? eaten[k] / t : 0;
        return (
          <div className="bar" key={k} data-area={c}>
            <div className="bar-head">
              <span className="muted">{label}</span>
              <span className="num">{fmtInt(eaten[k])}{t ? <span className="faint"> / {fmtInt(t)}</span> : ''} g</span>
            </div>
            <div className="bar-track"><div className={`bar-fill ${pct > 1.05 ? 'over' : ''}`} style={{ ['--w' as string]: Math.min(1, pct) }} /></div>
          </div>
        );
      })}
    </div>
  );
}
