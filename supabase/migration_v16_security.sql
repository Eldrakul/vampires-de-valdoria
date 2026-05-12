
-- ============================================================
-- SANG NOIR ONLINE — SECURITY MIGRATION v16
-- À coller dans Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

alter table public.shop_items add column if not exists description text not null default '';
alter table public.profiles add column if not exists selected_avatar text not null default 'avatar_frog';
alter table public.profiles add column if not exists profile_stats jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists history jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists role text not null default 'player';

create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null references public.shop_items(key) on delete cascade,
  acquired_at timestamptz not null default now(),
  unique(user_id, item_key)
);

create table if not exists public.training_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, room_id)
);

alter table public.player_inventory enable row level security;
alter table public.training_results enable row level security;

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

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'player' and not public.is_admin() then
      new.role := 'player';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.is_admin() then
      new.role := old.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_role_escalation_trigger on public.profiles;
create trigger prevent_role_escalation_trigger
before insert or update on public.profiles
for each row execute function public.prevent_role_escalation();

create or replace function public.prevent_profile_cheat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _bypass text;
begin
  _bypass := current_setting('app.bypass_profile_guard', true);

  if tg_op = 'UPDATE'
     and coalesce(_bypass, '') <> 'on'
     and not public.is_admin()
  then
    new.coins := old.coins;
    new.xp := old.xp;
    new.level := old.level;
    new.history := old.history;
    new.profile_stats := old.profile_stats;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_cheat_trigger on public.profiles;
create trigger prevent_profile_cheat_trigger
before update on public.profiles
for each row execute function public.prevent_profile_cheat();

insert into public.shop_items
(key, name, type, price, level_required, value, description, image_url, enabled)
values
  ('avatar_frog', 'Avatar Grenouille occulte', 'avatar', 0, 1, 'frog', 'Avatar de base gratuit.', null, true),
  ('avatar_human', 'Avatar Humain pâle', 'avatar', 60, 1, 'human', 'Avatar humain simple.', null, true),
  ('avatar_bat', 'Avatar Chauve-souris', 'avatar', 120, 2, 'bat', 'Avatar nocturne.', null, true),
  ('avatar_ghost', 'Avatar Spectre', 'avatar', 180, 3, 'ghost', 'Avatar spectral.', null, true),
  ('avatar_skull', 'Avatar Crâne', 'avatar', 240, 4, 'skull', 'Avatar sombre.', null, true),
  ('avatar_robot', 'Avatar Automate noir', 'avatar', 260, 5, 'robot', 'Avatar mécanique.', null, true),
  ('avatar_wolf', 'Avatar Loup rival', 'avatar', 320, 6, 'wolf', 'Avatar de prédateur rival.', null, true),
  ('avatar_witch', 'Avatar Sorcier sanglant', 'avatar', 380, 7, 'witch', 'Avatar magique.', null, true),
  ('skin_default', 'Skin simple', 'skin', 0, 1, 'default', 'Skin de base gratuit.', null, true),
  ('skin_blood', 'Skin Sang Royal', 'skin', 150, 2, 'blood', 'Contour rouge sang.', null, true),
  ('skin_moon', 'Skin Lune froide', 'skin', 180, 3, 'moon', 'Contour lunaire.', null, true),
  ('skin_shadow', 'Skin Ombre ancienne', 'skin', 260, 5, 'shadow', 'Contour sombre et violet.', null, true),
  ('skin_gold', 'Skin Noblesse dorée', 'skin', 420, 8, 'gold', 'Contour doré rare.', null, true),
  ('title_night_child', 'Titre : Enfant de la Nuit', 'title', 100, 2, 'Enfant de la Nuit', 'Titre cosmétique.', null, true),
  ('title_blood_hunter', 'Titre : Chasseur de Crocs', 'title', 180, 4, 'Chasseur de Crocs', 'Titre cosmétique.', null, true),
  ('title_lord', 'Titre : Seigneur du Sang', 'title', 360, 8, 'Seigneur du Sang', 'Titre prestigieux.', null, true),
  ('title_ancient', 'Titre : Ancien Éveillé', 'title', 600, 12, 'Ancien Éveillé', 'Titre légendaire.', null, true)
on conflict (key) do update set
  name = excluded.name,
  type = excluded.type,
  price = excluded.price,
  level_required = excluded.level_required,
  value = excluded.value,
  description = excluded.description,
  image_url = excluded.image_url,
  enabled = excluded.enabled;

insert into public.achievements
(key, name, description, rarity, reward_coins)
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

