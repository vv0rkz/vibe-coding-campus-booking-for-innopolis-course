-- CampusBook: таблица бронирований + RLS (выполнить в Supabase → SQL Editor)

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
create policy "bookings_select"
  on public.bookings for select to authenticated
  using (user_id = auth.uid() or status = 'active');

create policy "bookings_insert"
  on public.bookings for insert to authenticated
  with check (user_id = auth.uid());

create policy "bookings_update_own"
  on public.bookings for update to authenticated
  using (user_id = auth.uid());
