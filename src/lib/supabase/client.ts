import { createBrowserClient } from '@supabase/ssr';

const FALLBACK_URL = 'https://oyxzggegkzcvlcrvwpxs.supabase.co';
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95eHpnZ2Vna3pjdmxjcnZ3cHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODg5MDcsImV4cCI6MjEwNDE2NDkwN30.lQVLH4QopLtHHike2TUVDO3a-vtydXKjmod8bTpEdng';

function getValidUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  if (url && url.startsWith('http') && !url.includes('placeholder')) {
    return url;
  }
  return FALLBACK_URL;
}

function getValidAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '');
  if (key && key.startsWith('eyJ') && key.split('.').length === 3 && key.length > 100) {
    return key;
  }
  return FALLBACK_ANON;
}

export function createClient() {
  return createBrowserClient(getValidUrl(), getValidAnonKey());
}
