-- Migration 0014: Add period_adjustments to matches, match_analyses, and analysis_sessions
-- Run in Supabase SQL Editor. Safe and idempotent.

-- 1. Add period_adjustments to matches
ALTER TABLE IF EXISTS public.matches
  ADD COLUMN IF NOT EXISTS period_adjustments jsonb DEFAULT '{}'::jsonb;

-- 2. Add period_adjustments to match_analyses
ALTER TABLE IF EXISTS public.match_analyses
  ADD COLUMN IF NOT EXISTS period_adjustments jsonb DEFAULT '{}'::jsonb;

-- 3. Add period_adjustments to analysis_sessions
ALTER TABLE IF EXISTS public.analysis_sessions
  ADD COLUMN IF NOT EXISTS period_adjustments jsonb DEFAULT '{}'::jsonb;

-- Comments for documentation
COMMENT ON COLUMN public.matches.period_adjustments IS 'Ajustes manuales del cronómetro por parte ({ period: { matchTimeSec, videoTimeSec } })';
COMMENT ON COLUMN public.match_analyses.period_adjustments IS 'Ajustes manuales del cronómetro por parte ({ period: { matchTimeSec, videoTimeSec } })';
COMMENT ON COLUMN public.analysis_sessions.period_adjustments IS 'Ajustes manuales del cronómetro por parte ({ period: { matchTimeSec, videoTimeSec } })';

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
