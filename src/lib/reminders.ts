// Herinneringen (best effort). Zonder server kan een web-app geen betrouwbare pushmeldingen
// sturen. Wat wél kan: bij openen van de app (of terwijl hij openstaat) een melding tonen
// als de check-in van vandaag nog ontbreekt na het ingestelde tijdstip.

import { db, getSettings } from '../db/db';
import { today } from './date';

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

async function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: 'icon-192.png', tag: title });
  else new Notification(title, { body });
}

const shownKey = (what: string) => `getij-reminder-${what}-${today()}`;

export async function checkReminders(): Promise<void> {
  const s = await getSettings();
  if (!s.reminders.enabled) return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (s.reminders.checkinTime && hhmm >= s.reminders.checkinTime && !localStorage.getItem(shownKey('checkin'))) {
    const done = await db.checkins.where('date').equals(today()).count();
    if (!done) {
      await notify('Tijd voor je check-in', 'Hoe was je dag? Schrijf even op wat er in je hoofd zit.');
      localStorage.setItem(shownKey('checkin'), '1');
    }
  }
  if (s.reminders.weighDay != null && now.getDay() === s.reminders.weighDay && !localStorage.getItem(shownKey('weigh'))) {
    const done = await db.weights.get(today());
    if (!done) {
      await notify('Weegdag', 'Vul je gewicht van vandaag in.');
      localStorage.setItem(shownKey('weigh'), '1');
    }
  }
}

export function startReminderLoop(): () => void {
  const run = () => checkReminders().catch(() => {});
  run();
  const id = window.setInterval(run, 60_000);
  document.addEventListener('visibilitychange', run);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', run);
  };
}
