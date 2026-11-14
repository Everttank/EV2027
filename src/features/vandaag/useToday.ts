// Alle data voor het Vandaag-scherm op één plek (gedeeld door de stijlvarianten).

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { priceKeys, useDayNutrition, useSettings } from '../../db/hooks';
import { addDays, dayRange, today } from '../../lib/date';
import { smokeFree } from '../../lib/smoking';
import { latestBalances } from '../../lib/balances';
import { quoteEur, keyOf } from '../../lib/prices';
import { totals, value } from '../../lib/portfolio';
import { sum } from '../../lib/nutrition';
import { trend } from '../../lib/weight';

export const STEP_GOAL = 8000;
export const SPORT_GOAL_MIN = 30;

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useToday() {
  const t = today();
  const s = useSettings();
  const n = useDayNutrition(t);
  const now = useNow(1000);
  const steps = useLiveQuery(() => db.steps.get(t), [t])?.count ?? 0;
  const workouts = useLiveQuery(() => db.workouts.where('date').equals(t).toArray(), [t]) ?? [];
  const checkin = useLiveQuery(() => db.checkins.where('date').equals(t).last(), [t]);
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), []) ?? [];

  // Laatste 7 dagen voor weekstrip en balkjes
  const from = addDays(t, -6);
  const weekFood = useLiveQuery(() => db.foodLog.where('date').between(from, t, true, true).toArray(), [from, t]) ?? [];
  const weekSteps = useLiveQuery(() => db.steps.where('date').between(from, t, true, true).toArray(), [from, t]) ?? [];
  const weekSport = useLiveQuery(() => db.workouts.where('date').between(from, t, true, true).toArray(), [from, t]) ?? [];
  const budget = n.target?.kcal ?? null;
  const week = dayRange(from, t).map((d) => {
    const kcal = sum(weekFood.filter((f) => f.date === d).map((f) => f.macros)).kcal;
    const st = weekSteps.find((x) => x.date === d)?.count ?? 0;
    const min = weekSport.filter((w) => w.date === d).reduce((a, w) => a + w.minutes, 0);
    return { date: d, kcal, kcalPct: budget ? kcal / budget : 0, steps: st, stepsPct: st / STEP_GOAL, sportMin: min, sportPct: min / SPORT_GOAL_MIN };
  });

  const sportMin = workouts.reduce((a, w) => a + w.minutes, 0);
  const tr = trend(weights);
  const lastW = tr[tr.length - 1];
  const weekAgo = tr.filter((x) => x.date <= addDays(t, -7)).pop();

  return {
    date: t,
    nutrition: n,
    kcalPct: n.budget ? n.eaten.kcal / n.budget : 0,
    steps,
    stepsPct: steps / STEP_GOAL,
    sportMin,
    sportKcal: n.burned,
    sportPct: sportMin / SPORT_GOAL_MIN,
    checkin,
    weight: lastW ? { kg: lastW.kg, avg: lastW.avg, delta: weekAgo ? lastW.avg - weekAgo.avg : null, series: tr.slice(-30).map((x) => x.avg) } : null,
    weightGoal: s.weightGoalKg ?? null,
    smoke: s.smoking ? { ...smokeFree(s.smoking, now), perDay: s.smoking.perDay } : null,
    worth: useNetWorth(),
    week,
    now,
  };
}

function useNetWorth(): number | null {
  const s = useSettings();
  const tx = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const positions = useLiveQuery(() => db.positions.toArray(), []) ?? [];
  const others = useLiveQuery(() => db.otherAssets.toArray(), []) ?? [];
  const [port, setPort] = useState<number | null>(null);
  const keys = priceKeys(s);
  const sig = positions.map((p) => `${p.id}:${keyOf(p)}`).join(',');
  useEffect(() => {
    let alive = true;
    (async () => {
      const vals = [];
      for (const p of positions) vals.push(value(p, await quoteEur(p, keys)));
      if (alive) setPort(positions.length ? totals(vals).value : null);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, keys.av, keys.td]);
  const last = latestBalances(tx);
  const bank = [...last.values()].reduce((a, b) => a + b.balance, 0);
  const other = others.reduce((a, o) => a + o.value, 0);
  if (!last.size && port == null && !others.length) return null;
  return bank + (port ?? 0) + other;
}
