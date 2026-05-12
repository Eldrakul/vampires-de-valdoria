
-- ============================================================
-- SANG NOIR ONLINE — MIGRATION v17
-- Discord Auth côté Supabase + Admin panel + Gestion images
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- MEDIA ASSETS
-- ============================================================

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null default 'other', -- avatar/shop/role/adn/background/ui/other
  url text not null,
  storage_path text,
  mime_type text,
  size_bytes integer not null default 0,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

-- Optional : columns for richer shop visuals
alter table public.shop_items add column if not exists description text not null default '';
alter table public.shop_items add column if not exists rarity text not null default 'common';

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sang-noir-assets',
  'sang-noir-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- UPDATED_AT helper
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_media_assets_updated_at on public.media_assets;
create trigger touch_media_assets_updated_at
before update on public.media_assets
for each row execute function public.touch_updated_at();

-- ============================================================
-- ADMIN HELPER
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ============================================================
-- RPC : Admin role management
-- ============================================================

create or replace function public.admin_set_user_role(_user_id uuid, _role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if _role not in ('player', 'admin') then
    raise exception 'Invalid role';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);

  update public.profiles
  set role = _role
  where id = _user_id;

  return jsonb_build_object('ok', true, 'user_id', _user_id, 'role', _role);
end;
$$;

-- ============================================================
-- RPC : Admin media create/update/delete
-- ============================================================

create or replace function public.admin_upsert_media_asset(
  _key text,
  _name text,
  _category text,
  _url text,
  _storage_path text,
  _mime_type text,
  _size_bytes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if length(trim(_key)) < 2 then
    raise exception 'Invalid key';
  end if;

  if _category not in ('avatar', 'shop', 'role', 'adn', 'background', 'ui', 'other') then
    _category := 'other';
  end if;

  insert into public.media_assets
  (key, name, category, url, storage_path, mime_type, size_bytes, enabled, created_by)
  values
  (
    lower(regexp_replace(trim(_key), '[^a-zA-Z0-9_-]+', '_', 'g')),
    trim(_name),
    _category,
    _url,
    _storage_path,
    _mime_type,
    greatest(coalesce(_size_bytes, 0), 0),
    true,
    auth.uid()
  )
  on conflict (key) do update set
    name = excluded.name,
    category = excluded.category,
    url = excluded.url,
    storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    enabled = true
  returning id into _id;

  return jsonb_build_object('ok', true, 'id', _id);
end;
$$;

create or replace function public.admin_delete_media_asset(_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.media_assets
  where id = _id;

  return jsonb_build_object('ok', true, 'deleted', _id);
end;
$$;

create or replace function public.admin_set_shop_image(_shop_key text, _image_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.shop_items
  set image_url = _image_url
  where key = _shop_key;

  return jsonb_build_object('ok', true, 'shop_key', _shop_key, 'image_url', _image_url);
end;
$$;

-- ============================================================
-- RLS : media assets
-- ============================================================

drop policy if exists "media_assets select enabled" on public.media_assets;
create policy "media_assets select enabled"
on public.media_assets for select
to authenticated
using (enabled = true or public.is_admin());

drop policy if exists "media_assets admin all" on public.media_assets;
create policy "media_assets admin all"
on public.media_assets for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- RLS : storage objects for bucket sang-noir-assets
-- Public read, admin write/delete/update.
-- ============================================================

drop policy if exists "sang noir assets public read" on storage.objects;
create policy "sang noir assets public read"
on storage.objects for select
to public
using (bucket_id = 'sang-noir-assets');

drop policy if exists "sang noir assets admin insert" on storage.objects;
create policy "sang noir assets admin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'sang-noir-assets'
  and public.is_admin()
);

drop policy if exists "sang noir assets admin update" on storage.objects;
create policy "sang noir assets admin update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'sang-noir-assets'
  and public.is_admin()
)
with check (
  bucket_id = 'sang-noir-assets'
  and public.is_admin()
);

drop policy if exists "sang noir assets admin delete" on storage.objects;
create policy "sang noir assets admin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'sang-noir-assets'
  and public.is_admin()
);

-- ============================================================
-- Grants
-- ============================================================

grant usage on schema public to anon, authenticated;
grant all on public.media_assets to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_upsert_media_asset(text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.admin_delete_media_asset(uuid) to authenticated;
grant execute on function public.admin_set_shop_image(text, text) to authenticated;

-- ============================================================
-- MANUAL FIRST ADMIN
-- ============================================================
-- Après avoir créé ton compte sur le site, remplace l’email si besoin,
-- puis exécute cette ligne UNE SEULE FOIS pour te donner l’accès admin :
--
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'rttyrttyttttt@gmail.com');
--
-- ============================================================
-- END v17
-- ============================================================