create or replace function public.ensure_starter_inventory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.player_inventory (user_id, item_key)
  values (auth.uid(), 'avatar_frog'), (auth.uid(), 'skin_default')
  on conflict (user_id, item_key) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.purchase_shop_item(_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _item public.shop_items%rowtype;
  _profile public.profiles%rowtype;
begin
  _user_id := auth.uid();
  if _user_id is null then raise exception 'Not authenticated'; end if;

  select * into _item from public.shop_items where key = _item_key and enabled = true;
  if not found then raise exception 'Item not found'; end if;

  select * into _profile from public.profiles where id = _user_id for update;
  if not found then raise exception 'Profile not found'; end if;

  if exists (select 1 from public.player_inventory where user_id = _user_id and item_key = _item.key) then
    return jsonb_build_object('ok', true, 'already_owned', true, 'coins_after', _profile.coins);
  end if;

  if _profile.level < _item.level_required then raise exception 'Level too low'; end if;
  if _profile.coins < _item.price then raise exception 'Not enough coins'; end if;

  perform set_config('app.bypass_profile_guard', 'on', true);

  update public.profiles set coins = coins - _item.price where id = _user_id;
  insert into public.player_inventory (user_id, item_key)
  values (_user_id, _item.key)
  on conflict (user_id, item_key) do nothing;

  return jsonb_build_object('ok', true, 'item_key', _item.key, 'price', _item.price, 'coins_after', _profile.coins - _item.price);
end;
$$;

create or replace function public.equip_shop_item(_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _item public.shop_items%rowtype;
begin
  _user_id := auth.uid();
  if _user_id is null then raise exception 'Not authenticated'; end if;

  select * into _item from public.shop_items where key = _item_key and enabled = true;
  if not found then raise exception 'Item not found'; end if;

  if not exists (select 1 from public.player_inventory where user_id = _user_id and item_key = _item.key) then
    raise exception 'Item not owned';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);

  if _item.type = 'avatar' then
    update public.profiles set selected_avatar = _item.key where id = _user_id;
  elsif _item.type = 'skin' then
    update public.profiles set selected_skin = _item.value where id = _user_id;
  elsif _item.type = 'title' then
    update public.profiles set selected_title = _item.value where id = _user_id;
  else
    raise exception 'Unsupported item type';
  end if;

  return jsonb_build_object('ok', true, 'equipped', _item.key, 'type', _item.type);
end;
$$;

create or replace function public.unlock_achievement(_achievement_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _achievement public.achievements%rowtype;
  _allowed boolean := false;
  _count integer := 0;
begin
  _user_id := auth.uid();
  if _user_id is null then raise exception 'Not authenticated'; end if;

  select * into _achievement from public.achievements where key = _achievement_key;
  if not found then raise exception 'Achievement not found'; end if;

  if _achievement_key = 'first_profile' then
    select count(*) into _count from public.profiles where id = _user_id;
    _allowed := _count > 0;
  elsif _achievement_key = 'first_room' then
    select count(*) into _count from public.rooms where host_id = _user_id;
    _allowed := _count > 0;
  elsif _achievement_key = 'first_message' then
    select count(*) into _count
    from public.messages m
    join public.room_players p on p.id = m.sender_player_id
    where p.user_id = _user_id and m.is_bot = false;
    _allowed := _count > 0;
  elsif _achievement_key = 'first_purchase' then
    select count(*) into _count from public.player_inventory
    where user_id = _user_id and item_key not in ('avatar_frog', 'skin_default');
    _allowed := _count > 0;
  elsif _achievement_key = 'collector_5' then
    select count(*) into _count from public.player_inventory where user_id = _user_id;
    _allowed := _count >= 5;
  elsif _achievement_key = 'level_5' then
    select count(*) into _count from public.profiles where id = _user_id and level >= 5;
    _allowed := _count > 0;
  elsif _achievement_key = 'level_10' then
    select count(*) into _count from public.profiles where id = _user_id and level >= 10;
    _allowed := _count > 0;
  elsif _achievement_key = 'training_5' then
    select count(*) into _count from public.training_results where user_id = _user_id;
    _allowed := _count >= 5;
  elsif _achievement_key = 'blood_collector' then
    select count(*) into _count from public.room_players
    where user_id = _user_id and jsonb_array_length(absorbed_blood) >= 3;
    _allowed := _count > 0;
  else
    _allowed := public.is_admin();
  end if;

  if not _allowed then raise exception 'Achievement conditions not met'; end if;

  insert into public.player_achievements (user_id, achievement_key)
  values (_user_id, _achievement.key)
  on conflict (user_id, achievement_key) do nothing;

  if _achievement.reward_coins > 0 then
    perform set_config('app.bypass_profile_guard', 'on', true);
    update public.profiles set coins = coins + _achievement.reward_coins where id = _user_id;
  end if;

  return jsonb_build_object('ok', true, 'achievement', _achievement.key, 'reward_coins', _achievement.reward_coins);
end;
$$;

create or replace function public.secure_add_progress(_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _coins integer := 0;
  _xp integer := 0;
  _profile public.profiles%rowtype;
  _need integer;
  _history jsonb;
begin
  _user_id := auth.uid();
  if _user_id is null then raise exception 'Not authenticated'; end if;

  if _reason = 'message' then
    _coins := 0;
    _xp := 1;
  elsif _reason = 'daily_test' then
    _coins := 0;
    _xp := 5;
  else
    raise exception 'Invalid progress reason';
  end if;

  select * into _profile from public.profiles where id = _user_id for update;
  if not found then raise exception 'Profile not found'; end if;

  _profile.xp := _profile.xp + _xp;

  loop
    _need := floor(100 + (_profile.level - 1) * 75 + power((_profile.level - 1), 2) * 18);
    exit when _profile.xp < _need;
    _profile.xp := _profile.xp - _need;
    _profile.level := _profile.level + 1;
  end loop;

  _history := coalesce(_profile.history, '{}'::jsonb);
  _history := jsonb_set(_history, '{totalXpEarned}', to_jsonb(coalesce((_history->>'totalXpEarned')::integer, 0) + _xp), true);

  perform set_config('app.bypass_profile_guard', 'on', true);

  update public.profiles
  set coins = coins + _coins, xp = _profile.xp, level = _profile.level, history = _history
  where id = _user_id;

  return jsonb_build_object('ok', true, 'reason', _reason, 'coins', _coins, 'xp', _xp, 'level', _profile.level);
end;
$$;

create or replace function public.record_training_result(_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _count integer;
  _history jsonb;
begin
  _user_id := auth.uid();
  if _user_id is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1
    from public.rooms r
    join public.room_players p on p.room_id = r.id
    where r.id = _room_id
    and r.training_mode = true
    and p.user_id = _user_id
  ) then
    raise exception 'Invalid training room';
  end if;

  insert into public.training_results (user_id, room_id)
  values (_user_id, _room_id)
  on conflict (user_id, room_id) do nothing;

  select count(*) into _count from public.training_results where user_id = _user_id;
  select coalesce(history, '{}'::jsonb) into _history from public.profiles where id = _user_id;
  _history := jsonb_set(_history, '{trainingGames}', to_jsonb(_count), true);

  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set history = _history where id = _user_id;

  return jsonb_build_object('ok', true, 'training_count', _count);
end;
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;
alter table public.game_actions enable row level security;
alter table public.shop_items enable row level security;
alter table public.player_inventory enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.admin_config enable row level security;
alter table public.training_results enable row level security;

drop policy if exists "inventory read own" on public.player_inventory;
drop policy if exists "inventory select own admin" on public.player_inventory;
create policy "inventory select own admin"
on public.player_inventory for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "inventory insert own" on public.player_inventory;
drop policy if exists "inventory insert blocked" on public.player_inventory;
create policy "inventory insert blocked"
on public.player_inventory for insert to authenticated
with check (false);

drop policy if exists "inventory delete own admin" on public.player_inventory;
create policy "inventory delete own admin"
on public.player_inventory for delete to authenticated
using (public.is_admin());

drop policy if exists "player_achievements read own" on public.player_achievements;
drop policy if exists "player_achievements select own admin" on public.player_achievements;
create policy "player_achievements select own admin"
on public.player_achievements for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "player_achievements insert own" on public.player_achievements;
drop policy if exists "player_achievements insert blocked" on public.player_achievements;
create policy "player_achievements insert blocked"
on public.player_achievements for insert to authenticated
with check (false);

drop policy if exists "training_results select own admin" on public.training_results;
create policy "training_results select own admin"
on public.training_results for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "training_results insert blocked" on public.training_results;
create policy "training_results insert blocked"
on public.training_results for insert to authenticated
with check (false);

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.ensure_starter_inventory() to authenticated;
grant execute on function public.purchase_shop_item(text) to authenticated;
grant execute on function public.equip_shop_item(text) to authenticated;
grant execute on function public.unlock_achievement(text) to authenticated;
grant execute on function public.secure_add_progress(text) to authenticated;
grant execute on function public.record_training_result(uuid) to authenticated;
