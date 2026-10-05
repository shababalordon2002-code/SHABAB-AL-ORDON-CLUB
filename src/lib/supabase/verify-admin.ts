import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient, getValidAnonKey, getValidUrl } from './client';

// Same account AuthProvider treats as admin regardless of its profile row.
export const MAIN_ADMIN_EMAIL = 'shababalordon2002@gmail.com';

// Checks a password against the admin account(s) without touching the signed-in user's
// session: the sign-in runs on a throwaway client that never persists its session, and
// is signed out locally right after (scope 'local' so the admin's real sessions survive).
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;

  const emails = new Set<string>([MAIN_ADMIN_EMAIL]);
  try {
    const { data } = await createClient().from('profiles').select('email').eq('role', 'admin');
    (data || []).forEach((row: any) => {
      if (row?.email) emails.add(String(row.email).toLowerCase());
    });
  } catch {
    // Profiles not readable: the main admin account is still checked.
  }

  const probe = createSupabaseClient(getValidUrl(), getValidAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sao-admin-password-check',
    },
  });

  for (const email of Array.from(emails)) {
    const { data, error } = await probe.auth.signInWithPassword({ email, password });
    if (!error && data?.session) {
      await probe.auth.signOut({ scope: 'local' }).catch(() => {});
      return true;
    }
  }
  return false;
}
