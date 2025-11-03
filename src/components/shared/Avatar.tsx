'use client';

import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function Avatar({ src, alt = 'User avatar', size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      'rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <User size={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 32} className="text-gray-500" />
      )}
    </div>
  );
}