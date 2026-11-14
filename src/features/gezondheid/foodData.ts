// Rekenhulp voor eten: macro's van een vast gerecht en het juiste maaltijdmoment.

import { db, type Food, type Meal, type MealMoment } from '../../db/db';
import { scale, sum, type Macros } from '../../lib/nutrition';

/** Macro's per portie van een vast gerecht. */
export function mealPerPortion(meal: Meal, foods: Map<number, Food>): Macros {
  const total = sum(
    meal.ingredients.map((i) => {
      const f = foods.get(i.foodId);
      return f ? scale(f.per100, i.grams) : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    }),
  );
  const n = Math.max(1, meal.portions);
  return { kcal: total.kcal / n, protein: total.protein / n, carbs: total.carbs / n, fat: total.fat / n };
}

export function momentNow(d = new Date()): MealMoment {
  const h = d.getHours();
  if (h < 10) return 'ontbijt';
  if (h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'avond';
  return 'snack';
}

export async function logFood(date: string, food: Food, grams: number) {
  await db.foodLog.add({ date, moment: momentNow(), kind: 'food', refId: food.id, name: food.name, amount: grams, macros: scale(food.per100, grams) });
}

export async function logMeal(date: string, meal: Meal, portions: number, foods: Map<number, Food>) {
  const per = mealPerPortion(meal, foods);
  await db.foodLog.add({
    date,
    moment: momentNow(),
    kind: 'meal',
    refId: meal.id,
    name: meal.name,
    amount: portions,
    macros: { kcal: per.kcal * portions, protein: per.protein * portions, carbs: per.carbs * portions, fat: per.fat * portions },
  });
}
