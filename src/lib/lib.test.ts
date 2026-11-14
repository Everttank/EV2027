import { describe, expect, it } from 'vitest';
import { bmr, dailyTarget, energyPlan, macroTargets, scale } from './nutrition';
import { sportKcal } from './met';
import { smokeFree } from './smoking';
import { trend } from './weight';
import { parseAbn, counterpartyOf } from './abn';
import { categorize } from './categories';
import { reconstruct, value } from './portfolio';
import { parseNum } from './format';
import { latestBalances, dailyTotals } from './balances';

describe('voeding', () => {
  const p = { sex: 'man' as const, birthYear: 1996, heightCm: 180, activity: 'matig' as const, goal: 'behouden' as const };
  it('Mifflin-St Jeor', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr(p, 80, 2026)).toBe(1780);
  });
  it('dagdoel met activiteit, afgerond op 10', () => {
    expect(dailyTarget(p, 80, 2026)).toBe(2760); // 1780 * 1.55 = 2759
    expect(dailyTarget({ ...p, goal: 'afvallen' }, 80, 2026)).toBe(2260);
  });
  it('streefgewicht bepaalt richting en tekort', () => {
    // tdee 1780 × 1,55 = 2759; 0,5 kg/week → −550/dag → 2209 → afgerond 2210
    const e = energyPlan(p, 80, 75, 0.5, 2026);
    expect(e.direction).toBe('afvallen');
    expect(e.delta).toBe(2210 - 2759);
    expect(e.target).toBe(2210);
    expect(e.weeksToGoal).toBe(10);
    expect(energyPlan(p, 80, 80.2, 0.5, 2026).direction).toBe('behouden');
    expect(energyPlan(p, 70, 75, 0.25, 2026).direction).toBe('aankomen');
  });
  it('nooit onder de veilige ondergrens', () => {
    const e = energyPlan({ ...p, activity: 'zittend' }, 60, 50, 1, 2026);
    expect(e.floored).toBe(true);
    expect(e.target).toBeGreaterThanOrEqual(1500);
  });
  it('macro-doelen tellen op tot ongeveer het kcal-doel', () => {
    const m = macroTargets(2500, 80, 'behouden');
    expect(m.protein).toBe(144);
    expect(Math.abs(m.protein * 4 + m.carbs * 4 + m.fat * 9 - 2500)).toBeLessThan(10);
  });
  it('schaalt per 100 g', () => {
    expect(scale({ kcal: 200, protein: 10, carbs: 20, fat: 5 }, 150).kcal).toBe(300);
  });
});

describe('sport', () => {
  it('MET × kg × uur', () => {
    expect(sportKcal(9.8, 75, 30)).toBe(368);
  });
});

describe('roken', () => {
  it('telt tijd en geld', () => {
    const s = smokeFree({ quitAt: '2026-01-01T00:00:00', perDay: 10, packPrice: 10, perPack: 20 }, new Date('2026-01-11T06:30:00'));
    expect(s.days).toBe(10);
    expect(s.hours).toBe(6);
    expect(Math.round(s.saved)).toBe(51); // 102,7 sigaretten ≈ 5,1 pakjes
  });
});

describe('gewicht', () => {
  it('7-daags gemiddelde', () => {
    const t = trend([
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-03', kg: 82 },
      { date: '2026-01-10', kg: 78 },
    ]);
    expect(t[1].avg).toBe(81);
    expect(t[2].avg).toBe(78); // 1 en 3 januari vallen buiten het venster
  });
});

