// Voorbeelddata om de app te bekijken. Alle rijen krijgen `demo: true` zodat ze netjes
// weer weg kunnen zonder je echte data te raken.

import { db, getSettings, updateSettings, type Settings } from './db';
import { addDays, today } from '../lib/date';
import { categorize } from '../lib/categories';

const TABLES = ['foods', 'meals', 'foodLog', 'steps', 'workouts', 'weights', 'accounts', 'transactions', 'positions', 'checkins', 'otherAssets'] as const;
const LS = 'getij-demo-settings';

function rnd(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Voorbeelddata mag alleen in een lege app, zodat je echte data nooit wordt overschreven. */
export async function hasRealData(): Promise<boolean> {
  for (const name of TABLES) if ((await db.table(name).count()) > 0) return true;
  return false;
}

export async function loadDemo() {
  if (await hasRealData()) throw new Error('Voorbeelddata kan alleen in een lege app.');
  const r = rnd(42);
  const t = today();
  const s = await getSettings();
  const setKeys: (keyof Settings)[] = [];
  const patch: Partial<Settings> = { demo: true };
  if (!s.profile) { patch.profile = { sex: 'man', birthYear: 1997, heightCm: 182, activity: 'licht', goal: 'afvallen' }; setKeys.push('profile'); }
  if (!s.smoking) { patch.smoking = { quitAt: new Date(Date.now() - 23.4 * 86_400_000).toISOString(), perDay: 12, packPrice: 11.5, perPack: 20 }; setKeys.push('smoking'); }
  if (!s.weightGoalKg) { patch.weightGoalKg = 80; setKeys.push('weightGoalKg'); }
  localStorage.setItem(LS, JSON.stringify(setKeys));
  await updateSettings(patch);

  const D = { demo: true };
  const yog = await db.foods.add({ ...D, name: 'Griekse yoghurt 0%', brand: 'AH', per100: { kcal: 57, protein: 10, carbs: 4, fat: 0 }, defaultGrams: 150 });
  const oat = await db.foods.add({ ...D, name: 'Havermout', per100: { kcal: 372, protein: 13, carbs: 59, fat: 7 }, defaultGrams: 60 });
  const ban = await db.foods.add({ ...D, name: 'Banaan', per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, defaultGrams: 120 });
  const kip = await db.foods.add({ ...D, name: 'Kipfilet', per100: { kcal: 110, protein: 24, carbs: 0, fat: 1.5 }, defaultGrams: 150 });
  const rijst = await db.foods.add({ ...D, name: 'Zilvervliesrijst (gekookt)', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 1 }, defaultGrams: 200 });
  await db.meals.add({ ...D, name: 'Vast ontbijt: havermout', portions: 1, ingredients: [{ foodId: oat, grams: 60 }, { foodId: yog, grams: 150 }, { foodId: ban, grams: 120 }] });
  await db.meals.add({ ...D, name: 'Kip met rijst', portions: 2, ingredients: [{ foodId: kip, grams: 300 }, { foodId: rijst, grams: 400 }] });
  await db.foodLog.bulkAdd([
    { ...D, date: t, moment: 'ontbijt', kind: 'meal', name: 'Vast ontbijt: havermout', amount: 1, macros: { kcal: 416, protein: 24, carbs: 69, fat: 5 } },
    { ...D, date: t, moment: 'lunch', kind: 'quick', name: 'Broodjes kaas', amount: 1, macros: { kcal: 520, protein: 24, carbs: 58, fat: 19 } },
    { ...D, date: t, moment: 'snack', kind: 'food', name: 'Banaan', amount: 120, macros: { kcal: 107, protein: 1, carbs: 28, fat: 0 } },
  ]);

  const steps = [], weights = [], checkins = [], workouts = [];
  let kg = 86.4;
  for (let i = 120; i >= 0; i--) {
    const d = addDays(t, -i);
    if (i > 0) steps.push({ ...D, date: d, count: Math.round(5200 + r() * 7000) });
    kg += -0.045 + (r() - 0.5) * 0.5;
    if (i % 2 === 0 || r() > 0.6) weights.push({ ...D, date: d, kg: Math.round(kg * 10) / 10 });
    if (i < 40 && r() > 0.2) {
      const base = 6 + Math.sin(i / 5) * 1.5;
      const c = (x: number) => Math.max(1, Math.min(10, Math.round(base + x + (r() - 0.5) * 3)));
      checkins.push({ ...D, date: d, at: new Date(d).getTime() + 21 * 3600_000, scores: { Stemming: c(0.5), Energie: c(0), Stress: c(-2), Slaap: c(0.3), Focus: c(-0.5) }, text: ['Rustige dag gehad, veel gedaan gekregen op werk. Wel trek gehad na het eten, maar doorgezet.', 'Slecht geslapen en dat merkte ik de hele dag. Morgen eerder naar bed en minder koffie.', 'Goed gesport vanavond, voelde me sterk. Even gebeld met een vriend, dat deed me goed.', 'Druk in mijn hoofd over geld en planning. Opschrijven helpt, morgen lijstje maken.'][Math.floor(r() * 4)] });
    }
    if (i < 30 && r() > 0.68) workouts.push({ ...D, date: d, sportId: r() > 0.5 ? 'hardlopen' : 'kracht', name: r() > 0.5 ? 'Hardlopen (~10 km/u)' : 'Krachttraining', minutes: 30 + Math.round(r() * 40), kcal: 250 + Math.round(r() * 250) });
  }
  await db.steps.bulkPut(steps);
  await db.weights.bulkPut(weights);
  await db.checkins.bulkAdd(checkins);
  await db.workouts.bulkAdd(workouts);

  const BETAAL = 'NL00DEMO0000000001';
  const SPAAR = 'NL00DEMO0000000002';
  await db.accounts.bulkPut([{ ...D, iban: BETAAL, name: 'Betaalrekening (demo)', type: 'betaal' }, { ...D, iban: SPAAR, name: 'Spaarrekening (demo)', type: 'spaar' }]);
  const merchants = [['ALBERT HEIJN 1403', -8, -65], ['Jumbo Utrecht', -5, -40], ['Thuisbezorgd.nl', -18, -32], ['NS GROEP IZ NS REIZIGERS', -4, -25], ['Spotify', -11.99, -11.99], ['bol.com', -15, -80], ['Basic-Fit', -29.99, -29.99], ['Starbucks Utrecht', -3.5, -6]];
  const tx = [];
  let betaal = 1840, spaar = 6200;
  for (let i = 150; i >= 0; i--) {
    const d = addDays(t, -i);
    const day = Number(d.slice(8));
    if (day === 25) { betaal += 2650; tx.push({ account: BETAAL, date: d, amount: 2650, desc: '/TRTP/SEPA OVERBOEKING/NAME/Werkgever BV/REMI/Salaris' }); betaal -= 400; spaar += 400; tx.push({ account: BETAAL, date: d, amount: -400, desc: `/TRTP/SEPA OVERBOEKING/IBAN/${SPAAR}/NAME/Eigen spaar/REMI/Sparen` }); tx.push({ account: SPAAR, date: d, amount: 400, desc: `/TRTP/SEPA OVERBOEKING/IBAN/${BETAAL}/NAME/Eigen betaal/REMI/Sparen` }); }
    if (day === 1) { betaal -= 975; tx.push({ account: BETAAL, date: d, amount: -975, desc: '/TRTP/SEPA INCASSO/NAME/Woonstichting Huur/REMI/Huur' }); }
    const n = Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const [m, a, b] = merchants[Math.floor(r() * merchants.length)] as [string, number, number];
      const amt = Math.round((a + (b - a) * r()) * 100) / 100;
      betaal += amt;
      tx.push({ account: BETAAL, date: d, amount: amt, desc: `BEA, Google Pay ${m},PAS123` });
    }
    // saldo na elke transactie bijhouden
    for (const x of tx.filter((x) => x.date === d && (x as { bal?: number }).bal == null)) (x as { bal?: number }).bal = x.account === SPAAR ? spaar : betaal;
  }
  await db.transactions.bulkPut(tx.map((x, i) => ({ ...D, id: `demo${i}`, seq: i, account: x.account, date: x.date, amount: x.amount, balanceAfter: (x as { bal?: number }).bal ?? null, description: x.desc, counterparty: x.desc.match(/NAME\/([^/]+)/)?.[1] ?? x.desc.replace(/^BEA, Google Pay /, '').replace(/,PAS.*/, ''), category: categorize(x.desc, x.amount, [x.account === BETAAL ? SPAAR : BETAAL]) })));

  await db.positions.bulkAdd([
    { ...D, kind: 'stock', symbol: 'VWRL', exchange: 'Euronext', mic: 'XAMS', name: 'VWRL', quantity: 42, buyPrice: 104.2, buyDate: addDays(t, -400), manualPrice: 131.4 },
    { ...D, kind: 'stock', symbol: 'IWDA', exchange: 'Euronext', mic: 'XAMS', name: 'IWDA', quantity: 30, buyPrice: 82.5, buyDate: addDays(t, -250), manualPrice: 101.9 },
    { ...D, kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin', quantity: 0.035, buyPrice: 52000, buyDate: addDays(t, -300) },
    { ...D, kind: 'crypto', symbol: 'ethereum', name: 'Ethereum', quantity: 0.6, buyPrice: 2600, buyDate: addDays(t, -180) },
  ]);
}

export async function clearDemo() {
  for (const name of TABLES) {
    const table = db.table(name);
    const keys = await table.filter((row: { demo?: boolean }) => row.demo === true).primaryKeys();
    await table.bulkDelete(keys);
  }
  const keys = JSON.parse(localStorage.getItem(LS) ?? '[]') as (keyof Settings)[];
  const patch: Partial<Settings> = { demo: false };
  for (const k of keys) (patch as Record<string, undefined>)[k] = undefined;
  await updateSettings(patch);
  localStorage.removeItem(LS);
}
