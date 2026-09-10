-- Enable Supabase Realtime (postgres_changes) on the tables the /dashboards
-- page listens to, so it refreshes instantly for every viewer when an analyst
-- saves/finishes an analysis, creates a dashboard, registers an event, or a new match appears.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_analyses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_dashboards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_dashboards;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'analysis_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'analysis_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_sessions;
  END IF;
END $$;


