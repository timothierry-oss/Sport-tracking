import { useState } from 'react';
import type { AppData } from '../db/useData';
import { db } from '../db/db';
import { Card, CheckButton, Stepper } from '../components/ui';
import { IconBelt, IconDumbbell, IconPlus, IconTrash } from '../components/Icons';
import { formatKg } from '../lib/calc';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import { LOAD_STEP, SELECTED_SPORTS_KEY, USER_NAME_KEY } from '../sports';

type Step = 'name' | 'sports' | 'goals';
type PendingGoal = { id: string; exerciseId: string; reps: number; target: number };
const RM_CHOICES = [1, 2, 3, 5];

/** Premier lancement : prénom, puis sport(s) suivis, puis objectifs optionnels — avant d'entrer dans l'app. */
export default function Onboarding({ data }: { data: AppData }) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sportsChosen, setSportsChosen] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState<PendingGoal[]>([]);
  const [exId, setExId] = useState('');
  const [reps, setReps] = useState(1);
  const [target, setTarget] = useState(20);

  const allSportIds = new Set(data.sports.map((s) => s.id));

  const toggleSport = (id: string) => setSel((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const strengthExercisesFor = (sportIds: Set<string>) => {
    const strengthIds = new Set(data.sports.filter((s) => s.kind === 'strength' && sportIds.has(s.id)).map((s) => s.id));
    return data.exercises.filter((e) => strengthIds.has(e.sportId) && !e.archived);
  };

  const finish = async (sportIds: Set<string>, pendingGoals: PendingGoal[]) => {
    await db.transaction('rw', [db.settings, db.goals], async () => {
      await db.settings.put({ key: SELECTED_SPORTS_KEY, value: sportIds.size ? [...sportIds] : [...allSportIds] });
      await db.settings.put({ key: USER_NAME_KEY, value: name.trim() });
      for (const g of pendingGoals) {
        await db.goals.add({ id: uid(), exerciseId: g.exerciseId, reps: g.reps, target: g.target, achieved: false, createdAt: todayISO() });
      }
    });
  };

  const afterSports = (chosen: Set<string>) => {
    setSportsChosen(chosen);
    const exercises = strengthExercisesFor(chosen.size ? chosen : allSportIds);
    if (!exercises.length) {
      finish(chosen, []);
      return;
    }
    setExId(exercises[0].id);
    setStep('goals');
  };

  const addGoal = () => {
    if (!exId) return;
    setGoals((g) => [...g, { id: uid(), exerciseId: exId, reps, target }]);
  };

  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? 'Exercice';
  const goalExercises = strengthExercisesFor(sportsChosen.size ? sportsChosen : allSportIds);

  return (
    <div className="page">
      <div style={{ textAlign: 'center', margin: '48px 0 24px' }}>
        <h1>Bienvenue 👋</h1>
        {step === 'name' && <p className="muted">Comment tu t'appelles ?</p>}
        {step === 'sports' && <p className="muted">Choisis le ou les sports que tu veux suivre. Tu pourras changer ça plus tard dans les Réglages.</p>}
        {step === 'goals' && <p className="muted">Envie de te fixer un objectif tout de suite ? Tu pourras en ajouter d'autres plus tard.</p>}
      </div>

      {step === 'name' && (
        <>
          <Card>
            <div className="label">Prénom</div>
            <input autoFocus placeholder="Ton prénom" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setStep('sports')} />
          </Card>
          <button className="btn accent block xl" style={{ marginTop: 16 }} onClick={() => setStep('sports')}>Continuer</button>
        </>
      )}

      {step === 'sports' && (
        <>
          <Card>
            <div className="stack" style={{ gap: 4 }}>
              {data.sports.map((s) => (
                <div
                  key={s.id}
                  className="list-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSport(s.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSport(s.id)}
                >
                  <span className={`sport-dot ${s.kind === 'combat' ? 'combat' : 'strength'}`}>
                    {s.kind === 'combat' ? <IconBelt size={20} /> : <IconDumbbell size={20} />}
                  </span>
                  <span className="grow" style={{ fontWeight: 600 }}>{s.name}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <CheckButton on={sel.has(s.id)} label={`Suivre ${s.name}`} onClick={() => toggleSport(s.id)} />
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div className="row" style={{ marginTop: 16, gap: 10 }}>
            <button className="btn ghost grow" onClick={() => afterSports(new Set())}>Passer</button>
            <button className="btn accent grow" disabled={!sel.size} onClick={() => afterSports(sel)}>Continuer</button>
          </div>
        </>
      )}

      {step === 'goals' && (
        <>
          <Card>
            <div className="label">Exercice</div>
            <div className="chips">
              {goalExercises.map((e) => (
                <button key={e.id} className={`chip ${exId === e.id ? 'on' : ''}`} onClick={() => setExId(e.id)}>{e.name}</button>
              ))}
            </div>
            <div className="label" style={{ marginTop: 10 }}>Nombre de répétitions</div>
            <div className="segmented">
              {RM_CHOICES.map((r) => <button key={r} className={r === reps ? 'on' : ''} onClick={() => setReps(r)}>{r}RM</button>)}
            </div>
            <div className="label" style={{ marginTop: 10 }}>Lest visé</div>
            <Stepper keyboard="decimal" prefix="+" unit="kg" value={target} step={LOAD_STEP} onChange={setTarget} format={formatKg} />
            <button className="btn ghost sm block" style={{ marginTop: 10 }} onClick={addGoal} disabled={!exId}>
              <IconPlus size={16} /> Ajouter cet objectif
            </button>
          </Card>

          {goals.length > 0 && (
            <Card>
              {goals.map((g) => (
                <div key={g.id} className="list-item">
                  <span className="grow">{exName(g.exerciseId)} · {g.reps}RM +{formatKg(g.target)} kg</span>
                  <button className="muted" aria-label="Retirer cet objectif" onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))}>
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </Card>
          )}

          <div className="row" style={{ marginTop: 16, gap: 10 }}>
            <button className="btn ghost grow" onClick={() => finish(sportsChosen, [])}>Passer</button>
            <button className="btn accent grow" onClick={() => finish(sportsChosen, goals)}>Terminer</button>
          </div>
        </>
      )}
    </div>
  );
}
