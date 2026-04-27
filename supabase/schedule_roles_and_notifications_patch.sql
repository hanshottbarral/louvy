alter type public.instrument_role add value if not exists 'VIOLAO';
alter type public.instrument_role add value if not exists 'DIRETOR_MUSICAL';
alter type public.instrument_role add value if not exists 'MINISTRO_RESPONSAVEL';
alter type public.instrument_role add value if not exists 'VS';

alter table public.schedule_members
  add column if not exists decline_reason text;
