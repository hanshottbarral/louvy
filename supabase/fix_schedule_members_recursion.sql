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
with check (public.is_admin());

drop policy if exists "schedules_update_admin" on public.schedules;
create policy "schedules_update_admin"
on public.schedules
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "schedules_delete_admin" on public.schedules;
create policy "schedules_delete_admin"
on public.schedules
for delete
to authenticated
using (public.is_admin());

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
with check (public.is_admin());

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
using (public.is_admin());

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
using (public.is_admin())
with check (public.is_admin());

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
