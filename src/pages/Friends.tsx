import { useEffect, useState } from 'react';
import type { AppData } from '../db/useData';
import { supabase } from '../lib/supabase';
import { useAuthSession } from '../lib/auth';
import {
  acceptFriendRequest, fetchFriendSnapshot, listFriendships, removeFriendship, sendFriendRequest,
  type FriendRow, type SharedFull, type SharedSummary, type ShareLevel,
} from '../db/sharing';
import { Card, PageHead } from '../components/ui';
import { formatKg } from '../lib/calc';

export default function Friends(_props: { data: AppData }) {
  const session = useAuthSession();

  if (!supabase) {
    return (
      <div className="page">
        <PageHead title="Amis" />
        <Card><div className="muted">Le partage avec des amis n'est pas encore configuré sur cette installation.</div></Card>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="page">
        <PageHead title="Amis" />
        <Card>
          <div className="muted">Connecte-toi d'abord dans <a href="#/reglages">Réglages</a> pour ajouter des amis et partager ta progression.</div>
        </Card>
      </div>
    );
  }
  return <FriendsLoggedIn userId={session.user.id} />;
}

function FriendsLoggedIn({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [openFriend, setOpenFriend] = useState<FriendRow | null>(null);

  const refresh = () => listFriendships(userId).then(setFriends);
  useEffect(() => { refresh(); }, [userId]);

  const add = async () => {
    setMsg('');
    try {
      await sendFriendRequest(userId, email.trim());
      setEmail('');
      setMsg('Demande envoyée.');
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Échec de l\'envoi.');
    }
  };

  const incoming = friends.filter((f) => f.incoming && f.status === 'pending');
  const outgoing = friends.filter((f) => !f.incoming && f.status === 'pending');
  const accepted = friends.filter((f) => f.status === 'accepted');

  if (openFriend) return <FriendDetail friend={openFriend} onBack={() => setOpenFriend(null)} />;

  return (
    <div className="page">
      <PageHead title="Amis" />

      <Card>
        <div className="card-head"><h2>Ajouter un ami</h2></div>
        <div className="row">
          <input type="email" placeholder="Email de ton ami" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn sm" onClick={add} disabled={!email.trim()}>Ajouter</button>
        </div>
        {msg && <div className="small" style={{ marginTop: 8 }}>{msg}</div>}
      </Card>

      {incoming.length > 0 && (
        <Card>
          <div className="card-head"><h2>Demandes reçues</h2></div>
          {incoming.map((f) => (
            <div key={f.friendshipId} className="list-item">
              <span className="grow">{f.displayName || f.email}</span>
              <button className="btn sm" onClick={() => acceptFriendRequest(f.friendshipId).then(refresh)}>Accepter</button>
              <button className="btn ghost sm" onClick={() => removeFriendship(f.friendshipId).then(refresh)}>Refuser</button>
            </div>
          ))}
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card>
          <div className="card-head"><h2>Demandes envoyées</h2></div>
          {outgoing.map((f) => (
            <div key={f.friendshipId} className="list-item">
              <span className="grow">{f.displayName || f.email}</span>
              <span className="muted small">En attente</span>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="card-head"><h2>Mes amis</h2></div>
        {accepted.length === 0 && <div className="muted small">Aucun ami pour l'instant.</div>}
        {accepted.map((f) => (
          <div key={f.friendshipId} className="list-item" role="button" tabIndex={0} onClick={() => setOpenFriend(f)} onKeyDown={(e) => (e.key === 'Enter') && setOpenFriend(f)}>
            <span className="grow">{f.displayName || f.email}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function FriendDetail({ friend, onBack }: { friend: FriendRow; onBack: () => void }) {
  const [snap, setSnap] = useState<{ level: ShareLevel; summary: SharedSummary; full: SharedFull } | null | undefined>(undefined);

  useEffect(() => {
    fetchFriendSnapshot(friend.userId).then(setSnap);
  }, [friend.userId]);

  return (
    <div className="page">
      <PageHead title={friend.displayName || friend.email} back />
      {snap === undefined && <Card><div className="muted">Chargement…</div></Card>}
      {snap === null && <Card><div className="muted">{friend.displayName || friend.email} ne partage rien pour l'instant.</div></Card>}
      {snap && snap.level === 'none' && <Card><div className="muted">{friend.displayName || friend.email} ne partage rien pour l'instant.</div></Card>}
      {snap && snap.level !== 'none' && (
        <>
          <Card>
            <div className="card-head"><h2>Maxes</h2></div>
            {snap.summary.maxes.length === 0 && <div className="muted small">Aucun max enregistré.</div>}
            {snap.summary.maxes.map((m, i) => (
              <div key={i} className="list-item"><span className="grow">{m.exercise} · {m.reps}RM</span><span className="num">{formatKg(m.load)} kg</span></div>
            ))}
          </Card>
          <Card>
            <div className="card-head"><h2>Objectifs</h2></div>
            {snap.summary.goals.length === 0 && <div className="muted small">Aucun objectif.</div>}
            {snap.summary.goals.map((g, i) => (
              <div key={i} className="list-item">
                <span className="grow">{g.exercise} · {g.reps}RM</span>
                <span className="num">{formatKg(g.target)} kg {g.achieved ? '✓' : ''}</span>
              </div>
            ))}
          </Card>
          {snap.level === 'full' && (
            <Card>
              <div className="card-head"><h2>Séances</h2></div>
              {snap.full.sessions.length === 0 && <div className="muted small">Aucune séance.</div>}
              {snap.full.sessions.map((s, i) => (
                <div key={i} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="row"><span className="grow" style={{ fontWeight: 600 }}>{s.sport} · {s.date}</span><span className="muted small">{s.status === 'done' ? 'Faite' : 'Planifiée'}</span></div>
                  {s.sets.map((x, j) => (
                    <div key={j} className="muted small">{x.exercise} — {formatKg(x.load)} kg × {x.reps}{x.done ? '' : ' (non faite)'}</div>
                  ))}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
      <button className="btn ghost block" style={{ marginTop: 8 }} onClick={onBack}>Retour</button>
    </div>
  );
}
