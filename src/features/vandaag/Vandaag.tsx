// Vandaag: het startscherm als bento — één gekleurde tegel per onderdeel, tik om erheen te gaan.

import { Brain, CigaretteOff, Dumbbell, Flame, Footprints, Scale, Wallet } from 'lucide-react';
import { Rings } from '../../components/Rings';
import { CountUp } from '../../components/ui';
import { fmt1, fmtEur0, fmtInt } from '../../lib/format';
import { STEP_GOAL, useToday } from './useToday';

const pad = (n: number) => String(n).padStart(2, '0');

export function Vandaag() {
  const d = useToday();
  const n = d.nutrition;
  const left = n.remaining ?? n.eaten.kcal;
  const maxSteps = Math.max(STEP_GOAL, ...d.week.map((w) => w.steps));

  return (
    <div className="bento">
      <a className="tile t-eten" href="#/gezondheid/eten" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', minHeight: 190, padding: 20, background: 'linear-gradient(135deg, var(--c-eten), #ff4f7b 60%, var(--c-eten-2))' }}>
        <div className="stack" style={{ gap: 6 }}>
          <p className="label"><Flame size={16} /> {n.remaining == null ? 'Gegeten' : n.remaining >= 0 ? 'Kcal over' : 'Kcal te veel'}</p>
          <p className="huge"><CountUp value={Math.abs(left)} format={fmtInt} /></p>
          <p className="sub">
            {n.budget != null
              ? <>{fmtInt(n.eaten.kcal)} gegeten · {fmtInt(n.budget)} budget{n.burned ? ` · +${fmtInt(n.burned)} sport` : ''}</>
              : 'Vul je profiel in voor je dagdoel'}
          </p>
        </div>
        {n.budget != null && <Rings size={92} stroke={12} rings={[{ pct: d.kcalPct, from: 'rgb(255 255 255 / 0.95)', to: '#fff' }]} />}
      </a>

      <div className="grid2">
        <a className={`tile t-stappen ${d.steps ? '' : 'todo'}`} href="#/gezondheid/stappen">
          <p className="label"><Footprints size={16} /> Stappen</p>
          <p className="figure">{d.steps ? <CountUp value={d.steps} format={fmtInt} /> : <span className="status">Invullen</span>}</p>
          <div className="mini-bars" aria-hidden>
            {d.week.map((w) => <i key={w.date} style={{ height: `${Math.max(8, (w.steps / maxSteps) * 100)}%`, opacity: w.date === d.date ? 1 : 0.4 }} />)}
          </div>
        </a>
        <a className="tile t-sport" href="#/gezondheid/sport">
          <p className="label"><Dumbbell size={16} /> Sport</p>
          <p className="figure">{d.sportMin}<span className="unit">min</span></p>
          <p className="sub">{d.sportKcal ? `${fmtInt(d.sportKcal)} kcal verbrand` : 'Nog niet gesport'}</p>
        </a>
      </div>

      <a className="tile t-roken wide" href="#/gezondheid/roken">
        <p className="label"><CigaretteOff size={16} /> Rookvrij</p>
        {d.smoke ? (
          <div className="row between wrap" style={{ alignItems: 'baseline' }}>
            <p className="figure">{d.smoke.days}<span className="unit">{d.smoke.days === 1 ? 'dag' : 'dagen'}</span><span className="clock">{pad(d.smoke.hours)}:{pad(d.smoke.minutes)}:{pad(d.smoke.seconds)}</span></p>
            <p className="figure sm">{fmtEur0(d.smoke.saved)}<span className="unit">bespaard</span></p>
          </div>
        ) : <p className="sub">Stel je stopdatum in</p>}
      </a>

      <div className="grid3">
        <a className="tile t-hoofd" href="#/mentaal">
          <p className="label"><Brain size={16} /> Check-in</p>
          <p className="status">{d.checkin ? 'Gedaan' : 'Nog doen'}</p>
        </a>
        <a className="tile dark" href="#/gezondheid/gewicht">
          <p className="label" style={{ color: 'var(--c-gewicht-2)', opacity: 1 }}><Scale size={16} /> Gewicht</p>
          <p className="figure sm">{d.weight ? fmt1(d.weight.avg) : '–'}<span className="unit">kg</span></p>
        </a>
        <a className="tile t-geld" href="#/financien/portfolio">
          <p className="label"><Wallet size={16} /> Vermogen</p>
          <p className="figure sm">{d.worth != null ? `€${fmtInt(d.worth / 1000)}k` : '–'}</p>
        </a>
      </div>
    </div>
  );
}
