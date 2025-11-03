import { create } from 'zustand';
import type { City } from '@/lib/supabase';
import { mockCities } from '@/data/mockData';

interface CityState {
  selectedCity: City | null;
  cities: City[];
  setSelectedCity: (city: City) => void;
  fetchCities: () => Promise<void>;
}

export const useCityStore = create<CityState>((set) => ({
  selectedCity: mockCities[0],
  cities: mockCities,
  
  setSelectedCity: (city: City) => {
    set({ selectedCity: city });
  },
  
  fetchCities: async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ cities: mockCities });
  },
}));