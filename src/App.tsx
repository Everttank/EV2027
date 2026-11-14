// App-schil: bovenbalk, pagina en tabbalk onderin. Nieuwe pagina? Voeg hem toe aan PAGES.

import { useEffect, useState } from 'react';
import { Brain, HeartPulse, Settings, Waves, Wallet } from 'lucide-react';
import { useRoute } from './lib/router';
import { useSettingsState } from './db/hooks';
import { startReminderLoop } from './lib/reminders';
import { fmtLongDay } from './lib/format';
import { today } from './lib/date';
import { Lock } from './components/Lock';
import { Vandaag } from './features/vandaag/Vandaag';
import { Gezondheid } from './features/gezondheid/Gezondheid';
import { Financien } from './features/financien/Financien';
import { Mentaal } from './features/mentaal/Mentaal';
import { Instellingen } from './features/instellingen/Instellingen';

const TABS = [
  { id: 'vandaag', label: 'Vandaag', icon: Waves, area: 'today', color: '#fff' },
  { id: 'gezondheid', label: 'Gezondheid', icon: HeartPulse, area: 'health', color: 'var(--accent-2)' },
  { id: 'financien', label: 'Financiën', icon: Wallet, area: 'money', color: 'var(--c-geld-2)' },
  { id: 'mentaal', label: 'Mentaal', icon: Brain, area: 'mind', color: 'var(--c-hoofd-2)' },
] as const;

export function App() {
  const [page = 'vandaag', sub] = useRoute();
  const s = useSettingsState();
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => startReminderLoop(), []);

  const tab = TABS.find((t) => t.id === page);
  // Elk onderdeel van Gezondheid heeft zijn eigen kleur (eten, stappen, sport, gewicht, roken).
  const HEALTH_SUBS = ['eten', 'stappen', 'sport', 'gewicht', 'roken'];
  const area = page === 'gezondheid' ? (HEALTH_SUBS.includes(sub ?? '') ? sub! : 'eten') : page === 'instellingen' ? 'today' : tab?.area ?? 'today';
  useEffect(() => {
    document.documentElement.dataset.area = area;
  }, [area]);

  if (!s) return null; // instellingen nog aan het laden (een paar ms)
  if (s.pinHash && !unlocked) return <Lock hash={s.pinHash} onUnlock={() => setUnlocked(true)} />;

  const title = page === 'instellingen' ? 'Instellingen' : tab?.label ?? 'Vandaag';
  return (
    <div className="app" data-area={area}>
      <header className="topbar">
        <div className="grow">
          <h1>{title}</h1>
          {page === 'vandaag' && <div className="date">{fmtLongDay(today())}</div>}
        </div>
        <a className="btn icon" href="#/instellingen" aria-label="Instellingen"><Settings size={20} /></a>
      </header>
      <main className="page">
        {page === 'gezondheid' ? <Gezondheid sub={sub} />
          : page === 'financien' ? <Financien sub={sub} />
          : page === 'mentaal' ? <Mentaal />
          : page === 'instellingen' ? <Instellingen />
          : <Vandaag />}
      </main>
      <nav className="tabbar" aria-label="Hoofdmenu">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} aria-current={(tab?.id ?? (page === 'instellingen' ? '' : 'vandaag')) === t.id ? 'page' : undefined} style={{ ['--tab-color' as string]: t.color }}>
            <t.icon size={22} strokeWidth={tab?.id === t.id ? 2.4 : 1.8} />
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
