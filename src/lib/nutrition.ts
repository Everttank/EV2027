// Voeding: dagdoel (Mifflin-St Jeor), macro's en voedingswaarden per portie.

export type Sex = 'man' | 'vrouw';
export type Activity = 'zittend' | 'licht' | 'matig' | 'actief' | 'zeer-actief';
export type Goal = 'afvallen' | 'behouden' | 'aankomen';

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  activity: Activity;
  goal: Goal; // gebruikt als er geen streefgewicht is
  tempo?: number; // kg per week richting streefgewicht (standaard 0,5)
}

export interface Macros {
  kcal: number;
  protein: number; // gram
  carbs: number; // gram
  fat: number; // gram
}

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  zittend: 1.2,
  licht: 1.375,
  matig: 1.55,
  actief: 1.725,
  'zeer-actief': 1.9,
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  zittend: 'Zittend (weinig beweging)',
  licht: 'Licht actief (1–3× per week sport)',
  matig: 'Matig actief (3–5× per week)',
  actief: 'Actief (6–7× per week)',
  'zeer-actief': 'Zeer actief (fysiek werk + sport)',
};

const GOAL_DELTA: Record<Goal, number> = { afvallen: -500, behouden: 0, aankomen: 300 };

/** Basaal metabolisme volgens Mifflin-St Jeor. */
export function bmr(p: Profile, weightKg: number, year = new Date().getFullYear()): number {
  const age = year - p.birthYear;
  const base = 10 * weightKg + 6.25 * p.heightCm - 5 * age;
  return p.sex === 'man' ? base + 5 : base - 161;
}

/** Dagdoel in kcal (zonder sport; sport-kcal komen er per dag bovenop). */
export function dailyTarget(p: Profile, weightKg: number, year?: number): number {
  const tdee = bmr(p, weightKg, year) * ACTIVITY_FACTOR[p.activity];
  return Math.round((tdee + GOAL_DELTA[p.goal]) / 10) * 10;
}

/** 1 kg lichaamsgewicht ≈ 7.700 kcal. */
export const KCAL_PER_KG = 7700;

export interface EnergyPlan {
  bmr: number; // ruststofwisseling
  tdee: number; // verbruik per dag incl. activiteit (zonder gelogde sport)
  delta: number; // tekort (negatief) of overschot per dag
  target: number; // dagbudget
  direction: Goal;
  tempo: number; // kg per week (0 bij behouden)
  weeksToGoal: number | null;
  floored: boolean; // budget opgehoogd naar een veilige ondergrens
}

/**
 * Dagbudget op basis van je huidige gewicht en je streefgewicht.
 * Met een streefgewicht volgt de richting (afvallen/aankomen) daar vanzelf uit, en bepaalt het
 * tempo (kg per week) het tekort: tempo × 7.700 / 7. Zonder streefgewicht geldt het gekozen doel.
 * Ondergrens: nooit onder je ruststofwisseling en niet onder 1.500 (man) / 1.200 (vrouw) kcal.
 */
export function energyPlan(p: Profile, weightKg: number, goalKg?: number | null, tempo = 0.5, year?: number): EnergyPlan {
  const b = bmr(p, weightKg, year);
  const tdee = b * ACTIVITY_FACTOR[p.activity];
  let direction: Goal = p.goal;
  if (goalKg != null) direction = Math.abs(weightKg - goalKg) < 0.5 ? 'behouden' : goalKg < weightKg ? 'afvallen' : 'aankomen';
  const t = direction === 'behouden' ? 0 : goalKg != null ? tempo : direction === 'afvallen' ? 500 / (KCAL_PER_KG / 7) : 300 / (KCAL_PER_KG / 7);
  const delta = direction === 'afvallen' ? -(t * KCAL_PER_KG) / 7 : direction === 'aankomen' ? (t * KCAL_PER_KG) / 7 : 0;
  const floor = Math.max(b, p.sex === 'man' ? 1500 : 1200);
  const raw = tdee + delta;
  const target = Math.round(Math.max(raw, floor) / 10) * 10;
  const realDelta = target - tdee;
  const weeksToGoal = goalKg != null && realDelta !== 0 ? Math.max(1, Math.round(Math.abs(weightKg - goalKg) / (Math.abs(realDelta) * 7 / KCAL_PER_KG))) : null;
  return { bmr: Math.round(b), tdee: Math.round(tdee), delta: Math.round(realDelta), target, direction, tempo: t, weeksToGoal: direction === 'behouden' ? null : weeksToGoal, floored: raw < floor };
}

/** Macro-doelen: eiwit 1,8 g/kg (2,0 bij afvallen), vet 25% van kcal, rest koolhydraten. */
export function macroTargets(kcal: number, weightKg: number, goal: Goal): Macros {
  const protein = Math.round(weightKg * (goal === 'afvallen' ? 2.0 : 1.8));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/** Voedingswaarden voor `grams` gram, uitgaande van waarden per 100 g. */
export function scale(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  };
}

export function sum(list: Macros[]): Macros {
  return list.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Open Food Facts geeft soms alleen kJ: 1 kcal = 4,184 kJ. */
export function kjToKcal(kj: number): number {
  return kj / 4.184;
}
