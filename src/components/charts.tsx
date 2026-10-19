import type { ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// Marques fines, grille discrète, info-bulle au survol / au toucher, un seul axe Y.

const axis = { stroke: 'var(--muted)', fontSize: 11, tickLine: false, axisLine: false } as const;

type Row = { label: string };

function Tip({ active, payload, label, format, names }: {
  active?: boolean; payload?: { dataKey: string; value: number | null; color?: string }[]; label?: string;
  format: (v: number) => string; names?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      <b>{label}</b>
      {payload.map((p) => (
        <div key={p.dataKey} className="num">
          {names?.[p.dataKey] ? `${names[p.dataKey]} : ` : ''}
          {p.value == null ? '—' : format(p.value)}
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, dataKey, format, height = 170, refLine, line = false }: {
  data: Row[]; dataKey: string; format: (v: number) => string; height?: number; refLine?: { value: number; label: string }; line?: boolean;
}) {
  const target = refLine?.value;
  const id = `g-${dataKey}`;
  const tooltip = <Tooltip content={<Tip format={format} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />;
  const ref = target != null && <ReferenceLine y={target} stroke="var(--text-2)" strokeDasharray="4 4" label={{ value: refLine?.label, position: 'insideTopRight', fill: 'var(--text-2)', fontSize: 11 }} />;
  return (
    <div style={{ height, marginLeft: -8 }}>
      <ResponsiveContainer>
        {line ? (
          <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...axis} width={36} allowDecimals={false} domain={[0, (max: number) => niceMax(Math.max(max, target ?? 0) * 1.1)]} />
            {tooltip}
            {ref}
            <Line type="monotone" dataKey={dataKey} stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }} connectNulls isAnimationActive={false} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...axis} width={36} />
            {tooltip}
            {ref}
            <Area type="monotone" dataKey={dataKey} stroke="var(--accent)" strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--accent)' }} isAnimationActive={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export interface SeriesDef { key: string; name: string; color: string }

/** Barres simples (une série) ou empilées (plusieurs). */
export function Bars({ data, series, format, height = 170 }: { data: Row[]; series: SeriesDef[]; format: (v: number) => string; height?: number }) {
  const names = Object.fromEntries(series.map((s) => [s.key, s.name]));
  const stacked = series.length > 1;
  return (
    <div style={{ height, marginLeft: -8 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axis} width={36} allowDecimals={false} />
          <Tooltip content={<Tip format={format} names={stacked ? names : undefined} />} cursor={{ fill: 'var(--card-2)' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId={stacked ? 'a' : undefined} fill={s.color}
              stroke="var(--card)" strokeWidth={stacked ? 2 : 0}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={28} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; extra?: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.name}>
          <i style={{ background: it.color }} />
          {it.name}
          {it.extra}
        </span>
      ))}
    </div>
  );
}

/** Arrondit le haut de l'axe à une valeur « ronde » (5, 10, 25, 50…). */
function niceMax(v: number): number {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * p >= v / 4)! * p;
  return Math.ceil(v / step) * step;
}
