import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../db/useData';
import type { Template } from '../db/types';
import { db } from '../db/db';
import type { SetBlock } from '../db/actions';
import { Card, MiniStep, PageHead } from '../components/ui';
import { IconCopy, IconPlus, IconTrash } from '../components/Icons';
import { formatKg } from '../lib/calc';
import { LOAD_STEP } from '../sports';
import { goBack } from '../router';
import { AddSetsSheet } from './StrengthSession';

export default function TemplateEditor({ template, data }: { template: Template; data: AppData }) {
  const [t, setT] = useState(template);
  const [adding, setAdding] = useState<{ index?: number; exerciseId?: string; initial?: SetBlock } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h = setTimeout(() => db.templates.put(t), 300);
    return () => clearTimeout(h);
  }, [t]);

  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? 'Exercice';
  const setItems = (items: Template['items']) => setT((x) => ({ ...x, items }));
  const patchSet = (i: number, j: number, patch: Partial<Template['items'][number]['sets'][number]>) =>
    setItems(t.items.map((it, k) => (k !== i ? it : { ...it, sets: it.sets.map((s, l) => (l === j ? { ...s, ...patch } : s)) })));

  const remove = async () => {
    if (confirm('Supprimer ce modèle ?')) {
      await db.templates.delete(t.id);
      goBack('/seances');
    }
  };

  return (
    <div className="page">
      <PageHead back title="Modèle" />
      <Card>
        <div className="label">Nom</div>
        <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
      </Card>
      {t.items.map((item, i) => (
        <Card key={i}>
          <div className="card-head">
            <h2>{exName(item.exerciseId)}</h2>
            <button className="icon-btn" aria-label="Retirer l'exercice" onClick={() => setItems(t.items.filter((_, k) => k !== i))}><IconTrash size={18} /></button>
          </div>
          {item.sets.map((s, j) => (
            <div key={j} className="set-row">
              <span className="idx">{j + 1}</span>
              <MiniStep decimal value={s.load} step={LOAD_STEP} unit="kg" format={formatKg} onChange={(load) => patchSet(i, j, { load })} />
              <MiniStep value={s.reps} step={1} unit="reps" onChange={(reps) => patchSet(i, j, { reps })} />
              <div className="grow" />
              <button className="muted" aria-label="Retirer la série" onClick={() => setItems(t.items.map((it, k) => (k !== i ? it : { ...it, sets: it.sets.filter((_, l) => l !== j) })))}>✕</button>
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost sm grow"
              onClick={() => setItems(t.items.map((it, k) => (k !== i ? it : { ...it, sets: [...it.sets, { ...(it.sets[it.sets.length - 1] ?? { load: 0, reps: 5 }) }] })))}>
              <IconCopy size={16} /> Dupliquer
            </button>
            <button className="btn ghost sm grow"
              onClick={() => {
                const last = item.sets[item.sets.length - 1] ?? { load: 0, reps: 5 };
                setAdding({ index: i, exerciseId: item.exerciseId, initial: { count: 1, load: last.load, reps: last.reps, rest: last.rest } });
              }}>
              <IconPlus size={16} /> Séries
            </button>
          </div>
        </Card>
      ))}
      <button className="btn ghost block" onClick={() => setAdding({})}><IconPlus size={18} /> Ajouter un exercice</button>
      <button className="btn danger block" onClick={remove}>Supprimer le modèle</button>
      <AddSetsSheet open={!!adding} exerciseId={adding?.exerciseId} initial={adding?.initial} sportId={t.sportId} onClose={() => setAdding(null)} data={data}
        onAdd={(exerciseId, b) => {
          const index = adding?.index;
          setAdding(null);
          const newSets = Array.from({ length: b.count }, () => ({ load: b.load, reps: b.reps, rest: b.rest }));
          setT((x) => ({
            ...x,
            items: index != null
              ? x.items.map((it, k) => (k === index ? { ...it, sets: [...it.sets, ...newSets] } : it))
              : [...x.items, { exerciseId, sets: newSets }],
          }));
        }} />
    </div>
  );
}
