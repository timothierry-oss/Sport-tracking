import { useRef, useState } from 'react';
import type { AppData } from '../db/useData';
import { db } from '../db/db';
import { clearTrainingData, resetWithDemo } from '../db/demo';
import { Card, PageHead, Segmented } from '../components/ui';
import { IconTrash } from '../components/Icons';
import { OfficialMaxes } from '../components/OfficialMaxes';
import { useTheme, type ThemePref } from '../theme/useTheme';
import { downloadFile, exportData, importData } from '../db/backup';
import { uid } from '../lib/id';
import { todayISO } from '../lib/dates';
import { BJJ_ID, STREET_ID } from '../sports';

export default function Settings({ data }: { data: AppData }) {
  const [theme, setTheme] = useTheme();
  const [exName, setExName] = useState('');
  const [tagName, setTagName] = useState('');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const exercises = data.exercises.filter((e) => e.sportId === STREET_ID);
  const tags = data.tags.filter((t) => t.sportId === BJJ_ID);

  const addExercise = async () => {
    if (!exName.trim()) return;
    await db.exercises.add({ id: uid(), sportId: STREET_ID, name: exName.trim() });
    setExName('');
  };
  const addTag = async () => {
    if (!tagName.trim()) return;
    await db.tags.add({ id: uid(), sportId: BJJ_ID, name: tagName.trim() });
    setTagName('');
  };

  const doExport = async () => {
    downloadFile(`suivi-sport-${todayISO()}.json`, await exportData());
    setMsg('Sauvegarde exportée.');
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    if (!confirm('Importer ce fichier remplacera toutes les données actuelles. Continuer ?')) return;
    try {
      await importData(await f.text());
      setMsg('Données importées.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import impossible.');
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <div className="page">
      <PageHead back title="Réglages" />

      <Card>
        <div className="card-head"><h2>Thème</h2></div>
        <Segmented<ThemePref> value={theme} onChange={setTheme} options={[['light', 'Clair'], ['dark', 'Sombre'], ['system', 'Auto']]} />
      </Card>

      <OfficialMaxes data={data} />

      <Card>
        <div className="card-head"><h2>Exercices</h2></div>
        {exercises.map((e) => (
          <div key={e.id} className="list-item" style={{ opacity: e.archived ? 0.5 : 1 }}>
            <input value={e.name} onChange={(ev) => db.exercises.update(e.id, { name: ev.target.value })} style={{ background: 'transparent', padding: '8px 0' }} />
            <button className="btn ghost sm" onClick={() => db.exercises.update(e.id, { archived: !e.archived })}>{e.archived ? 'Réactiver' : 'Archiver'}</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="Nouvel exercice" value={exName} onChange={(e) => setExName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExercise()} />
          <button className="btn sm" onClick={addExercise} disabled={!exName.trim()}>Ajouter</button>
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>Archiver masque l'exercice sans effacer son historique.</div>
      </Card>

      <Card>
        <div className="card-head"><h2>Tags BJJ</h2></div>
        <div className="chips">
          {tags.map((t) => (
            <span key={t.id} className="chip">
              {t.name}
              <button aria-label={`Supprimer ${t.name}`} onClick={() => db.tags.delete(t.id)} className="muted"><IconTrash size={14} /></button>
            </span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input placeholder="Nouveau tag" value={tagName} onChange={(e) => setTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} />
          <button className="btn sm" onClick={addTag} disabled={!tagName.trim()}>Ajouter</button>
        </div>
      </Card>

      <Card>
        <div className="card-head"><h2>Données</h2></div>
        <div className="muted small" style={{ marginBottom: 12 }}>
          Tout est stocké sur cet appareil. Exporte régulièrement une sauvegarde (fichier JSON).
        </div>
        <div className="row">
          <button className="btn grow" onClick={doExport}>Exporter</button>
          <button className="btn ghost grow" onClick={() => file.current?.click()}>Importer</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </div>
        <button className="btn danger sm block" style={{ marginTop: 8 }}
          onClick={async () => {
            if (confirm('Effacer toutes les séances, modèles, objectifs et maxes ? (pense à exporter avant)')) {
              await clearTrainingData();
              setMsg('Données effacées.');
            }
          }}>
          Effacer toutes les séances
        </button>
        {import.meta.env.DEV && (
          <button className="btn ghost sm block" style={{ marginTop: 8 }}
            onClick={async () => {
              if (confirm('Remplacer les données par le jeu de démo ?')) {
                await resetWithDemo();
                setMsg('Démo rechargée.');
              }
            }}>
            Recharger les données de démo (dev)
          </button>
        )}
        {msg && <div className="small" style={{ marginTop: 10 }}>{msg}</div>}
      </Card>

      <div className="muted small" style={{ textAlign: 'center' }}>Suivi Sport · v{__APP_VERSION__}</div>
    </div>
  );
}
