import { db } from './db';
import type { CombatDetails, Session, Template, WorkSet } from './types';
import { uid } from '../lib/id';
import { todayISO } from '../lib/dates';

export function emptyCombat(): CombatDetails {
  return { type: [], duration: 90, flow: '', remarks: '', improve: '', techniques: [], videos: [] };
}

export async function createSession(opts: {
  sportId: string;
  date?: string;
  template?: Template;
  status?: Session['status'];
  /** Brouillon : n'existe vraiment qu'une fois validé dans l'éditeur. */
  draft?: boolean;
}): Promise<string> {
  const sport = await db.sports.get(opts.sportId);
  const session: Session = {
    id: uid(),
    date: opts.date ?? todayISO(),
    sportId: opts.sportId,
    status: opts.status ?? 'planned',
    title: opts.template?.name,
    createdAt: Date.now(),
    combat: sport?.kind === 'combat' ? emptyCombat() : undefined,
    draft: opts.draft ?? true,
  };
  const sets: WorkSet[] = [];
  let order = 0;
  for (const item of opts.template?.items ?? []) {
    for (const s of item.sets) {
      sets.push({ id: uid(), sessionId: session.id, exerciseId: item.exerciseId, order: order++, load: s.load, reps: s.reps, rest: s.rest, done: false });
    }
  }
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sessions.add(session);
    if (sets.length) await db.sets.bulkAdd(sets);
  });
  return session.id;
}

/** Séries de la dernière séance contenant cet exercice (pour préremplir). */
export async function lastSetsFor(exerciseId: string, excludeSessionId?: string): Promise<WorkSet[]> {
  const all = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const bySession = new Map<string, WorkSet[]>();
  for (const s of all) {
    if (s.sessionId === excludeSessionId) continue;
    (bySession.get(s.sessionId) ?? bySession.set(s.sessionId, []).get(s.sessionId)!).push(s);
  }
  if (!bySession.size) return [];
  const sessions = await db.sessions.bulkGet([...bySession.keys()]);
  const sorted = sessions
    .filter((s): s is Session => !!s)
    .sort((a, b) => (b.status === 'done' ? 1 : 0) - (a.status === 'done' ? 1 : 0) || b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const best = sorted[0];
  return best ? bySession.get(best.id)!.sort((a, b) => a.order - b.order) : [];
}

export interface SetBlock {
  count: number;
  load: number;
  reps: number;
  rest?: number;
}

/** Ajoute `count` séries identiques d'un exercice à la fin de la séance. */
export async function addSetsToSession(sessionId: string, exerciseId: string, block: SetBlock) {
  const existing = await db.sets.where('sessionId').equals(sessionId).toArray();
  let order = existing.reduce((m, s) => Math.max(m, s.order), -1) + 1;
  await db.sets.bulkAdd(
    Array.from({ length: block.count }, () => ({
      id: uid(), sessionId, exerciseId, order: order++, load: block.load, reps: block.reps, rest: block.rest, done: false,
    })),
  );
}

/** Proposition par défaut pour un exercice : la dernière séance (séries, reps, charge), sinon 3 × 5 à vide. */
export async function defaultBlock(exerciseId: string, excludeSessionId?: string): Promise<SetBlock> {
  const last = await lastSetsFor(exerciseId, excludeSessionId);
  if (!last.length) return { count: 3, load: 0, reps: 5, rest: 180 };
  const top = last.reduce((m, s) => (s.load > m.load ? s : m), last[0]);
  const same = last.filter((s) => s.load === top.load && s.reps === top.reps).length;
  return { count: Math.max(same, 1), load: top.load, reps: top.reps, rest: top.rest };
}

export async function deleteSession(id: string) {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

export async function sessionToTemplate(sessionId: string, name: string) {
  const session = await db.sessions.get(sessionId);
  const sets = (await db.sets.where('sessionId').equals(sessionId).toArray()).sort((a, b) => a.order - b.order);
  const items: Template['items'] = [];
  for (const s of sets) {
    let item = items.find((i) => i.exerciseId === s.exerciseId);
    if (!item) items.push((item = { exerciseId: s.exerciseId, sets: [] }));
    item.sets.push({ load: s.load, reps: s.reps, rest: s.rest });
  }
  const t: Template = { id: uid(), name, sportId: session!.sportId, items };
  await db.templates.add(t);
  return t.id;
}

/** Supprime les brouillons abandonnés (sauf celui en cours d'édition). */
export async function purgeDrafts(keepId?: string) {
  const drafts = await db.sessions.filter((s) => !!s.draft && s.id !== keepId).toArray();
  for (const d of drafts) await deleteSession(d.id);
}
