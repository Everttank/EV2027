// React-hooks bovenop de database. useLiveQuery ververst automatisch bij wijzigingen.

import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS, type Settings } from './db';
import { energyPlan, macroTargets, sum, type EnergyPlan, type Macros } from '../lib/nutrition';
import { today } from '../lib/date';
import type { PriceKeys } from '../lib/prices';

export function useSettings(): Settings {
  return useSettingsState() ?? DEFAULT_SETTINGS;
}

/** undefined = nog aan het laden. Gebruik dit vóór je formulieren vult met instellingen. */
export function useSettingsState(): Settings | undefined {
  const row = useLiveQuery(async () => (await db.settings.get('main')) ?? null, []);
  return row === undefined ? undefined : row ?? DEFAULT_SETTINGS;
}

/** Meest recente gewicht (of null). */
export function useLatestWeight(): number | null {
  const w = useLiveQuery(() => db.weights.orderBy('date').last(), []);
  return w?.kg ?? null;
}

/** Sleutels voor koersen: uit Instellingen, of in ontwikkelmodus uit .env.local. */
export function priceKeys(s: Settings): PriceKeys {
  const dev = import.meta.env.DEV;
  return {
    av: s.alphaVantageKey || (dev ? (import.meta.env.VITE_ALPHA_VANTAGE_KEY as string | undefined) : undefined) || undefined,
    td: s.twelveDataKey || (dev ? (import.meta.env.VITE_TWELVE_DATA_KEY as string | undefined) : undefined) || undefined,
  };
}

export interface DayNutrition {
  eaten: Macros;
  burned: number;
  target: Macros | null; // null = profiel nog niet ingevuld
  budget: number | null; // doel + sport
  remaining: number | null;
  plan: EnergyPlan | null; // hoe het dagdoel is opgebouwd (null zonder profiel/gewicht)
  override: boolean; // eigen dagdoel ingesteld
}

export function useDayNutrition(date: string = today()): DayNutrition {
  const s = useSettings();
  const weight = useLatestWeight();
  const log = useLiveQuery(() => db.foodLog.where('date').equals(date).toArray(), [date]) ?? [];
  const workouts = useLiveQuery(() => db.workouts.where('date').equals(date).toArray(), [date]) ?? [];
  const eaten = sum(log.map((l) => l.macros));
  const burned = workouts.reduce((a, w) => a + w.kcal, 0);
  let target: Macros | null = null;
  let plan: EnergyPlan | null = null;
  if (s.profile && weight) {
    plan = energyPlan(s.profile, weight, s.weightGoalKg, s.profile.tempo ?? 0.5);
    const kcal = s.kcalTargetOverride ?? plan.target;
    target = macroTargets(kcal, weight, plan.direction);
  } else if (s.kcalTargetOverride) {
    target = { kcal: s.kcalTargetOverride, protein: 0, carbs: 0, fat: 0 };
  }
  const budget = target ? target.kcal + burned : null;
  return { eaten, burned, target, budget, remaining: budget != null ? budget - eaten.kcal : null, plan, override: s.kcalTargetOverride != null };
}
