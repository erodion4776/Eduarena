import { create } from 'zustand';

type Mode = 'study' | 'arena';

interface ThemeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'study',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({ mode: state.mode === 'study' ? 'arena' : 'study' })),
}));
