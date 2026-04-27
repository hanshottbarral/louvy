create or replace function public.update_my_profile(display_name text, avatar text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.profiles
  set
    name = coalesce(nullif(trim(display_name), ''), name),
    avatar_url = nullif(trim(avatar), '')
  where id = auth.uid();
end;
$fn$;

drop policy if exists "member_profiles_update_self" on public.member_profiles;
create policy "member_profiles_update_self"
on public.member_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "member_profiles_insert_self" on public.member_profiles;
create policy "member_profiles_insert_self"
on public.member_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "member_assignments_select_authenticated" on public.member_assignments;
create policy "member_assignments_select_authenticated"
on public.member_assignments
for select
to authenticated
using (true);

drop policy if exists "member_assignments_insert_self_or_admin" on public.member_assignments;
create policy "member_assignments_insert_self_or_admin"
on public.member_assignments
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "member_assignments_update_self_or_admin" on public.member_assignments;
create policy "member_assignments_update_self_or_admin"
on public.member_assignments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "member_assignments_delete_self_or_admin" on public.member_assignments;
create policy "member_assignments_delete_self_or_admin"
on public.member_assignments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());
