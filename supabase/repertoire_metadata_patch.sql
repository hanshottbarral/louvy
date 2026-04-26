alter table public.repertoire_songs
  add column if not exists artist text,
  add column if not exists duration_seconds integer;
