// Gedeelde bouwstenen: Sheet (onderblad), Field, CountUp, Hero, Toast, Segments, Empty.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/* Onderblad op basis van <dialog>: focus en Esc werken vanzelf. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // tik op de achtergrond
      }}
    >
      {open && (
        <div className="sheet-inner">
          <div className="sheet-grip" aria-hidden />
          <div className="row between">
            <h2>{title}</h2>
            <button className="btn ghost small" onClick={onClose}>Sluiten</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

/* Telt vloeiend naar een nieuw getal. */
export function CountUp({ value, format = (n: number) => String(Math.round(n)), duration = 700 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (reduce || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 4);
      const v = start + (value - start) * eased;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return <>{format(shown)}</>;
}

/* Gekleurde hoofdtegel van een scherm (kleur komt van het onderdeel via data-area). */
export function Hero({ label, icon, children, right, className = '' }: { label?: ReactNode; icon?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`hero ${right ? 'split' : ''} ${className}`}>
      <div className="stack" style={{ gap: 6 }}>
        {label && <p className="label">{icon}{label}</p>}
        {children}
      </div>
      {right}
    </section>
  );
}

export function Segments({ items, current }: { items: { id: string; label: string; href: string }[]; current: string }) {
  return (
    <nav className="segments" aria-label="Onderdelen">
      {items.map((it) => (
        <a key={it.id} href={it.href} aria-current={it.id === current ? 'page' : undefined}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

/* Toasts */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
