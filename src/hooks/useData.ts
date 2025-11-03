import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabaseClient } from '../lib/supabase-client'

// Hook for fetching posts by city
export function usePosts(selectedCity: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['posts', selectedCity, userId],
    queryFn: async () => {
      if (!selectedCity || !userId) return []

      // Get city ID
      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id')
        .eq('name', selectedCity)
        .single()

      if (!cityData) throw new Error('City not found')

      // Fetch posts with user details
      const { data: postsData, error: postsError } = await supabaseClient
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
        .limit(20)

      if (postsError) throw postsError

      if (!postsData || postsData.length === 0) return []

      // Check which posts are liked by current user
      const postIds = postsData.map(p => p.id)
      const { data: likesData } = await supabaseClient
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds)

      const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])

      return postsData.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id)
      }))
    },
    enabled: !!userId && !!selectedCity,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

// Hook for fetching user profile
export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null

      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*, cities(name)')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Hook for fetching user's posts
export function useUserPosts(userId: string | null) {
  return useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

// Hook for fetching cities
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // Cities don't change often, cache for 10 minutes
  })
}

// Mutation for liking a post
export function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await supabaseClient
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId })

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate all post-related queries to refetch
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
    },
  })
}

// Mutation for unliking a post
export function useUnlikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await supabaseClient
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
    },
  })
}

// Mutation for following a user
export function useFollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const { error } = await supabaseClient
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Mutation for unfollowing a user
export function useUnfollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const { error } = await supabaseClient
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
