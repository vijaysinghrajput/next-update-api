import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/supabase-client'
import { debugLogger } from '@/utils/debugLogger'

const PAGE_SIZE = 10 // Items per page

interface Post {
  id: string
  user_id: string
  title: string | null
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

export function useInfinitePosts(cityId: string | null, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', cityId, userId],
    queryFn: async ({ pageParam = 0 }) => {
      const queryKey = `posts-infinite-${cityId}`
      debugLogger.queryFetch(queryKey, pageParam)

      if (!cityId || !userId) {
        console.log('⏭️ Skipping posts fetch - no city or user')
        return { data: [], nextPage: null, hasMore: false }
      }

      console.log(`📥 Fetching posts - City: ${cityId}, Page: ${pageParam}`)

      try {
        // Get city data
        const { data: cityData } = await supabaseClient
          .from('cities')
          .select('id')
          .eq('name', cityId)
          .single()

        if (!cityData) {
          console.log('❌ City not found:', cityId)
          return { data: [], nextPage: null, hasMore: false }
        }

        // Fetch posts with pagination
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
          .order('created_at', { ascending: false })
          .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)

        if (error) {
          debugLogger.queryError(queryKey, error, pageParam)
          throw error
        }

        debugLogger.querySuccess(queryKey, postsData?.length || 0, pageParam)

        // Check which posts are liked by current user and follow status
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id)
          const userIds = postsData.map(p => p.user_id)
          
          // Get likes
          const { data: likesData } = await supabaseClient
            .from('post_likes')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds)

          const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])
          
          // Get follow status
          const { data: followsData } = await supabaseClient
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)
            .in('following_id', userIds)
          
          const followingUserIds = new Set(followsData?.map(f => f.following_id) || [])
          
          postsData.forEach(post => {
            post.is_liked = likedPostIds.has(post.id)
            post.is_following = followingUserIds.has(post.user_id)
          })
        }

        const hasMore = postsData.length === PAGE_SIZE

        return {
          data: postsData as Post[],
          nextPage: hasMore ? pageParam + 1 : null,
          hasMore,
        }
      } catch (error) {
        debugLogger.queryError(queryKey, error, pageParam)
        throw error
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!cityId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
    refetchOnWindowFocus: false, // ❌ Don't refetch on window focus
    refetchOnMount: false, // ❌ Don't refetch on mount, use cached data
    refetchOnReconnect: true, // ✅ Only refetch when internet reconnects
  })
}

export function useInfiniteTrendingPosts(cityId: string | null, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['posts', 'trending', 'infinite', cityId, userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!cityId || !userId) return { data: [], nextPage: null, hasMore: false }

      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id')
        .eq('name', cityId)
        .single()

      if (!cityData) return { data: [], nextPage: null, hasMore: false }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: postsData } = await supabaseClient
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
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id)
        const userIds = postsData.map(p => p.user_id)
        
        // Get likes
        const { data: likesData } = await supabaseClient
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds)

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])
        
        // Get follow status
        const { data: followsData } = await supabaseClient
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .in('following_id', userIds)
        
        const followingUserIds = new Set(followsData?.map(f => f.following_id) || [])
        
        postsData.forEach(post => {
          post.is_liked = likedPostIds.has(post.id)
          post.is_following = followingUserIds.has(post.user_id)
        })
      }

      const hasMore = postsData?.length === PAGE_SIZE

      return {
        data: (postsData as Post[]) || [],
        nextPage: hasMore ? pageParam + 1 : null,
        hasMore,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!cityId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // ❌ Don't refetch on window focus
    refetchOnMount: false, // ❌ Don't refetch on mount
    refetchOnReconnect: true, // ✅ Only refetch when internet reconnects
  })
}

// Prefetch next page for better UX
export function usePrefetchNextPage(cityId: string | null, userId: string | null, currentPage: number) {
  const queryClient = useQueryClient()

  const prefetch = () => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['posts', 'infinite', cityId, userId],
      queryFn: async ({ pageParam = currentPage + 1 }) => {
        if (!cityId || !userId) return { data: [], nextPage: null, hasMore: false }

        const { data: cityData } = await supabaseClient
          .from('cities')
          .select('id')
          .eq('name', cityId)
          .single()

        if (!cityData) return { data: [], nextPage: null, hasMore: false }

        const { data: postsData } = await supabaseClient
          .from('posts')
          .select(`
            *,
            profiles:user_id (id, name, avatar_url, is_verified, has_blue_tick)
          `)
          .eq('city_id', cityData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)

        return {
          data: postsData || [],
          nextPage: (postsData?.length === PAGE_SIZE) ? pageParam + 1 : null,
          hasMore: postsData?.length === PAGE_SIZE,
        }
      },
      initialPageParam: currentPage + 1,
    })
  }

  return { prefetch }
}
