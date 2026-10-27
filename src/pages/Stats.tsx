import { useMemo, useState } from 'react';
import type { AppData } from '../db/useData';
import { strengthExercises } from '../db/useData';
import { Card, PageHead, Segmented, energyColor } from '../components/ui';
import { Bars, Legend, TrendChart } from '../components/charts';
import { aggregate, bucketStart, categorySummary, dayStatuses, e1rmSeries, officialAt, type DayStatus, type Period } from '../lib/stats';
import { CATEGORY_LABEL, formatKg, formatTonnage } from '../lib/calc';
import { addDays, addMonths, formatDay, formatMonth, formatMonthYear, parseISO, startOfWeek, todayISO, weekdayLetter } from '../lib/dates';
import { IconBack, IconCheck, IconChevron } from '../components/Icons';

const CAT_COLORS = { force: 'var(--accent)', inter: 'var(--series-2)', volume: 'var(--series-3)' };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const dec = (v: number) => v.toFixed(1).replace('.', ',');

export default function Stats({ data }: { data: AppData }) {
  const [period, setPeriod] = useState<Period>('day');
  const n = period === 'day' ? 7 : period === 'week' ? 12 : 6;
  const exercises = strengthExercises(data);
  const [exSel, setExSel] = useState<Set<string>>(new Set());
  const toggleEx = (id: string) => setExSel((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const counted = useMemo(
    () => (exSel.size ? data.counted.filter((c) => exSel.has(c.exerciseId)) : data.counted),
    [data.counted, exSel],
  );
  const buckets = useMemo(() => aggregate(data, counted, period, n), [data, counted, period, n]);
  const [exId, setExId] = useState(exercises[0]?.id ?? '');
  const e1 = useMemo(() => e1rmSeries(data.counted, exId, period, n), [data.counted, exId, period, n]);
  const since = bucketStart(buckets[0].key);
  const official = exId ? officialAt(data.maxes, exId, todayISO()) : undefined;
  const cats = categorySummary(counted, since);

  const withIntensity = buckets.map((b) => ({ ...b, intensityPct: b.intensity != null ? b.intensity * 100 : null }));
  const known = buckets.filter((b) => b.intensity != null);
  const avgInt = known.length ? known.reduce((a, b) => a + b.intensity!, 0) / known.length : null;
  const rpeKnown = buckets.filter((b) => b.rpe != null);
  const avgRpe = rpeKnown.length ? rpeKnown.reduce((a, b) => a + b.rpe!, 0) / rpeKnown.length : null;
  const en = buckets.filter((b) => b.energy != null);
  const avgEnergy = en.length ? en.reduce((a, b) => a + b.energy!, 0) / en.length : null;
  const totalStrength = buckets.reduce((a, b) => a + b.strengthSessions, 0);
  const totalCombat = buckets.reduce((a, b) => a + b.combatSessions, 0);
  const periodWord = period === 'day' ? '7 derniers jours' : period === 'week' ? '12 dernières semaines' : '6 derniers mois';
  const unit = period === 'day' ? 'jour' : period === 'week' ? 'semaine' : 'mois';

  return (
    <div className="page">
      <PageHead title="Stats" sub={periodWord} />
      <Segmented value={period} onChange={setPeriod} options={[['day', '7 jours'], ['week', 'Semaines'], ['month', 'Mois']]} />

      <div className="chips scroll" style={{ margin: '0 -16px', padding: '0 16px' }}>
        <button className={`chip ${exSel.size === 0 ? 'on' : ''}`} onClick={() => setExSel(new Set())}>Tous</button>
        {exercises.map((e) => (
          <button key={e.id} className={`chip ${exSel.has(e.id) ? 'on' : ''}`} onClick={() => toggleEx(e.id)}>{e.name}</button>
        ))}
      </div>

      <Card>
        <div className="card-head"><h2>Tonnage</h2><span className="muted small">charge × reps</span></div>
        <TrendChart data={buckets} dataKey="tonnage" format={formatTonnage} />
      </Card>

      <Card>
        <div className="card-head"><h2>Volume de répétitions</h2></div>
        <TrendChart line data={buckets} dataKey="reps" format={(v) => `${v} reps`} />
      </Card>

      <Card>
        <div className="card-head"><h2>Intensité</h2></div>
        <div className="row" style={{ gap: 24, marginBottom: 8 }}>
          <div><div className="muted small">% du 1RM</div><div className="big-sm num">{avgInt != null ? pct(avgInt) : '—'}</div></div>
          <div><div className="muted small">RPE moyen</div><div className="big-sm num">{avgRpe != null ? dec(avgRpe) : '—'}</div></div>
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>Calculé sur ton 1RM officiel (PR saisi dans les Réglages), sinon sur le 1RM estimé.</div>
        <div className="label">% du 1RM</div>
        <TrendChart line data={withIntensity} dataKey="intensityPct" format={(v) => `${Math.round(v)} %`} height={140} />
        <div className="label" style={{ marginTop: 8 }}>RPE moyen</div>
        <TrendChart line data={buckets} dataKey="rpe" format={dec} height={120} />
      </Card>

      <Card>
        <div className="card-head"><h2>Taux d'énergie</h2></div>
        <div className="muted small">Énergie moyenne</div>
        <div className="big-sm num" style={{ color: avgEnergy != null ? energyColor(avgEnergy) : undefined, marginBottom: 6 }}>
          {avgEnergy != null ? `${Math.round(avgEnergy)} %` : '—'}
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>Moyenne du niveau de batterie saisi à chaque séance.</div>
        <TrendChart line data={buckets} dataKey="energy" format={(v) => `${Math.round(v)} %`} height={150} />
      </Card>

      <Card>
        <div className="card-head"><h2>Force / intermédiaire / volume</h2></div>
        <div className="muted small" style={{ marginBottom: 8 }}>Séries par catégorie : 1–3, 4–6 et 7+ reps</div>
        <Legend items={(['force', 'inter', 'volume'] as const).map((c) => ({ name: CATEGORY_LABEL[c], color: CAT_COLORS[c] }))} />
        <Bars data={buckets} format={(v) => `${v} séries`}
          series={(['force', 'inter', 'volume'] as const).map((c) => ({ key: c, name: CATEGORY_LABEL[c], color: CAT_COLORS[c] }))} />
        <table className="mini" style={{ marginTop: 10 }}>
          <thead><tr><th>Catégorie</th><th>Séries</th><th>Charge moy.</th><th>1RM est.</th><th>RPE</th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.category}>
                <td><span className="row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[c.category] }} />{CATEGORY_LABEL[c.category]}</span></td>
                <td>{c.sets}</td>
                <td>{c.avgLoad != null ? `${formatKg(c.avgLoad)} kg` : '—'}</td>
                <td>{c.bestE1rm != null ? `${formatKg(c.bestE1rm)} kg` : '—'}</td>
                <td>{c.avgRpe != null ? dec(c.avgRpe) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="card-head"><h2>1RM estimé</h2>{official && <span className="muted small">officiel {formatKg(official.load)} kg</span>}</div>
        <div className="chips scroll" style={{ marginBottom: 8 }}>
          {exercises.map((e) => (
            <button key={e.id} className={`chip ${exId === e.id ? 'on' : ''}`} onClick={() => setExId(e.id)}>{e.name}</button>
          ))}
        </div>
        <TrendChart line data={e1} dataKey="value" format={(v) => `${formatKg(v)} kg`} refLine={official ? { value: official.load, label: 'Officiel' } : undefined} />
      </Card>

      <Card>
        <div className="card-head"><h2>Régularité</h2></div>
        <RegularityCalendar data={data} />
        <div className="label" style={{ marginTop: 16 }}>Séances par {unit}</div>
        <Bars data={buckets.map((b) => ({ ...b, total: b.strengthSessions + b.combatSessions }))}
          series={[{ key: 'total', name: 'Séances', color: 'var(--accent)' }]} format={(v) => `${v} séance${v > 1 ? 's' : ''}`} height={140} />
      </Card>

      <Card>
        <div className="card-head"><h2>Streetlifting / BJJ</h2></div>
        <div className="row" style={{ gap: 24, marginBottom: 10 }}>
          <div><div className="muted small">Streetlifting</div><div className="big-sm num">{totalStrength}</div></div>
          <div><div className="muted small">BJJ</div><div className="big-sm num">{totalCombat}</div></div>
          {totalStrength + totalCombat > 0 && (
            <div><div className="muted small">Part BJJ</div><div className="big-sm num">{pct(totalCombat / (totalStrength + totalCombat))}</div></div>
          )}
        </div>
        <Legend items={[{ name: 'Streetlifting', color: 'var(--accent)' }, { name: 'BJJ', color: 'var(--series-2)' }]} />
        <Bars data={buckets} format={(v) => `${v} séance${v > 1 ? 's' : ''}`}
          series={[{ key: 'strengthSessions', name: 'Streetlifting', color: 'var(--accent)' }, { key: 'combatSessions', name: 'BJJ', color: 'var(--series-2)' }]} />
      </Card>
    </div>
  );
}

const STATUS_LABEL: Record<DayStatus, string> = { done: 'Séance faite', skipped: 'Séance sautée', planned: 'Programmée', rest: 'Repos' };

/** Calendrier de régularité sur 1 ou 3 mois : faite / sautée / programmée / repos, avec les dates. */
function RegularityCalendar({ data }: { data: AppData }) {
  const today = todayISO();
  const [span, setSpan] = useState<1 | 3>(1);
  const [month, setMonth] = useState(today.slice(0, 7));
  const statuses = useMemo(() => dayStatuses(data.sessions, today), [data.sessions, today]);
  const months = span === 1 ? [month] : [addMonths(month, -2), addMonths(month, -1), month];
  const inRange = (d: string) => d.slice(0, 7) >= months[0] && d.slice(0, 7) <= month;
  const counts = { done: 0, skipped: 0 };
  for (const [d, st] of statuses) if (inRange(d) && (st === 'done' || st === 'skipped')) counts[st]++;
  const { done, skipped } = counts;
  const year = month.slice(0, 4);
  const title = span === 1 ? formatMonthYear(month) : `${formatMonth(months[0])} – ${formatMonth(month)} ${year}`;

  return (
    <>
      <div className="row between" style={{ marginBottom: 10 }}>
        <button className="week-nav" aria-label="Période précédente" onClick={() => setMonth(addMonths(month, -span))}><IconBack size={16} /></button>
        <strong style={{ textTransform: 'capitalize' }}>{title}</strong>
        <button className="week-nav" aria-label="Période suivante" onClick={() => setMonth(addMonths(month, span))}><IconChevron size={16} /></button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Segmented value={String(span) as '1' | '3'} onChange={(v) => setSpan(v === '1' ? 1 : 3)} options={[['1', 'Mois'], ['3', '3 mois']]} />
      </div>
      {months.map((m) => (
        <div key={m} style={{ marginBottom: span === 3 ? 14 : 0 }}>
          {span === 3 && <div className="label" style={{ textTransform: 'capitalize' }}>{formatMonthYear(m)}</div>}
          <MonthGrid month={m} today={today} statuses={statuses} compact={span === 3} />
        </div>
      ))}
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i className="lg done" />Faite</span>
        <span><i className="lg skipped" />Sautée</span>
        <span><i className="lg planned" />Programmée</span>
        <span><i className="lg rest" />Repos</span>
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>
        {done} séance{done > 1 ? 's' : ''} faite{done > 1 ? 's' : ''}
        {skipped > 0 && ` · ${skipped} sautée${skipped > 1 ? 's' : ''}`}
        {done + skipped > 0 && ` · ${Math.round((done / (done + skipped)) * 100)} % de régularité`}
      </div>
    </>
  );
}

function MonthGrid({ month, today, statuses, compact }: { month: string; today: string; statuses: Map<string, DayStatus>; compact: boolean }) {
  const start = startOfWeek(month + '-01');
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const shown = cells.slice(0, cells[35].slice(0, 7) === month ? 42 : 35);
  return (
    <div className={`reg-grid ${compact ? 'compact' : ''}`}>
      {shown.slice(0, 7).map((d) => <span key={'h' + d} className="cal-head">{weekdayLetter(d)}</span>)}
      {shown.map((d) => {
        const other = d.slice(0, 7) !== month;
        // En vue 3 mois, les jours hors du mois sont masqués (ils apparaissent dans le mois voisin).
        if (other && compact) return <div key={d} className="reg-cell out" aria-hidden />;
        const st = d > today && !statuses.has(d) ? 'future' : statuses.get(d) ?? 'rest';
        return (
          <div key={d} className={`reg-cell ${st} ${other ? 'other' : ''} ${d === today ? 'today' : ''}`}
            title={`${formatDay(d)} : ${st === 'future' ? 'à venir' : STATUS_LABEL[st as DayStatus]}`}>
            <span className="num">{parseISO(d).getDate()}</span>
            {!compact && st === 'done' && <IconCheck size={12} />}
            {!compact && st === 'skipped' && <span aria-hidden className="x">✕</span>}
          </div>
        );
      })}
    </div>
  );
}
