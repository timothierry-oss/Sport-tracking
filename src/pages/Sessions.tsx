import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../db/useData';
import { strengthSports } from '../db/useData';
import type { Session, Template } from '../db/types';
import { BatteryBadge, Card, PageHead, Segmented, Sheet } from '../components/ui';
import { IconBack, IconBelt, IconChevron, IconDumbbell, IconPlus, IconSearch } from '../components/Icons';
import { createSession } from '../db/actions';
import { db } from '../db/db';
import { uid } from '../lib/id';
import { addDays, addMonths, formatMonthYear, formatShort, parseISO, relativeDay, startOfWeek, todayISO, weekdayLetter } from '../lib/dates';
import { formatKg, tonnage } from '../lib/calc';
import { navigate } from '../router';
import { sessionTitle } from './sessionInfo';

type Tab = 'plan' | 'history' | 'templates';
type NewState = { template?: Template; date?: string };

export default function Sessions({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>(() => {
    try { return (sessionStorage.getItem('sessions-tab') as Tab) || 'plan'; } catch { return 'plan'; }
  });
  const [creating, setCreating] = useState<NewState | null>(null);
  const changeTab = (t: Tab) => {
    setTab(t);
    try { sessionStorage.setItem('sessions-tab', t); } catch { /* ignoré */ }
  };

  return (
    <div className="page">
      <PageHead
        title="Séances"
        right={
          <button className="btn accent sm" onClick={() => setCreating({})}>
            <IconPlus size={18} /> Séance
          </button>
        }
      />
      <Segmented value={tab} onChange={changeTab} options={[['plan', 'Planning'], ['history', 'Historique'], ['templates', 'Modèles']]} />
      {tab === 'plan' && <Planning data={data} onAdd={(date) => setCreating({ date })} />}
      {tab === 'history' && <History data={data} />}
      {tab === 'templates' && <Templates data={data} onPlan={(template) => setCreating({ template })} />}
      <NewSessionSheet data={data} state={creating} onClose={() => setCreating(null)} />
    </div>
  );
}

function SessionItem({ s, data, compact }: { s: Session; data: AppData; compact?: boolean }) {
  const sets = data.sets.filter((x) => x.sessionId === s.id);
  const done = sets.filter((x) => x.done);
  const strength = !s.combat;
  const detail = strength
    ? s.status === 'done'
      ? `${done.length} séries · ${formatKg(tonnage(done))} kg`
      : `${new Set(sets.map((x) => x.exerciseId)).size} exercices · ${sets.length} séries`
    : `${s.combat!.duration} min${s.combat!.techniques.length ? ` · ${s.combat!.techniques.length} technique(s)` : ''}`;
  return (
    <button className={`list-item ${compact ? 'compact' : ''}`} onClick={() => navigate(`/seance/${s.id}`)}>
      <span className={`sport-dot ${strength ? 'strength' : 'combat'}`}>{strength ? <IconDumbbell size={20} /> : <IconBelt size={20} />}</span>
      <span className="grow">
        <div className="row" style={{ gap: 8 }}><b>{sessionTitle(s, data)}</b><BatteryBadge value={s.feeling} /></div>
        <div className="muted small">{compact ? (s.status === 'done' ? `Faite · ${detail}` : detail) : `${relativeDay(s.date)} · ${detail}`}</div>
      </span>
      <IconChevron size={18} />
    </button>
  );
}

function Planning({ data, onAdd }: { data: AppData; onAdd: (date: string) => void }) {
  const today = todayISO();
  const [view, setView] = useState<'days' | 'month'>('days');
  const [start, setStart] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);

  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of data.sessions) (m.get(s.date) ?? m.set(s.date, []).get(s.date)!).push(s);
    for (const l of m.values()) l.sort((a, b) => a.createdAt - b.createdAt);
    return m;
  }, [data.sessions]);
  const late = data.sessions.filter((s) => s.status === 'planned' && s.date < today).sort((a, b) => a.date.localeCompare(b.date));

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const monthStart = startOfWeek(month + '-01');
  const cells = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
  const weeksShown = cells[35].slice(0, 7) === month ? 6 : 5;

  return (
    <>
      <div className="row between">
        <Segmented value={view} onChange={setView} options={[['days', '7 jours'], ['month', 'Mois']]} />
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" aria-label="Précédent" onClick={() => (view === 'days' ? setStart(addDays(start, -7)) : setMonth(addMonths(month, -1)))}>
            <IconBack size={18} />
          </button>
          <button className="icon-btn" aria-label="Suivant" onClick={() => (view === 'days' ? setStart(addDays(start, 7)) : setMonth(addMonths(month, 1)))}>
            <IconChevron size={18} />
          </button>
        </div>
      </div>
      <div className="row between" style={{ padding: '0 4px' }}>
        <strong style={{ textTransform: view === 'month' ? 'capitalize' : undefined }}>
          {view === 'days' ? `${formatShort(days[0])} – ${formatShort(days[6])}` : formatMonthYear(month)}
        </strong>
        {(view === 'days' ? start !== today : month !== today.slice(0, 7)) && (
          <button className="chip" onClick={() => { setStart(today); setMonth(today.slice(0, 7)); setSelected(today); }}>Aujourd'hui</button>
        )}
      </div>

      {view !== 'month' ? (
        <Card>
          {days.map((d) => (
            <div key={d} className="cal-day">
              <div className={`cal-date ${d === today ? 'today' : ''}`}>
                <span>{['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'][(parseISO(d).getDay() + 6) % 7]}</span>
                <b className="num">{parseISO(d).getDate()}</b>
              </div>
              <div className="grow">
                {(byDate.get(d) ?? []).map((s) => <SessionItem key={s.id} s={s} data={data} compact />)}
                {!byDate.get(d)?.length && <div className="muted small" style={{ padding: '10px 0' }}>Repos</div>}
              </div>
              <button className="cal-add" aria-label={`Ajouter une séance le ${formatShort(d)}`} onClick={() => onAdd(d)}>
                <IconPlus size={18} />
              </button>
            </div>
          ))}
        </Card>
      ) : (
        <>
          <Card>
            <div className="cal-grid">
              {cells.slice(0, 7).map((d) => <span key={'h' + d} className="cal-head">{weekdayLetter(d)}</span>)}
              {cells.slice(0, weeksShown * 7).map((d) => {
                const list = byDate.get(d) ?? [];
                return (
                  <button key={d} onClick={() => setSelected(d)}
                    className={`cal-cell ${d.slice(0, 7) !== month ? 'other' : ''} ${d === today ? 'today' : ''} ${d === selected ? 'sel' : ''}`}>
                    <span className="num">{parseISO(d).getDate()}</span>
                    <span className="cal-dots">
                      {list.slice(0, 3).map((s) => <i key={s.id} className={s.status === 'done' ? 'done' : ''} />)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="legend" style={{ marginTop: 10 }}>
              <span><i style={{ background: 'var(--accent)', borderRadius: 9 }} />Programmée</span>
              <span><i style={{ background: 'var(--text)', borderRadius: 9 }} />Faite</span>
            </div>
          </Card>
          <div className="section-title">{relativeDay(selected)}</div>
          <Card>
            {(byDate.get(selected) ?? []).map((s) => <SessionItem key={s.id} s={s} data={data} />)}
            {!byDate.get(selected)?.length && <div className="empty" style={{ padding: 8 }}>Rien ce jour-là.</div>}
            <button className="btn ghost sm block" style={{ marginTop: 8 }} onClick={() => onAdd(selected)}>
              <IconPlus size={16} /> Ajouter une séance
            </button>
          </Card>
        </>
      )}

      {late.length > 0 && (
        <>
          <div className="section-title">Programmées, pas encore faites</div>
          <Card>{late.map((s) => <SessionItem key={s.id} s={s} data={data} />)}</Card>
        </>
      )}
    </>
  );
}

function History({ data }: { data: AppData }) {
  const [q, setQ] = useState('');
  const [sport, setSport] = useState<'all' | string>('all');
  const [tag, setTag] = useState<string | null>(null);
  const combatIds = new Set(data.activeSports.filter((s) => s.kind === 'combat').map((s) => s.id));
  const combatTags = data.tags.filter((t) => combatIds.has(t.sportId));

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.sessions
      .filter((s) => s.status === 'done')
      .filter((s) => sport === 'all' || s.sportId === sport)
      .filter((s) => !tag || s.combat?.techniques.some((t) => t.tagIds.includes(tag)))
      .filter((s) => {
        if (!needle) return true;
        const exNames = data.sets.filter((x) => x.sessionId === s.id).map((x) => data.exercises.find((e) => e.id === x.exerciseId)?.name ?? '');
        const hay = [s.title, s.note, s.combat?.flow, s.combat?.remarks, s.combat?.improve, ...(s.combat?.type ?? []),
          ...(s.combat?.techniques.map((t) => t.name) ?? []), ...exNames].join(' ').toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [data, q, sport, tag]);

  return (
    <>
      <div className="row" style={{ background: 'var(--card-2)', borderRadius: 999, paddingLeft: 14 }}>
        <IconSearch size={18} />
        <input placeholder="Rechercher (technique, note…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ background: 'transparent' }} />
      </div>
      <div className="chips">
        <button className={`chip ${sport === 'all' ? 'on' : ''}`} onClick={() => setSport('all')}>Tout</button>
        {data.activeSports.map((s) => (
          <button key={s.id} className={`chip ${sport === s.id ? 'on' : ''}`}
            onClick={() => { setSport(s.id); if (!combatIds.has(s.id)) setTag(null); }}>
            {s.name}
          </button>
        ))}
      </div>
      {(sport === 'all' || combatIds.has(sport)) && combatTags.length > 0 && (
        <div className="chips scroll" style={{ margin: '0 -16px', padding: '0 16px' }}>
          {combatTags.map((t) => (
            <button key={t.id} className={`chip ${tag === t.id ? 'accent' : ''}`} onClick={() => setTag(tag === t.id ? null : t.id)}>#{t.name}</button>
          ))}
        </div>
      )}
      <Card>{list.length ? list.map((s) => <SessionItem key={s.id} s={s} data={data} />) : <div className="empty">Aucune séance trouvée.</div>}</Card>
    </>
  );
}

function Templates({ data, onPlan }: { data: AppData; onPlan: (t: Template) => void }) {
  const strengthList = strengthSports(data);
  const [newSportId, setNewSportId] = useState(strengthList[0]?.id ?? '');
  const visible = data.templates.filter((t) => strengthList.some((s) => s.id === t.sportId));
  const create = async () => {
    const sportId = newSportId || strengthList[0]?.id;
    if (!sportId) return;
    const id = uid();
    await db.templates.add({ id, name: 'Nouveau modèle', sportId, items: [] });
    navigate(`/modele/${id}`);
  };
  return (
    <>
      {visible.map((t) => (
        <Card key={t.id}>
          <div className="card-head">
            <h2>{t.name}</h2>
            <button className="btn ghost sm" onClick={() => navigate(`/modele/${t.id}`)}>Modifier</button>
          </div>
          <div className="muted small" style={{ marginBottom: 12 }}>
            {t.items.map((i) => `${data.exercises.find((e) => e.id === i.exerciseId)?.name ?? '?'} ${i.sets.length}×${i.sets[0]?.reps ?? '?'}`).join(' · ') || 'Vide'}
          </div>
          <button className="btn block" onClick={() => onPlan(t)}>Planifier</button>
        </Card>
      ))}
      {!visible.length && <Card><div className="empty">Crée un modèle réutilisable (ex. « Pull A »), ou enregistre une séance comme modèle.</div></Card>}
      {strengthList.length > 1 && (
        <div className="chips" style={{ margin: '8px 0' }}>
          {strengthList.map((s) => (
            <button key={s.id} className={`chip ${newSportId === s.id ? 'on' : ''}`} onClick={() => setNewSportId(s.id)}>{s.name}</button>
          ))}
        </div>
      )}
      <button className="btn ghost block" onClick={create} disabled={!strengthList.length}><IconPlus size={18} /> Nouveau modèle</button>
    </>
  );
}

function NewSessionSheet({ data, state, onClose }: { data: AppData; state: NewState | null; onClose: () => void }) {
  const [date, setDate] = useState(todayISO());
  useEffect(() => {
    if (state) setDate(state.date ?? todayISO());
  }, [state]);
  const [templateId, setTemplateId] = useState<string>('');
  const fixed = state?.template;
  const strengthIds = new Set(strengthSports(data).map((s) => s.id));
  const templates = data.templates.filter((t) => strengthIds.has(t.sportId));

  const go = async (sportId: string) => {
    const template = fixed ?? templates.find((t) => t.id === templateId && t.sportId === sportId);
    const id = await createSession({ sportId, date, template });
    onClose();
    setTemplateId('');
    navigate(`/seance/${id}`);
  };

  return (
    <Sheet open={!!state} onClose={onClose} title={fixed ? `Planifier « ${fixed.name} »` : 'Nouvelle séance'}>
      <div>
        <div className="label">Date</div>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>
      {fixed ? (
        <button className="btn accent block xl" onClick={() => go(fixed.sportId)}>Planifier</button>
      ) : (
        <>
          {templates.length > 0 && (
            <div>
              <div className="label">Modèle</div>
              <div className="chips">
                <button className={`chip ${templateId === '' ? 'on' : ''}`} onClick={() => setTemplateId('')}>Aucun</button>
                {templates.map((t) => (
                  <button key={t.id} className={`chip ${templateId === t.id ? 'on' : ''}`} onClick={() => setTemplateId(t.id)}>{t.name}</button>
                ))}
              </div>
            </div>
          )}
          <div className="stack">
            {data.activeSports.map((s, i) => (
              <button key={s.id} className={`btn ${i === 0 ? 'accent' : ''} block xl`} onClick={() => go(s.id)}>
                {s.kind === 'combat' ? <IconBelt /> : <IconDumbbell />} {s.name}
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
