// Sport-kcal schatten met MET-waarden (Compendium of Physical Activities).
// kcal = MET × gewicht (kg) × uren. Dit is een schatting, geen meting.

export interface Sport {
  id: string;
  name: string;
  met: number;
}

export const SPORTS: Sport[] = [
  { id: 'wandelen', name: 'Wandelen', met: 3.5 },
  { id: 'stevig-wandelen', name: 'Stevig wandelen', met: 4.8 },
  { id: 'hardlopen-rustig', name: 'Hardlopen (rustig, ~8 km/u)', met: 8.3 },
  { id: 'hardlopen', name: 'Hardlopen (~10 km/u)', met: 9.8 },
  { id: 'hardlopen-snel', name: 'Hardlopen (snel, ~12 km/u)', met: 11.8 },
  { id: 'fietsen', name: 'Fietsen (normaal)', met: 6.8 },
  { id: 'fietsen-sport', name: 'Wielrennen / snel fietsen', met: 10.0 },
  { id: 'kracht', name: 'Krachttraining', met: 5.0 },
  { id: 'kracht-zwaar', name: 'Krachttraining (zwaar)', met: 6.0 },
  { id: 'zwemmen', name: 'Zwemmen', met: 7.0 },
  { id: 'voetbal', name: 'Voetbal', met: 7.0 },
  { id: 'padel', name: 'Padel / tennis', met: 7.3 },
  { id: 'hiit', name: 'HIIT / circuit', met: 8.0 },
  { id: 'yoga', name: 'Yoga', met: 2.5 },
  { id: 'roeien', name: 'Roeien (apparaat)', met: 7.0 },
  { id: 'surfen', name: 'Surfen', met: 3.0 },
  { id: 'boksen', name: 'Boksen (zak)', met: 5.5 },
];

export function sportKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

/** Grove schatting: ~0,04 kcal per stap per 70 kg. Alleen voor info, telt niet mee in het budget. */
export function stepsKcal(steps: number, weightKg: number): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}
