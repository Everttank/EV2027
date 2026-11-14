// Stoppen met roken: tijd sinds stoppen en geld bespaard.

export interface SmokingSettings {
  quitAt: string; // ISO datum-tijd
  perDay: number; // sigaretten per dag
  packPrice: number; // € per pakje
  perPack: number; // sigaretten per pakje
}

export interface SmokeFreeStats {
  ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  notSmoked: number;
  saved: number;
}

export function smokeFree(s: SmokingSettings, now: Date = new Date()): SmokeFreeStats {
  const ms = Math.max(0, now.getTime() - new Date(s.quitAt).getTime());
  const totalSec = Math.floor(ms / 1000);
  const fractionDays = ms / 86_400_000;
  const notSmoked = fractionDays * s.perDay;
  const saved = s.perPack > 0 ? (notSmoked / s.perPack) * s.packPrice : 0;
  return {
    ms,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    notSmoked,
    saved,
  };
}
