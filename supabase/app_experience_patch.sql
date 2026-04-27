alter type public.availability_recurrence add value if not exists 'MONTHLY_BY_DAY';
alter type public.availability_recurrence add value if not exists 'BIWEEKLY';

alter table public.member_profiles
  add column if not exists birthday date;

alter table public.schedule_members
  add column if not exists can_manage_setlist boolean not null default false;

alter table public.schedule_songs
  add column if not exists lead_vocalist_user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  link_url text,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fellowship_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type public.message_type not null default 'TEXT',
  audio_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint fellowship_message_payload_check check (
    (type = 'TEXT' and content is not null)
    or
    (type = 'AUDIO' and audio_url is not null)
  )
);

create index if not exists idx_announcements_created_at on public.announcements(created_at desc);
create index if not exists idx_fellowship_messages_created_at on public.fellowship_messages(created_at asc);

alter table public.announcements enable row level security;
alter table public.fellowship_messages enable row level security;

drop policy if exists "announcements_select_authenticated" on public.announcements;
create policy "announcements_select_authenticated"
on public.announcements
for select
to authenticated
using (true);

drop policy if exists "announcements_write_admin" on public.announcements;
create policy "announcements_write_admin"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "fellowship_messages_select_authenticated" on public.fellowship_messages;
create policy "fellowship_messages_select_authenticated"
on public.fellowship_messages
for select
to authenticated
using (true);

drop policy if exists "fellowship_messages_insert_authenticated" on public.fellowship_messages;
create policy "fellowship_messages_insert_authenticated"
on public.fellowship_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "fellowship_messages_delete_own_or_admin" on public.fellowship_messages;
create policy "fellowship_messages_delete_own_or_admin"
on public.fellowship_messages
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

do $rt$
begin
  begin
    alter publication supabase_realtime add table
      public.announcements,
      public.fellowship_messages;
  exception
    when duplicate_object then
      null;
  end;
end;
$rt$;
