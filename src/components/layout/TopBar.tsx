'use client';

import { Search, MapPin } from 'lucide-react';
import type { City } from '@/lib/supabase';

interface TopBarProps {
  selectedCity: City;
  cities: City[];
  onCityChange: (cityId: string) => void;
  onSearch: () => void;
}

export function TopBar({ selectedCity, cities, onCityChange, onSearch }: TopBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-[var(--z-sticky)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          <select
            value={selectedCity.id}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-transparent font-semibold text-base outline-none cursor-pointer"
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
        
        <h1 className="heading-3 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          Ghar Khojo
        </h1>
        
        <button
          onClick={onSearch}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <Search size={20} />
        </button>
      </div>
    </div>
  );
}