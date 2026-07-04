import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  points: number;
  level: number;
  tenant_id: string;
  tenant_name?: string;
  school_id: string; // mapped from tenant_id for frontend compatibility
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  _authSubscription: (() => void) | null;
  init: () => Promise<void>;
  destroy: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    name: string;
    role: 'student' | 'teacher';
    tenantMode: 'create' | 'join';
    schoolName?: string;
    joinSlug?: string;
  }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface ProfileWithTenant {
  id: string;
  name: string;
  role: string;
  points: number;
  level: number;
  tenant_id: string;
  tenants: { name: string } | null | undefined;
}

async function loadProfile(userId: string, email: string): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data: rawData, error } = await supabase
      .from('profiles')
      .select('id, name, role, points, level, tenant_id, tenants(name)')
      .eq('id', userId)
      .maybeSingle();

    if (error || !rawData) return null;

    const data = rawData as any as ProfileWithTenant;
    const tenantsData = data.tenants;
    const tenantName = tenantsData 
      ? (Array.isArray(tenantsData) ? tenantsData[0]?.name : (tenantsData as { name: string }).name)
      : '';

    return {
      id: data.id,
      email,
      name: data.name,
      role: data.role as 'student' | 'teacher' | 'admin',
      points: Number(data.points ?? 0),
      level: Number(data.level ?? 1),
      tenant_id: data.tenant_id,
      tenant_name: tenantName || '',
      school_id: data.tenant_id,
    };
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const suffix = Math.random().toString(36).slice(2, 9); // 7 chars
  return `${base}-${suffix}`;
}

