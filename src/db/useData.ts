import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from './db';
import { countedSets } from '../lib/stats';

/** Toutes les données locales, réactives (volumes faibles : on charge tout). */
export function useData() {
  const data = useLiveQuery(async () => {
    const [sports, exercises, allSessions, sets, tags, templates, goals, maxes] = await Promise.all([
      db.sports.toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.sets.toArray(),
      db.tags.toArray(),
      db.templates.toArray(),
      db.goals.toArray(),
      db.maxes.toArray(),
    ]);
    return {
      sports, exercises, sets, tags, templates, goals, maxes,
      /** Séances validées (hors brouillons) : c'est ce qu'affichent les listes et les stats. */
      sessions: allSessions.filter((s) => !s.draft),
      drafts: allSessions.filter((s) => s.draft),
    };
  });
  const counted = useMemo(() => (data ? countedSets(data) : []), [data]);
  return data ? { ...data, counted } : undefined;
}

export type AppData = NonNullable<ReturnType<typeof useData>>;
