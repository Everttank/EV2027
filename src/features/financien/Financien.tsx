import { Segments } from '../../components/ui';
import { Rekeningen } from './Rekeningen';
import { Portfolio } from './Portfolio';

const ITEMS = [
  { id: 'rekeningen', label: 'Rekeningen', href: '#/financien/rekeningen' },
  { id: 'portfolio', label: 'Portfolio', href: '#/financien/portfolio' },
];

export function Financien({ sub = 'rekeningen' }: { sub?: string }) {
  const current = sub === 'portfolio' ? 'portfolio' : 'rekeningen';
  return (
    <>
      <Segments items={ITEMS} current={current} />
      {current === 'rekeningen' ? <Rekeningen /> : <Portfolio />}
    </>
  );
}
