-- Enable Supabase Realtime (postgres_changes) on the tables the /dashboards
-- page listens to, so it refreshes instantly for every viewer when an analyst
-- saves/finishes an analysis, creates a dashboard, or a new match appears.
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_analyses;
alter publication supabase_realtime add table public.match_dashboards;
