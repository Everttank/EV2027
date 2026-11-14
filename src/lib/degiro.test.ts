import { describe, expect, it } from 'vitest';
import { num, parseCsv, parseDegiroTransactions, toLots } from './degiro';

const NL = [
  'Datum,Tijd,Product,ISIN,Beurs,Uitvoeringsplaats,Aantal,Koers,,Lokale waarde,,Waarde,,Wisselkoers,Transactiekosten en/of kosten van derden,,Totaal,,Order ID',
  '15-03-2026,10:02,VANGUARD FTSE AW,IE00B3RBWM25,EAM,XAMS,10,"110,00",EUR,"-1100,00",EUR,"-1100,00",EUR,,"-2,00",EUR,"-1102,00",EUR,a1',
  '02-01-2026,09:15,VANGUARD FTSE AW,IE00B3RBWM25,EAM,XAMS,20,"100,00",EUR,"-2000,00",EUR,"-2000,00",EUR,,"-2,00",EUR,"-2002,00",EUR,a0',
  '01-06-2026,15:30,VANGUARD FTSE AW,IE00B3RBWM25,EAM,XAMS,-25,"120,00",EUR,"3000,00",EUR,"3000,00",EUR,,"-2,00",EUR,"2998,00",EUR,a2',
  '10-04-2026,16:00,APPLE INC,US0378331005,NDQ,XNAS,5,"200,00",USD,"-1000,00",USD,"-920,00",EUR,"1,0870","-1,00",EUR,"-921,00",EUR,b1',
].join('\n');

describe('DeGiro', () => {
  it('csv met aanhalingstekens en komma-decimalen', () => {
    expect(parseCsv('a,"1,5",c\n')).toEqual([['a', '1,5', 'c']]);
    expect(num('1.234,56')).toBe(1234.56);
    expect(num('1,234.56')).toBe(1234.56);
    expect(num('-2,00')).toBe(-2);
  });
  it('leest transacties (NL)', () => {
    const { trades, skipped } = parseDegiroTransactions(NL);
    expect(skipped).toBe(0);
    expect(trades).toHaveLength(4);
    expect(trades[0]).toMatchObject({ date: '2026-03-15', isin: 'IE00B3RBWM25', exchange: 'EAM', qty: 10, valueEur: 1100, feesEur: 2 });
    expect(trades[3]).toMatchObject({ currency: 'USD', valueEur: 920 });
  });
  it('FIFO: verkoop gaat van de oudste aankoop af, kosten in de kostprijs', () => {
    const lots = toLots(parseDegiroTransactions(NL).trades);
    const vwrl = lots.filter((l) => l.isin === 'IE00B3RBWM25');
    // 20 (jan) + 10 (mrt) gekocht, 25 verkocht → jan op, van mrt blijven 5 over
    expect(vwrl).toEqual([{ isin: 'IE00B3RBWM25', product: 'VANGUARD FTSE AW', exchange: 'EAM', qty: 5, buyPriceEur: 110.2, buyDate: '2026-03-15' }]);
    const aapl = lots.find((l) => l.isin === 'US0378331005')!;
    expect(aapl.qty).toBe(5);
    expect(aapl.buyPriceEur).toBe(184.2); // (920 + 1) / 5
  });
  it('herkent een verkeerd bestand', () => {
    expect(() => parseDegiroTransactions('foo,bar\n1,2')).toThrow(/DeGiro/);
  });
});
