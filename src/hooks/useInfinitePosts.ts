import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/supabase-client'

const PAGE_SIZE = 10 // Items per page

interface Post {
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
}

export function useInfinitePosts(cityId: string | null, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', cityId, userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!cityId || !userId) return { data: [], nextPage: null, hasMore: false }

      console.log(`📥 Fetching posts - Page ${pageParam}`)

      // Get city data
      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id')
        .eq('name', cityId)
        .single()

      if (!cityData) return { data: [], nextPage: null, hasMore: false }

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

      if (error) throw error

      // Check which posts are liked by current user
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id)
        const { data: likesData } = await supabaseClient
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds)

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])
        
        postsData.forEach(post => {
          post.is_liked = likedPostIds.has(post.id)
        })
      }

      const hasMore = postsData.length === PAGE_SIZE

      return {
        data: postsData as Post[],
        nextPage: hasMore ? pageParam + 1 : null,
        hasMore,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!cityId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
        const { data: likesData } = await supabaseClient
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds)

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])
        postsData.forEach(post => {
          post.is_liked = likedPostIds.has(post.id)
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
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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
