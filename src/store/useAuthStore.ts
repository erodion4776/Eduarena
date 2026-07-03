import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  points: number;
  level: number;
  school_id: string; // mapped from tenant_id for frontend compatibility
  tenant_id?: string;
  tenant_name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
    schoolName?: string; // For registering a new school
    joinCode?: string;   // For joining an existing school
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

// Helper to load user profile from Supabase profiles table
async function loadUserProfile(userId: string, email: string): Promise<User> {
  if (!supabase) {
    // Return a generic fallback if Supabase is not available
    return {
      id: userId,
      name: email.split('@')[0],
      email,
      role: 'student',
      points: 100,
      level: 1,
      school_id: 'school_default',
    };
  }

  try {
    // Read the user profile. We do a left join on tenants to get school name.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, tenants(name)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error.message);
    }

    if (profile) {
      return {
        id: profile.id,
        name: profile.name || 'Scholar',
        email: profile.email || email,
        role: (profile.role as any) || 'student',
        points: Number(profile.points ?? 0),
        level: Number(profile.level ?? 1),
        school_id: profile.tenant_id || 'school_default',
        tenant_id: profile.tenant_id,
        tenant_name: profile.tenants?.name || '',
      };
    }
  } catch (err) {
    console.error('Failed to load user profile:', err);
  }

  return {
    id: userId,
    name: email.split('@')[0],
    email,
    role: 'student',
    points: 100,
    level: 1,
    school_id: 'school_default',
  };
}

// Helper to sync the session cookie with the local Express API backend
async function syncSessionWithBackend(userId: string, role: string) {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
  } catch (err) {
    console.error('Error syncing session cookie with backend:', err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  init: async () => {
    set({ isLoading: true, error: null });
    if (!supabase) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        const profile = await loadUserProfile(session.user.id, session.user.email || '');
        await syncSessionWithBackend(session.user.id, profile.role);
        set({ user: profile, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err.message);
      set({ user: null, isLoading: false, error: err.message });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    if (!supabase) {
      throw new Error('Supabase configuration missing.');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in succeeded, but user data is missing.');

      const profile = await loadUserProfile(data.user.id, data.user.email || '');
      await syncSessionWithBackend(data.user.id, profile.role);

      set({ user: profile, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  signUp: async ({ name, email, password, role, schoolName, joinCode }) => {
    set({ isLoading: true, error: null });
    if (!supabase) {
      throw new Error('Supabase configuration missing.');
    }

    try {
      let tenantId = '';
      let tenantName = '';

      if (role === 'admin') {
        if (!schoolName?.trim()) {
          throw new Error('School name is required to register a school.');
        }

        // Generate matching slug for join code: "Lagos High" -> "lagos-high-a4bf"
        const cleanSlug = schoolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const randomHex = Math.random().toString(36).substring(2, 6);
        const slug = `${cleanSlug}-${randomHex}`;

        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .insert({ name: schoolName.trim(), slug })
          .select()
          .single();

        if (tenantErr) throw tenantErr;
        tenantId = tenantData.id;
        tenantName = tenantData.name;
      } else {
        if (!joinCode?.trim()) {
          throw new Error('School join code is required.');
        }

        // Find tenant by join code / slug
        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .select()
          .eq('slug', joinCode.trim())
          .maybeSingle();

        if (tenantErr) throw tenantErr;
        if (!tenantData) {
          throw new Error(`Invalid join code: No school found matching "${joinCode}"`);
        }

        tenantId = tenantData.id;
        tenantName = tenantData.name;
      }

      // Create authentication user in Supabase
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) {
        throw new Error('Signup succeeded, but user profile was not generated.');
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

      if (profileErr) throw profileErr;

      const newUser: User = {
        id: authData.user.id,
        name: name.trim(),
        email: email.trim(),
        role,
        points: 0,
        level: 1,
        school_id: tenantId,
        tenant_id: tenantId,
        tenant_name: tenantName,
      };

      await syncSessionWithBackend(authData.user.id, role);
      set({ user: newUser, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
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
      console.error('Failed to notify backend logout:', err);
    }

    set({ user: null, isLoading: false, error: null });
  },
}));
