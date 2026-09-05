-- Migration 0004: Dashboards personalizados por partido analizado (pizarra tipo Tableau/Power BI)
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).

create table if not exists public.match_dashboards (
  id text primary key,
  match_id text not null,
  analysis_id text,
  name text not null,
  description text default '',
  botonera_template_id text,
  cols integer default 12,
  row_height integer default 40,
  widgets jsonb not null default '[]'::jsonb,
  global_filters jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_match_dashboards_match_id on public.match_dashboards(match_id);

alter table public.match_dashboards enable row level security;

drop policy if exists "Allow public read access on match_dashboards" on public.match_dashboards;
create policy "Allow public read access on match_dashboards" on public.match_dashboards for select using (true);

drop policy if exists "Allow public write access on match_dashboards" on public.match_dashboards;
create policy "Allow public write access on match_dashboards" on public.match_dashboards for all using (true) with check (true);

comment on table public.match_dashboards is 'Pizarras de dashboard configurables por partido analizado (widgets, filtros y layout)';

-- Refresh PostgREST schema
notify pgrst, 'reload schema';
