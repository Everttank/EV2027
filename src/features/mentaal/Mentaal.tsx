// Mentale check-in: eigen onderwerpen scoren (1–10) en verplicht opschrijven wat er speelt.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, Pencil, Plus, X } from 'lucide-react';
import { db, updateSettings } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { addDays, today } from '../../lib/date';
import { fmt1, fmtDay } from '../../lib/format';
import { Lines, DONUT_COLORS } from '../../components/charts';
import { Empty, Sheet, useToast } from '../../components/ui';

export const MIN_CHARS = 50;

const PROMPTS = [
  'Wat houdt je vandaag het meest bezig?',
  'Waar ben je trots op, en wat zat je dwars?',
  'Wat zou je morgen anders willen doen?',
  'Hoe voelt je lichaam, en waar komt dat door?',
  'Waar ben je dankbaar voor?',
];

export function Mentaal() {
  const s = useSettings();
  const t = today();
  const todays = useLiveQuery(() => db.checkins.where('date').equals(t).toArray(), [t]) ?? [];
  const [again, setAgain] = useState(false);
  const [editTopics, setEditTopics] = useState(false);
  const showForm = todays.length === 0 || again;

  return (
    <>
      {showForm ? (
        <CheckinForm topics={s.checkinTopics} onSaved={() => setAgain(false)} onEditTopics={() => setEditTopics(true)} />
      ) : (
        <section className="hero">
          <div className="row between"><h2>Check-in gedaan</h2><Check size={22} /></div>
          <p className="sub" style={{ whiteSpace: 'pre-wrap' }}>{todays[todays.length - 1].text}</p>
          <button className="btn" onClick={() => setAgain(true)}><Plus size={16} /> Nog een check-in</button>
        </section>
      )}
      <History topics={s.checkinTopics} />
      {editTopics && <TopicsSheet open onClose={() => setEditTopics(false)} topics={s.checkinTopics} />}
    </>
  );
}

const WORD = ['', 'Heel slecht', 'Slecht', 'Slecht', 'Matig', 'Matig', 'Oké', 'Goed', 'Goed', 'Heel goed', 'Top'];

/* Check-in stap voor stap: één onderwerp per scherm, daarna de tekst. Een cijfer kiezen gaat vanzelf door. */
function CheckinForm({ topics, onSaved, onEditTopics }: { topics: string[]; onSaved: () => void; onEditTopics: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState(0); // 0..topics.length-1 = scores, topics.length = tekst
  const [scores, setScores] = useState<Record<string, number>>({});
  const [text, setText] = useState('');
  const [prompt] = useState(() => PROMPTS[new Date().getDate() % PROMPTS.length]);
  const total = topics.length + 1;
  const isText = step === topics.length;
  const topic = topics[step];
  const len = text.trim().length;

  function pick(n: number) {
    setScores((s) => ({ ...s, [topic]: n }));
    navigator.vibrate?.(15);
    window.setTimeout(() => setStep((x) => Math.min(x + 1, topics.length)), 280);
  }

  return (
    <section className="checkin">
      <div className="row between">
        <div className="steps" aria-label={`Stap ${step + 1} van ${total}`}>
          {Array.from({ length: total }, (_, i) => <i key={i} className={i < step ? 'done' : i === step ? 'now' : ''} />)}
        </div>
        <button type="button" className="btn ghost small" onClick={onEditTopics} aria-label="Onderwerpen aanpassen"><Pencil size={14} /></button>
      </div>

      <div className="checkin-card" key={step}>
        {!isText ? (
          <>
            <p className="checkin-q">Hoe was je <b>{topic.toLowerCase()}</b> vandaag?</p>
            <div className="checkin-big" aria-live="polite">
              <span className="huge">{scores[topic] ?? '–'}</span>
              <span className="sub">{scores[topic] ? WORD[scores[topic]] : 'Tik een cijfer'}</span>
            </div>
            <div className="checkin-grid" role="group" aria-label={`${topic} van 1 tot 10`}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button type="button" key={n} aria-pressed={scores[topic] === n} onClick={() => pick(n)}>{n}</button>
              ))}
            </div>
          </>
        ) : (
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            if (len < MIN_CHARS) return;
            await db.checkins.add({ date: today(), at: Date.now(), scores, text: text.trim() });
            toast('Check-in opgeslagen');
            onSaved();
          }}>
            <p className="checkin-q">{prompt}</p>
            <textarea className="textarea" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Schrijf het op, ook als het rommelig is." aria-label={prompt} aria-describedby="checkin-count" />
            <div className="bar-track" aria-hidden><div className="bar-fill" style={{ ['--w' as string]: Math.min(1, len / MIN_CHARS) }} /></div>
            <small id="checkin-count" className="sub">
              {len >= MIN_CHARS ? `${len} tekens, klaar om op te slaan` : `Nog ${MIN_CHARS - len} tekens: zonder je gedachten op te schrijven kun je niet opslaan.`}
            </small>
            <button className="btn primary block" disabled={len < MIN_CHARS}>Check-in opslaan</button>
          </form>
        )}
      </div>

      {step > 0 && <button type="button" className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Vorige</button>}
    </section>
  );
}

