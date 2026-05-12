
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
