-- Migration 0012: Collaborative Events Safety & Recycle Bin
-- Run in Supabase SQL Editor. Safe and idempotent.

-- 1. Table for backing up deleted events so nothing is ever permanently lost
create table if not exists public.analysis_events_trash (
  event_id text primary key,
  match_id text not null,
  event_data jsonb not null default '{}'::jsonb,
  deleted_by text,
  deleted_at timestamp with time zone default now()
);

create index if not exists analysis_events_trash_match_id_idx on public.analysis_events_trash(match_id);

comment on table public.analysis_events_trash is 'Papelera de seguridad de eventos eliminados para recuperación y auditoría en tiempo real';

-- 2. Row Level Security policies
alter table public.analysis_events_trash enable row level security;

drop policy if exists "Allow public read access on analysis_events_trash" on public.analysis_events_trash;
create policy "Allow public read access on analysis_events_trash" on public.analysis_events_trash for select using (true);

drop policy if exists "Allow public write access on analysis_events_trash" on public.analysis_events_trash;
create policy "Allow public write access on analysis_events_trash" on public.analysis_events_trash for all using (true) with check (true);

-- 3. Notify PostgREST to reload schema
notify pgrst, 'reload schema';
