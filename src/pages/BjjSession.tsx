import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../db/useData';
import type { CombatDetails, Session, Technique } from '../db/types';
import { db } from '../db/db';
import { deleteSession, emptyCombat } from '../db/actions';
import { BatteryPicker, Card, PageHead, Segmented, Stepper } from '../components/ui';
import { IconLink, IconPlus, IconTrash } from '../components/Icons';
import { BJJ_CLASS_TYPES } from '../sports';
import { addDays, relativeDay, todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import { goBack } from '../router';

export default function BjjSession({ session, data }: { session: Session; data: AppData }) {
  const [c, setC] = useState<CombatDetails>(session.combat ?? emptyCombat());
  const [feeling, setFeeling] = useState(session.feeling);
  const [date, setDate] = useState(session.date);
  const today = todayISO();
  const finished = session.status === 'done';
  const [mode, setMode] = useState<'now' | 'plan'>(finished || session.date <= today ? 'now' : 'plan');
  const planning = mode === 'plan' && !finished;
  const switchMode = (m: 'now' | 'plan') => {
    setMode(m);
    if (m === 'now') setDate(today);
    else if (date <= today) setDate(addDays(today, 1));
  };
  const first = useRef(true);

  // Sauvegarde automatique (le formulaire garde son état local pour une saisie fluide).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => db.sessions.update(session.id, { combat: c, feeling, date }), 400);
    return () => clearTimeout(t);
  }, [c, feeling, date, session.id]);

  const tags = data.tags.filter((t) => t.sportId === session.sportId);
  const set = (patch: Partial<CombatDetails>) => setC((x) => ({ ...x, ...patch }));
  const setTech = (id: string, patch: Partial<Technique>) =>
    set({ techniques: c.techniques.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const toggleType = (t: string) => set({ type: c.type.includes(t) ? c.type.filter((x) => x !== t) : [...c.type, t] });

  const save = async (status: Session['status']) => {
    await db.sessions.update(session.id, { combat: c, feeling, date, status, draft: false });
    goBack(status === 'planned' ? '/seances' : '/');
  };
  const remove = async () => {
    if (confirm('Supprimer ce cours ?')) {
      await deleteSession(session.id);
      goBack('/seances');
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}>
      <PageHead back title="Cours de BJJ" sub={`${relativeDay(date)} · ${session.draft ? 'nouveau' : finished ? 'fait' : 'planifié'}`} />
      {!finished && (
        <Segmented value={mode} onChange={switchMode} options={[['now', "Je le fais aujourd'hui"], ['plan', 'Je le programme']]} />
      )}

      <Card>
        <div className="stack">
          <div>
            <div className="label">Type</div>
            <div className="chips">
              {BJJ_CLASS_TYPES.map((t) => (
                <button key={t} className={`chip ${c.type.includes(t) ? 'on' : ''}`} onClick={() => toggleType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <div className="grow">
              <div className="label">Date</div>
              <input type="date" value={date} min={planning ? today : undefined} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="label">Durée</div>
            <Stepper value={c.duration} step={15} format={(v) => `${v} min`} onChange={(duration) => set({ duration })} />
          </div>
          <div>
            <div className="label">Niveau d'énergie</div>
            <BatteryPicker value={feeling} onChange={setFeeling} />
          </div>
        </div>
      </Card>

      <div className="section-title">Techniques vues</div>
      {c.techniques.map((t) => (
        <Card key={t.id}>
          <div className="stack">
            <div className="row">
              <input value={t.name} placeholder="Nom de la technique" onChange={(e) => setTech(t.id, { name: e.target.value })} />
              <button className="icon-btn" aria-label="Supprimer la technique" onClick={() => set({ techniques: c.techniques.filter((x) => x.id !== t.id) })}>
                <IconTrash size={18} />
              </button>
            </div>
            <div className="chips">
              {tags.map((tag) => {
                const on = t.tagIds.includes(tag.id);
                return (
                  <button key={tag.id} className={`chip ${on ? 'accent' : ''}`}
                    onClick={() => setTech(t.id, { tagIds: on ? t.tagIds.filter((x) => x !== tag.id) : [...t.tagIds, tag.id] })}>
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <VideoLinks links={t.videos} onChange={(videos) => setTech(t.id, { videos })} />
          </div>
        </Card>
      ))}
      <button className="btn ghost block" onClick={() => set({ techniques: [...c.techniques, { id: uid(), name: '', tagIds: [], videos: [] }] })}>
        <IconPlus size={18} /> Ajouter une technique
      </button>

      <div className="section-title">Notes du cours</div>
      <Card>
        <div className="stack">
          <div>
            <div className="label">Déroulé</div>
            <textarea value={c.flow} onChange={(e) => set({ flow: e.target.value })} placeholder="Échauffement, drill, sparring…" />
          </div>
          <div>
            <div className="label">Remarques</div>
            <textarea value={c.remarks} onChange={(e) => set({ remarks: e.target.value })} />
          </div>
          <div>
            <div className="label">Points à améliorer</div>
            <textarea value={c.improve} onChange={(e) => set({ improve: e.target.value })} placeholder="Ex. garder les coudes serrés en garde fermée" />
          </div>
          <div>
            <div className="label">Vidéos du cours</div>
            <VideoLinks links={c.videos} onChange={(videos) => set({ videos })} />
          </div>
          {!session.draft && <button className="btn danger sm" onClick={remove}>Supprimer ce cours</button>}
        </div>
      </Card>

      <div className="action-bar">
        <div>
          {finished ? (
            <button className="btn block xl" onClick={() => save('done')}>Enregistrer</button>
          ) : planning ? (
            <button className="btn block xl" onClick={() => save('planned')}>Programmer · {relativeDay(date)}</button>
          ) : (
            <button className="btn accent block xl" onClick={() => save('done')}>Cours fait ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoLinks({ links, onChange }: { links: string[]; onChange: (v: string[]) => void }) {
  const [url, setUrl] = useState('');
  const add = () => {
    const u = url.trim();
    if (!u) return;
    onChange([...links, /^https?:\/\//.test(u) ? u : `https://${u}`]);
    setUrl('');
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      {links.map((l, i) => (
        <div key={i} className="row small">
          <IconLink size={16} />
          <a href={l} target="_blank" rel="noreferrer" className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {l.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
          <button aria-label="Retirer le lien" className="muted" onClick={() => onChange(links.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <input type="url" inputMode="url" placeholder="Lien vidéo (YouTube…)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn ghost sm" onClick={add} disabled={!url.trim()}>Ajouter</button>
      </div>
    </div>
  );
}
