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
  init: () => Promise<void>;
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

async function loadProfile(userId: string, email: string): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, points, level, tenant_id, tenants(name)')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      email,
      name: data.name,
      role: data.role as 'student' | 'teacher' | 'admin',
      points: Number(data.points ?? 0),
      level: Number(data.level ?? 1),
      tenant_id: data.tenant_id,
      tenant_name: (data.tenants as any)?.name || '',
      school_id: data.tenant_id,
    };
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

// Helper to sync session cookie with backend
async function syncSessionWithBackend(userId: string, role: string) {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
  } catch (err) {
    console.error('Error syncing session with backend:', err);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  init: async () => {
    if (!supabase) {
      set({ isLoading: false, isInitialized: true });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        if (profile) {
          await syncSessionWithBackend(session.user.id, profile.role);
          set({ user: profile });
        }
      } else {
        set({ user: null });
      }
    } catch (err) {
      console.error('Auth initialization session fetch error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email ?? '');
        if (profile) {
          await syncSessionWithBackend(session.user.id, profile.role);
          set({ user: profile, isLoading: false });
        }
      } else {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
          console.error('Failed backend logout sync:', err);
        }
        set({ user: null, isLoading: false });
      }
    });
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }
      if (!data.user) {
        set({ isLoading: false });
        return { error: 'Sign in succeeded, but user metadata is empty.' };
      }

      const profile = await loadProfile(data.user.id, data.user.email ?? '');
      if (profile) {
        await syncSessionWithBackend(data.user.id, profile.role);
        set({ user: profile, isLoading: false });
        return { error: null };
      } else {
        set({ isLoading: false });
        return { error: 'User profile record not found in database.' };
      }
    } catch (err: any) {
      set({ isLoading: false });
      return { error: err.message || 'An error occurred during sign in.' };
    }
  },

  signUp: async ({ email, password, name, role, tenantMode, schoolName, joinSlug }) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    set({ isLoading: true });

    let tenantId: string;
    let tenantName = '';

    try {
      if (tenantMode === 'create') {
        if (!schoolName?.trim()) {
          set({ isLoading: false });
          return { error: 'School name is required.' };
        }
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({ name: schoolName.trim(), slug: slugify(schoolName) })
          .select()
          .single();
        if (tenantError || !tenant) {
          set({ isLoading: false });
          return { error: tenantError?.message ?? 'Could not create school.' };
        }
        tenantId = tenant.id;
        tenantName = tenant.name;
        // Whoever creates the school becomes its admin.
        role = 'admin' as any;
      } else {
        if (!joinSlug?.trim()) {
          set({ isLoading: false });
          return { error: 'Join code is required.' };
        }
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select()
          .eq('slug', joinSlug.trim())
          .maybeSingle();
        if (tenantError || !tenant) {
          set({ isLoading: false });
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
        set({ isLoading: false });
        return { error: signUpError.message };
      }

      if (!authData.user) {
        set({ isLoading: false });
        return { error: 'Signup succeeded but user authentication data is missing.' };
      }

      // Insert profile in profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim(),
          role,
          tenant_id: tenantId,
          points: 0,
          level: 1,
        });

      if (profileErr) {
        set({ isLoading: false });
        return { error: profileErr.message };
      }

      const newUser: User = {
        id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: role as any,
        points: 0,
        level: 1,
        tenant_id: tenantId,
        tenant_name: tenantName,
        school_id: tenantId,
      };

      await syncSessionWithBackend(authData.user.id, role);
      set({ user: newUser, isLoading: false });
      return { error: null };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: err.message || 'An unexpected error occurred during signup.' };
    }
  },

  logout: async () => {
    set({ isLoading: true });
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
    set({ user: null, isLoading: false });
  },

  refreshProfile: async () => {
    const current = get().user;
    if (!current || !supabase) return;
    const profile = await loadProfile(current.id, current.email);
    if (profile) set({ user: profile });
  },
}));
