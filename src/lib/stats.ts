import type { Goal, OfficialMax, Session, WorkSet } from '../db/types';
import { epley, repCategory, type RepCategory } from './calc';
import { addDays, formatMonth, formatShort, formatWeekdayDay, monthKey, startOfWeek, todayISO } from './dates';

export type Period = 'day' | 'week' | 'month';

export interface Dataset {
  sessions: Session[];
  sets: WorkSet[];
  maxes: OfficialMax[];
}

/** Série comptée = cochée « validée » dans une séance existante. */
export interface CountedSet extends WorkSet {
  date: string;
  e1rm: number;
  /** 1RM de référence : officiel le plus récent à cette date, sinon meilleur 1RM estimé. */
  ref1rm: number;
  /** charge ÷ 1RM de référence (null si 0 kg). */
  intensity: number | null;
  category: RepCategory | null;
}

export function bucketKey(date: string, period: Period) {
  if (period === 'day') return date;
  return period === 'week' ? startOfWeek(date) : monthKey(date);
}

export function bucketLabel(key: string, period: Period) {
  if (period === 'day') return formatWeekdayDay(key);
  return period === 'week' ? formatShort(key) : formatMonth(key);
}

/** Premier jour couvert par une clé de période. */
export const bucketStart = (key: string) => (key.length === 7 ? key + '-01' : key);

