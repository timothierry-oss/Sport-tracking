import { useState } from 'react';
import type { AppData } from '../db/useData';
import type { Goal } from '../db/types';
import { db } from '../db/db';
import { Card, PageHead, Progress, Sheet, Stepper } from '../components/ui';
import { IconPlus, IconTrash } from '../components/Icons';
import { TrendChart } from '../components/charts';
import { goalSeries, goalValue } from '../lib/stats';
import { formatKg } from '../lib/calc';
import { formatShort, parseISO, todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import { LOAD_STEP, STREET_ID } from '../sports';

const RM_CHOICES = [1, 2, 3, 5];
const kg = (v: number) => `+${formatKg(Math.round(v * 10) / 10)} kg`;

export function goalTitle(g: Goal, data: AppData) {
  const ex = data.exercises.find((e) => e.id === g.exerciseId)?.name ?? 'Exercice';
  return `${ex} · ${g.reps}RM ${kg(g.target)}`;
}

function RmPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="segmented">
      {RM_CHOICES.map((r) => (
        <button key={r} className={r === value ? 'on' : ''} onClick={() => onChange(r)}>{r}RM</button>
      ))}
    </div>
  );
}

export default function Goals({ data }: { data: AppData }) {
  const [creating, setCreating] = useState(false);
  const active = data.goals.filter((g) => !g.achieved).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const achieved = data.goals.filter((g) => g.achieved).sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''));

  return (
    <div className="page">
      <PageHead title="Objectifs" right={<button className="btn accent sm" onClick={() => setCreating(true)}><IconPlus size={18} /> Objectif</button>} />
      {active.map((g) => <GoalCard key={g.id} goal={g} data={data} />)}
      {!active.length && <Card><div className="empty">Fixe-toi un cap, par exemple traction lestée 1RM +40 kg.</div></Card>}
      {achieved.length > 0 && (
        <>
          <div className="section-title">Atteints 🏆</div>
          <Card>
            {achieved.map((g) => (
              <div key={g.id} className="list-item">
                <span className="grow">
                  <div style={{ fontWeight: 700 }}>{goalTitle(g, data)}</div>
                  <div className="muted small">Atteint le {g.achievedAt ? formatShort(g.achievedAt) : '—'}</div>
                </span>
                <button className="muted small" onClick={() => db.goals.update(g.id, { achieved: false, achievedAt: undefined })}>Réactiver</button>
              </div>
            ))}
          </Card>
        </>
      )}
      <NewGoal open={creating} onClose={() => setCreating(false)} data={data} />
    </div>
  );
}

function GoalCard({ goal, data }: { goal: Goal; data: AppData }) {
  const [chart, setChart] = useState(false);
  const current = goalValue(goal, data, data.counted);
  const ratio = goal.target > 0 ? current / goal.target : 0;
  const reached = current >= goal.target;
  const daysLeft = goal.deadline ? Math.ceil((parseISO(goal.deadline).getTime() - parseISO(todayISO()).getTime()) / 86400000) : null;
  const exName = data.exercises.find((e) => e.id === goal.exerciseId)?.name ?? 'Exercice';

  return (
    <Card>
      <div className="card-head">
        <div>
          <h2>{exName}</h2>
          <div className="muted small">
            Objectif {goal.reps}RM {kg(goal.target)}
            {daysLeft != null && ` · ${daysLeft >= 0 ? `J-${daysLeft}` : 'échéance passée'}`}
          </div>
        </div>
        <button className="muted" aria-label="Supprimer l'objectif" onClick={() => confirm('Supprimer cet objectif ?') && db.goals.delete(goal.id)}><IconTrash size={18} /></button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <RmPicker value={goal.reps} onChange={(reps) => db.goals.update(goal.id, { reps })} />
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span className="big-sm num">{current > 0 ? kg(current) : '—'}</span>
        <span className="muted num">/ {kg(goal.target)}</span>
        <span className="grow" />
        <span className="num" style={{ fontWeight: 800 }}>{Math.min(100, Math.round(ratio * 100))} %</span>
      </div>
      <Progress value={ratio} done={reached} />
      <div className="muted small" style={{ marginTop: 6 }}>Meilleur lest sur {goal.reps} rep{goal.reps > 1 ? 's' : ''} ou plus (séries validées et maxes officiels).</div>
      {chart && (
        <div style={{ marginTop: 12 }}>
          <div className="label">Cible</div>
          <Stepper value={goal.target} step={LOAD_STEP} onChange={(target) => db.goals.update(goal.id, { target })} format={kg} />
          <div style={{ marginTop: 12 }}>
            <TrendChart line data={goalSeries(goal, data, data.counted)} dataKey="value" refLine={{ value: goal.target, label: 'Cible' }} format={kg} height={150} />
          </div>
        </div>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost sm grow" onClick={() => setChart(!chart)}>{chart ? 'Masquer' : 'Progression'}</button>
        <button className={`btn sm grow ${reached ? 'accent' : ''}`} onClick={() => db.goals.update(goal.id, { achieved: true, achievedAt: todayISO() })}>
          {reached ? 'Atteint ! Archiver' : 'Marquer atteint'}
        </button>
      </div>
    </Card>
  );
}

function NewGoal({ open, onClose, data }: { open: boolean; onClose: () => void; data: AppData }) {
  const exercises = data.exercises.filter((e) => e.sportId === STREET_ID && !e.archived);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [reps, setReps] = useState(1);
  const [target, setTarget] = useState(20);
  const [deadline, setDeadline] = useState('');

  const save = async () => {
    await db.goals.add({ id: uid(), exerciseId, reps, target, deadline: deadline || undefined, achieved: false, createdAt: todayISO() });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nouvel objectif">
      <div>
        <div className="label">Exercice</div>
        <div className="chips">
          {exercises.map((e) => <button key={e.id} className={`chip ${exerciseId === e.id ? 'on' : ''}`} onClick={() => setExerciseId(e.id)}>{e.name}</button>)}
        </div>
      </div>
      <div>
        <div className="label">Nombre de répétitions</div>
        <RmPicker value={reps} onChange={setReps} />
      </div>
      <div>
        <div className="label">Lest visé</div>
        <Stepper value={target} step={LOAD_STEP} onChange={setTarget} format={kg} />
      </div>
      <div>
        <div className="label">Échéance (optionnelle)</div>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <button className="btn accent block xl" onClick={save} disabled={!exerciseId}>Créer l'objectif {reps}RM {kg(target)}</button>
    </Sheet>
  );
}
