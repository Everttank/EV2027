// Eten toevoegen: zoeken in eigen producten/gerechten, barcode scannen, nieuw product of snel kcal.

import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus, ScanBarcode, Search, UtensilsCrossed, Zap } from 'lucide-react';
import { db, type Food, type Meal } from '../../db/db';
import { Empty, Field, Sheet, useToast } from '../../components/ui';
import { Scanner } from '../../components/Scanner';
import { fmtInt, parseNum } from '../../lib/format';
import { scale } from '../../lib/nutrition';
import { lookupBarcode } from '../../lib/openfoodfacts';
import { logFood, logMeal, mealPerPortion } from './foodData';

/* ── Toevoegen ─────────────────────────────────────── */

type Mode = 'zoeken' | 'scannen' | 'nieuw' | 'snel';
type Pick = { type: 'food'; food: Food } | { type: 'meal'; meal: Meal };

export function AddFoodSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const [mode, setMode] = useState<Mode>('zoeken');
  const [pick, setPick] = useState<Pick | null>(null);
  const [prefillEan, setPrefillEan] = useState<string>('');
  const close = () => {
    setPick(null);
    setMode('zoeken');
    onClose();
  };
  const modes: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'zoeken', label: 'Zoeken', icon: <Search size={16} /> },
    { id: 'scannen', label: 'Scannen', icon: <ScanBarcode size={16} /> },
    { id: 'nieuw', label: 'Nieuw', icon: <Plus size={16} /> },
    { id: 'snel', label: 'Snel', icon: <Zap size={16} /> },
  ];
  return (
    <Sheet open={open} onClose={close} title={pick ? 'Hoeveel?' : 'Eten toevoegen'}>
      {pick ? (
        <AmountStep pick={pick} date={date} onDone={close} onBack={() => setPick(null)} />
      ) : (
        <>
          <div className="row wrap" role="tablist">
            {modes.map((m) => (
              <button key={m.id} role="tab" className="chip" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.icon}{m.label}</button>
            ))}
          </div>
          {mode === 'zoeken' && <SearchStep onPick={setPick} />}
          {mode === 'scannen' && <ScanStep onPick={setPick} onUnknown={(ean) => { setPrefillEan(ean); setMode('nieuw'); }} />}
          {mode === 'nieuw' && <NewFoodStep ean={prefillEan} onSaved={(food) => setPick({ type: 'food', food })} />}
          {mode === 'snel' && <QuickStep date={date} onDone={close} />}
        </>
      )}
    </Sheet>
  );
}

