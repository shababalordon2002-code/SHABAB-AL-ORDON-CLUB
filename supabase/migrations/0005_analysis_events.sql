-- Migration 0005: Analysis Events (registro colaborativo en vivo, fila por evento)
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).
--
-- Sustituye el modelo de "un array jsonb entero se sobrescribe cada vez" (analysis_sessions.events)
-- por una tabla con una fila por evento, para que varios analistas puedan registrar a la vez
-- sobre el mismo partido sin pisarse los eventos entre sí.

create table if not exists public.analysis_events (
  event_id text primary key,
  match_id text not null,
  source_event_id text,
  team_id text,
  team_name text,
  player_id text,
  player_name text,
  event_type text not null,
  category text,
  subcategory text,
  "timestamp" double precision,
  minute integer,
  second integer,
  duration double precision,
  period integer,
  x double precision,
  y double precision,
  end_x double precision,
  end_y double precision,
  outcome text,
  metadata jsonb default '{}'::jsonb,
  source text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists analysis_events_match_id_idx on public.analysis_events(match_id);

comment on table public.analysis_events is 'Eventos individuales de un análisis en vivo (una fila por evento) para permitir registro colaborativo simultáneo de varios analistas sobre el mismo partido';

-- Enable RLS and add public access policies (consistente con analysis_sessions / botonera_templates)
alter table public.analysis_events enable row level security;

drop policy if exists "Allow public read access on analysis_events" on public.analysis_events;
create policy "Allow public read access on analysis_events" on public.analysis_events for select using (true);

drop policy if exists "Allow public write access on analysis_events" on public.analysis_events;
create policy "Allow public write access on analysis_events" on public.analysis_events for all using (true) with check (true);

-- Enable Realtime so connected analysts see each other's inserts/updates/deletes live
alter publication supabase_realtime add table public.analysis_events;

-- Refresh PostgREST schema
notify pgrst, 'reload schema';
