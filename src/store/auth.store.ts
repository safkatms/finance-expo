import { create } from 'zustand';
import type { User } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setUser: (user: User | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
  setUser: (user) => set({ user }),
  reset: () => set({ isAuthenticated: false, user: null }),
}));