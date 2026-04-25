-- CampusBook: таблицы bookings + profiles + RLS
-- Выполнить в Supabase → SQL Editor

-- =========================================================
-- 1) Таблица bookings (из hw6)
-- =========================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text not null,
  resource_id text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  purpose text not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_resource_date_idx on public.bookings (resource_id, date);

alter table public.bookings enable row level security;

-- Свои строки + все активные (для проверки пересечений на клиенте)
drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select"
  on public.bookings for select to authenticated
  using (user_id = auth.uid() or status = 'active');

drop policy if exists "bookings_insert" on public.bookings;
create policy "bookings_insert"
  on public.bookings for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own"
  on public.bookings for update to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- 2) Таблица profiles (hw10 — paywall, hw7 — display_name)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SELECT — только свой профиль
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

-- INSERT — только свой профиль, и только с paid = false
-- (фронт не может сделать себя PRO в обход webhook)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and paid = false);

-- UPDATE — свой профиль, но менять можно только display_name.
-- paid апдейтится через service_role (серверный webhook от платёжки, hw11).
drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and paid = (select paid from public.profiles where id = auth.uid()));

-- Флаг администратора (выставляется вручную в Supabase dashboard)
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- =========================================================
-- 3) Таблица resources (редактируемый каталог ресурсов)
-- =========================================================
create table if not exists public.resources (
  id          text primary key,
  name        text not null,
  type        text not null check (type in ('room','coworking','equipment','consultation')),
  description text,
  floor       integer not null default 1,
  capacity    integer not null default 1,
  img_url     text,
  active      boolean not null default true,
  sort_order  integer default 0,
  created_at  timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Все видят активные ресурсы
drop policy if exists "resources_select" on public.resources;
create policy "resources_select"
  on public.resources for select
  using (active = true);

-- Только is_admin = true могут изменять
drop policy if exists "resources_write" on public.resources;
create policy "resources_write"
  on public.resources for all to authenticated
  using     ((select is_admin from public.profiles where id = auth.uid()))
  with check((select is_admin from public.profiles where id = auth.uid()));

-- Обновление updated_at триггером
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- =========================================================
-- 4) Автоматически выставлять is_admin для известных email
-- =========================================================
-- Триггер: при создании профиля проверяет email и ставит is_admin
create or replace function public.set_admin_by_email()
returns trigger language plpgsql security definer as $$
begin
  if new.email = 'admin@campusbook.ru' then
    new.is_admin := true;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_set_admin on public.profiles;
create trigger profiles_set_admin
before insert on public.profiles
for each row execute function public.set_admin_by_email();

-- Одноразовый апдейт для уже зарегистрированных admin-аккаунтов:
update public.profiles set is_admin = true where email = 'admin@campusbook.ru';
