'use client'

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Empty, Alert } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useApp } from '../lib/providers'
import { useInfinitePosts } from '../hooks/useInfinitePosts'
import PostCard from '../components/posts/PostCard'
import InfiniteScrollList from '../components/shared/InfiniteScrollList'
import PullToRefresh from '../components/shared/PullToRefresh'

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

export default function HomePage() {
  const { user, selectedCity, isLoading: isUserLoading } = useApp()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isUserLoading, router])

  // Use infinite query for posts
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfinitePosts(selectedCity, user?.id || null)

  // Flatten paginated data
  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || []
  }, [data])

  // Handle pull to refresh
  const handleRefresh = async () => {
    console.log('🔄 Refreshing posts...')
    await queryClient.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    await refetch()
  }

  // Update post in cache after user action
  const handleUpdatePost = (updatedPost: Partial<Post> & { id: string }) => {
    queryClient.setQueryData(['posts', selectedCity, user?.id], (oldData: Post[] = []) => {
      return oldData.map(p => 
        p.id === updatedPost.id ? { ...p, ...updatedPost } : p
      )
    })
  }

  // Show loading spinner during initial load or user check
  if (isUserLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  // Don't render anything if user is not logged in (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Feed */}
      <div className="px-4 py-2 pt-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
  // Handle post update (optimistic)
  const handleUpdatePost = (updatedPost: Post) => {
    queryClient.setQueryData(['posts', 'infinite', selectedCity, user?.id], (oldData: any) => {
      if (!oldData) return oldData
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((post: Post) =>
            post.id === updatedPost.id ? updatedPost : post
          ),
        })),
      }
    })
  }

  // Loading state
  if (isUserLoading) {
    return null
  }

  // Not logged in
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 pt-4">
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Alert
                message="Error loading feed"
                description={error instanceof Error ? error.message : 'Failed to load posts'}
                type="error"
                showIcon
                closable
              />
            </motion.div>
          )}

          {/* Infinite Scroll List */}
          <InfiniteScrollList
            data={posts}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage || false}
            fetchNextPage={fetchNextPage}
            error={error}
            retry={refetch}
            renderItem={(post) => (
              <div className="mb-4">
                <PostCard
                  post={post}
                  currentUserId={user.id}
                  onUpdate={handleUpdatePost}
                />
              </div>
            )}
            emptyMessage={`No posts in ${selectedCity || 'your city'} yet. Be the first to share!`}
            loadingMessage="Loading your feed..."
            className="space-y-0"
          />
        </PullToRefresh>
      </div>
    </div>
  )
}
