'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAnalyst: false,
  isViewer: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error || !data) {
        // Fallback profile if profiles table is missing or row not created yet
        const fallbackProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: (currentUser.user_metadata?.full_name as string) || currentUser.email?.split('@')[0] || 'Usuario',
          role: (currentUser.user_metadata?.role as any) || 'viewer',
          created_at: currentUser.created_at || new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      } else {
        const effectiveRole = (currentUser.user_metadata?.role as any) || data.role || 'viewer';
        setProfile({ ...data, role: effectiveRole } as UserProfile);
      }
    } catch {
      // Fallback profile on any network/Supabase exception
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: (currentUser.user_metadata?.full_name as string) || currentUser.email?.split('@')[0] || 'Usuario',
        role: (currentUser.user_metadata?.role as any) || 'viewer',
        created_at: currentUser.created_at || new Date().toISOString(),
      };
      setProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser);
        }
      } catch {
        // Quiet initialization failure handling
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    } finally {
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'shababalordon2002@gmail.com' || user?.user_metadata?.role === 'admin';
  const isAnalyst = isAdmin || profile?.role === 'analyst' || user?.user_metadata?.role === 'analyst';
  const isViewer = profile?.role === 'viewer' || profile?.role === 'user' || user?.user_metadata?.role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isAnalyst,
        isViewer,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/**
 * Redirects away from the current page if the signed-in user's role is not in `allowedRoles`
 * (e.g. keep "visor" / role 'user' out of Botonera and Configuración, which are for
 * admin/analyst only). Returns { allowed, loading } so the page can render a placeholder
 * while the auth state is still resolving, instead of flashing restricted content.
 */
export function useRequireRole(allowedRoles: UserRole[]) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const allowed = !!profile && allowedRoles.includes(profile.role);

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace('/');
    }
  }, [loading, allowed, router]);

  return { allowed, loading };
}