function SearchStep({ onPick }: { onPick: (p: Pick) => void }) {
  const [q, setQ] = useState('');
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const meals = useLiveQuery(() => db.meals.toArray(), []) ?? [];
  const needle = q.trim().toLowerCase();
  const fMatch = foods.filter((f) => !needle || `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(needle)).slice(0, 30);
  const mMatch = meals.filter((m) => !needle || m.name.toLowerCase().includes(needle));
  return (
    <>
      <input className="input" placeholder="Zoek in je producten en gerechten" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Zoeken" />
      <div className="panel flush">
        {fMatch.length + mMatch.length === 0 ? (
          <Empty>{foods.length === 0 ? 'Nog geen producten. Scan een verpakking of maak er een aan via "Nieuw".' : 'Niets gevonden.'}</Empty>
        ) : (
          <ul className="list">
            {mMatch.map((m) => (
              <li key={`m${m.id}`} onClick={() => onPick({ type: 'meal', meal: m })} style={{ cursor: 'pointer' }}>
                <UtensilsCrossed size={16} className="faint" />
                <div className="grow"><div className="title">{m.name}</div><div className="faint tiny">Vast gerecht</div></div>
                <ChevronRight size={16} className="faint" />
              </li>
            ))}
            {fMatch.map((f) => (
              <li key={`f${f.id}`} onClick={() => onPick({ type: 'food', food: f })} style={{ cursor: 'pointer' }}>
                <div className="grow"><div className="title">{f.name}</div><div className="faint tiny">{f.brand ? `${f.brand} · ` : ''}<span className="num">{fmtInt(f.per100.kcal)}</span> kcal / 100 g</div></div>
                <ChevronRight size={16} className="faint" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ScanStep({ onPick, onUnknown }: { onPick: (p: Pick) => void; onUnknown: (ean: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const handle = useCallback(async (code: string) => {
    setBusy(code);
    setMsg(null);
    try {
      const local = await db.foods.where('ean').equals(code).first();
      if (local) return onPick({ type: 'food', food: local });
      const p = await lookupBarcode(code);
      if (!p) {
        setMsg('Product niet gevonden in Open Food Facts. Vul de waarden zelf in.');
        return onUnknown(code);
      }
      const food: Food = { name: p.name, brand: p.brand, ean: p.ean, per100: p.per100, defaultGrams: p.servingGrams ?? 100 };
      food.id = await db.foods.add(food);
      onPick({ type: 'food', food });
    } catch {
      setMsg('Opzoeken lukte niet. Ben je online?');
      setBusy(null);
    }
  }, [onPick, onUnknown]);
  return (
    <>
      {busy ? <div className="skeleton" style={{ height: 200 }} aria-label="Product opzoeken" /> : <Scanner onResult={handle} />}
      {msg && <p className="error">{msg}</p>}
      <p className="faint small">Richt op de streepjescode. Voedingswaarden komen uit Open Food Facts.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) handle(manual.trim()); }}>
        <input className="input grow" inputMode="numeric" placeholder="Of typ de code (EAN)" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} aria-label="Streepjescode" />
        <button className="btn" disabled={!manual}>Zoek</button>
      </form>
    </>
  );
}

function NewFoodStep({ ean, onSaved }: { ean: string; onSaved: (f: Food) => void }) {
  const [f, setF] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', grams: '100' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const kcal = parseNum(f.kcal);
  const valid = f.name.trim() && kcal != null;
  const save = async () => {
    const food: Food = {
      name: f.name.trim(),
      brand: f.brand.trim() || undefined,
      ean: ean || undefined,
      per100: { kcal: kcal!, protein: parseNum(f.protein) ?? 0, carbs: parseNum(f.carbs) ?? 0, fat: parseNum(f.fat) ?? 0 },
      defaultGrams: parseNum(f.grams) ?? 100,
    };
    food.id = await db.foods.add(food);
    onSaved(food);
  };
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}>
      {ean && <p className="faint small">Code <span className="num">{ean}</span>: hij wordt herkend als je hem de volgende keer scant.</p>}
      <Field label="Naam"><input className="input" value={f.name} onChange={set('name')} placeholder="Bijv. Griekse yoghurt" /></Field>
      <Field label="Merk (optioneel)"><input className="input" value={f.brand} onChange={set('brand')} /></Field>
      <p className="small muted">Per 100 gram:</p>
      <div className="grid2">
        <Field label="Kcal"><input className="input num" inputMode="decimal" value={f.kcal} onChange={set('kcal')} /></Field>
        <Field label="Eiwit (g)"><input className="input num" inputMode="decimal" value={f.protein} onChange={set('protein')} /></Field>
        <Field label="Koolhydraten (g)"><input className="input num" inputMode="decimal" value={f.carbs} onChange={set('carbs')} /></Field>
        <Field label="Vet (g)"><input className="input num" inputMode="decimal" value={f.fat} onChange={set('fat')} /></Field>
      </div>
      <Field label="Standaardportie (g)"><input className="input num" inputMode="decimal" value={f.grams} onChange={set('grams')} /></Field>
      <button className="btn primary block" disabled={!valid}>Opslaan en verder</button>
    </form>
  );
}

function QuickStep({ date, onDone }: { date: string; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const v = parseNum(kcal);
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      if (v == null) return;
      await db.foodLog.add({ date, moment: 'snack', kind: 'quick', name: name.trim() || 'Snel toegevoegd', amount: 1, macros: { kcal: v, protein: 0, carbs: 0, fat: 0 } });
      toast(`${fmtInt(v)} kcal toegevoegd`);
      onDone();
    }}>
      <p className="small muted">Voor als je het niet precies weet, bijvoorbeeld uit eten.</p>
      <Field label="Omschrijving"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. pizza bij vrienden" /></Field>
      <Field label="Kcal"><input className="input num" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></Field>
      <button className="btn primary block" disabled={v == null}>Toevoegen</button>
    </form>
  );
}

function AmountStep({ pick, date, onDone, onBack }: { pick: Pick; date: string; onDone: () => void; onBack: () => void }) {
  const toast = useToast();
  const foodsArr = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const foods = useMemo(() => new Map(foodsArr.map((f) => [f.id!, f])), [foodsArr]);
  const isMeal = pick.type === 'meal';
  const [amount, setAmount] = useState(isMeal ? '1' : String(pick.food.defaultGrams));
  const a = parseNum(amount) ?? 0;
  const preview = pick.type === 'meal'
    ? (() => { const p = mealPerPortion(pick.meal, foods); return { kcal: p.kcal * a, protein: p.protein * a, carbs: p.carbs * a, fat: p.fat * a }; })()
    : scale(pick.food.per100, a);
  const name = pick.type === 'meal' ? pick.meal.name : pick.food.name;
  const quick = isMeal ? [0.5, 1, 1.5, 2] : [50, 100, 150, 250];

  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      if (a <= 0) return;
      if (pick.type === 'meal') await logMeal(date, pick.meal, a, foods);
      else await logFood(date, pick.food, a);
      toast(`${name} toegevoegd`);
      onDone();
    }}>
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {pick.type === 'food' && pick.food.brand && <div className="faint small">{pick.food.brand}</div>}
      </div>
      <Field label={isMeal ? 'Porties' : 'Gram'}>
        <input className="big-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <div className="row wrap">
        {quick.map((q) => <button type="button" key={q} className="chip" aria-pressed={a === q} onClick={() => setAmount(String(q).replace('.', ','))}>{String(q).replace('.', ',')}{isMeal ? '' : ' g'}</button>)}
      </div>
      <div className="grid3 small">
        <div><div className="faint tiny">Kcal</div><div className="num figure sm">{fmtInt(preview.kcal)}</div></div>
        <div><div className="faint tiny">Eiwit</div><div className="num">{fmtInt(preview.protein)} g</div></div>
        <div><div className="faint tiny">Koolh. / vet</div><div className="num">{fmtInt(preview.carbs)} / {fmtInt(preview.fat)} g</div></div>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={onBack}>Terug</button>
        <button className="btn primary grow" disabled={a <= 0}>Toevoegen</button>
      </div>
    </form>
  );
}
