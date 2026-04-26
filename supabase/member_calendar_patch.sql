do $$
begin
  if not exists (select 1 from pg_type where typname = 'ministry_assignment') then
    create type public.ministry_assignment as enum (
      'VOCAL',
      'BATERIA',
      'BAIXO',
      'GUITARRA',
      'TECLADO',
      'VIOLAO',
      'DIRETOR_MUSICAL',
      'MINISTRO_RESPONSAVEL',
      'VS'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'vocal_range') then
    create type public.vocal_range as enum (
      'BARITONO',
      'TENOR',
      'CONTRALTO',
      'SOPRANO',
      'MEZZO'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'availability_time_slot') then
    create type public.availability_time_slot as enum ('ANY', 'MORNING', 'AFTERNOON', 'NIGHT');
  end if;

  if not exists (select 1 from pg_type where typname = 'availability_recurrence') then
    create type public.availability_recurrence as enum (
      'NONE',
      'WEEKLY',
      'FIRST_SUNDAY_MONTHLY',
      'SUNDAY_MORNING_WEEKLY',
      'SUNDAY_NIGHT_WEEKLY'
    );
  end if;
end $$;

create table if not exists public.member_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.member_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment public.ministry_assignment not null,
  vocal_range public.vocal_range,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  reason text not null,
  time_slot public.availability_time_slot not null default 'ANY',
  recurrence public.availability_recurrence not null default 'NONE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_member_assignments_user on public.member_assignments(user_id);
create index if not exists idx_availability_blocks_user_date on public.availability_blocks(user_id, date);

drop trigger if exists member_profiles_set_updated_at on public.member_profiles;
create trigger member_profiles_set_updated_at
before update on public.member_profiles
for each row execute function public.set_updated_at();

drop trigger if exists availability_blocks_set_updated_at on public.availability_blocks;
create trigger availability_blocks_set_updated_at
before update on public.availability_blocks
for each row execute function public.set_updated_at();

alter table public.member_profiles enable row level security;
alter table public.member_assignments enable row level security;
alter table public.availability_blocks enable row level security;

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "member_profiles_select_authenticated" on public.member_profiles;
create policy "member_profiles_select_authenticated"
on public.member_profiles
for select
to authenticated
using (true);

drop policy if exists "member_profiles_write_admin" on public.member_profiles;
create policy "member_profiles_write_admin"
on public.member_profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "member_assignments_select_authenticated" on public.member_assignments;
create policy "member_assignments_select_authenticated"
on public.member_assignments
for select
to authenticated
using (true);

drop policy if exists "member_assignments_write_admin" on public.member_assignments;
create policy "member_assignments_write_admin"
on public.member_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "availability_blocks_select_own_or_admin" on public.availability_blocks;
create policy "availability_blocks_select_own_or_admin"
on public.availability_blocks
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "availability_blocks_insert_own_or_admin" on public.availability_blocks;
create policy "availability_blocks_insert_own_or_admin"
on public.availability_blocks
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "availability_blocks_update_own_or_admin" on public.availability_blocks;
create policy "availability_blocks_update_own_or_admin"
on public.availability_blocks
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);

drop policy if exists "availability_blocks_delete_own_or_admin" on public.availability_blocks;
create policy "availability_blocks_delete_own_or_admin"
on public.availability_blocks
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
  )
);
