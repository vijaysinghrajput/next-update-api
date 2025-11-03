'use client';

import { BadgeCheck, Edit } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import type { Profile } from '@/lib/supabase';
import { formatPoints } from '@/utils/formatters';

interface ProfileHeaderProps {
  user: Profile;
  isOwnProfile: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEditProfile?: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  followersCount = 0,
  followingCount = 0,
  postsCount = 0,
  isFollowing = false,
  onFollow,
  onUnfollow,
  onEditProfile,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <Avatar src={user.avatar_url} alt={user.name} size="xl" />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="heading-2">{user.name}</h2>
            {user.has_blue_tick && (
              <BadgeCheck size={20} className="text-primary" fill="currentColor" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">@{user.referral_code}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="font-bold">{postsCount}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">Posts</span>
            </div>
            <div>
              <span className="font-bold">{followersCount}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold">{followingCount}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">Following</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{formatPoints(user.points_balance)}</p>
          <p className="text-xs opacity-90">Points</p>
        </div>
        {user.is_verified && (
          <div className="flex-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold">✓ Verified</p>
            <p className="text-xs">KYC Approved</p>
          </div>
        )}
      </div>

      {isOwnProfile ? (
        <button
          onClick={onEditProfile}
          className="w-full btn-secondary flex items-center justify-center gap-2"
        >
          <Edit size={18} />
          Edit Profile
        </button>
      ) : (
        <button
          onClick={isFollowing ? onUnfollow : onFollow}
          className={isFollowing ? 'w-full btn-secondary' : 'w-full btn-primary'}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </div>
  );
}