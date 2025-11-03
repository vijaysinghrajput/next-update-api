'use client';

import { House, Compass, CirclePlus, Wallet, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavigationTab } from '@/types/enums';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: NavigationTab.HOME, icon: House, label: 'Home' },
  { id: NavigationTab.EXPLORE, icon: Compass, label: 'Explore' },
  { id: NavigationTab.ADD_POST, icon: CirclePlus, label: 'Add Post' },
  { id: NavigationTab.WALLET, icon: Wallet, label: 'Wallet' },
  { id: NavigationTab.PROFILE, icon: User, label: 'Profile' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-[var(--z-sticky)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                isActive 
                  ? 'text-white bg-blue-600' 
                  : 'text-gray-600 dark:text-gray-400 bg-transparent'
              )}
            >
              <Icon 
                size={item.id === NavigationTab.ADD_POST ? 28 : 24} 
              />
              <span className="text-xs font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}