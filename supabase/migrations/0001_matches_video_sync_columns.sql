-- Columnas de vídeo / botonera en `matches`.
-- La botonera guarda en cada partido qué vídeo se usó, en qué minuto del vídeo
-- arranca cada parte (sincronización crono ↔ vídeo) y con qué plantilla se registró.
-- Ejecutar en Supabase → SQL Editor (es idempotente: se puede lanzar varias veces).

alter table public.matches
  add column if not exists video_type          text,             -- 'local' | 'link' | 'none'
  add column if not exists video_url           text,
  add column if not exists video_source_name   text,
  add column if not exists p1_video_start_time double precision, -- seg. del vídeo en los que empieza la 1ª parte
  add column if not exists p2_video_start_time double precision, -- seg. del vídeo en los que empieza la 2ª parte
  add column if not exists botonera_template_id text;

comment on column public.matches.p1_video_start_time is 'Segundo del vídeo en el que se pone en juego la 1ª parte (offset de sincronización del cronómetro)';
comment on column public.matches.p2_video_start_time is 'Segundo del vídeo en el que se pone en juego la 2ª parte (el crono muestra 45:00 en ese punto)';

-- Refresca la caché de esquema de PostgREST para que la API vea las columnas nuevas
notify pgrst, 'reload schema';
