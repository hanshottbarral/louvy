create or replace function public.recover_admin_access()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  admin_count integer;
begin
  select count(*)
  into admin_count
  from public.profiles
  where role = 'ADMIN';

  if admin_count > 0 then
    raise exception 'Já existe pelo menos um admin ativo.';
  end if;

  update public.profiles
  set role = 'ADMIN'
  where id = auth.uid();
end;
$fn$;
