import { db } from './db';
import type { Goal, OfficialMax, Session, Template, WorkSet } from './types';
import { uid } from '../lib/id';
import { addDays, startOfWeek, todayISO } from '../lib/dates';
import { BJJ_ID, STREET_ID } from '../sports';

// Jeu de démonstration : ~10 semaines d'historique + 2 semaines programmées.
// Chargé automatiquement en développement (localhost) uniquement.

const TRACTION = 'ex-traction', DIPS = 'ex-dips', MU = 'ex-muscleup';
const SETTING_DEMO = 'demoSeeded';
/** À incrémenter quand la démo change : elle est rechargée une fois en dev. */
const DEMO_VERSION = 2;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Niveau de batterie plausible (40–100 %, plutôt haut). */
const energyFor = (rand: () => number) => Math.min(100, 40 + Math.round(rand() * 6) * 10 + (rand() < 0.5 ? 10 : 0));
const r25 = (v: number) => Math.max(0, Math.round(v / 2.5) * 2.5);

/** Lest de travail sur 1 rep pour la semaine w (0 = il y a 10 semaines). */
const base = (ex: string, w: number) => ({ [TRACTION]: 32, [DIPS]: 45, [MU]: 10 })[ex]! + w * ({ [TRACTION]: 0.9, [DIPS]: 1.1, [MU]: 0.6 })[ex]!;
const loadFor = (ex: string, w: number, reps: number) => r25(base(ex, w) / (1 + (reps - 1) / 30));

type Plan = { title: string; items: { ex: string; sets: number; reps: number }[] };
const PULL: Plan = { title: 'Pull A', items: [{ ex: TRACTION, sets: 4, reps: 3 }, { ex: MU, sets: 4, reps: 2 }] };
const PUSH: Plan = { title: 'Push A', items: [{ ex: DIPS, sets: 4, reps: 5 }, { ex: MU, sets: 3, reps: 3 }] };
const VOLUME: Plan = { title: 'Volume', items: [{ ex: TRACTION, sets: 3, reps: 8 }, { ex: DIPS, sets: 3, reps: 10 }] };

