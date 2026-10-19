import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../db/useData';
import type { Session, WorkSet } from '../db/types';
import { db } from '../db/db';
import { addSetsToSession, defaultBlock, deleteSession, sessionToTemplate, type SetBlock } from '../db/actions';
import { BatteryPicker, CheckButton, MiniStep, PageHead, Segmented, Sheet, Card, Stepper } from '../components/ui';
import { IconCopy, IconPlus, IconTrash } from '../components/Icons';
import { epley, formatKg, tonnage } from '../lib/calc';
import { addDays, relativeDay, todayISO } from '../lib/dates';
import { LOAD_STEP, STREET_ID } from '../sports';
import { goBack, navigate } from '../router';
import { uid } from '../lib/id';
import { sessionTitle } from './sessionInfo';

const RPES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];
type Mode = 'now' | 'plan';
const fmtRest = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function StrengthSession({ session, data }: { session: Session; data: AppData }) {
  const today = todayISO();
  const [adding, setAdding] = useState<{ exerciseId?: string; initial?: SetBlock } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [note, setNote] = useState(session.note ?? '');
  const finished = session.status === 'done';
  const [mode, setMode] = useState<Mode>(finished || session.date <= today ? 'now' : 'plan');

  const sets = useMemo(
    () => data.sets.filter((s) => s.sessionId === session.id).sort((a, b) => a.order - b.order),
    [data.sets, session.id],
  );
  const groups = useMemo(() => {
    const m = new Map<string, WorkSet[]>();
    for (const s of sets) (m.get(s.exerciseId) ?? m.set(s.exerciseId, []).get(s.exerciseId)!).push(s);
    return [...m.entries()];
  }, [sets]);

  // Meilleur 1RM estimé avant cette séance, par exercice (pour le badge record).
  const previousBest = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.counted) {
      if (c.sessionId === session.id || c.date > session.date) continue;
      m.set(c.exerciseId, Math.max(m.get(c.exerciseId) ?? 0, c.e1rm));
    }
    return m;
  }, [data.counted, session.id, session.date]);

  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? 'Exercice';
  const update = (id: string, patch: Partial<WorkSet>) => db.sets.update(id, patch);
  const updateSession = (patch: Partial<Session>) => db.sessions.update(session.id, patch);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'now' && session.date !== today) updateSession({ date: today });
    if (m === 'plan' && session.date <= today) updateSession({ date: addDays(today, 1) });
  };

  const duplicate = async (group: WorkSet[]) => {
    const last = group[group.length - 1];
    // Décale les séries suivantes pour insérer juste après.
    await db.transaction('rw', db.sets, async () => {
      for (const s of sets) if (s.order > last.order) await db.sets.update(s.id, { order: s.order + 1 });
      await db.sets.add({ ...last, id: uid(), order: last.order + 1, done: false });
    });
  };

  const doneSets = sets.filter((s) => s.done);
  const planning = mode === 'plan' && !finished;

  const finish = async () => {
    await updateSession({ status: 'done', draft: false, note });
    navigate('/');
  };
  const schedule = async () => {
    await updateSession({ status: 'planned', draft: false, note });
    navigate('/seances');
  };

  const saveTemplate = async () => {
    const name = prompt('Nom du modèle (ex. « Pull A »)', session.title ?? '');
    if (name?.trim()) {
      await sessionToTemplate(session.id, name.trim());
      await updateSession({ title: name.trim() });
      alert('Modèle enregistré.');
    }
  };

  const remove = async () => {
    if (confirm('Supprimer cette séance ?')) {
      await deleteSession(session.id);
      goBack('/seances');
    }
  };

  const status = session.draft ? 'nouvelle' : finished ? 'faite' : 'planifiée';

  return (
    <div className="page" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}>
      <PageHead back title={sessionTitle(session, data)} sub={`${relativeDay(session.date)} · ${status}`} />

      {!finished && (
        <Segmented value={mode} onChange={switchMode} options={[['now', "Je la fais aujourd'hui"], ['plan', 'Je la programme']]} />
      )}

      {planning ? (
        <Card>
          <div className="label">Date prévue</div>
          <input type="date" value={session.date} min={today} onChange={(e) => e.target.value && updateSession({ date: e.target.value })} />
          <div className="muted small" style={{ marginTop: 8 }}>
            {sets.length} séries prévues · {formatKg(tonnage(sets))} kg de tonnage visé
          </div>
        </Card>
      ) : (
        <div className="row" style={{ gap: 10 }}>
          <Card className="grow">
            <div className="muted small">Tonnage</div>
            <div className="big-sm num">{formatKg(tonnage(doneSets))} kg</div>
          </Card>
          <Card className="grow">
            <div className="muted small">Séries validées</div>
            <div className="big-sm num">{doneSets.length}/{sets.length}</div>
          </Card>
        </div>
      )}

      {groups.map(([exerciseId, group]) => {
        const best = Math.max(0, ...group.filter((s) => s.done).map((s) => epley(s.load, s.reps)));
        const prev = previousBest.get(exerciseId) ?? 0;
        const isRecord = best > 0 && best > prev && prev > 0;
        return (
          <Card key={exerciseId}>
            <div className="card-head">
              <div>
                <h2>{exName(exerciseId)}</h2>
                <div className="muted small num">
                  {!planning && `1RM estimé ${best > 0 ? `${formatKg(best)} kg` : '—'}`}
                  {!planning && prev > 0 && ' · '}
                  {prev > 0 && `record ${formatKg(prev)} kg`}
                </div>
              </div>
              {isRecord && <span className="badge">🏆 Record</span>}
            </div>
            {group.map((s, i) => (
              <div key={s.id} className="set">
                <div className={`set-row ${s.done ? 'done' : ''}`}>
                  <button className="idx" onClick={() => setOpen(open === s.id ? null : s.id)} aria-label="Détails de la série">
                    {i + 1}
                  </button>
                  <MiniStep decimal value={s.load} step={LOAD_STEP} unit="kg" format={formatKg} onChange={(load) => update(s.id, { load })} />
                  <MiniStep value={s.reps} step={1} unit="reps" onChange={(reps) => update(s.id, { reps })} />
                  <div className="grow" />
                  {!planning && <CheckButton on={s.done} label={`Valider la série ${i + 1}`} onClick={() => update(s.id, { done: !s.done })} />}
                </div>
                <div className="rpe-row">
                  <span className="rpe-label">RPE</span>
                  <div className="rpe-chips">
                    {RPES.map((r) => (
                      <button key={r} className={s.rpe === r ? 'on' : ''} onClick={() => update(s.id, { rpe: s.rpe === r ? undefined : r })}>
                        {String(r).replace('.', ',')}
                      </button>
                    ))}
                  </div>
                </div>
                {open === s.id && (
                  <div className="set-extra">
                    <div>
                      <div className="label">Énergie sur la série</div>
                      <BatteryPicker value={s.feeling} onChange={(feeling) => update(s.id, { feeling })} />
                    </div>
                    <div>
                      <div className="label">Repos</div>
                      <Stepper value={s.rest ?? 0} step={15} format={fmtRest} onChange={(rest) => update(s.id, { rest })} />
                    </div>
                    <button className="btn danger sm" onClick={() => db.sets.delete(s.id)}>
                      <IconTrash size={16} /> Supprimer la série
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn ghost sm grow" onClick={() => duplicate(group)}>
                <IconCopy size={16} /> Dupliquer
              </button>
              <button className="btn ghost sm grow"
                onClick={() => {
                  const last = group[group.length - 1];
                  setAdding({ exerciseId, initial: { count: 1, load: last.load, reps: last.reps, rest: last.rest } });
                }}>
                <IconPlus size={16} /> Séries
              </button>
            </div>
          </Card>
        );
      })}

      {groups.length === 0 && <Card><div className="empty">Ajoute un premier exercice : les charges de ta dernière séance seront préremplies.</div></Card>}

      <button className="btn ghost block" onClick={() => setAdding({})}>
        <IconPlus size={18} /> Ajouter un exercice
      </button>

      {!planning && (
        <Card>
          <div className="card-head"><h2>Niveau d'énergie</h2></div>
          <BatteryPicker value={session.feeling} onChange={(feeling) => updateSession({ feeling })} />
          <div className="muted small" style={{ marginTop: 8 }}>Ta batterie sur cette séance : elle alimente le taux de fatigue dans les stats.</div>
        </Card>
      )}

      <button className="btn ghost block" onClick={() => setDetails(!details)}>
        {details ? 'Masquer' : 'Notes et options…'}
      </button>
      {details && (
        <Card>
          <div className="stack">
            {!planning && (
              <div>
                <div className="label">Date</div>
                <input type="date" value={session.date} onChange={(e) => e.target.value && updateSession({ date: e.target.value })} />
              </div>
            )}
            <div>
              <div className="label">Note</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => updateSession({ note })} placeholder="Sensations, contexte…" />
            </div>
            <div className="row wrap">
              <button className="btn ghost sm" onClick={saveTemplate} disabled={!sets.length}>Enregistrer comme modèle</button>
              {finished && <button className="btn ghost sm" onClick={() => updateSession({ status: 'planned' })}>Repasser en planifiée</button>}
              {!session.draft && <button className="btn danger sm" onClick={remove}>Supprimer</button>}
            </div>
          </div>
        </Card>
      )}

      <div className="action-bar">
        <div>
          {finished ? (
            <button className="btn block xl" onClick={() => goBack('/')}>Fermer</button>
          ) : planning ? (
            <button className="btn block xl" onClick={schedule} disabled={!sets.length}>
              Programmer · {relativeDay(session.date)}
            </button>
          ) : (
            <button className="btn accent block xl" onClick={finish} disabled={!doneSets.length}>
              Terminer la séance
            </button>
          )}
        </div>
      </div>

      <AddSetsSheet
        open={!!adding}
        exerciseId={adding?.exerciseId}
        initial={adding?.initial}
        excludeSessionId={session.id}
        onClose={() => setAdding(null)}
        data={data}
        onAdd={async (exerciseId, block) => {
          setAdding(null);
          await addSetsToSession(session.id, exerciseId, block);
        }}
      />
    </div>
  );
}

/**
 * Choix d'un exercice puis d'un bloc de séries identiques (ex. 3 × 8 @ +30 kg),
 * prérempli avec la dernière séance. Avec `exerciseId`, on saute le choix de l'exercice.
 */
export function AddSetsSheet({ open, onClose, onAdd, data, exerciseId: fixed, initial, excludeSessionId }: {
  open: boolean; onClose: () => void; onAdd: (exerciseId: string, block: SetBlock) => void; data: AppData;
  exerciseId?: string; initial?: SetBlock; excludeSessionId?: string;
}) {
  const [name, setName] = useState('');
  const [exId, setExId] = useState<string | null>(null);
  const [block, setBlock] = useState<SetBlock | null>(null);
  const list = data.exercises.filter((e) => e.sportId === STREET_ID && !e.archived);

  const choose = async (id: string) => {
    setExId(id);
    setBlock(initial ?? (await defaultBlock(id, excludeSessionId)));
  };
  useEffect(() => {
    setExId(null);
    setBlock(null);
    if (open && fixed) choose(fixed);
  }, [open, fixed]);

  const create = async () => {
    if (!name.trim()) return;
    const id = uid();
    await db.exercises.add({ id, sportId: STREET_ID, name: name.trim() });
    setName('');
    choose(id);
  };

  const exName = data.exercises.find((e) => e.id === exId)?.name;
  return (
    <Sheet open={open} onClose={onClose} title={exId && block ? exName : 'Ajouter un exercice'}>
      {exId && block ? (
        <>
          <div>
            <div className="label">Nombre de séries</div>
            <Stepper value={block.count} step={1} min={1} format={(v) => `${v} série${v > 1 ? 's' : ''}`} onChange={(count) => setBlock({ ...block, count })} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="label">Charge</div>
              <MiniStep decimal value={block.load} step={LOAD_STEP} unit="kg" format={formatKg} onChange={(load) => setBlock({ ...block, load })} />
            </div>
            <div>
              <div className="label">Répétitions</div>
              <MiniStep value={block.reps} step={1} unit="reps" onChange={(reps) => setBlock({ ...block, reps: Math.max(1, reps) })} />
            </div>
          </div>
          <button className="btn accent block xl" onClick={() => onAdd(exId, block)}>
            Ajouter {block.count} × {block.reps} @ +{formatKg(block.load)} kg
          </button>
          {!fixed && <button className="btn ghost sm" onClick={() => { setExId(null); setBlock(null); }}>Changer d'exercice</button>}
        </>
      ) : (
        <>
          <Card>
            {list.map((e) => (
              <button key={e.id} className="list-item" onClick={() => choose(e.id)}>
                <span className="grow" style={{ fontWeight: 600 }}>{e.name}</span>
                <IconPlus size={18} />
              </button>
            ))}
          </Card>
          <div className="row">
            <input placeholder="Nouvel exercice" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button className="btn sm" onClick={create} disabled={!name.trim()}>Créer</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