// Helper to sync session cookie with backend
async function syncSessionWithBackend(userId: string, role: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error syncing session with backend:', err);
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  _authSubscription: null,

  init: async () => {
    if (!supabase) {
      set({ isLoading: false, isInitialized: true });
      return;
    }

    const currentSubscription = get()._authSubscription;
    if (currentSubscription) {
      currentSubscription();
    }

    set({ isLoading: true, error: null });

    let alreadyLoaded = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        if (profile) {
          const synced = await syncSessionWithBackend(session.user.id, profile.role);
          if (!synced) {
            console.warn('Backend session sync failed — some features may be unavailable');
          }
          set({ user: profile, isInitialized: true });
          alreadyLoaded = true;
        }
      } else {
        set({ user: null, isInitialized: true });
      }
    } catch (err) {
      console.error('Auth initialization session fetch error:', err);
    } finally {
      set({ isLoading: false });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Avoid loading profile twice for the same initial session
      if (alreadyLoaded && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user?.id === get().user?.id) {
        return;
      }

      if (session?.user) {
        set({ isLoading: true });
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        if (profile) {
          const synced = await syncSessionWithBackend(session.user.id, profile.role);
          if (!synced) {
            console.warn('Backend session sync failed on auth change');
          }
          set({ user: profile, isLoading: false, isInitialized: true });
        } else {
          set({ isLoading: false, isInitialized: true });
        }
      } else {
        if (event === 'SIGNED_OUT') {
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (err) {
            console.error('Failed backend logout sync:', err);
          }
        }
        set({ user: null, isLoading: false, isInitialized: true });
      }
    });

    set({ _authSubscription: () => subscription.unsubscribe() });
  },

  destroy: () => {
    const unsub = get()._authSubscription;
    if (unsub) {
      unsub();
      set({ _authSubscription: null });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ isLoading: false, error: error.message });
        return { error: error.message };
      }
      if (!data.user) {
        set({ isLoading: false, error: 'Sign in succeeded, but user metadata is empty.' });
        return { error: 'Sign in succeeded, but user metadata is empty.' };
      }

      const profile = await loadProfile(data.user.id, data.user.email ?? '');
      if (profile) {
        const synced = await syncSessionWithBackend(data.user.id, profile.role);
        if (!synced) {
          console.warn('Backend session sync failed on manual sign in');
        }
        set({ user: profile, isLoading: false, error: null });
        return { error: null };
      } else {
        set({ isLoading: false, error: 'User profile record not found in database.' });
        return { error: 'User profile record not found in database.' };
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during sign in.';
      set({ isLoading: false, error: errMsg });
      return { error: errMsg };
    }
  },

  signUp: async ({ email, password, name, role, tenantMode, schoolName, joinSlug }) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    set({ isLoading: true, error: null });

    let tenantId = '';
    let tenantName = '';
    const effectiveRole: 'student' | 'teacher' | 'admin' = tenantMode === 'create' ? 'admin' : role;

    try {
      if (tenantMode === 'create') {
        if (!schoolName?.trim()) {
          set({ isLoading: false, error: 'School name is required.' });
          return { error: 'School name is required.' };
        }
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({ name: schoolName.trim(), slug: slugify(schoolName) })
          .select()
          .single();
        if (tenantError || !tenant) {
          set({ isLoading: false, error: tenantError?.message ?? 'Could not create school.' });
          return { error: tenantError?.message ?? 'Could not create school.' };
        }
        tenantId = tenant.id;
        tenantName = tenant.name;
      } else {
        if (!joinSlug?.trim()) {
          set({ isLoading: false, error: 'Join code is required.' });
          return { error: 'Join code is required.' };
        }
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select()
          .eq('slug', joinSlug.trim())
          .maybeSingle();
        if (tenantError || !tenant) {
          set({ isLoading: false, error: 'No school found with that join code.' });
          return { error: 'No school found with that join code.' };
        }
        tenantId = tenant.id;
        tenantName = tenant.name;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (signUpError) {
        // Rollback tenant creation on signup failure
        if (tenantMode === 'create' && tenantId) {
          await supabase.from('tenants').delete().eq('id', tenantId);
        }
        set({ isLoading: false, error: signUpError.message });
        return { error: signUpError.message };
      }

      if (!authData.user) {
        if (tenantMode === 'create' && tenantId) {
          await supabase.from('tenants').delete().eq('id', tenantId);
        }
        set({ isLoading: false, error: 'Signup succeeded but user authentication data is missing.' });
        return { error: 'Signup succeeded but user authentication data is missing.' };
      }

      // Insert profile in profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim(),
          role: effectiveRole,
          tenant_id: tenantId,
          points: 0,
          level: 1,
        });

      if (profileErr) {
        // Rollback tenant creation on profile insert failure
        if (tenantMode === 'create' && tenantId) {
          await supabase.from('tenants').delete().eq('id', tenantId);
        }
        set({ isLoading: false, error: profileErr.message });
        return { error: profileErr.message };
      }

      const newUser: User = {
        id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: effectiveRole,
        points: 0,
        level: 1,
        tenant_id: tenantId,
        tenant_name: tenantName,
        school_id: tenantId,
      };

      const synced = await syncSessionWithBackend(authData.user.id, effectiveRole);
      if (!synced) {
        console.warn('Backend session sync failed during registration');
      }
      set({ user: newUser, isLoading: false, error: null });
      return { error: null };
    } catch (err: any) {
      // Rollback tenant creation on unexpected exceptions
      if (tenantMode === 'create' && tenantId) {
        try {
          await supabase.from('tenants').delete().eq('id', tenantId);
        } catch (rollbackErr) {
          console.error('Failed to rollback tenant creation:', rollbackErr);
        }
      }
      const errMsg = err.message || 'An unexpected error occurred during signup.';
      set({ isLoading: false, error: errMsg });
      return { error: errMsg };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during Supabase signout:', err);
      }
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed backend logout sync:', err);
    }
    set({ user: null, isLoading: false, error: null });
  },

  refreshProfile: async () => {
    const current = get().user;
    if (!current || !supabase) return;
    
    set({ isLoading: true });
    try {
      const profile = await loadProfile(current.id, current.email);
      if (profile) {
        set({ user: profile, error: null });
      } else {
        set({ error: 'Failed to refresh profile.' });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to refresh profile.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
