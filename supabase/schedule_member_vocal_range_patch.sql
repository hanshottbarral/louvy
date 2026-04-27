alter table public.schedule_members
  add column if not exists vocal_range public.vocal_range;
