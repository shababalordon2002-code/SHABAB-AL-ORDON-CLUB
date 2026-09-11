-- Migration 0011: Single Match Analysis per Match & Unique Constraint
-- Enforces that each match has strictly ONE single master match_analysis record
-- so multiple analysts work collaboratively on the exact same match analysis card.

-- 1. Deduplicate any legacy match_analyses rows keeping one master row per match_id
DO $$
DECLARE
  r RECORD;
BEGIN
  -- For each match_id with multiple match_analyses rows, group them into a single row with id = 'analysis_' || match_id
  FOR r IN (
    SELECT match_id
    FROM public.match_analyses
    GROUP BY match_id
    HAVING COUNT(*) > 1
  ) LOOP
    -- Delete secondary rows, keeping the one with id = 'analysis_' || r.match_id or the newest one
    DELETE FROM public.match_analyses
    WHERE match_id = r.match_id
      AND id != 'analysis_' || r.match_id
      AND ctid NOT IN (
        SELECT ctid FROM public.match_analyses
        WHERE match_id = r.match_id
        ORDER BY updated_at DESC
        LIMIT 1
      );
  END LOOP;
END $$;

-- 2. Add Unique Constraint on match_id in match_analyses table if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'match_analyses_match_id_key' 
      AND table_name = 'match_analyses'
  ) THEN
    ALTER TABLE public.match_analyses ADD CONSTRAINT match_analyses_match_id_key UNIQUE (match_id);
  END IF;
END $$;

-- 3. Ensure Realtime publication includes match_analyses & analysis_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_analyses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'analysis_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_events;
  END IF;
END $$;

-- Refresh PostgREST schema
NOTIFY pgrst, 'reload schema';
