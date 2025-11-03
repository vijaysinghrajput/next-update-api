import { create } from 'zustand';
import { NavigationTab } from '@/types/enums';

interface UIState {
  theme: 'light' | 'dark';
  activeTab: string;
  isLoading: boolean;
  toggleTheme: () => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  activeTab: NavigationTab.HOME,
  isLoading: false,
  
  toggleTheme: () => {
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }));
  },
  
  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));