describe('ABN AMRO', () => {
  const sample = [
    'NL12ABNA0123456789\tEUR\t20261101\t1.250,00\t1.237,55\t20261101\t-12,45\tBEA, Betaalpas                   ALBERT HEIJN 1403,PAS123      NR:AB12CD, 01.11.26/14:02     UTRECHT',
    'NL12ABNA0123456789\tEUR\t20261102\t1.237,55\t3.637,55\t20261102\t2.400,00\t/TRTP/SEPA OVERBOEKING/IBAN/NL91RABO0300000000/BIC/RABONL2U/NAME/Werkgever BV/REMI/Salaris november/EREF/NOTPROVIDED',
    'NL12ABNA0123456789\tEUR\t20261103\t3.637,55\t3.137,55\t20261103\t-500,00\t/TRTP/SEPA OVERBOEKING/IBAN/NL55ABNA0987654321/BIC/ABNANL2A/NAME/J Jansen/REMI/Sparen/EREF/NOTPROVIDED',
    'NL12ABNA0123456789\tEUR\t20261103\t3.137,55\t3.133,05\t20261103\t-4,50\tBEA, Google Pay                  Starbucks Utrecht,PAS123',
    'NL12ABNA0123456789\tEUR\t20261103\t3.133,05\t3.128,55\t20261103\t-4,50\tBEA, Google Pay                  Starbucks Utrecht,PAS123',
    'onzin regel',
  ].join('\r\n');

  it('leest TAB-export', () => {
    const r = parseAbn(sample);
    expect(r.transactions).toHaveLength(5);
    expect(r.skipped).toBe(1);
    expect(r.transactions[0]).toMatchObject({ date: '2026-11-01', amount: -12.45, balanceAfter: 1237.55 });
    expect(r.transactions[1].amount).toBe(2400);
  });
  it('dubbele regels op één dag krijgen verschillende id', () => {
    const r = parseAbn(sample);
    expect(r.transactions[3].id).not.toBe(r.transactions[4].id);
    expect(parseAbn(sample).transactions[3].id).toBe(r.transactions[3].id);
  });
  it('tegenpartij', () => {
    expect(counterpartyOf('/TRTP/SEPA OVERBOEKING/IBAN/NL91/BIC/X/NAME/Werkgever BV/REMI/x')).toBe('Werkgever BV');
    expect(counterpartyOf('BEA, Betaalpas   ALBERT HEIJN 1403,PAS123 NR:AB')).toBe('ALBERT HEIJN 1403');
  });
  it('categoriseert', () => {
    expect(categorize('BEA ALBERT HEIJN 1403', -12, [])).toBe('Boodschappen');
    expect(categorize('/IBAN/NL55ABNA0987654321/NAME/J Jansen', -500, ['NL55ABNA0987654321'])).toBe('Sparen & beleggen');
    expect(categorize('iets onbekends', 30, [])).toBe('Inkomen');
    expect(categorize('Starbucks', -4, [], [{ match: 'starbucks', category: 'Koffie' }])).toBe('Koffie');
  });
});

describe('portfolio', () => {
  const pos = [
    { kind: 'stock' as const, symbol: 'VWRL', name: 'VWRL', quantity: 10, buyPrice: 100, buyDate: '2026-01-02' },
    { kind: 'crypto' as const, symbol: 'bitcoin', name: 'Bitcoin', quantity: 0.1, buyPrice: 50000, buyDate: '2026-01-04' },
  ];
  it('waarde en winst', () => {
    const v = value(pos[0], 110);
    expect(v.value).toBe(1100);
    expect(v.gainPct).toBeCloseTo(0.1);
  });
  it('reconstrueert historie en overbrugt weekend', () => {
    const r = reconstruct(pos, { VWRL: [{ date: '2026-01-02', close: 100 }, { date: '2026-01-05', close: 120 }], bitcoin: [{ date: '2026-01-04', close: 60000 }] }, '2026-01-05');
    expect(r.map((x) => x.value)).toEqual([1000, 1000, 7000, 7200]);
    expect(r[3].cost).toBe(6000);
  });
});

describe('invoer', () => {
  it('komma en punt', () => {
    expect(parseNum('12,5')).toBe(12.5);
    expect(parseNum('12.5')).toBe(12.5);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('12.500')).toBe(12500);
    expect(parseNum('1.234,56')).toBe(1234.56);
    expect(parseNum('€ 250')).toBe(250);
    expect(parseNum('82.5')).toBe(82.5);
  });
});

describe('saldo', () => {
  it('laatste transactie van de dag (bestandsvolgorde) bepaalt het saldo', () => {
    const r = parseAbn([
      'NL1\tEUR\t20261101\t100,00\t90,00\t20261101\t-10,00\tZZZ eerste',
      'NL1\tEUR\t20261101\t90,00\t70,00\t20261101\t-20,00\tAAA tweede',
      'NL2\tEUR\t20261101\t500,00\t550,00\t20261101\t50,00\tspaar',
    ].join('\n')).transactions;
    const shuffled = [r[1], r[2], r[0]]; // zoals een database ze in willekeurige volgorde kan teruggeven
    expect(latestBalances(shuffled).get('NL1')!.balance).toBe(70);
    expect(dailyTotals(shuffled)).toEqual([{ date: '2026-11-01', saldo: 620 }]);
  });
});

describe('portfolio meerdere aankopen', () => {
  it('historie per instrument-sleutel', () => {
    const lots = [
      { kind: 'stock' as const, symbol: 'VWRL', mic: 'XAMS', name: 'VWRL', quantity: 1, buyPrice: 100, buyDate: '2026-01-01' },
      { kind: 'stock' as const, symbol: 'VWRL', mic: 'XAMS', name: 'VWRL', quantity: 1, buyPrice: 110, buyDate: '2026-01-02' },
    ];
    const r = reconstruct(lots, { k: [{ date: '2026-01-01', close: 105 }, { date: '2026-01-02', close: 120 }] }, '2026-01-02', () => 'k');
    expect(r.map((x) => x.value)).toEqual([105, 240]);
  });
});
