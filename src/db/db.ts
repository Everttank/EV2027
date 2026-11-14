// Lokale database (IndexedDB via Dexie). Alles blijft op dit apparaat.
// Een tabel toevoegen? Verhoog het versienummer en voeg een nieuwe .version(n).stores() toe.

import Dexie, { type Table } from 'dexie';
import type { Macros, Profile } from '../lib/nutrition';
import type { SmokingSettings } from '../lib/smoking';
import type { Position, PricePoint } from '../lib/portfolio';
import type { CategoryRule } from '../lib/categories';

export interface Settings {
  id: 'main';
  profile?: Profile;
  kcalTargetOverride?: number;
  weightGoalKg?: number;
  smoking?: SmokingSettings;
  checkinTopics: string[];
  pinHash?: string;
  reminders: { checkinTime?: string; weighDay?: number; enabled: boolean };
  twelveDataKey?: string; // wisselkoersen + zoeken
  alphaVantageKey?: string; // koersen aandelen/ETF's
  demo?: boolean;
}

export interface Food {
  id?: number;
  name: string;
  brand?: string;
  ean?: string;
  per100: Macros;
  defaultGrams: number;
}

export interface MealIngredient {
  foodId: number;
  grams: number;
}

export interface Meal {
  id?: number;
  name: string;
  ingredients: MealIngredient[];
  portions: number; // het recept is voor zoveel porties
}

export type MealMoment = 'ontbijt' | 'lunch' | 'avond' | 'snack';

export interface FoodLogEntry {
  id?: number;
  date: string;
  moment: MealMoment;
  kind: 'food' | 'meal' | 'quick';
  refId?: number;
  name: string;
  amount: number; // gram (food) of porties (meal)
  macros: Macros; // momentopname: later wijzigen van een gerecht verandert oude dagen niet
}

export interface StepsEntry {
  date: string;
  count: number;
}

export interface Workout {
  id?: number;
  date: string;
  sportId: string;
  name: string;
  minutes: number;
  kcal: number;
}

export interface WeightRow {
  date: string;
  kg: number;
}

export interface Account {
  iban: string;
  name: string;
  type: 'betaal' | 'spaar';
}

export interface Transaction {
  id: string;
  account: string;
  date: string;
  amount: number;
  balanceAfter: number | null;
  seq?: number;
  description: string;
  counterparty: string;
  category: string;
}

export interface PriceCacheRow {
  key: string; // 'stock:VWRL:Euronext' of 'crypto:bitcoin' of 'fx:USD/EUR'
  price: number;
  fetchedAt: number;
}

export interface HistoryCacheRow {
  key: string;
  points: PricePoint[];
  fetchedAt: number;
}

/** Overige bezittingen met een vaste waarde (pensioen, contant, crypto elders…). */
export interface OtherAsset {
  id?: number;
  name: string;
  value: number;
  updatedAt: string; // YYYY-MM-DD
}

export interface Checkin {
  id?: number;
  date: string;
  at: number;
  scores: Record<string, number>;
  text: string;
}

// Interne naam 'getij' (de oorspronkelijke werknaam) blijft staan: wijzigen = data kwijt.
class GetijDB extends Dexie {
  settings!: Table<Settings, string>;
  foods!: Table<Food, number>;
  meals!: Table<Meal, number>;
  foodLog!: Table<FoodLogEntry, number>;
  steps!: Table<StepsEntry, string>;
  workouts!: Table<Workout, number>;
  weights!: Table<WeightRow, string>;
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  categoryRules!: Table<CategoryRule, number>;
  positions!: Table<Position, number>;
  priceCache!: Table<PriceCacheRow, string>;
  historyCache!: Table<HistoryCacheRow, string>;
  checkins!: Table<Checkin, number>;
  otherAssets!: Table<OtherAsset, number>;

  constructor() {
    super('getij');
    this.version(1).stores({
      settings: 'id',
      foods: '++id, name, ean',
      meals: '++id, name',
      foodLog: '++id, date',
      steps: 'date',
      workouts: '++id, date',
      weights: 'date',
      accounts: 'iban',
      transactions: 'id, date, account, category',
      categoryRules: '++id',
      positions: '++id, symbol',
      priceCache: 'key',
      historyCache: 'key',
      checkins: '++id, date',
    });
    // v2: overige bezittingen + DeGiro-herkomst van posities
    this.version(2).stores({
      otherAssets: '++id',
      positions: '++id, symbol, source',
    });
  }
}

export const db = new GetijDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  checkinTopics: ['Stemming', 'Energie', 'Stress', 'Slaap', 'Focus'],
  reminders: { enabled: false, checkinTime: '21:00', weighDay: 1 },
};

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: 'main' });
}

/** Tabellen die in de back-up horen (caches niet). */
export const BACKUP_TABLES = [
  'settings', 'foods', 'meals', 'foodLog', 'steps', 'workouts', 'weights',
  'accounts', 'transactions', 'categoryRules', 'positions', 'checkins', 'otherAssets',
] as const;
