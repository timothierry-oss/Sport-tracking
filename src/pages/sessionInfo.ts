import type { Session } from '../db/types';
import type { AppData } from '../db/useData';

export function sessionTitle(s: Session, data: Pick<AppData, 'sports'>): string {
  if (s.title) return s.title;
  if (s.combat) return s.combat.type.length ? `BJJ · ${s.combat.type.join(', ')}` : 'Cours de BJJ';
  return data.sports.find((x) => x.id === s.sportId)?.name ?? 'Séance';
}
