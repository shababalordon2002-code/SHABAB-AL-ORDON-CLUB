-- Migration 0006: User Profiles (roles: admin / analyst / user)
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).
--
-- Esta tabla faltaba por completo: /admin/usuarios, /api/admin/users y el middleware
-- ya dependían de public.profiles para comprobar el rol, pero nunca se había creado,
-- por lo que la comprobación de "admin" siempre fallaba (ningún usuario podía entrar).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'analyst', 'user')),
  created_at timestamp with time zone default now()
);

comment on table public.profiles is 'Perfil de aplicación por usuario (nombre y rol admin/analyst/user), 1:1 con auth.users';

alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer los perfiles (necesario para pintar nombres de
-- analistas conectados, listas, etc.). La escritura normal la hace el service-role desde
-- las rutas /api/admin/*; además dejamos que cada usuario pueda ver/editar su propia fila.
drop policy if exists "Allow authenticated read access on profiles" on public.profiles;
create policy "Allow authenticated read access on profiles" on public.profiles for select using (true);

drop policy if exists "Allow users to update own profile" on public.profiles;
create policy "Allow users to update own profile" on public.profiles for update using (auth.uid() = id);

-- Crea automáticamente la fila de perfil cuando se registra un usuario nuevo en auth.users,
-- tomando el rol/nombre indicados en user_metadata si vienen (p.ej. desde /api/admin/users).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea el perfil para cualquier usuario que ya existiera en auth.users antes de
-- esta migración (incluida tu cuenta de administrador actual), respetando el rol que ya
-- tuviera guardado en user_metadata si lo tiene.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'role', 'user')
from auth.users u
on conflict (id) do nothing;

-- Refresh PostgREST schema
notify pgrst, 'reload schema';
