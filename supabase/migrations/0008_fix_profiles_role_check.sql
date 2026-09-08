-- Migration 0008: Allow 'viewer' role in public.profiles check constraint
-- Safe and idempotent to run in Supabase SQL Editor.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'analyst', 'viewer', 'user'));
