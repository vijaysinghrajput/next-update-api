'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/shared/Avatar';
import type { Post, Profile } from '@/lib/supabase';
import { formatRelativeTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  user: Profile;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

export function PostCard({ post, user, currentUserId, onLike, onComment, onShare }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(post.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar_url} alt={user.name} size="md" />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">{user.name}</span>
              {user.has_blue_tick && (
                <BadgeCheck size={16} className="text-primary" fill="currentColor" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatRelativeTime(post.created_at)}</span>
              <span>•</span>
              <span>{user.city_id}</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Media */}
      <div className="relative bg-black">
        <img
          src={post.media_urls[currentImageIndex]}
          alt="Post media"
          className="w-full aspect-square object-cover"
        />
        {post.media_urls.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
            {post.media_urls.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              className="flex items-center gap-1"
            >
              <Heart
                size={24}
                className={cn(
                  'transition-colors',
                  isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700 dark:text-gray-300'
                )}
              />
              <span className="text-sm font-medium">{post.likes_count + (isLiked ? 1 : 0)}</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onComment(post.id)}
              className="flex items-center gap-1"
            >
              <MessageCircle size={24} className="text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium">{post.comments_count}</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onShare(post.id)}
              className="flex items-center gap-1"
            >
              <Share2 size={24} className="text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium">{post.shares_count}</span>
            </motion.button>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-2">{user.name}</span>
            {post.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
}