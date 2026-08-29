import { create } from 'zustand';
import type { User } from '@/types/finance';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  originalAdmin: User | null;
  adminToken: string | null;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setOriginalAdmin: (user: User | null) => void;
  setAdminToken: (token: string | null) => void;
  clearImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  originalAdmin: null,
  adminToken: null,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  setOriginalAdmin: (user) => set({ originalAdmin: user }),
  setAdminToken: (token) => set({ adminToken: token }),
  clearImpersonation: () => set({ originalAdmin: null, adminToken: null }),
}));