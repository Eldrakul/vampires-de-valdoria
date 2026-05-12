
-- Sang Noir v14 — Supabase schema
-- À exécuter dans Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- TYPES
do $$ begin
  create type room_status as enum ('lobby', 'playing', 'ended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type room_phase as enum ('lobby', 'day', 'night', 'ended');
exception when duplicate_object then null;
end $$;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Joueur',
  avatar_url text,
  coins integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  selected_skin text not null default 'default',
  selected_title text not null default '',
  role text not null default 'player', -- player/admin
  history jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ROOMS
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status room_status not null default 'lobby',
  phase room_phase not null default 'lobby',
  day integer not null default 0,
  training_mode boolean not null default false,
  bot_difficulty text not null default 'medium',
  vampire_power integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PLAYERS IN ROOM
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  is_bot boolean not null default false,
  ready boolean not null default false,
  alive boolean not null default true,
  role text,
  adn text,
  absorbed_blood jsonb not null default '[]'::jsonb,
  suspicion integer not null default 0,
  avatar jsonb not null default '{}'::jsonb,
  bot_brain jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);

-- CHAT
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_player_id uuid references public.room_players(id) on delete set null,
  sender_name text not null,
  message text not null,
  is_bot boolean not null default false,
  kind text not null default 'chat', -- chat/system/narrator/private
  created_at timestamptz not null default now()
);

-- VOTES
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  voter_player_id uuid not null references public.room_players(id) on delete cascade,
  target_player_id uuid not null references public.room_players(id) on delete cascade,
  day integer not null,
  created_at timestamptz not null default now(),
  unique(room_id, voter_player_id, day)
);

-- GAME ACTIONS
create table if not exists public.game_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_player_id uuid not null references public.room_players(id) on delete cascade,
  target_player_id uuid references public.room_players(id) on delete set null,
  action_type text not null,
  phase room_phase not null,
  day integer not null,
  resolved boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ACHIEVEMENTS
create table if not exists public.achievements (
  key text primary key,
  name text not null,
  description text not null,
  rarity text not null default 'common',
  reward_coins integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.achievements (key, name, description, rarity, reward_coins)
values
  ('terror_of_bots', 'Terreur des bots', 'Terminer 5 entraînements contre des bots.', 'rare', 0),
  ('blood_collector', 'Collectionneur de sang', 'Absorber au moins 3 types de sang dans une partie.', 'rare', 6),
  ('first_win', 'Première victoire', 'Remporter une partie.', 'common', 0),
  ('ancient_perfect_win', 'Seigneur de la nuit', 'Gagner comme vampire vivant avec 8 Puissance ou plus.', 'legendary', 12)
on conflict (key) do nothing;

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.achievements(key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(user_id, achievement_key)
);

-- SHOP
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type text not null,
  price integer not null default 0,
  level_required integer not null default 1,
  value text not null,
  image_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ADMIN CONFIG
create table if not exists public.admin_config (
  id integer primary key default 1,
  reward_config jsonb not null default '{}'::jsonb,
  role_config jsonb not null default '[]'::jsonb,
  adn_config jsonb not null default '[]'::jsonb,
  bot_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint single_row_admin_config check (id = 1)
);

insert into public.admin_config (id) values (1)
on conflict (id) do nothing;

-- STORAGE NOTE:
-- Crée aussi un bucket "avatars" dans Supabase Storage.
-- Tu peux le rendre public au début, ou créer des politiques Storage plus strictes.

-- ENABLE RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;
alter table public.game_actions enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.shop_items enable row level security;
alter table public.admin_config enable row level security;

-- HELPER
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- PROFILES POLICIES
drop policy if exists "profiles read own and public basics" on public.profiles;
create policy "profiles read own and public basics"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- ROOMS POLICIES
drop policy if exists "rooms read authenticated" on public.rooms;
create policy "rooms read authenticated"
on public.rooms for select
to authenticated
using (true);

drop policy if exists "rooms create own" on public.rooms;
create policy "rooms create own"
on public.rooms for insert
to authenticated
with check (host_id = auth.uid());

drop policy if exists "rooms update host or admin" on public.rooms;
create policy "rooms update host or admin"
on public.rooms for update
to authenticated
using (host_id = auth.uid() or public.is_admin())
with check (host_id = auth.uid() or public.is_admin());

-- ROOM PLAYERS
drop policy if exists "room_players read room" on public.room_players;
create policy "room_players read room"
on public.room_players for select
to authenticated
using (true);

drop policy if exists "room_players insert self or host bot" on public.room_players;
create policy "room_players insert self or host bot"
on public.room_players for insert
to authenticated
with check (
  user_id = auth.uid()
  or (
    is_bot = true
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
      and r.host_id = auth.uid()
    )
  )
);

