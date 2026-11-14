// Activiteitsringen: concentrische ringen die vollopen. Boven 100% loopt de ring een tweede rondje.

import { useEffect, useState } from 'react';

export interface RingSpec {
  pct: number; // 0..∞ (1 = doel gehaald)
  from: string; // kleur begin
  to: string; // kleur eind
  label?: string;
}

export function Rings({ rings, size = 220, stroke = 22, gap = 5, children }: { rings: RingSpec[]; size?: number; stroke?: number; gap?: number; children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const c = size / 2;
  return (
    <div className="rings" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          {rings.map((r, i) => (
            <linearGradient key={i} id={`ring-g-${i}-${size}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={r.from} />
              <stop offset="100%" stopColor={r.to} />
            </linearGradient>
          ))}
        </defs>
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap);
          const circ = 2 * Math.PI * radius;
          const p = mounted ? Math.min(r.pct, 2) : 0;
          const first = Math.min(p, 1);
          const second = Math.max(0, p - 1);
          return (
            <g key={i} transform={`rotate(-90 ${c} ${c})`}>
              <circle cx={c} cy={c} r={radius} fill="none" stroke={r.from} strokeOpacity={0.16} strokeWidth={stroke} />
              <circle
                className="ring-arc"
                cx={c}
                cy={c}
                r={radius}
                fill="none"
                stroke={`url(#ring-g-${i}-${size})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - first) + (first > 0 ? 0.001 : 0)}
                style={{ transitionDelay: `${i * 120}ms` }}
              />
              {second > 0 && (
                <circle
                  className="ring-arc ring-lap"
                  cx={c}
                  cy={c}
                  r={radius}
                  fill="none"
                  stroke={r.to}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - second)}
                  style={{ transitionDelay: `${i * 120 + 600}ms` }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {children && <div className="rings-center">{children}</div>}
    </div>
  );
}
