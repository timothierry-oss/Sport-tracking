import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from './db';
import { countedSets } from '../lib/stats';
import { SELECTED_SPORTS_KEY, SHARE_LEVEL_KEY, USER_NAME_KEY } from '../sports';
import type { ShareLevel } from './sharing';

/** Toutes les données locales, réactives (volumes faibles : on charge tout). */
export function useData() {
  const data = useLiveQuery(async () => {
    const [sports, exercises, allSessions, allSets, allTags, templates, allGoals, allMaxes, settings] = await Promise.all([
      db.sports.toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.sets.toArray(),
      db.tags.toArray(),
      db.templates.toArray(),
      db.goals.toArray(),
      db.maxes.toArray(),
      db.settings.toArray(),
    ]);
    const raw = settings.find((s) => s.key === SELECTED_SPORTS_KEY)?.value;
    // null = l'utilisateur n'a pas encore choisi ses sports (onboarding à afficher).
    const selectedSports = Array.isArray(raw) && raw.length ? (raw as string[]) : null;
    const rawName = settings.find((s) => s.key === USER_NAME_KEY)?.value;
    const userName = typeof rawName === 'string' && rawName ? rawName : undefined;
    const rawShareLevel = settings.find((s) => s.key === SHARE_LEVEL_KEY)?.value;
    const shareLevel: ShareLevel = rawShareLevel === 'summary' || rawShareLevel === 'full' ? rawShareLevel : 'none';

    const activeSports = sports.filter((s) => selectedSports == null || selectedSports.includes(s.id));
    const activeSportIds = new Set(activeSports.map((s) => s.id));

    // Un sport désélectionné (dans les Réglages) disparaît partout : séances, séries, objectifs,
    // records, tags — sans effacer les données, qui réapparaissent si le sport est réactivé.
    /** Séances validées (hors brouillons) : c'est ce qu'affichent les listes et les stats. */
    const sessions = allSessions.filter((s) => !s.draft && activeSportIds.has(s.sportId));
    const drafts = allSessions.filter((s) => s.draft);
    const visibleSessionIds = new Set([...sessions, ...drafts].map((s) => s.id));
    const sets = allSets.filter((x) => visibleSessionIds.has(x.sessionId));
    const exerciseSportOf = new Map(exercises.map((e) => [e.id, e.sportId]));
    const goals = allGoals.filter((g) => activeSportIds.has(exerciseSportOf.get(g.exerciseId) ?? ''));
    const maxes = allMaxes.filter((m) => activeSportIds.has(exerciseSportOf.get(m.exerciseId) ?? ''));
    const tags = allTags.filter((t) => activeSportIds.has(t.sportId));

    return { sports, exercises, sets, tags, templates, goals, maxes, selectedSports, userName, shareLevel, sessions, drafts, activeSports };
  });
  const counted = useMemo(() => (data ? countedSets(data) : []), [data]);
  return data ? { ...data, counted } : undefined;
}

export type AppData = NonNullable<ReturnType<typeof useData>>;

/** Sports de force (streetlifting, powerlifting…) actuellement choisis par l'utilisateur. */
export function strengthSports(data: AppData) {
  return data.activeSports.filter((s) => s.kind === 'strength');
}

/** Sports de combat (BJJ…) actuellement choisis par l'utilisateur. */
export function combatSports(data: AppData) {
  return data.activeSports.filter((s) => s.kind === 'combat');
}

/** Exercices (non archivés) de tous les sports de force actifs, toutes confondues. */
export function strengthExercises(data: AppData) {
  const ids = new Set(strengthSports(data).map((s) => s.id));
  return data.exercises.filter((e) => ids.has(e.sportId) && !e.archived);
}
