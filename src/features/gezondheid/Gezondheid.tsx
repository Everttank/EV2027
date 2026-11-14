import { Segments } from '../../components/ui';
import { Eten } from './Eten';
import { Stappen } from './Stappen';
import { Sport } from './Sport';
import { Gewicht } from './Gewicht';
import { Roken } from './Roken';

const ITEMS = [
  { id: 'eten', label: 'Eten', href: '#/gezondheid/eten' },
  { id: 'stappen', label: 'Stappen', href: '#/gezondheid/stappen' },
  { id: 'sport', label: 'Sport', href: '#/gezondheid/sport' },
  { id: 'gewicht', label: 'Gewicht', href: '#/gezondheid/gewicht' },
  { id: 'roken', label: 'Rookvrij', href: '#/gezondheid/roken' },
];

export function Gezondheid({ sub = 'eten' }: { sub?: string }) {
  const current = ITEMS.some((i) => i.id === sub) ? sub : 'eten';
  return (
    <>
      <Segments items={ITEMS} current={current} />
      {current === 'eten' && <Eten />}
      {current === 'stappen' && <Stappen />}
      {current === 'sport' && <Sport />}
      {current === 'gewicht' && <Gewicht />}
      {current === 'roken' && <Roken />}
    </>
  );
}