drop policy if exists "room_players update self host admin" on public.room_players;
create policy "room_players update self host admin"
on public.room_players for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.host_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.host_id = auth.uid()
  )
);

-- MESSAGES
drop policy if exists "messages read authenticated" on public.messages;
create policy "messages read authenticated"
on public.messages for select
to authenticated
using (true);

drop policy if exists "messages insert room member" on public.messages;
create policy "messages insert room member"
on public.messages for insert
to authenticated
with check (
  exists (
    select 1 from public.room_players p
    where p.room_id = messages.room_id
    and (p.user_id = auth.uid()
      or exists (
        select 1 from public.rooms r
        where r.id = messages.room_id and r.host_id = auth.uid()
      )
    )
  )
);

-- VOTES
drop policy if exists "votes read authenticated" on public.votes;
create policy "votes read authenticated"
on public.votes for select
to authenticated
using (true);

drop policy if exists "votes insert own player" on public.votes;
create policy "votes insert own player"
on public.votes for insert
to authenticated
with check (
  exists (
    select 1 from public.room_players p
    where p.id = voter_player_id
    and p.user_id = auth.uid()
  )
);

drop policy if exists "votes update own player" on public.votes;
create policy "votes update own player"
on public.votes for update
to authenticated
using (
  exists (
    select 1 from public.room_players p
    where p.id = voter_player_id
    and p.user_id = auth.uid()
  )
);

-- ACTIONS
drop policy if exists "actions read room" on public.game_actions;
create policy "actions read room"
on public.game_actions for select
to authenticated
using (true);

drop policy if exists "actions insert own" on public.game_actions;
create policy "actions insert own"
on public.game_actions for insert
to authenticated
with check (
  exists (
    select 1 from public.room_players p
    where p.id = actor_player_id
    and p.user_id = auth.uid()
  )
);

-- ACHIEVEMENTS
drop policy if exists "achievements read" on public.achievements;
create policy "achievements read"
on public.achievements for select
to authenticated
using (true);

drop policy if exists "player_achievements read own" on public.player_achievements;
create policy "player_achievements read own"
on public.player_achievements for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "player_achievements insert own" on public.player_achievements;
create policy "player_achievements insert own"
on public.player_achievements for insert
to authenticated
with check (user_id = auth.uid());

-- SHOP
drop policy if exists "shop read enabled" on public.shop_items;
create policy "shop read enabled"
on public.shop_items for select
to authenticated
using (enabled = true or public.is_admin());

drop policy if exists "shop admin all" on public.shop_items;
create policy "shop admin all"
on public.shop_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ADMIN CONFIG
drop policy if exists "admin config read admin" on public.admin_config;
create policy "admin config read admin"
on public.admin_config for select
to authenticated
using (public.is_admin());

drop policy if exists "admin config write admin" on public.admin_config;
create policy "admin config write admin"
on public.admin_config for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- UPDATED_AT helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_rooms_updated_at on public.rooms;
create trigger touch_rooms_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

-- IMPORTANT 2026:
-- Selon les nouveaux réglages Supabase, pense à exposer les tables voulues dans Data API
-- ou à accorder les droits nécessaires si ton projet n’expose pas public par défaut.



-- Sang Noir v15 migration
-- À exécuter dans Supabase SQL Editor si tu avais déjà installé la v14.

