import { useEffect } from 'react';
import { useData } from './db/useData';
import { purgeDrafts } from './db/actions';
import { useRoute } from './router';
import { TabBar } from './components/TabBar';
import Home from './pages/Home';
import Sessions from './pages/Sessions';
import Stats from './pages/Stats';
import Goals from './pages/Goals';
import Friends from './pages/Friends';
import Settings from './pages/Settings';
import { SyncProvider } from './components/SyncProvider';
import StrengthSession from './pages/StrengthSession';
import BjjSession from './pages/BjjSession';
import TemplateEditor from './pages/TemplateEditor';
import Onboarding from './pages/Onboarding';
import { useTheme } from './theme/useTheme';

const TAB_PATHS = ['/', '/seances', '/stats', '/objectifs', '/amis'];

export default function App() {
  useTheme();
  const path = useRoute();
  const data = useData();
  const [, section, id] = path.split('/');

  // Quitter l'éditeur sans valider (retour, onglet, geste iOS) abandonne le brouillon.
  useEffect(() => {
    purgeDrafts(section === 'seance' ? id : undefined);
  }, [section, id]);

  if (!data) return null;
  if (data.selectedSports == null) return <div className="app"><Onboarding data={data} /></div>;

  let page: React.ReactNode;
  if (section === 'seance' && id) {
    const session = data.sessions.find((s) => s.id === id) ?? data.drafts.find((s) => s.id === id);
    page = !session ? <NotFound /> : session.combat
      ? <BjjSession key={id} session={session} data={data} />
      : <StrengthSession key={id} session={session} data={data} />;
  } else if (section === 'modele' && id) {
    const template = data.templates.find((t) => t.id === id);
    page = template ? <TemplateEditor key={id} template={template} data={data} /> : <NotFound />;
  } else if (path === '/seances') page = <Sessions data={data} />;
  else if (path === '/stats') page = <Stats data={data} />;
  else if (path === '/objectifs') page = <Goals data={data} />;
  else if (path === '/amis') page = <Friends data={data} />;
  else if (path === '/reglages') page = <Settings data={data} />;
  else page = <Home data={data} />;

  return (
    <div className="app">
      <SyncProvider data={data} />
      {page}
      {TAB_PATHS.includes(path) && <TabBar path={path} />}
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="empty">Élément introuvable. <a href="#/">Retour à l'accueil</a></div>
    </div>
  );
}
