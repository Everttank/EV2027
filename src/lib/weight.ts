// Gewicht: 7-daags voortschrijdend gemiddelde (trendlijn).

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

/** Gemiddelde van alle metingen in de 7 dagen t/m elke meetdatum. */
export function trend(entries: WeightEntry[]): (WeightEntry & { avg: number })[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => {
    const end = new Date(e.date).getTime();
    const start = end - 6 * 86_400_000;
    const win = sorted.filter((x) => {
      const t = new Date(x.date).getTime();
      return t >= start && t <= end;
    });
    const avg = win.reduce((s, x) => s + x.kg, 0) / win.length;
    return { ...e, avg: Math.round(avg * 10) / 10 };
  });
}

export function bmi(kg: number, heightCm: number): number {
  const m = heightCm / 100;
  return kg / (m * m);
}