create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  acquired_at timestamptz not null default now(),
  unique(user_id, item_key)
);

alter table public.player_inventory enable row level security;

drop policy if exists "inventory read own" on public.player_inventory;
create policy "inventory read own"
on public.player_inventory for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "inventory insert own" on public.player_inventory;
create policy "inventory insert own"
on public.player_inventory for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "inventory delete own admin" on public.player_inventory;
create policy "inventory delete own admin"
on public.player_inventory for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

alter table public.profiles
add column if not exists selected_avatar text not null default 'avatar_frog';

alter table public.profiles
add column if not exists profile_stats jsonb not null default '{}'::jsonb;

-- Boutique de base
insert into public.shop_items (key, name, type, price, level_required, value, image_url, enabled)
values
  ('avatar_frog', 'Avatar Grenouille occulte', 'avatar', 0, 1, 'frog', null, true),
  ('avatar_human', 'Avatar Humain pâle', 'avatar', 60, 1, 'human', null, true),
  ('avatar_bat', 'Avatar Chauve-souris', 'avatar', 120, 2, 'bat', null, true),
  ('avatar_ghost', 'Avatar Spectre', 'avatar', 180, 3, 'ghost', null, true),
  ('avatar_skull', 'Avatar Crâne', 'avatar', 240, 4, 'skull', null, true),
  ('avatar_robot', 'Avatar Automate noir', 'avatar', 260, 5, 'robot', null, true),
  ('avatar_wolf', 'Avatar Loup rival', 'avatar', 320, 6, 'wolf', null, true),
  ('avatar_witch', 'Avatar Sorcier sanglant', 'avatar', 380, 7, 'witch', null, true),

  ('skin_default', 'Skin simple', 'skin', 0, 1, 'default', null, true),
  ('skin_blood', 'Skin Sang Royal', 'skin', 150, 2, 'blood', null, true),
  ('skin_moon', 'Skin Lune froide', 'skin', 180, 3, 'moon', null, true),
  ('skin_shadow', 'Skin Ombre ancienne', 'skin', 260, 5, 'shadow', null, true),
  ('skin_gold', 'Skin Noblesse dorée', 'skin', 420, 8, 'gold', null, true),

  ('title_night_child', 'Titre : Enfant de la Nuit', 'title', 100, 2, 'Enfant de la Nuit', null, true),
  ('title_blood_hunter', 'Titre : Chasseur de Crocs', 'title', 180, 4, 'Chasseur de Crocs', null, true),
  ('title_lord', 'Titre : Seigneur du Sang', 'title', 360, 8, 'Seigneur du Sang', null, true),
  ('title_ancient', 'Titre : Ancien Éveillé', 'title', 600, 12, 'Ancien Éveillé', null, true)
on conflict (key) do update set
  name = excluded.name,
  type = excluded.type,
  price = excluded.price,
  level_required = excluded.level_required,
  value = excluded.value,
  enabled = excluded.enabled;

-- Succès supplémentaires
insert into public.achievements (key, name, description, rarity, reward_coins)
values
  ('first_profile', 'Premier profil', 'Créer ton profil Sang Noir.', 'common', 0),
  ('first_room', 'Maître de salon', 'Créer ta première partie.', 'common', 5),
  ('first_message', 'Première parole', 'Envoyer ton premier message dans le chat.', 'common', 5),
  ('first_purchase', 'Premier achat', 'Acheter ton premier objet dans la boutique.', 'common', 10),
  ('collector_5', 'Petit collectionneur', 'Posséder 5 objets cosmétiques.', 'rare', 20),
  ('level_5', 'Ascension obscure', 'Atteindre le niveau 5.', 'rare', 30),
  ('level_10', 'Noblesse de sang', 'Atteindre le niveau 10.', 'epic', 60),
  ('training_5', 'Terreur des bots', 'Terminer 5 entraînements contre des bots.', 'rare', 0),
  ('blood_collector', 'Collectionneur de sang', 'Absorber au moins 3 types de sang dans une partie.', 'rare', 6)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  reward_coins = excluded.reward_coins;
