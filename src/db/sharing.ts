import { supabase } from '../lib/supabase';
import type { AppData } from './useData';

export type ShareLevel = 'none' | 'summary' | 'full';

export type SharedMax = { exercise: string; reps: number; load: number; date: string };
export type SharedGoal = { exercise: string; reps: number; target: number; achieved: boolean };
export type SharedSet = { exercise: string; load: number; reps: number; done: boolean };
export type SharedSession = { date: string; sport: string; title?: string; status: string; sets: SharedSet[] };

export type SharedSummary = { maxes: SharedMax[]; goals: SharedGoal[] };
export type SharedFull = SharedSummary & { sessions: SharedSession[] };

function exerciseName(data: AppData, exerciseId: string) {
  return data.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercice';
}
function sportName(data: AppData, sportId: string) {
  return data.sports.find((s) => s.id === sportId)?.name ?? 'Sport';
}

export function buildSummary(data: AppData): SharedSummary {
  return {
    maxes: data.maxes.map((m) => ({ exercise: exerciseName(data, m.exerciseId), reps: m.reps, load: m.load, date: m.date })),
    goals: data.goals.map((g) => ({ exercise: exerciseName(data, g.exerciseId), reps: g.reps, target: g.target, achieved: g.achieved })),
  };
}

export function buildFull(data: AppData): SharedFull {
  return {
    ...buildSummary(data),
    sessions: data.sessions.map((s) => ({
      date: s.date,
      sport: sportName(data, s.sportId),
      title: s.title,
      status: s.status,
      sets: data.sets.filter((x) => x.sessionId === s.id).map((x) => ({ exercise: exerciseName(data, x.exerciseId), load: x.load, reps: x.reps, done: x.done })),
    })),
  };
}

/** Pousse l'état partageable courant vers Supabase (upsert). No-op si le partage n'est pas configuré/activé. */
export async function pushSnapshot(data: AppData, userId: string, level: ShareLevel) {
  if (!supabase) return;
  const summary = buildSummary(data);
  const fullData = level === 'full' ? buildFull(data) : { ...summary, sessions: [] };
  await supabase.from('shared_snapshots').upsert({ user_id: userId, level, summary, full_data: fullData, updated_at: new Date().toISOString() });
}

export type FriendRow = { friendshipId: string; userId: string; email: string; displayName: string | null; status: 'pending' | 'accepted'; incoming: boolean };

/** Demandes + amis liés au compte courant. */
export async function listFriendships(userId: string): Promise<FriendRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select('id, status, requester_id, recipient_id, requester:profiles!friendships_requester_id_fkey(email,display_name), recipient:profiles!friendships_recipient_id_fkey(email,display_name)')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error || !data) return [];
  return data.map((f: any) => {
    const incoming = f.recipient_id === userId;
    const other = incoming ? f.requester : f.recipient;
    const otherId = incoming ? f.requester_id : f.recipient_id;
    return { friendshipId: f.id, userId: otherId, email: other?.email ?? '', displayName: other?.display_name ?? null, status: f.status, incoming };
  });
}

export async function sendFriendRequest(myUserId: string, friendEmail: string) {
  if (!supabase) throw new Error('Partage non configuré.');
  const { data: profile, error: findErr } = await supabase.from('profiles').select('id').eq('email', friendEmail.trim().toLowerCase()).maybeSingle();
  if (findErr) throw findErr;
  if (!profile) throw new Error('Aucun compte avec cet email.');
  if (profile.id === myUserId) throw new Error('Tu ne peux pas t\'ajouter toi-même.');
  const { error } = await supabase.from('friendships').insert({ requester_id: myUserId, recipient_id: profile.id });
  if (error) throw error;
}

export async function acceptFriendRequest(friendshipId: string) {
  if (!supabase) return;
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
}

export async function removeFriendship(friendshipId: string) {
  if (!supabase) return;
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function fetchFriendSnapshot(friendUserId: string): Promise<{ level: ShareLevel; summary: SharedSummary; full: SharedFull } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('shared_snapshots').select('level, summary, full_data').eq('user_id', friendUserId).maybeSingle();
  if (error || !data) return null;
  return { level: data.level, summary: data.summary, full: data.full_data };
}
