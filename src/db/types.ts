// Modèle de données (SPEC §8). Un sport est générique : on ajoute un sport sans refonte.

export type SportKind = 'strength' | 'combat';

export interface Sport {
  id: string;
  name: string;
  kind: SportKind;
  /** Champs activés pour les séries / cours de ce sport. */
  fields: string[];
}

export interface Exercise {
  id: string;
  sportId: string;
  name: string;
  archived?: boolean;
}

export type SessionStatus = 'planned' | 'done';

export interface Technique {
  id: string;
  name: string;
  tagIds: string[];
  videos: string[];
}

/** Détails d'un cours de combat (BJJ). */
export interface CombatDetails {
  type: string[];
  duration: number; // minutes
  flow: string; // déroulé
  remarks: string;
  improve: string; // points à améliorer
  techniques: Technique[];
  videos: string[];
}

export interface Session {
  id: string;
  date: string; // AAAA-MM-JJ
  sportId: string;
  status: SessionStatus;
  title?: string;
  note?: string;
  /** Niveau d'énergie (batterie), 10–100 %. */
  feeling?: number;
  combat?: CombatDetails;
  createdAt: number;
  /** Séance en cours de création, pas encore validée : supprimée si on quitte sans valider. */
  draft?: boolean;
}

export interface WorkSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  load: number;
  reps: number;
  rpe?: number;
  /** Niveau d'énergie (batterie), 10–100 %. */
  feeling?: number;
  rest?: number; // secondes
  done: boolean;
}

export interface Tag {
  id: string;
  name: string;
  sportId: string;
}

export interface TemplateSet {
  load: number;
  reps: number;
  rest?: number;
}

export interface Template {
  id: string;
  name: string;
  sportId: string;
  items: { exerciseId: string; sets: TemplateSet[] }[];
}

/** Objectif de type XRM : soulever `target` kg de lest sur `reps` répétitions. */
export interface Goal {
  id: string;
  exerciseId: string;
  reps: number;
  target: number;
  deadline?: string;
  achieved: boolean;
  achievedAt?: string;
  createdAt: string;
}

/** Max réellement testé (1RM officiel, ou XRM). */
export interface OfficialMax {
  id: string;
  exerciseId: string;
  reps: number;
  load: number;
  date: string;
}

export interface Setting {
  key: string;
  value: unknown;
}
