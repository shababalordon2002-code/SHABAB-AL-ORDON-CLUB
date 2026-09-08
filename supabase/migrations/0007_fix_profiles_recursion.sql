-- Migration 0007: Fix infinite recursion in public.profiles RLS policies
-- Run in Supabase SQL Editor. It is idempotent (safe to run multiple times).
--
-- Root cause: some pre-existing RLS policy on public.profiles referenced public.profiles
-- itself inside its condition (e.g. "... where exists (select 1 from profiles where role =
-- 'admin')"), which Postgres rejects at query time with "infinite recursion detected in
-- policy for relation profiles" (42P17). Migration 0006 only dropped policies by specific
-- name, so that old recursive policy survived. This migration drops ALL policies currently
-- defined on public.profiles and recreates only the simple, non-recursive ones we need.

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- Read: any authenticated (or anon) request can read profiles (needed to check roles from
-- middleware/API routes and to show analyst names in the UI). No self-reference to profiles.
create policy "Allow public read access on profiles" on public.profiles for select using (true);

-- Update: a user may only update their own profile row. No self-reference to profiles either
-- (auth.uid() comes from the JWT, not from a profiles lookup), so this cannot recurse.
create policy "Allow users to update own profile" on public.profiles for update using (auth.uid() = id);

notify pgrst, 'reload schema';
