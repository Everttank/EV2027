// Instellingen: profiel (voor dagdoel), API-sleutel, pincode, herinneringen, back-up en demo-data.

import { useRef, useState } from 'react';
import { db, updateSettings } from '../../db/db';
import { useLatestWeight, useSettingsState } from '../../db/hooks';
import type { Settings } from '../../db/db';
import { exportAll, downloadBlob, importAll } from '../../db/backup';
import { loadDemo, clearDemo, hasRealData } from '../../db/demo';
import { useLiveQuery } from 'dexie-react-hooks';
import { hashPin } from '../../lib/pin';
import { requestPermission } from '../../lib/reminders';
import { ACTIVITY_LABEL, energyPlan, type Activity, type Goal, type Profile } from '../../lib/nutrition';
import { av, td } from '../../lib/prices';
import { fmt1, fmtInt, parseNum } from '../../lib/format';
import { addDays, today } from '../../lib/date';
import { fmtLongDay } from '../../lib/format';
import { Field, useToast } from '../../components/ui';

export function Instellingen() {
  const s = useSettingsState();
  // Pas tonen als de opgeslagen instellingen geladen zijn, anders vult het formulier zich met lege standaardwaarden.
  return s ? <InstellingenForm s={s} /> : null;
}

function InstellingenForm({ s }: { s: Settings }) {
  const toast = useToast();
  const weight = useLatestWeight();
  const p = s.profile;
  const [f, setF] = useState({
    sex: p?.sex ?? 'man',
    birthYear: String(p?.birthYear ?? ''),
    heightCm: String(p?.heightCm ?? ''),
    activity: (p?.activity ?? 'licht') as Activity,
    goal: (p?.goal ?? 'behouden') as Goal,
    override: s.kcalTargetOverride ? String(s.kcalTargetOverride) : '',
    goalKg: s.weightGoalKg ? fmt1(s.weightGoalKg) : '',
    tempo: String(p?.tempo ?? 0.5),
  });
  const [key, setKey] = useState(s.twelveDataKey ?? '');
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [avKey, setAvKey] = useState(s.alphaVantageKey ?? '');
  const [avMsg, setAvMsg] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const hasData = useLiveQuery(() => hasRealData(), []);

  const profile: Profile | null = parseNum(f.birthYear) && parseNum(f.heightCm)
    ? { sex: f.sex as Profile['sex'], birthYear: parseNum(f.birthYear)!, heightCm: parseNum(f.heightCm)!, activity: f.activity, goal: f.goal, tempo: Number(f.tempo) }
    : null;
  const goalKg = parseNum(f.goalKg);
  const plan = profile && weight ? energyPlan(profile, weight, goalKg, Number(f.tempo)) : null;
  const calc = plan?.target ?? null;

  return (
    <>
      <form className="panel stack" onSubmit={async (e) => {
        e.preventDefault();
        await updateSettings({ profile: profile ?? undefined, kcalTargetOverride: parseNum(f.override) ?? undefined, weightGoalKg: goalKg ?? undefined });
        toast('Profiel opgeslagen');
      }}>
        <h2>Profiel</h2>
        <p className="faint small">Hiermee berekent de app je dagdoel (Mifflin-St Jeor) en je macro's.</p>
        <div className="grid2">
          <Field label="Geslacht">
            <select className="select" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value as Profile['sex'] })}>
              <option value="man">Man</option>
              <option value="vrouw">Vrouw</option>
            </select>
          </Field>
          <Field label="Geboortejaar"><input className="input num" inputMode="numeric" value={f.birthYear} onChange={(e) => setF({ ...f, birthYear: e.target.value })} /></Field>
        </div>
        <Field label="Lengte (cm)"><input className="input num" inputMode="numeric" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} /></Field>
        <Field label="Activiteit (zonder je gelogde sport)">
          <select className="select" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value as Activity })}>
            {Object.entries(ACTIVITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Streefgewicht (kg)" hint={weight ? `Nu ${fmt1(weight)} kg` : undefined}>
            <input className="input num" inputMode="decimal" value={f.goalKg} onChange={(e) => setF({ ...f, goalKg: e.target.value })} placeholder="bijv. 78" />
          </Field>
          {goalKg != null ? (
            <Field label="Tempo">
              <select className="select" value={f.tempo} onChange={(e) => setF({ ...f, tempo: e.target.value })}>
                <option value="0.25">¼ kg/week</option>
                <option value="0.5">½ kg/week</option>
                <option value="0.75">¾ kg/week</option>
                <option value="1">1 kg/week</option>
              </select>
            </Field>
          ) : (
            <Field label="Doel">
              <select className="select" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value as Goal })}>
                <option value="afvallen">Afvallen</option>
                <option value="behouden">Op gewicht blijven</option>
                <option value="aankomen">Aankomen</option>
              </select>
            </Field>
          )}
        </div>
        {plan ? (
          <div className="plan">
            <div><span>Ruststofwisseling</span><b className="num">{fmtInt(plan.bmr)}</b></div>
            <div><span>Verbruik met je activiteit</span><b className="num">{fmtInt(plan.tdee)}</b></div>
            <div><span>{plan.delta < 0 ? 'Tekort' : plan.delta > 0 ? 'Overschot' : 'Tekort / overschot'}{plan.tempo ? ` (${fmt1(plan.tempo).replace(',0', '')} kg/week)` : ''}</span><b className="num">{plan.delta > 0 ? '+' : plan.delta < 0 ? '−' : ''}{fmtInt(Math.abs(plan.delta))}</b></div>
            <div className="total"><span>Dagbudget</span><b className="num">{fmtInt(plan.target)} kcal</b></div>
            {plan.weeksToGoal != null && goalKg != null && <p className="sub">Op dit tempo haal je {fmt1(goalKg)} kg over ongeveer {plan.weeksToGoal} weken, rond {fmtLongDay(addDays(today(), plan.weeksToGoal * 7))}.</p>}
            {plan.floored && <p className="sub">Opgehoogd naar een veilige ondergrens: minder eten dan dit raden we af. Kies een rustiger tempo.</p>}
            <p className="sub">Wordt automatisch opnieuw berekend bij elke nieuwe weging. Sport komt er per dag bovenop.</p>
          </div>
        ) : <p className="small muted">{weight ? 'Vul geboortejaar en lengte in.' : 'Vul ook je gewicht in (Gezondheid → Gewicht).'}</p>}
        <Field label="Eigen dagdoel (optioneel)" hint="Overschrijft de berekening."><input className="input num" inputMode="numeric" value={f.override} onChange={(e) => setF({ ...f, override: e.target.value })} placeholder={calc ? String(calc) : ''} /></Field>
        <button className="btn primary block">Profiel opslaan</button>
      </form>

      <section className="panel stack">
        <h2>Koersen</h2>
        <p className="faint small">Twee gratis sleutels, alleen op dit apparaat bewaard. Alpha Vantage geeft de koersen van je aandelen en ETF's (ook Euronext, max. 25 aanvragen per dag; de app gaat daar zuinig mee om). Twelve Data rekent dollars en ponden om naar euro's.</p>
        <Field label="Alpha Vantage-sleutel" hint={`Vandaag ${av.usedToday()} van 25 aanvragen gebruikt.`}>
          <input className="input num" type="password" autoComplete="off" value={avKey} onChange={(e) => setAvKey(e.target.value.trim())} />
        </Field>
        <div className="row">
          <button className="btn" disabled={!avKey} onClick={async () => { setAvMsg('Testen…'); setAvMsg(await av.testKey(avKey)); }}>Testen</button>
          <button className="btn primary grow" onClick={async () => { await updateSettings({ alphaVantageKey: avKey || undefined }); toast('Sleutel opgeslagen'); }}>Opslaan</button>
        </div>
        {avMsg && <p className="small muted">{avMsg}</p>}
        <Field label="Twelve Data-sleutel (wisselkoersen)"><input className="input num" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value.trim())} /></Field>
        <div className="row">
          <button className="btn" disabled={!key} onClick={async () => { setKeyMsg('Testen…'); try { setKeyMsg(`Werkt: 1 dollar = € ${(await td.fx('USD', 'EUR', key)).toFixed(4).replace('.', ',')}`); } catch (e) { setKeyMsg(`Fout: ${(e as Error).message}`); } }}>Testen</button>
          <button className="btn primary grow" onClick={async () => { await updateSettings({ twelveDataKey: key || undefined }); toast('Sleutel opgeslagen'); }}>Opslaan</button>
        </div>
        {keyMsg && <p className="small muted">{keyMsg}</p>}
      </section>

      <section className="panel stack">
        <h2>Pincode</h2>
        <p className="faint small">Vraagt een pincode bij het openen. Houdt meekijkers buiten; je data wordt er niet door versleuteld.</p>
        {s.pinHash ? (
          <button className="btn" onClick={async () => { await updateSettings({ pinHash: undefined }); toast('Pincode uitgezet'); }}>Pincode uitzetten</button>
        ) : (
          <div className="row">
            <input className="input grow num" type="password" inputMode="numeric" maxLength={6} placeholder="4–6 cijfers" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="Nieuwe pincode" />
            <button className="btn primary" disabled={pin.length < 4} onClick={async () => { await updateSettings({ pinHash: await hashPin(pin) }); setPin(''); toast('Pincode ingesteld'); }}>Instellen</button>
          </div>
        )}
      </section>

      <section className="panel stack">
        <h2>Herinneringen</h2>
        <p className="faint small">Zonder server kan een web-app geen betrouwbare pushmeldingen sturen. Je krijgt een melding als de app openstaat of je hem opent na het ingestelde tijdstip.</p>
        <label className="row between">
          <span>Herinneringen aan</span>
          <input type="checkbox" style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} checked={s.reminders.enabled} onChange={async (e) => {
            const enabled = e.target.checked;
            if (enabled && (await requestPermission()) !== 'granted') { toast('Meldingen zijn geblokkeerd in je browser'); return; }
            await updateSettings({ reminders: { ...s.reminders, enabled } });
          }} />
        </label>
        <div className="grid2">
          <Field label="Check-in om"><input className="input num" type="time" value={s.reminders.checkinTime ?? ''} onChange={(e) => updateSettings({ reminders: { ...s.reminders, checkinTime: e.target.value } })} /></Field>
          <Field label="Weegdag">
            <select className="select" value={s.reminders.weighDay ?? ''} onChange={(e) => updateSettings({ reminders: { ...s.reminders, weighDay: e.target.value === '' ? undefined : Number(e.target.value) } })}>
              <option value="">Geen</option>
              {['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'].map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="panel stack">
        <h2>Back-up</h2>
        <p className="faint small">Alles staat alleen op dit apparaat. Maak af en toe een back-up, zeker voordat je je browser opschoont.</p>
        <div className="row">
          <button className="btn grow" onClick={async () => downloadBlob(await exportAll(), `getij-backup-${today()}.json`)}>Exporteren</button>
          <button className="btn grow" onClick={() => importRef.current?.click()}>Terugzetten</button>
        </div>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (!confirm('Dit vervangt ALLE huidige data door de back-up. Doorgaan?')) return;
          try { await importAll(file); toast('Back-up teruggezet'); } catch (err) { toast((err as Error).message); }
        }} />
      </section>

      <section className="panel stack">
        <h2>Voorbeelddata</h2>
        <p className="faint small">Vult de app met nepdata om rond te kijken. Weghalen verwijdert alleen de voorbeelddata.</p>
        {s.demo ? (
          <button className="btn danger" onClick={async () => { await clearDemo(); toast('Voorbeelddata verwijderd'); }}>Voorbeelddata weghalen</button>
        ) : (
          <>
            <button className="btn" disabled={hasData !== false} onClick={async () => { try { await loadDemo(); toast('Voorbeelddata geladen'); } catch (e) { toast((e as Error).message); } }}>Voorbeelddata laden</button>
            {hasData && <p className="faint tiny">Kan alleen in een lege app, zodat je echte data nooit wordt overschreven.</p>}
          </>
        )}
      </section>

      <section className="stack">
        <button className="btn danger ghost" onClick={async () => {
          if (!confirm('Alles wissen? Dit kan niet ongedaan worden gemaakt (tenzij je een back-up hebt).')) return;
          await db.delete();
          location.reload();
        }}>Alle data wissen</button>
      </section>
    </>
  );
}
