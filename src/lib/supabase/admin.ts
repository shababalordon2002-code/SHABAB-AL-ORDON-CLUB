import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://oyxzggegkzcvlcrvwpxs.supabase.co';
const FALLBACK_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95eHpnZ2Vna3pjdmxjcnZ3cHhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU4ODkwNywiZXhwIjoyMTA0MTY0OTA3fQ.6Y00w9zkh6d92XGws9o_fVkZS_CEbi3OZmyQpuAB9hE';

function getValidUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  if (url && url.startsWith('http') && !url.includes('placeholder')) {
    return url;
  }
  return FALLBACK_URL;
}

function getValidServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, '');
  if (key && key.startsWith('eyJ') && key.split('.').length === 3 && key.length > 100) {
    return key;
  }
  return FALLBACK_SERVICE_ROLE;
}

export function createAdminClient() {
  return createSupabaseClient(getValidUrl(), getValidServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
