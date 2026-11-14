// Back-up: alles exporteren naar één JSON-bestand en weer terugzetten.

import { db, BACKUP_TABLES } from './db';

export const BACKUP_VERSION = 1;

export async function exportAll(): Promise<Blob> {
  const data: Record<string, unknown[]> = {};
  for (const name of BACKUP_TABLES) data[name] = await db.table(name).toArray();
  const payload = { app: 'getij', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
  return new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Vervangt ALLE data door de inhoud van de back-up. */
export async function importAll(file: File): Promise<void> {
  const json = JSON.parse(await file.text());
  if (json?.app !== 'getij' || typeof json.data !== 'object') throw new Error('Dit is geen Getij-back-up.');
  if (json.version > BACKUP_VERSION) throw new Error('Deze back-up komt uit een nieuwere versie van de app.');
  await db.transaction('rw', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const name of BACKUP_TABLES) {
      await db.table(name).clear();
      const rows = json.data[name];
      if (Array.isArray(rows) && rows.length) await db.table(name).bulkPut(rows);
    }
  });
}
