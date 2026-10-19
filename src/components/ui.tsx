import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconBack, IconCheck } from './Icons';
import { goBack } from '../router';
import { formatKg } from '../lib/calc';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function PageHead({ title, sub, right, back }: { title: string; sub?: string; right?: ReactNode; back?: boolean }) {
  return (
    <header className="page-head">
      <div className="row grow">
        {back && (
          <button className="icon-btn" onClick={() => goBack()} aria-label="Retour">
            <IconBack />
          </button>
        )}
        <div className="grow">
          <h1 style={back ? { fontSize: 24 } : undefined}>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
      {right}
    </header>
  );
}

/** Petit stepper horizontal (séries) : +/− ou saisie directe au clavier (le champ se vide au toucher ; vide = inchangé). */
export function MiniStep({ value, step, unit, onChange, format = (v) => String(v), decimal = false }: {
  value: number; step: number; unit: string; onChange: (v: number) => void; format?: (v: number) => string; decimal?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text == null) return;
    const v = text === '' ? NaN : parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) onChange(decimal ? Math.round(v * 100) / 100 : Math.round(v));
    setText(null);
  };
  return (
    <div className="mini-step">
      <button aria-label={`moins ${step} ${unit}`} onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}>−</button>
      <label className="v num">
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-label={unit}
          value={text ?? format(value)}
          placeholder={format(value)}
          onFocus={() => setText('')}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <span className="u">{unit}</span>
      </label>
      <button aria-label={`plus ${step} ${unit}`} onClick={() => onChange(+(value + step).toFixed(2))}>+</button>
    </div>
  );
}

/**
 * Grand stepper (formulaires). Avec `keyboard`, le chiffre se tape aussi au clavier
 * (le champ se vide au toucher ; vide = inchangé), entouré de `prefix` et `unit`.
 */
export function Stepper({ value, step, onChange, format = formatKg, min = 0, keyboard, prefix, unit }: {
  value: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; min?: number;
  keyboard?: 'decimal' | 'int'; prefix?: string; unit?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text == null) return;
    const v = text === '' ? NaN : parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v)) onChange(Math.max(min, keyboard === 'int' ? Math.round(v) : Math.round(v * 100) / 100));
    setText(null);
  };
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="moins">−</button>
      {keyboard ? (
        <label className="v num stepper-input">
          {prefix}
          <input
            inputMode={keyboard === 'decimal' ? 'decimal' : 'numeric'}
            aria-label={unit ?? 'valeur'}
            value={text ?? format(value)}
            placeholder={format(value)}
            size={Math.max(2, format(value).length)}
            onFocus={() => setText('')}
            onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ''))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          {unit && <span className="stepper-unit">{unit}</span>}
        </label>
      ) : (
        <span className="v num">{format(value)}</span>
      )}
      <button onClick={() => onChange(+(value + step).toFixed(2))} aria-label="plus">+</button>
    </div>
  );
}

export function CheckButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`check ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} aria-label={label}>
      <IconCheck size={24} />
    </button>
  );
}

/** Couleur d'un niveau d'énergie (0–100 %) : vert → jaune → orange → rouge. */
export function energyColor(v: number): string {
  if (v >= 70) return 'var(--lvl-green)';
  if (v >= 50) return 'var(--lvl-yellow)';
  if (v >= 30) return 'var(--lvl-orange)';
  return 'var(--lvl-red)';
}

/** Batterie à remplir (tap ou glisser) : niveau d'énergie de 10 à 100 %. */
export function BatteryPicker({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const pct = Math.min(100, Math.max(10, Math.ceil(((clientX - r.left) / r.width) * 10) * 10));
    if (pct !== value) onChange(pct);
  };
  const color = value != null ? energyColor(value) : 'var(--muted)';
  return (
    <div className="battery-picker">
      <div
        ref={ref}
        className="battery"
        role="slider"
        tabIndex={0}
        aria-label="Niveau d'énergie"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && pick(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onChange(Math.min(100, (value ?? 0) + 10));
          if (e.key === 'ArrowLeft') onChange(Math.max(10, (value ?? 20) - 10));
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={value != null && i < value / 10 ? { background: color } : undefined} />
        ))}
      </div>
      <span className="battery-val num" style={{ color }}>{value != null ? `${value} %` : '— %'}</span>
    </div>
  );
}

/** Petite batterie en lecture seule (listes). */
export function BatteryBadge({ value }: { value?: number }) {
  if (value == null) return null;
  return (
    <span className="battery-badge" title={`Énergie ${value} %`} aria-label={`Énergie ${value} %`}>
      <span className="bb"><i style={{ width: `${value}%`, background: energyColor(value) }} /></span>
      <span className="num">{value} %</span>
    </span>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/** Anneau de progression (0–1). */
export function Ring({ value, size = 64, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size / 4.2 }}>{children}</div>
    </div>
  );
}

export function Progress({ value, done }: { value: number; done?: boolean }) {
  return (
    <div className={`progress ${done ? 'done' : ''}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
