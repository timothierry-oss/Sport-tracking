// Définitions de calcul (SPEC §7).

export type RepCategory = 'force' | 'inter' | 'volume';

export const CATEGORY_LABEL: Record<RepCategory, string> = {
  force: 'Force',
  inter: 'Intermédiaire',
  volume: 'Volume',
};

/** 1RM estimé (Epley) : charge × (1 + reps / 30). Une seule rep vaut la charge elle-même. */
export function epley(load: number, reps: number): number {
  if (reps <= 0 || load <= 0) return 0;
  if (reps === 1) return load;
  return load * (1 + reps / 30);
}

/** Force 1–3, intermédiaire 4–6, volume 7+. */
export function repCategory(reps: number): RepCategory | null {
  if (reps <= 0) return null;
  if (reps <= 3) return 'force';
  if (reps <= 6) return 'inter';
  return 'volume';
}

export interface LoadReps {
  load: number;
  reps: number;
}

/** Tonnage = Σ charge ajoutée × reps (sans poids de corps). */
export const tonnage = (sets: LoadReps[]) => sets.reduce((s, x) => s + x.load * x.reps, 0);

export const totalReps = (sets: LoadReps[]) => sets.reduce((s, x) => s + x.reps, 0);

/** Intensité = charge ÷ 1RM estimé (null si non calculable). */
export function intensity(load: number, oneRm: number): number | null {
  if (load <= 0 || oneRm <= 0) return null;
  return load / oneRm;
}

export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export function formatKg(v: number): string {
  const r = Math.round(v * 10) / 10;
  return r.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function formatTonnage(v: number): string {
  if (v >= 10000) return (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' t';
  return Math.round(v).toLocaleString('fr-FR') + ' kg';
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  return (curr - prev) / prev;
}