export function lastBuckets(n: number, period: Period, today = todayISO()): string[] {
  const keys: string[] = [];
  if (period === 'day') {
    for (let i = n - 1; i >= 0; i--) keys.push(addDays(today, -i));
  } else if (period === 'week') {
    const start = startOfWeek(today);
    for (let i = n - 1; i >= 0; i--) keys.push(addDays(start, -7 * i));
  } else {
    const [y, m] = today.split('-').map(Number);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  return keys;
}

/** Séries validées, triées chronologiquement, enrichies du 1RM et de l'intensité. */
/** 1RM officiel (1 rep) le plus récent à une date donnée. */
export function officialAt(maxes: OfficialMax[], exerciseId: string, date: string): OfficialMax | undefined {
  let best: OfficialMax | undefined;
  for (const m of maxes) {
    if (m.exerciseId !== exerciseId || m.reps !== 1 || m.date > date) continue;
    if (!best || m.date > best.date) best = m;
  }
  return best;
}

export function countedSets({ sessions, sets, maxes }: Dataset): CountedSet[] {
  const byId = new Map(sessions.filter((s) => !s.draft).map((s) => [s.id, s]));
  const rows = sets
    .filter((s) => s.done && byId.has(s.sessionId))
    .map((s) => ({ s, sess: byId.get(s.sessionId)! }))
    .sort((a, b) => a.sess.date.localeCompare(b.sess.date) || a.sess.createdAt - b.sess.createdAt || a.s.order - b.s.order);
  const best = new Map<string, number>();
  return rows.map(({ s, sess }) => {
    const e = epley(s.load, s.reps);
    const b = Math.max(best.get(s.exerciseId) ?? 0, e);
    best.set(s.exerciseId, b);
    const ref = officialAt(maxes, s.exerciseId, sess.date)?.load ?? b;
    return { ...s, date: sess.date, e1rm: e, ref1rm: ref, intensity: s.load > 0 && ref > 0 ? s.load / ref : null, category: repCategory(s.reps) };
  });
}

export interface Bucket {
  key: string;
  label: string;
  tonnage: number;
  reps: number;
  sets: number;
  intensity: number | null; // moyenne, 0–1
  rpe: number | null;
  force: number;
  inter: number;
  volume: number;
  strengthSessions: number;
  combatSessions: number;
  combatMinutes: number;
  /** Niveau de batterie moyen des séances faites (0–100), null si non renseigné. */
  energy: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function aggregate(
  data: Dataset,
  counted: CountedSet[],
  period: Period,
  n: number,
  opts: { exerciseId?: string; combatSportIds?: Set<string> } = {},
): Bucket[] {
  const keys = lastBuckets(n, period);
  const map = new Map<string, { sets: CountedSet[]; strength: Set<string>; combat: number; minutes: number; energy: number[] }>();
  for (const k of keys) map.set(k, { sets: [], strength: new Set(), combat: 0, minutes: 0, energy: [] });
  for (const s of counted) {
    if (opts.exerciseId && s.exerciseId !== opts.exerciseId) continue;
    const b = map.get(bucketKey(s.date, period));
    if (b) {
      b.sets.push(s);
      b.strength.add(s.sessionId);
    }
  }
  for (const sess of data.sessions) {
    if (sess.status !== 'done' || sess.draft) continue;
    const b = map.get(bucketKey(sess.date, period));
    if (!b) continue;
    if (sess.feeling != null) b.energy.push(sess.feeling);
    if (sess.combat) {
      b.combat++;
      b.minutes += sess.combat.duration || 0;
    }
  }
  return keys.map((key) => {
    const b = map.get(key)!;
    const inten = b.sets.map((s) => s.intensity).filter((x): x is number => x != null);
    const rpe = b.sets.map((s) => s.rpe).filter((x): x is number => x != null);
    return {
      key,
      label: bucketLabel(key, period),
      tonnage: b.sets.reduce((a, s) => a + s.load * s.reps, 0),
      reps: b.sets.reduce((a, s) => a + s.reps, 0),
      sets: b.sets.length,
      intensity: avg(inten),
      rpe: avg(rpe),
      force: b.sets.filter((s) => s.category === 'force').length,
      inter: b.sets.filter((s) => s.category === 'inter').length,
      volume: b.sets.filter((s) => s.category === 'volume').length,
      strengthSessions: b.strength.size,
      combatSessions: b.combat,
      combatMinutes: b.minutes,
      energy: avg(b.energy),
    };
  });
}

export interface CategorySummary {
  category: RepCategory;
  sets: number;
  avgLoad: number | null;
  bestE1rm: number | null;
  avgRpe: number | null;
}

export function categorySummary(counted: CountedSet[], since: string): CategorySummary[] {
  return (['force', 'inter', 'volume'] as RepCategory[]).map((category) => {
    const xs = counted.filter((s) => s.category === category && s.date >= since);
    return {
      category,
      sets: xs.length,
      avgLoad: avg(xs.map((s) => s.load)),
      bestE1rm: xs.length ? Math.max(...xs.map((s) => s.e1rm)) : null,
      avgRpe: avg(xs.map((s) => s.rpe).filter((x): x is number => x != null)),
    };
  });
}

/** Meilleur 1RM estimé par période pour un exercice (null si aucune série). */
export function e1rmSeries(counted: CountedSet[], exerciseId: string, period: Period, n: number) {
  const keys = lastBuckets(n, period);
  const best = new Map<string, number>();
  for (const s of counted) {
    if (s.exerciseId !== exerciseId) continue;
    const k = bucketKey(s.date, period);
    best.set(k, Math.max(best.get(k) ?? 0, s.e1rm));
  }
  return keys.map((key) => ({ key, label: bucketLabel(key, period), value: best.get(key) ?? null }));
}

export function bestE1rm(counted: CountedSet[], exerciseId: string): number {
  return counted.reduce((m, s) => (s.exerciseId === exerciseId ? Math.max(m, s.e1rm) : m), 0);
}

export type DayStatus = 'done' | 'skipped' | 'planned' | 'rest';

/** État d'un jour : séance faite, programmée mais sautée, programmée à venir, ou repos. */
export function dayStatuses(sessions: Session[], today = todayISO()): Map<string, DayStatus> {
  const m = new Map<string, DayStatus>();
  for (const s of sessions) {
    if (s.draft) continue;
    const prev = m.get(s.date);
    const st: DayStatus = s.status === 'done' ? 'done' : s.date < today ? 'skipped' : 'planned';
    // une séance faite l'emporte sur une séance sautée le même jour
    if (!prev || st === 'done' || (st === 'skipped' && prev === 'planned')) m.set(s.date, st);
  }
  return m;
}

/** Nombre de séances faites par jour. */
export function trainingDays(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) if (s.status === 'done' && !s.draft) m.set(s.date, (m.get(s.date) ?? 0) + 1);
  return m;
}

// --- Objectifs (XRM) ---

/** Meilleur lest soulevé pour au moins `goal.reps` reps (séries validées + maxes officiels). */
export function goalValue(goal: Goal, data: Dataset, counted: CountedSet[], upTo = todayISO()): number {
  let v = 0;
  for (const s of counted) {
    if (s.exerciseId === goal.exerciseId && s.reps >= goal.reps && s.date <= upTo) v = Math.max(v, s.load);
  }
  for (const m of data.maxes) {
    if (m.exerciseId === goal.exerciseId && m.reps >= goal.reps && m.date <= upTo) v = Math.max(v, m.load);
  }
  return v;
}

export function goalSeries(goal: Goal, data: Dataset, counted: CountedSet[], n = 12) {
  return lastBuckets(n, 'week').map((key) => ({
    key,
    label: bucketLabel(key, 'week'),
    value: goalValue(goal, data, counted, addDays(key, 6)),
  }));
}
