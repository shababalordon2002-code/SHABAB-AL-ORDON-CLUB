-- Migration 0016: Dedicated single-source-of-truth table for each analysis's video
-- (YouTube link or local video) and its match-time sync settings (period start offsets
-- and period adjustments). Run in Supabase SQL Editor. It is idempotent (safe to run
-- multiple times) and 100% additive: it does not touch, alter, or delete any existing
-- table, column, or row. video_url/video_type/etc. keep existing in match_analyses and
-- matches for backward compatibility with any code path not yet migrated.
--
-- Why: today the video shown for an analysis is resolved by falling back across THREE
-- tables (analysis_sessions -> match_analyses -> matches). Depending on which table a
-- given analyst's save happened to reach, the analysis can end up with or without a
-- video, or with a stale one. This table removes that ambiguity: one row per match_id,
-- always the same place written and read.

create table if not exists public.analysis_videos (
  match_id text primary key,
  video_type text,                          -- 'link' (YouTube/URL) or 'local'
  video_url text,
  video_source_name text,
  p1_video_start_seconds double precision,   -- minuto/segundo del vídeo donde arranca la 1ª parte
  p2_video_start_seconds double precision,   -- minuto/segundo del vídeo donde arranca la 2ª parte
  period_adjustments jsonb default '{}'::jsonb, -- re-ajustes de sincronización a mitad de parte
  updated_by uuid references auth.users(id),
  updated_by_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.analysis_videos is 'Fuente única de verdad del vídeo (YouTube/local) y sus ajustes de sincronización de tiempo por análisis/partido.';

alter table public.analysis_videos enable row level security;

drop policy if exists "analysis_videos_select_all" on public.analysis_videos;
create policy "analysis_videos_select_all" on public.analysis_videos for select using (true);

drop policy if exists "analysis_videos_write_all" on public.analysis_videos;
create policy "analysis_videos_write_all" on public.analysis_videos for all using (true) with check (true);

-- Realtime: so a video/timing change made by one analyst is reflected instantly for
-- everyone else working on the same match, same as analysis_events.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'analysis_videos'
  ) then
    alter publication supabase_realtime add table public.analysis_videos;
  end if;
end $$;

-- Backfill: one row per match_id that has video/timing data today in match_analyses or
-- matches, preferring match_analyses (the "master" saved analysis) when both have a
-- value. Never overwrites anything already present here (ON CONFLICT DO NOTHING), so
-- running this migration twice, or after manual rows already exist, is always safe.
insert into public.analysis_videos (
  match_id, video_type, video_url, video_source_name,
  p1_video_start_seconds, p2_video_start_seconds, period_adjustments
)
select
  coalesce(ma.match_id, m.id) as match_id,
  coalesce(ma.video_type, m.video_type) as video_type,
  coalesce(ma.video_url, m.video_url) as video_url,
  coalesce(ma.video_source_name, m.video_source_name) as video_source_name,
  coalesce(ma.p1_video_start_time, m.p1_video_start_time) as p1_video_start_seconds,
  coalesce(ma.p2_video_start_time, m.p2_video_start_time) as p2_video_start_seconds,
  coalesce(ma.period_adjustments, m.period_adjustments, '{}'::jsonb) as period_adjustments
from public.matches m
full outer join public.match_analyses ma on ma.match_id = m.id
where coalesce(ma.match_id, m.id) is not null
  and (
    coalesce(ma.video_url, m.video_url) is not null
    or coalesce(ma.p1_video_start_time, m.p1_video_start_time) is not null
    or coalesce(ma.p2_video_start_time, m.p2_video_start_time) is not null
  )
on conflict (match_id) do nothing;

notify pgrst, 'reload schema';
