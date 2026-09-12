-- Migration 0013: Add goal mouth coordinates to analysis_events and analysis_events_trash
-- Run in Supabase SQL Editor. Safe and idempotent.

alter table if exists public.analysis_events
  add column if not exists goal_x double precision,
  add column if not exists goal_y double precision,
  add column if not exists goal_zone text;

alter table if exists public.analysis_events_trash
  add column if not exists goal_x double precision,
  add column if not exists goal_y double precision,
  add column if not exists goal_zone text;

comment on column public.analysis_events.goal_x is 'Coordenada X en la portería (0% poste izq a 100% poste der)';
comment on column public.analysis_events.goal_y is 'Coordenada Y en la portería (0% larguero a 100% línea de cal)';
comment on column public.analysis_events.goal_zone is 'Zona táctica de la portería (Escuadra Izq/Der, Alto Centro, Raso, Poste, Fuera...)';
