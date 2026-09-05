-- Migration 0003: Match Analyses (Tarjetas de análisis por partido) persistence in Supabase
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).

create table if not exists public.match_analyses (
  id text primary key,
  match_id text not null,
  title text not null,
  analyst_name text default 'Analista SAO',
  status text default 'completed', -- 'completed' | 'in_progress'
  video_type text,
  video_url text,
  video_source_name text,
  p1_video_start_time double precision,
  p2_video_start_time double precision,
  botonera_template_id text,
  events jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for fast lookup by match_id
create index if not exists idx_match_analyses_match_id on public.match_analyses(match_id);

-- Enable RLS and add public access policies
alter table public.match_analyses enable row level security;

drop policy if exists "Allow public read access on match_analyses" on public.match_analyses;
create policy "Allow public read access on match_analyses" on public.match_analyses for select using (true);

drop policy if exists "Allow public write access on match_analyses" on public.match_analyses;
create policy "Allow public write access on match_analyses" on public.match_analyses for all using (true) with check (true);

-- Refresh PostgREST schema
notify pgrst, 'reload schema';
