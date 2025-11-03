import { create } from 'zustand';
import type { Profile } from '@/lib/supabase';
import { mockCurrentUser } from '@/data/mockData';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: mockCurrentUser,
  isAuthenticated: true,
  isLoading: false,
  
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({ user: mockCurrentUser, isAuthenticated: true, isLoading: false });
  },
  
  signup: async (data: any) => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({ user: mockCurrentUser, isAuthenticated: true, isLoading: false });
  },
  
  logout: async () => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  
  updateProfile: async (data: Partial<Profile>) => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
      isLoading: false
    }));
  },
}));