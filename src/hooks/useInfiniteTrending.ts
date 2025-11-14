import { useInfiniteQuery } from '@tanstack/react-query'
import { supabaseClient } from '../lib/supabase-client'

const POSTS_PER_PAGE = 10

interface TrendingPost {
  id: string
  user_id: string
  caption: string | null
  media_urls: string[]
  media_type: 'image' | 'video'
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    is_verified: boolean
    has_blue_tick: boolean
  }
  is_liked?: boolean
  is_following?: boolean
}

interface UseInfiniteTrendingParams {
  cityId?: string
  userId?: string
  enabled?: boolean
}

export function useInfiniteTrending({
  cityId,
  userId,
  enabled = true,
}: UseInfiniteTrendingParams) {
  return useInfiniteQuery({
    queryKey: ['infinite-trending', cityId, userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!cityId || !userId) return { posts: [], hasMore: false }

      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id')
        .eq('name', cityId)
        .single()

      if (!cityData) return { posts: [], hasMore: false }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: postsData, error } = await supabaseClient
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            avatar_url,
            is_verified,
            has_blue_tick
          )
        `)
        .eq('city_id', cityData.id)
        .eq('is_active', true)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('likes_count', { ascending: false })
        .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1)

      if (error) throw error

      if (!postsData || postsData.length === 0) {
        return { posts: [], hasMore: false }
      }

      const postIds = postsData.map((p) => p.id)
      const userIds = postsData.map((p) => p.user_id)
      
      // Get likes
      const { data: likesData } = await supabaseClient
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds)

      const likedPostIds = new Set(likesData?.map((l) => l.post_id) || [])
      
      // Get follow status
      const { data: followsData } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', userIds)
      
      const followingUserIds = new Set(followsData?.map((f) => f.following_id) || [])

      const posts = postsData.map((post) => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        is_following: followingUserIds.has(post.user_id),
      }))

      return {
        posts,
        hasMore: postsData.length === POSTS_PER_PAGE,
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes for trending
    refetchOnWindowFocus: true,
  })
}
