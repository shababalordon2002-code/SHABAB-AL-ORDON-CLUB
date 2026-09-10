-- Migration 0009: Add home_lineup and away_lineup JSONB columns to matches, match_analyses, and analysis_sessions
-- Idempotent script (safe to execute multiple times in Supabase SQL Editor).

-- 1. Table `matches`
alter table public.matches
  add column if not exists home_lineup jsonb,
  add column if not exists away_lineup jsonb;

comment on column public.matches.home_lineup is 'Configuración táctica y alineación del equipo local (titulares, suplentes, dorsales, posiciones campograma)';
comment on column public.matches.away_lineup is 'Configuración táctica y alineación del equipo visitante (titulares, suplentes, dorsales, posiciones campograma)';

-- 2. Table `match_analyses`
alter table public.match_analyses
  add column if not exists home_lineup jsonb,
  add column if not exists away_lineup jsonb;

comment on column public.match_analyses.home_lineup is 'Alineación táctica guardada del equipo local para el análisis del partido';
comment on column public.match_analyses.away_lineup is 'Alineación táctica guardada del equipo visitante para el análisis del partido';

-- 3. Table `analysis_sessions` (sesiones de etiquetado en vivo)
alter table public.analysis_sessions
  add column if not exists home_lineup jsonb,
  add column if not exists away_lineup jsonb;

comment on column public.analysis_sessions.home_lineup is 'Alineación en tiempo real del equipo local durante la sesión activa';
comment on column public.analysis_sessions.away_lineup is 'Alineación en tiempo real del equipo visitante durante la sesión activa';

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
