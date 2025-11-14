/**
 * Auto-like System Hook
 * Automatically increases post likes by 100 per day
 * Works without cron jobs by calculating on-demand
 */

import { useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

/**
 * Calculates and applies auto likes for a specific post
 * Adds 100 likes per day since last update
 */
export async function calculateAutoLikes(postId: string): Promise<number> {
  try {
    const { data, error } = await supabaseClient.rpc('calculate_auto_likes', {
      p_post_id: postId
    })

    if (error) {
      console.error('Error calculating auto likes:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in calculateAutoLikes:', error)
    return 0
  }
}

/**
 * Updates auto likes for all active posts
 * Call this periodically or on app launch
 */
export async function updateAllPostLikes(): Promise<void> {
  try {
    const { data, error } = await supabaseClient.rpc('auto_update_all_post_likes')

    if (error) {
      console.error('Error updating all post likes:', error)
      return
    }

    console.log(`✅ Auto-updated likes for ${data?.length || 0} posts`)
  } catch (error) {
    console.error('Error in updateAllPostLikes:', error)
  }
}

/**
 * Hook to automatically update post likes on mount
 * Call this in your main app component or layout
 */
export function useAutoLikeSystem(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    // Update all post likes when component mounts
    updateAllPostLikes()

    // Set up interval to update every hour (optional, for active users)
    const interval = setInterval(() => {
      updateAllPostLikes()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [enabled])
}

/**
 * Calculates auto likes for an array of posts
 * Use this after fetching posts to ensure they have updated likes
 */
export async function calculateAutoLikesForPosts(postIds: string[]): Promise<void> {
  if (!postIds || postIds.length === 0) return

  try {
    // Process in batches of 10 to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize)
      await Promise.all(batch.map(id => calculateAutoLikes(id)))
    }
  } catch (error) {
    console.error('Error calculating auto likes for posts:', error)
  }
}

/**
 * Get posts with automatically updated likes
 * This function fetches posts and updates their auto likes in one call
 */
export async function getPostsWithAutoLikes(params: {
  cityId?: string
  userId?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDesc?: boolean
}) {
  try {
    const { data, error } = await supabaseClient.rpc('get_posts_with_auto_likes', {
      p_city_id: params.cityId || null,
      p_user_id: params.userId || null,
      p_limit: params.limit || 20,
      p_offset: params.offset || 0,
      p_order_by: params.orderBy || 'created_at',
      p_order_desc: params.orderDesc !== false
    })

    if (error) {
      console.error('Error getting posts with auto likes:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPostsWithAutoLikes:', error)
    return []
  }
}
