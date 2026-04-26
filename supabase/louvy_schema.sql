-- Louvy schema for Supabase (PostgreSQL)
-- Cole este script no SQL Editor do Supabase.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('ADMIN', 'MUSICIAN');
  end if;

  if not exists (select 1 from pg_type where typname = 'schedule_event_type') then
    create type public.schedule_event_type as enum ('SERVICE', 'REHEARSAL', 'SPECIAL');
  end if;

  if not exists (select 1 from pg_type where typname = 'instrument_role') then
    create type public.instrument_role as enum ('VOCAL', 'GUITAR', 'BASS', 'DRUMS', 'KEYS');
  end if;

  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type public.member_status as enum ('CONFIRMED', 'PENDING', 'DECLINED');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum ('TEXT', 'AUDIO');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('NEW_MESSAGE', 'SCHEDULE_ASSIGNED', 'STATUS_CHANGED', 'SCHEDULE_UPDATED');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.role = 'ADMIN'
  );
$$;

create or replace function public.is_schedule_member(
  target_schedule_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.schedule_members sm
    where sm.schedule_id = target_schedule_id
      and sm.user_id = check_user_id
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique,
  role public.app_role not null default 'MUSICIAN',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time not null,
  event_type public.schedule_event_type not null,
  event_label text not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_members (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.instrument_role not null,
  status public.member_status not null default 'PENDING',
  last_read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (schedule_id, user_id, role)
);

create table if not exists public.repertoire_songs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  musical_key text not null,
  bpm integer,
  youtube_url text,
  category text not null default 'Geral',
  notes text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_songs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  repertoire_song_id uuid references public.repertoire_songs(id) on delete set null,
  name text not null,
  musical_key text not null,
  bpm integer,
  youtube_url text,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type public.message_type not null default 'TEXT',
  audio_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint message_payload_check check (
    (type = 'TEXT' and content is not null)
    or
    (type = 'AUDIO' and audio_url is not null)
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type public.notification_type not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_schedules_event_date on public.schedules(event_date);
create index if not exists idx_schedules_created_by on public.schedules(created_by);
create index if not exists idx_schedule_members_schedule on public.schedule_members(schedule_id);
create index if not exists idx_schedule_members_user on public.schedule_members(user_id);
create index if not exists idx_repertoire_songs_active on public.repertoire_songs(is_active);
create index if not exists idx_repertoire_songs_category on public.repertoire_songs(category);
create index if not exists idx_schedule_songs_schedule on public.schedule_songs(schedule_id);
create index if not exists idx_messages_schedule_created on public.messages(schedule_id, created_at);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

drop trigger if exists schedule_members_set_updated_at on public.schedule_members;
create trigger schedule_members_set_updated_at
before update on public.schedule_members
for each row execute function public.set_updated_at();

drop trigger if exists repertoire_songs_set_updated_at on public.repertoire_songs;
create trigger repertoire_songs_set_updated_at
before update on public.repertoire_songs
for each row execute function public.set_updated_at();

drop trigger if exists schedule_songs_set_updated_at on public.schedule_songs;
create trigger schedule_songs_set_updated_at
before update on public.schedule_songs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role := 'MUSICIAN';
begin
  if not exists (
    select 1
    from public.profiles
    where role = 'ADMIN'
  ) then
    assigned_role := 'ADMIN';
  end if;

  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Novo usuario'),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;

  update public.profiles
  set role = assigned_role
  where id = new.id
    and role = 'MUSICIAN';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_members enable row level security;
alter table public.repertoire_songs enable row level security;
alter table public.schedule_songs enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "schedules_select_member_or_admin" on public.schedules;
create policy "schedules_select_member_or_admin"
on public.schedules
for select
to authenticated
using (
  public.is_admin()
  or public.is_schedule_member(schedules.id)
);

drop policy if exists "schedules_insert_admin" on public.schedules;
create policy "schedules_insert_admin"
on public.schedules
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists "schedules_update_admin" on public.schedules;
create policy "schedules_update_admin"
on public.schedules
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "schedules_delete_admin" on public.schedules;
create policy "schedules_delete_admin"
on public.schedules
for delete
to authenticated
using (
  public.is_admin()
);

drop policy if exists "schedule_members_select_member_or_admin" on public.schedule_members;
create policy "schedule_members_select_member_or_admin"
on public.schedule_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_schedule_member(schedule_members.schedule_id)
);

drop policy if exists "schedule_members_insert_admin" on public.schedule_members;
create policy "schedule_members_insert_admin"
on public.schedule_members
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists "schedule_members_update_self_or_admin" on public.schedule_members;
create policy "schedule_members_update_self_or_admin"
on public.schedule_members
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "schedule_members_delete_admin" on public.schedule_members;
create policy "schedule_members_delete_admin"
on public.schedule_members
for delete
to authenticated
using (
  public.is_admin()
);

drop policy if exists "repertoire_select_authenticated" on public.repertoire_songs;
create policy "repertoire_select_authenticated"
on public.repertoire_songs
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "repertoire_write_admin" on public.repertoire_songs;
create policy "repertoire_write_admin"
on public.repertoire_songs
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "schedule_songs_select_member_or_admin" on public.schedule_songs;
create policy "schedule_songs_select_member_or_admin"
on public.schedule_songs
for select
to authenticated
using (
  public.is_admin()
  or public.is_schedule_member(schedule_songs.schedule_id)
);

drop policy if exists "schedule_songs_write_admin" on public.schedule_songs;
create policy "schedule_songs_write_admin"
on public.schedule_songs
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "messages_select_member_or_admin" on public.messages;
create policy "messages_select_member_or_admin"
on public.messages
for select
to authenticated
using (
  public.is_admin()
  or public.is_schedule_member(messages.schedule_id)
);

drop policy if exists "messages_insert_member_or_admin" on public.messages;
create policy "messages_insert_member_or_admin"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (public.is_admin() or public.is_schedule_member(messages.schedule_id))
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-audio',
  'chat-audio',
  true,
  10485760,
  array['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a']
)
on conflict (id) do nothing;

drop policy if exists "chat_audio_public_read" on storage.objects;
create policy "chat_audio_public_read"
on storage.objects
for select
to public
using (bucket_id = 'chat-audio');

drop policy if exists "chat_audio_authenticated_insert" on storage.objects;
create policy "chat_audio_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-audio'
  and owner = auth.uid()
);

drop policy if exists "chat_audio_owner_update" on storage.objects;
create policy "chat_audio_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-audio'
  and owner = auth.uid()
)
with check (
  bucket_id = 'chat-audio'
  and owner = auth.uid()
);

drop policy if exists "chat_audio_owner_delete" on storage.objects;
create policy "chat_audio_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-audio'
  and owner = auth.uid()
);

do $$
begin
  begin
    alter publication supabase_realtime add table
      public.schedules,
      public.schedule_members,
      public.schedule_songs,
      public.messages,
      public.notifications;
  exception
    when duplicate_object then
      null;
  end;
end $$;

commit;
