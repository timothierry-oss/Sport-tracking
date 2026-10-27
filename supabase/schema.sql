-- À exécuter une fois dans Supabase : Project > SQL Editor > New query > coller > Run.
-- Stocke uniquement les données que chaque utilisateur choisit de partager (pas toute sa base locale).

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, recipient_id)
);

create table if not exists shared_snapshots (
  user_id uuid primary key references profiles (id) on delete cascade,
  level text not null default 'none' check (level in ('none', 'summary', 'full')),
  summary jsonb not null default '{}'::jsonb,
  full jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table friendships enable row level security;
alter table shared_snapshots enable row level security;

-- profiles : tout le monde peut chercher un profil par email (pour ajouter un ami) et voir son propre profil.
create policy "profiles: lecture publique" on profiles for select using (true);
create policy "profiles: on crée/modifie seulement le sien" on profiles for insert with check (auth.uid() = id);
create policy "profiles: on modifie seulement le sien" on profiles for update using (auth.uid() = id);

-- friendships : visible et modifiable seulement par les deux personnes concernées.
create policy "friendships: lecture par les deux parties" on friendships for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "friendships: on envoie une demande en son nom" on friendships for insert
  with check (auth.uid() = requester_id);
create policy "friendships: le destinataire accepte, les deux peuvent supprimer" on friendships for update
  using (auth.uid() = recipient_id);
create policy "friendships: suppression par les deux parties" on friendships for delete
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- shared_snapshots : chacun gère le sien ; un ami accepté peut lire si le niveau n'est pas 'none'.
create policy "snapshots: on gère le sien" on shared_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "snapshots: lecture par un ami accepté" on shared_snapshots for select
  using (
    level <> 'none'
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.recipient_id = user_id)
          or (f.recipient_id = auth.uid() and f.requester_id = user_id))
    )
  );

-- Crée automatiquement une ligne `profiles` à l'inscription.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
