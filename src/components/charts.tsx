// Grafieken (Recharts) in de stijl van de app.

import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtDay } from '../lib/format';

const axis = { tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="faint tiny">{label ? fmtDay(label, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
      {payload.map((p) => (
        <div key={p.name} className="num" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

export interface Series {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
  dot?: boolean;
}

export function Lines({ data, series, fmt = String, height = 200, goal, domain }: {
  data: object[];
  series: Series[];
  fmt?: (n: number) => string;
  height?: number;
  goal?: { value: number; label: string };
  domain?: [number | string, number | string];
}) {
  return (
    <div className="chart-box" style={{ height }}><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="date" {...axis} tickFormatter={(d) => fmtDay(d)} minTickGap={28} />
        <YAxis {...axis} domain={domain ?? ['auto', 'auto']} width={40} tickFormatter={(n) => fmt(n)} />
        <Tooltip content={<Tip fmt={fmt} />} cursor={{ stroke: 'var(--line-strong)' }} />
        {goal && <ReferenceLine y={goal.value} stroke="var(--text-3)" strokeDasharray="4 4" label={{ value: goal.label, position: 'insideTopRight', fill: 'var(--text-2)', fontSize: 11 }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2} strokeDasharray={s.dashed ? '4 3' : undefined} dot={s.dot ? { r: 2.5, fill: s.color, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer></div>
  );
}

export function AreaLine({ data, dataKey, name, color, fmt = String, height = 200, baselineKey }: {
  data: object[];
  dataKey: string;
  name: string;
  color: string;
  fmt?: (n: number) => string;
  height?: number;
  baselineKey?: string;
}) {
  const id = `g-${dataKey}`;
  return (
    <div className="chart-box" style={{ height }}><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="date" {...axis} tickFormatter={(d) => fmtDay(d)} minTickGap={32} />
        <YAxis {...axis} width={52} domain={['auto', 'auto']} tickFormatter={(n) => fmt(n)} />
        <Tooltip content={<Tip fmt={fmt} />} cursor={{ stroke: 'var(--line-strong)' }} />
        {baselineKey && <Area type="monotone" dataKey={baselineKey} name="Ingelegd" stroke="var(--text-3)" strokeDasharray="4 3" fill="none" strokeWidth={1.25} isAnimationActive={false} />}
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer></div>
  );
}

export const DONUT_COLORS = ['#0a84ff', '#7fe021', '#b34bff', '#ff8a00', '#00d8f0', '#fa114f', '#ffd60a', '#ff6b3d'];

export function Donut({ data, center, size = 200 }: { data: { name: string; value: number }[]; center?: React.ReactNode; size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>{center}</div>}
    </div>
  );
}
