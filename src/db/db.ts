import Dexie, { type Table } from 'dexie';
import type { Exercise, Goal, OfficialMax, Session, Setting, Sport, Tag, Template, WorkSet } from './types';
import { DEFAULT_BJJ_TAGS, DEFAULT_EXERCISES, DEFAULT_SPORTS, BJJ_ID, POWERLIFTING_ID, POWERLIFTING_EXERCISES } from '../sports';
import { uid } from '../lib/id';

class SportDB extends Dexie {
  sports!: Table<Sport, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  sets!: Table<WorkSet, string>;
  tags!: Table<Tag, string>;
  templates!: Table<Template, string>;
  goals!: Table<Goal, string>;
  maxes!: Table<OfficialMax, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('suivi-sport');
    this.version(1).stores({
      sports: 'id',
      exercises: 'id, sportId',
      sessions: 'id, date, sportId, status',
      sets: 'id, sessionId, exerciseId',
      tags: 'id, sportId',
      templates: 'id, sportId',
      goals: 'id',
      settings: 'key',
    });
    // v2 : 1RM officiels ; les objectifs deviennent des XRM.
    this.version(2)
      .stores({ maxes: 'id, exerciseId' })
      .upgrade(async (tx) => {
        await tx.table('goals').filter((g) => !g.exerciseId).delete();
        await tx.table('goals').toCollection().modify((g) => {
          if (g.reps == null) g.reps = 1;
          delete g.kind;
          delete g.title;
        });
      });
    // v3 : le ressenti devient un niveau de batterie (1–5 → 20–100 %).
    this.version(3).upgrade(async (tx) => {
      const toPct = (o: { feeling?: number }) => {
        if (o.feeling != null && o.feeling <= 5) o.feeling = o.feeling * 20;
      };
      await tx.table('sessions').toCollection().modify(toPct);
      await tx.table('sets').toCollection().modify(toPct);
    });
    // v4 : ajout du sport Powerlifting (squat / développé couché / soulevé de terre).
    this.version(4).upgrade(async (tx) => {
      const sports = tx.table('sports');
      const plSport = DEFAULT_SPORTS.find((s) => s.id === POWERLIFTING_ID)!;
      if (!(await sports.get(POWERLIFTING_ID))) await sports.add(plSport);
      const exercises = tx.table('exercises');
      for (const ex of POWERLIFTING_EXERCISES) {
        if (!(await exercises.get(ex.id))) await exercises.add(ex);
      }
    });
    this.on('populate', (tx) => {
      tx.table('sports').bulkAdd(DEFAULT_SPORTS);
      tx.table('exercises').bulkAdd(DEFAULT_EXERCISES);
      tx.table('tags').bulkAdd(DEFAULT_BJJ_TAGS.map((name) => ({ id: uid(), name, sportId: BJJ_ID })));
    });
  }
}

export const db = new SportDB();

export const TABLES = ['sports', 'exercises', 'sessions', 'sets', 'tags', 'templates', 'goals', 'maxes', 'settings'] as const;
