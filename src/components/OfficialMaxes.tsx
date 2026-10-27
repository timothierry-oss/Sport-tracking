import { useState } from 'react';
import type { AppData } from '../db/useData';
import { strengthExercises } from '../db/useData';
import { db } from '../db/db';
import { uid } from '../lib/id';
import { formatKg } from '../lib/calc';
import { formatShort, todayISO } from '../lib/dates';
import { LOAD_STEP } from '../sports';
import { Card, MiniStep } from './ui';
import { IconTrash } from './Icons';

/** Records personnels réellement testés (1RM officiels, ou XRM) par exercice. */
export function OfficialMaxes({ data }: { data: AppData }) {
  const exercises = strengthExercises(data);
  const [adding, setAdding] = useState(false);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [reps, setReps] = useState(1);
  const [load, setLoad] = useState(20);
  const [date, setDate] = useState(todayISO());
  const list = [...data.maxes].sort((a, b) => b.date.localeCompare(a.date));
  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? 'Exercice';

  const save = async () => {
    await db.maxes.add({ id: uid(), exerciseId, reps, load, date });
    setAdding(false);
  };

  return (
    <Card>
      <div className="card-head">
        <h2>Records personnels (PR)</h2>
        {!adding && <button className="btn ghost sm" onClick={() => setAdding(true)}>Ajouter</button>}
      </div>
      {list.map((m) => (
        <div key={m.id} className="list-item" style={{ padding: '10px 0' }}>
          <span className="grow">
            <div style={{ fontWeight: 700 }}>{exName(m.exerciseId)} · {m.reps}RM</div>
            <div className="muted small">Testé le {formatShort(m.date)}</div>
          </span>
          <span className="num" style={{ fontWeight: 800, fontSize: 18 }}>+{formatKg(m.load)} kg</span>
          <button className="muted" aria-label="Supprimer" onClick={() => confirm('Supprimer ce record ?') && db.maxes.delete(m.id)}><IconTrash size={16} /></button>
        </div>
      ))}
      {!list.length && !adding && <div className="muted small">Renseigne un max que tu as vraiment testé. Un 1RM sert de référence pour le % du 1RM dans les stats ; tous comptent pour les objectifs.</div>}
      {adding && (
        <div className="stack" style={{ marginTop: 8 }}>
          <div className="chips">
            {exercises.map((e) => <button key={e.id} className={`chip ${exerciseId === e.id ? 'on' : ''}`} onClick={() => setExerciseId(e.id)}>{e.name}</button>)}
          </div>
          <div className="segmented">
            {[1, 2, 3, 5].map((r) => <button key={r} className={r === reps ? 'on' : ''} onClick={() => setReps(r)}>{r}RM</button>)}
          </div>
          <div className="row">
            <MiniStep decimal value={load} step={LOAD_STEP} unit="kg" format={formatKg} onChange={setLoad} />
            <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <div className="row">
            <button className="btn ghost grow" onClick={() => setAdding(false)}>Annuler</button>
            <button className="btn accent grow" onClick={save} disabled={!exerciseId}>Enregistrer</button>
          </div>
        </div>
      )}
    </Card>
  );
}
