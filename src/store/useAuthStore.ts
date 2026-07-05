import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  points: number;
  level: number;
  school_id: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  loginAsGuest: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    set({ user: null, isLoading: false });
  },
  checkSession: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          set({ user: data.user, isLoading: false });
          return;
        }
      }
    } catch (err) {
      console.error('Session verification failed:', err);
    }
    set({ user: null, isLoading: false });
  },
  loginAsGuest: () => {
    set({
      user: {
        id: '1',
        name: 'Guest Scholar',
        email: 'guest@eduarena.local',
        role: 'admin',
        points: 1500,
        level: 5,
        school_id: 'school_1'
      },
      isLoading: false
    });
  }
}));