export async function seedDemo() {
  const rand = rng(42);
  const today = todayISO();
  const tags = await db.tags.where('sportId').equals(BJJ_ID).toArray();
  const tag = (name: string) => tags.find((t) => t.name === name)?.id;
  const sessions: Session[] = [];
  const sets: WorkSet[] = [];
  let created = 1;

  const strength = (date: string, plan: Plan, w: number, done: boolean) => {
    const id = uid();
    sessions.push({ id, date, sportId: STREET_ID, status: done ? 'done' : 'planned', title: plan.title, createdAt: created++, feeling: done ? energyFor(rand) : undefined });
    let order = 0;
    for (const it of plan.items) {
      for (let k = 0; k < it.sets; k++) {
        const fatigue = done && k === it.sets - 1 && rand() < 0.3 ? 1 : 0;
        sets.push({
          id: uid(), sessionId: id, exerciseId: it.ex, order: order++,
          load: loadFor(it.ex, w, it.reps), reps: it.reps - fatigue, rest: it.reps <= 3 ? 240 : 150,
          rpe: done ? Math.min(10, Math.round((7 + k * 0.5 + rand()) * 2) / 2) : undefined, done,
        });
      }
    }
  };

  const BJJ_CLASSES = [
    { type: ['Gi', 'Technique'], tech: [['Passage torreando', 'Passage de garde'], ['Kimura depuis la garde fermée', 'Soumission']], improve: 'Contrôler les hanches avant de passer.' },
    { type: ['No-gi', 'Sparring'], tech: [['Single leg', 'Takedown'], ['Guillotine', 'Soumission']], improve: 'Garder la tête haute sur les takedowns.' },
    { type: ['Gi', 'Drill'], tech: [['Balayage en ciseaux', 'Balayage'], ['Retour en garde', 'Défense']], improve: 'Casser la posture avant de balayer.' },
    { type: ['Open mat'], tech: [['Garde De La Riva', 'Garde'], ['Back take depuis la DLR', 'Transition']], improve: 'Respirer, ne pas forcer en position basse.' },
  ];
  const bjj = (date: string, i: number, done: boolean) => {
    const c = BJJ_CLASSES[i % BJJ_CLASSES.length];
    sessions.push({
      id: uid(), date, sportId: BJJ_ID, status: done ? 'done' : 'planned', createdAt: created++, feeling: done ? energyFor(rand) : undefined,
      combat: {
        type: c.type, duration: c.type.includes('Open mat') ? 120 : 90,
        flow: done ? 'Échauffement 15 min, technique 30 min, drill 15 min, sparring 5 × 6 min.' : '',
        remarks: '', improve: done ? c.improve : '',
        techniques: done ? c.tech.map(([name, t]) => ({ id: uid(), name, tagIds: [tag(t)].filter((x): x is string => !!x), videos: [] })) : [],
        videos: done && i % 3 === 0 ? ['https://www.youtube.com/results?search_query=' + encodeURIComponent(c.tech[0][0])] : [],
      },
    });
  };

  // Semaine type : lun Pull, mar BJJ, jeu Push, sam BJJ, dim Volume.
  const thisWeek = startOfWeek(today);
  for (let w = 0; w < 12; w++) {
    const ws = addDays(thisWeek, 7 * (w - 10));
    const days: [number, (d: string, done: boolean) => void][] = [
      [0, (d, done) => strength(d, PULL, w, done)],
      [1, (d, done) => bjj(d, w * 2, done)],
      [3, (d, done) => strength(d, PUSH, w, done)],
      [5, (d, done) => bjj(d, w * 2 + 1, done)],
    ];
    days.push([6, (d, done) => strength(d, VOLUME, w, done)]);
    for (const [dow, make] of days) {
      const d = addDays(ws, dow);
      if (d < today) {
        make(d, rand() < 0.9); // ~10 % de séances programmées mais sautées
      } else make(d, false);
    }
  }

  const w = 10;
  const templates: Template[] = [PULL, PUSH, VOLUME].map((p) => ({
    id: uid(), name: p.title, sportId: STREET_ID,
    items: p.items.map((it) => ({ exerciseId: it.ex, sets: Array.from({ length: it.sets }, () => ({ load: loadFor(it.ex, w, it.reps), reps: it.reps })) })),
  }));
  const maxes: OfficialMax[] = [
    { id: uid(), exerciseId: TRACTION, reps: 1, load: 40, date: addDays(today, -42) },
    { id: uid(), exerciseId: DIPS, reps: 1, load: 57.5, date: addDays(today, -28) },
  ];
  const goals: Goal[] = [
    { id: uid(), exerciseId: TRACTION, reps: 1, target: 45, deadline: addDays(today, 90), achieved: false, createdAt: addDays(today, -60) },
    { id: uid(), exerciseId: DIPS, reps: 3, target: 50, achieved: false, createdAt: addDays(today, -40) },
    { id: uid(), exerciseId: MU, reps: 1, target: 15, achieved: true, achievedAt: addDays(today, -12), createdAt: addDays(today, -70) },
  ];

  await db.transaction('rw', [db.sessions, db.sets, db.templates, db.maxes, db.goals, db.settings], async () => {
    await db.sessions.bulkAdd(sessions);
    await db.sets.bulkAdd(sets);
    await db.templates.bulkAdd(templates);
    await db.maxes.bulkAdd(maxes);
    await db.goals.bulkAdd(goals);
    await db.settings.put({ key: SETTING_DEMO, value: DEMO_VERSION });
  });
}

/** Efface séances, modèles, objectifs et maxes (garde exercices, tags et réglages). */
export async function clearTrainingData() {
  await db.transaction('rw', [db.sessions, db.sets, db.templates, db.maxes, db.goals], async () => {
    await Promise.all([db.sessions.clear(), db.sets.clear(), db.templates.clear(), db.maxes.clear(), db.goals.clear()]);
  });
}

export async function resetWithDemo() {
  await clearTrainingData();
  await seedDemo();
}

/** En dev : charge la démo au premier lancement, puis à chaque nouvelle version de la démo. */
export async function seedDemoOnce() {
  if ((await db.settings.get(SETTING_DEMO))?.value === DEMO_VERSION) return;
  await resetWithDemo();
}
