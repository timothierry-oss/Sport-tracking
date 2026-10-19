import type { Sport } from '../db/types';

// Modèles de sport fournis au premier lancement. Pour ajouter un sport :
// une nouvelle entrée ici (kind « strength » ou « combat ») suffit.

export const STREET_ID = 'streetlifting';
export const BJJ_ID = 'bjj';

export const DEFAULT_SPORTS: Sport[] = [
  { id: STREET_ID, name: 'Streetlifting', kind: 'strength', fields: ['load', 'reps', 'rpe', 'feeling', 'rest'] },
  { id: BJJ_ID, name: 'Jiu-jitsu brésilien', kind: 'combat', fields: ['type', 'duration', 'feeling', 'techniques', 'videos'] },
];

export const DEFAULT_EXERCISES = [
  { id: 'ex-traction', sportId: STREET_ID, name: 'Traction lestée' },
  { id: 'ex-dips', sportId: STREET_ID, name: 'Dips lestés' },
  { id: 'ex-muscleup', sportId: STREET_ID, name: 'Muscle-up lesté' },
];

export const DEFAULT_BJJ_TAGS = [
  'Passage de garde', 'Soumission', 'Garde', 'Balayage', 'Takedown', 'Transition', 'Défense',
];

export const BJJ_CLASS_TYPES = ['Gi', 'No-gi', 'Technique', 'Sparring', 'Drill', 'Open mat', 'Compétition'];

export const LOAD_STEP = 2.5;
