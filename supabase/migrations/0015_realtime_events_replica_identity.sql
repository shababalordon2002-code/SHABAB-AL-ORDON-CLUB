-- Migration 0015: Ensure Realtime replica identity on analysis_events
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).
--
-- Garantiza que las eliminaciones (DELETE) y actualizaciones (UPDATE) envíen
-- el registro completo en el WAL para que los filtros y handlers de Realtime funcionen al 100%.

DO $$
BEGIN
  -- 1. Establecer REPLICA IDENTITY FULL para que los eventos DELETE incluyan match_id y todos los campos
  ALTER TABLE public.analysis_events REPLICA IDENTITY FULL;

  -- 2. Asegurar que la tabla esté incluida en la publicación de Realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'analysis_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_analyses;
  END IF;
END $$;

-- 3. Notificar recarga de esquema a PostgREST
NOTIFY pgrst, 'reload schema';
