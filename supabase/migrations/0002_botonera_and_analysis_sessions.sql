-- Migration 0002: Botoneras (Templates) and Analysis Sessions persistence in Supabase
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).

-- 1. Table for Botonera Templates (plantillas / botoneras guardadas)
create table if not exists public.botonera_templates (
  id text primary key,
  name text not null,
  description text default '',
  is_default boolean default false,
  grid_cols integer default 4,
  buttons jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Table for Ongoing / Active Analysis Sessions (análisis en marcha)
create table if not exists public.analysis_sessions (
  match_id text primary key,
  period integer default 1,
  timer_seconds integer default 0,
  is_timer_running boolean default false,
  start_timestamp bigint,
  last_updated_timestamp bigint,
  events jsonb default '[]'::jsonb,
  is_configured boolean default true,
  video_type text,
  video_source_name text,
  video_url text,
  p1_video_start_seconds double precision,
  p2_video_start_seconds double precision,
  botonera_template_id text,
  status text default 'in_progress',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Comments for clarity
comment on table public.botonera_templates is 'Plantillas de botonera (paneles de botones tácticos y descriptores) guardadas por el usuario';
comment on table public.analysis_sessions is 'Sesiones de análisis y etiquetado en vivo en curso por cada partido';

-- Enable RLS and add public access policies
alter table public.botonera_templates enable row level security;
alter table public.analysis_sessions enable row level security;

drop policy if exists "Allow public read access on botonera_templates" on public.botonera_templates;
create policy "Allow public read access on botonera_templates" on public.botonera_templates for select using (true);

drop policy if exists "Allow public write access on botonera_templates" on public.botonera_templates;
create policy "Allow public write access on botonera_templates" on public.botonera_templates for all using (true) with check (true);

drop policy if exists "Allow public read access on analysis_sessions" on public.analysis_sessions;
create policy "Allow public read access on analysis_sessions" on public.analysis_sessions for select using (true);

drop policy if exists "Allow public write access on analysis_sessions" on public.analysis_sessions;
create policy "Allow public write access on analysis_sessions" on public.analysis_sessions for all using (true) with check (true);

-- Refresh PostgREST schema
notify pgrst, 'reload schema';
