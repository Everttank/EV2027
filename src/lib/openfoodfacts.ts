// Product opzoeken op streepjescode via Open Food Facts (gratis, open database).

import type { Macros } from './nutrition';
import { kjToKcal } from './nutrition';

export interface OffProduct {
  ean: string;
  name: string;
  brand?: string;
  per100: Macros;
  servingGrams?: number;
}

export async function lookupBarcode(ean: string): Promise<OffProduct | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=product_name,product_name_nl,brands,nutriments,serving_quantity`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;
  const p = json.product;
  const n = p.nutriments ?? {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy-kj_100g'] != null ? kjToKcal(n['energy-kj_100g']) : n.energy_100g != null ? kjToKcal(n.energy_100g) : 0);
  return {
    ean,
    name: p.product_name_nl || p.product_name || `Product ${ean}`,
    brand: p.brands?.split(',')[0]?.trim(),
    per100: {
      kcal: Math.round(kcal),
      protein: Number(n.proteins_100g ?? 0),
      carbs: Number(n.carbohydrates_100g ?? 0),
      fat: Number(n.fat_100g ?? 0),
    },
    servingGrams: p.serving_quantity ? Number(p.serving_quantity) : undefined,
  };
}
