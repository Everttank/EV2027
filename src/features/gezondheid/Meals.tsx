// Vaste gerechten: één keer samenstellen uit producten, daarna met één tik loggen.

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db, type Food, type Meal } from '../../db/db';
import { Empty, Field, Sheet, useToast } from '../../components/ui';
import { fmtInt, parseNum } from '../../lib/format';
import { logMeal, mealPerPortion } from './foodData';

/* ── Vaste gerechten ───────────────────────────────── */

export function Meals({ date }: { date: string }) {
  const meals = useLiveQuery(() => db.meals.toArray(), []) ?? [];
  const foodsArr = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const foods = useMemo(() => new Map(foodsArr.map((f) => [f.id!, f])), [foodsArr]);
  const [editing, setEditing] = useState<Meal | 'new' | null>(null);
  const toast = useToast();
  return (
    <section className="stack">
      <div className="section-head">
        <h2>Vaste gerechten</h2>
        <button className="btn small" onClick={() => setEditing('new')}><Plus size={16} /> Nieuw</button>
      </div>
      <div className="panel flush">
        {meals.length === 0 ? (
          <Empty>Stel een gerecht één keer samen uit producten (bijv. je vaste ontbijt) en log het daarna met één tik.</Empty>
        ) : (
          <ul className="list">
            {meals.map((m) => {
              const p = mealPerPortion(m, foods);
              return (
                <li key={m.id}>
                  <button className="grow" style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => setEditing(m)}>
                    <div className="title">{m.name}</div>
                    <div className="faint tiny"><span className="num">{fmtInt(p.kcal)}</span> kcal per portie · {m.ingredients.length} ingrediënt{m.ingredients.length === 1 ? '' : 'en'}</div>
                  </button>
                  <button className="btn small" onClick={async () => { await logMeal(date, m, 1, foods); toast(`${m.name} gelogd`); }}><Plus size={16} /> Log</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <MealEditor meal={editing} onClose={() => setEditing(null)} foods={foodsArr} />
    </section>
  );
}

function MealEditor({ meal, onClose, foods }: { meal: Meal | 'new' | null; onClose: () => void; foods: Food[] }) {
  const open = meal != null;
  const initial = meal && meal !== 'new' ? meal : null;
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Gerecht bewerken' : 'Nieuw gerecht'}>
      {open && <MealForm key={initial?.id ?? 'new'} initial={initial} foods={foods} onClose={onClose} />}
    </Sheet>
  );
}

function MealForm({ initial, foods, onClose }: { initial: Meal | null; foods: Food[]; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [portions, setPortions] = useState(String(initial?.portions ?? 1));
  const [items, setItems] = useState(initial?.ingredients ?? []);
  const [foodId, setFoodId] = useState<string>('');
  const [grams, setGrams] = useState('100');
  const map = new Map(foods.map((f) => [f.id!, f]));
  const per = mealPerPortion({ name, portions: parseNum(portions) ?? 1, ingredients: items }, map);
  const valid = name.trim() && items.length > 0;
  return (
    <div className="stack">
      <Field label="Naam"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Havermout met banaan" /></Field>
      <Field label="Aantal porties dat dit recept oplevert"><input className="input num" inputMode="decimal" value={portions} onChange={(e) => setPortions(e.target.value)} /></Field>
      <div className="panel flush">
        {items.length === 0 ? <Empty>Voeg hieronder ingrediënten toe.</Empty> : (
          <ul className="list">
            {items.map((it, i) => (
              <li key={i}>
                <div className="grow"><div className="title">{map.get(it.foodId)?.name ?? 'Onbekend product'}</div><div className="faint tiny num">{fmtInt(it.grams)} g</div></div>
                <button className="btn icon ghost" aria-label="Verwijderen" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {foods.length === 0 ? (
        <p className="small muted">Je hebt nog geen producten. Voeg ze eerst toe via "Eten toevoegen", dan kun je ze hier gebruiken.</p>
      ) : (
        <div className="row">
          <select className="select grow" value={foodId} onChange={(e) => setFoodId(e.target.value)} aria-label="Product">
            <option value="">Kies product…</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input className="input num" style={{ width: 84 }} inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Gram" />
          <button className="btn icon" aria-label="Ingrediënt toevoegen" disabled={!foodId} onClick={() => { setItems([...items, { foodId: Number(foodId), grams: parseNum(grams) ?? 100 }]); setFoodId(''); }}><Plus size={18} /></button>
        </div>
      )}
      <p className="small muted">Per portie: <span className="num">{fmtInt(per.kcal)}</span> kcal · E <span className="num">{fmtInt(per.protein)}</span> · K <span className="num">{fmtInt(per.carbs)}</span> · V <span className="num">{fmtInt(per.fat)}</span></p>
      <div className="row">
        {initial && <button className="btn danger" onClick={async () => { await db.meals.delete(initial.id!); onClose(); }}>Verwijderen</button>}
        <button className="btn primary grow" disabled={!valid} onClick={async () => {
          const m: Meal = { ...(initial ?? {}), name: name.trim(), portions: parseNum(portions) ?? 1, ingredients: items };
          await db.meals.put(m);
          onClose();
        }}>Opslaan</button>
      </div>
    </div>
  );
}
