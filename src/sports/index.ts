import type { Exercise, Sport } from '../db/types';

// Modèles de sport fournis au premier lancement. Pour ajouter un sport :
// une nouvelle entrée ici (kind « strength » ou « combat ») suffit.

export const STREET_ID = 'streetlifting';
export const POWERLIFTING_ID = 'powerlifting';
export const BJJ_ID = 'bjj';

/** Clé de réglage : liste des sports choisis par l'utilisateur (onboarding). */
export const SELECTED_SPORTS_KEY = 'selectedSports';
/** Clé de réglage : prénom affiché sur l'accueil. */
export const USER_NAME_KEY = 'userName';

export const DEFAULT_SPORTS: Sport[] = [
  { id: STREET_ID, name: 'Streetlifting', kind: 'strength', fields: ['load', 'reps', 'rpe', 'feeling', 'rest'] },
  { id: POWERLIFTING_ID, name: 'Powerlifting', kind: 'strength', fields: ['load', 'reps', 'rpe', 'feeling', 'rest'] },
  { id: BJJ_ID, name: 'Jiu-jitsu brésilien', kind: 'combat', fields: ['type', 'duration', 'feeling', 'techniques', 'videos'] },
];

export const STREET_EXERCISES: Exercise[] = [
  { id: 'ex-traction', sportId: STREET_ID, name: 'Traction lestée' },
  { id: 'ex-dips', sportId: STREET_ID, name: 'Dips lestés' },
  { id: 'ex-muscleup', sportId: STREET_ID, name: 'Muscle-up lesté' },
];

export const POWERLIFTING_EXERCISES: Exercise[] = [
  { id: 'ex-squat', sportId: POWERLIFTING_ID, name: 'Squat' },
  { id: 'ex-bench', sportId: POWERLIFTING_ID, name: 'Développé couché' },
  { id: 'ex-deadlift', sportId: POWERLIFTING_ID, name: 'Soulevé de terre' },
];

export const DEFAULT_EXERCISES: Exercise[] = [...STREET_EXERCISES, ...POWERLIFTING_EXERCISES];

export const DEFAULT_BJJ_TAGS = [
  'Passage de garde', 'Soumission', 'Garde', 'Balayage', 'Takedown', 'Transition', 'Défense',
];

export const BJJ_CLASS_TYPES = ['Gi', 'No-gi', 'Technique', 'Sparring', 'Drill', 'Open mat', 'Compétition'];

export const LOAD_STEP = 2.5;