function History({ topics }: { topics: string[] }) {
  const from = addDays(today(), -60);
  const list = useLiveQuery(() => db.checkins.where('date').aboveOrEqual(from).sortBy('at'), [from]) ?? [];
  const [shown, setShown] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(7);
  // Gemiddelde per dag per onderwerp
  const days = new Map<string, Record<string, number[]>>();
  for (const c of list) {
    const d = days.get(c.date) ?? {};
    for (const [k, v] of Object.entries(c.scores)) (d[k] ??= []).push(v);
    days.set(c.date, d);
  }
  const data = [...days.entries()].map(([date, sc]) => {
    const row: Record<string, unknown> = { date };
    for (const [k, vs] of Object.entries(sc)) row[k] = vs.reduce((a, b) => a + b, 0) / vs.length;
    return row;
  });
  const visible = shown ? [shown] : topics;

  return (
    <>
      <section className="stack">
        <div className="section-head"><h2>Trend</h2><span className="faint small">60 dagen</span></div>
        <div className="panel stack">
          {data.length < 2 ? <Empty>Na een paar check-ins zie je hier hoe het gaat.</Empty> : (
            <>
              <div className="row wrap" style={{ gap: 6 }}>
                <button className="chip" aria-pressed={shown == null} onClick={() => setShown(null)}>Alles</button>
                {topics.map((tp) => <button key={tp} className="chip" aria-pressed={shown === tp} onClick={() => setShown(tp)}>{tp}</button>)}
              </div>
              <Lines data={data} height={200} fmt={(n) => fmt1(n)} domain={[1, 10]} series={visible.map((tp) => ({ key: tp, name: tp, color: DONUT_COLORS[topics.indexOf(tp) % DONUT_COLORS.length], dot: shown != null }))} />
            </>
          )}
        </div>
      </section>
      {list.length > 0 && (
        <section className="stack">
          <h2>Wat je schreef</h2>
          <div className="panel flush">
            <ul className="list">
              {[...list].reverse().slice(0, limit).map((c) => (
                <li key={c.id} style={{ display: 'block', cursor: 'pointer' }} onClick={() => setOpen(open === c.id ? null : c.id!)}>
                  <div className="tiny muted">{fmtDay(c.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                  <div className="score-line">{Object.entries(c.scores).map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</div>
                  <p className="small" style={{ whiteSpace: 'pre-wrap', display: open === c.id ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.text}</p>
                </li>
              ))}
            </ul>
          </div>
          {list.length > limit && <button className="btn ghost" onClick={() => setLimit(limit + 14)}>Meer tonen</button>}
        </section>
      )}
    </>
  );
}

function TopicsSheet({ open, onClose, topics }: { open: boolean; onClose: () => void; topics: string[] }) {
  const [list, setList] = useState(topics);
  const [n, setN] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Onderwerpen">
      <p className="faint small">Kies zelf wat je elke dag scoort. Oude check-ins blijven bewaard.</p>
      <div className="panel flush">
        <ul className="list">
          {list.map((tp) => (
            <li key={tp}>
              <span className="grow">{tp}</span>
              <button className="btn icon ghost" aria-label={`${tp} verwijderen`} disabled={list.length <= 1} onClick={() => setList(list.filter((x) => x !== tp))}><X size={16} /></button>
            </li>
          ))}
        </ul>
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); const v = n.trim(); if (v && !list.includes(v)) setList([...list, v]); setN(''); }}>
        <input className="input grow" placeholder="Nieuw onderwerp, bijv. Sociaal" value={n} onChange={(e) => setN(e.target.value)} aria-label="Nieuw onderwerp" />
        <button className="btn icon" aria-label="Toevoegen"><Plus size={18} /></button>
      </form>
      <button className="btn primary block" onClick={async () => { await updateSettings({ checkinTopics: list }); onClose(); }}>Opslaan</button>
    </Sheet>
  );
}
