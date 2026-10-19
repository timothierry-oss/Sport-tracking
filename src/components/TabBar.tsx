import { IconCalendar, IconChart, IconHome, IconTarget } from './Icons';

const TABS = [
  { path: '/', label: 'Accueil', Icon: IconHome },
  { path: '/seances', label: 'Séances', Icon: IconCalendar },
  { path: '/stats', label: 'Stats', Icon: IconChart },
  { path: '/objectifs', label: 'Objectifs', Icon: IconTarget },
];

export function TabBar({ path }: { path: string }) {
  return (
    <div className="tabbar">
      <nav aria-label="Navigation principale">
        {TABS.map(({ path: p, label, Icon }) => (
          <a key={p} href={`#${p}`} className={path === p ? 'on' : ''} aria-current={path === p ? 'page' : undefined}>
            <Icon size={20} />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
