import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../db/useData';
import { Card, PageHead, Ring, Segmented } from '../components/ui';
import { IconBack, IconBelt, IconChevron, IconDumbbell, IconPlay, IconSettings } from '../components/Icons';
import { TrendChart } from '../components/charts';
import { navigate } from '../router';
import { addDays, formatDay, formatLong, formatMonthYear, formatShort, parseISO, relativeDay, startOfWeek, todayISO, weekDays, weekdayLetter } from '../lib/dates';
import { aggregate, trainingDays, type Period } from '../lib/stats';
import { formatKg, formatTonnage, pctChange } from '../lib/calc';
import { createSession } from '../db/actions';
import { BJJ_ID, STREET_ID } from '../sports';
import { sessionTitle } from './sessionInfo';
import type { Session } from '../db/types';

export default function Home({ data }: { data: AppData }) {
  const today = todayISO();
  const [period, setPeriod] = useState<Period>('week');
  const [exerciseId, setExerciseId] = useState<string>('');

  const days = weekDays(today);
  const done = trainingDays(data.sessions);
  const todays = data.sessions.filter((s) => s.date === today).sort((a, b) => a.createdAt - b.createdAt);
  const todayPlanned = todays.filter((s) => s.status === 'planned');
  const todayDone = todays.filter((s) => s.status === 'done');

  const strengthExercises = data.exercises.filter((e) => e.sportId === STREET_ID && !e.archived);
  const buckets = useMemo(
    () => aggregate(data, data.counted, period, period === 'week' ? 10 : 6, { exerciseId: exerciseId || undefined }),
    [data, period, exerciseId],
  );
  const curr = buckets[buckets.length - 1];
  const prev = buckets[buckets.length - 2];
  const delta = pctChange(curr.tonnage, prev?.tonnage ?? 0);

  const week = aggregate(data, data.counted, 'week', 1)[0];
  const weekSessions = data.sessions.filter((s) => s.status === 'done' && s.date >= days[0] && s.date <= days[6]).length;
  // Objectif de la semaine = séances de streetlifting programmées (ou déjà faites) cette semaine.
  const weekStreet = data.sessions.filter((s) => s.sportId === STREET_ID && s.date >= days[0] && s.date <= days[6]);
  const streetDone = weekStreet.filter((s) => s.status === 'done').length;
  const streetTarget = weekStreet.length;

  const quick = async (sportId: string, date?: string) => navigate(`/seance/${await createSession({ sportId, date })}`);

  return (
    <div className="page">
      <PageHead
        title="Salut Tim"
        sub={formatLong(today)}
        right={
          <button className="icon-btn" onClick={() => navigate('/reglages')} aria-label="Réglages">
            <IconSettings />
          </button>
        }
      />

      <WeekScroller data={data} done={done} onQuick={quick} />

      <Card>
        <div className="card-head">
          <h2>Séance du jour</h2>
        </div>
        {todayPlanned.length > 0 ? (
          <div className="stack">
            {todayPlanned.map((s) => {
              const n = data.sets.filter((x) => x.sessionId === s.id);
              const exCount = new Set(n.map((x) => x.exerciseId)).size;
              return (
                <div key={s.id} className="stack" style={{ gap: 12 }}>
                  <div>
                    <div className="big-sm">{sessionTitle(s, data)}</div>
                    <div className="muted small">
                      {s.combat ? `${s.combat.duration} min` : `${exCount} exercice${exCount > 1 ? 's' : ''} · ${n.length} séries`}
                    </div>
                  </div>
                  <button className="btn accent xl block" onClick={() => navigate(`/seance/${s.id}`)}>
                    <IconPlay size={18} /> Démarrer
                  </button>
                </div>
              );
            })}
          </div>
        ) : todayDone.length > 0 ? (
          <div className="row between">
            <div>
              <div className="big-sm">Séance faite 💪</div>
              <div className="muted small">{todayDone.map((s) => sessionTitle(s, data)).join(' · ')}</div>
            </div>
            <button className="btn ghost sm" onClick={() => navigate(`/seance/${todayDone[0].id}`)}>Voir</button>
          </div>
        ) : (
          <div className="muted">Rien de prévu aujourd'hui. Repos, ou on y va&nbsp;?</div>
        )}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost sm grow" onClick={() => quick(STREET_ID)}>
            <IconDumbbell size={18} /> Streetlifting
          </button>
          <button className="btn ghost sm grow" onClick={() => quick(BJJ_ID)}>
            <IconBelt size={18} /> Cours BJJ
          </button>
        </div>
      </Card>

      <Card>
        <div className="card-head">
          <h2>Tonnage</h2>
          <Segmented value={period} onChange={setPeriod} options={[['week', 'Semaine'], ['month', 'Mois']]} />
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
          <span className="big num">{formatTonnage(curr.tonnage)}</span>
          {delta != null && (
            <span className="delta num" style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--accent)' }}>
              {delta >= 0 ? '+' : '−'}
              {Math.abs(Math.round(delta * 100))} %
            </span>
          )}
        </div>
        <div className="muted small" style={{ marginTop: -6, marginBottom: 10 }}>
          {period === 'week' ? 'cette semaine' : 'ce mois-ci'}
          {delta != null && ` vs ${period === 'week' ? 'semaine' : 'mois'} précédent${period === 'week' ? 'e' : ''}`}
        </div>
        <div className="chips scroll" style={{ marginBottom: 8 }}>
          <button className={`chip ${exerciseId === '' ? 'on' : ''}`} onClick={() => setExerciseId('')}>Tous</button>
          {strengthExercises.map((e) => (
            <button key={e.id} className={`chip ${exerciseId === e.id ? 'on' : ''}`} onClick={() => setExerciseId(e.id)}>
              {e.name.replace(/ lest(é|ée|és)$/, '')}
            </button>
          ))}
        </div>
        <TrendChart data={buckets} dataKey="tonnage" format={formatTonnage} />
      </Card>

      <Card>
        <div className="card-head">
          <h2>Cette semaine</h2>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <Ring value={streetTarget ? streetDone / streetTarget : 0} size={84} stroke={10}>
              <span className="num">{streetDone}/{streetTarget}</span>
            </Ring>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>street prévues</div>
          </div>
          <div className="grow" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat label="Séances" value={String(weekSessions)} />
            <Stat label="Répétitions" value={String(week.reps)} />
            <Stat label="Intensité" value={week.intensity != null ? `${Math.round(week.intensity * 100)} %` : '—'} />
            <Stat label="RPE moyen" value={week.rpe != null ? week.rpe.toFixed(1).replace('.', ',') : '—'} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted small">{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const WEEKS_BEFORE = 8;
const WEEKS_AFTER = 8;

/** Bande des jours, défilable semaine par semaine ; toucher un jour affiche un aperçu. */
function WeekScroller({ data, done, onQuick }: { data: AppData; done: Map<string, number>; onQuick: (sportId: string, date: string) => void }) {
  const today = todayISO();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(WEEKS_BEFORE);
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = useMemo(
    () => Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER + 1 }, (_, i) => addDays(startOfWeek(today), 7 * (i - WEEKS_BEFORE))),
    [today],
  );
  const planned = new Set(data.sessions.filter((s) => s.status === 'planned').map((s) => s.date));

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = WEEKS_BEFORE * el.clientWidth;
  }, []);

  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  const weekStart = weeks[index];
  const label = index === WEEKS_BEFORE ? 'Cette semaine' : index === WEEKS_BEFORE + 1 ? 'Semaine prochaine'
    : index === WEEKS_BEFORE - 1 ? 'Semaine dernière' : `Semaine du ${formatShort(weekStart)}`;
  const daySessions = selected ? data.sessions.filter((s) => s.date === selected).sort((a, b) => a.createdAt - b.createdAt) : [];

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between" style={{ padding: '0 4px' }}>
        <div>
          <strong>{label}</strong>
          <span className="muted small" style={{ marginLeft: 8, textTransform: 'capitalize' }}>{formatMonthYear(addDays(weekStart, 3).slice(0, 7))}</span>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="week-nav" aria-label="Semaine précédente" disabled={index === 0} onClick={() => go(index - 1)}><IconBack size={16} /></button>
          <button className="week-nav" aria-label="Semaine suivante" disabled={index === weeks.length - 1} onClick={() => go(index + 1)}><IconChevron size={16} /></button>
        </div>
      </div>
      <div className="week-scroller" ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {weeks.map((ws) => (
          <div key={ws} className="week">
            {weekDays(ws).map((d) => (
              <button key={d} onClick={() => setSelected(selected === d ? null : d)} aria-pressed={selected === d}
                className={`day ${d === today ? 'today' : ''} ${done.has(d) ? 'done' : ''} ${selected === d ? 'sel' : ''}`}>
                <span className="l">{weekdayLetter(d)}</span>
                <span className="d num">{parseISO(d).getDate()}</span>
                {planned.has(d) && !done.has(d) ? <span className="dot" /> : <span style={{ height: 5 }} />}
              </button>
            ))}
          </div>
        ))}
      </div>
      {selected && (
        <div className="card preview">
          <div className="row between" style={{ marginBottom: 4 }}>
            <strong style={{ textTransform: 'capitalize' }}>{relativeDay(selected) === formatDay(selected) ? formatDay(selected) : relativeDay(selected)}</strong>
            <button className="muted small" onClick={() => setSelected(null)}>Fermer</button>
          </div>
          {daySessions.map((s) => <Preview key={s.id} s={s} data={data} />)}
          {!daySessions.length && (
            <>
              <div className="muted small" style={{ margin: '4px 0 10px' }}>Rien de prévu ce jour-là.</div>
              {selected >= today && (
                <div className="row">
                  <button className="btn ghost sm grow" onClick={() => onQuick(STREET_ID, selected)}><IconDumbbell size={16} /> Programmer</button>
                  <button className="btn ghost sm grow" onClick={() => onQuick(BJJ_ID, selected)}><IconBelt size={16} /> BJJ</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Preview({ s, data }: { s: Session; data: AppData }) {
  const sets = data.sets.filter((x) => x.sessionId === s.id).sort((a, b) => a.order - b.order);
  const lines: string[] = [];
  if (s.combat) {
    lines.push(`${s.combat.duration} min${s.combat.techniques.length ? ' · ' + s.combat.techniques.map((t) => t.name).filter(Boolean).join(', ') : ''}`);
  } else {
    const byEx = new Map<string, typeof sets>();
    for (const x of sets) (byEx.get(x.exerciseId) ?? byEx.set(x.exerciseId, []).get(x.exerciseId)!).push(x);
    for (const [exId, xs] of byEx) {
      const name = data.exercises.find((e) => e.id === exId)?.name ?? 'Exercice';
      const top = xs.reduce((m, x) => (x.load > m.load ? x : m), xs[0]);
      lines.push(`${name} · ${xs.length}×${top.reps} @ +${formatKg(top.load)} kg`);
    }
  }
  return (
    <button className="preview-item" onClick={() => navigate(`/seance/${s.id}`)}>
      <span className={`sport-dot ${s.combat ? 'combat' : 'strength'}`}>{s.combat ? <IconBelt size={18} /> : <IconDumbbell size={18} />}</span>
      <span className="grow">
        <span className="row" style={{ gap: 6 }}>
          <b>{sessionTitle(s, data)}</b>
          {s.status === 'done' && <span className="chip" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>Faite</span>}
        </span>
        {lines.map((l) => <span key={l} className="muted small" style={{ display: 'block' }}>{l}</span>)}
      </span>
      <IconChevron size={16} />
    </button>
  );
}
